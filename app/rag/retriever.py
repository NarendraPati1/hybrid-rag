import os
import json
import pickle
from collections import defaultdict

# Point fastembed to the baked-in cache directory (set before importing fastembed)
# This uses the model pre-warmed at Docker build time — no download on cold start.
os.environ.setdefault("FASTEMBED_CACHE_PATH", "/var/task/.fastembed_cache")

from fastembed import TextEmbedding
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

from app.utils.helpers import clean_tokens
from app.db.pinecone_client import get_pinecone_index
from app.rag.prompts import ROUTER_PROMPT
from app.rag.schemas import RouterOutput

# Load env variables
load_dotenv()

# ---------------------------------------------------------------------------
# PATH RESOLUTION
# ---------------------------------------------------------------------------
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.abspath(os.path.join(CURRENT_DIR, "..", "ai_tools_dataset.json"))
BM25_INDEX_PATH = os.path.abspath(os.path.join(CURRENT_DIR, "..", "bm25_index.pkl"))

# ---------------------------------------------------------------------------
# LAZY-LOADED SINGLETONS
# Defer heavy I/O and model loading until the first actual request.
# This keeps Lambda cold-start under the 10s timeout threshold.
# ---------------------------------------------------------------------------
_tools = None
_tool_lookup = None
_bm25 = None
_embed_model = None
_pinecone_index = None


def _get_tools():
    global _tools
    if _tools is None:
        with open(DATASET_PATH, "r", encoding="utf-8") as f:
            _tools = json.load(f)
    return _tools


def _get_tool_lookup():
    global _tool_lookup
    if _tool_lookup is None:
        _tool_lookup = {
            tool["tool_name"].lower().replace(" ", "-"): tool
            for tool in _get_tools()
        }
    return _tool_lookup


def _get_bm25():
    global _bm25
    if _bm25 is None:
        with open(BM25_INDEX_PATH, "rb") as f:
            _bm25 = pickle.load(f)
    return _bm25


def _get_embed_model():
    global _embed_model
    if _embed_model is None:
        _embed_model = TextEmbedding("BAAI/bge-small-en-v1.5")
    return _embed_model


def _get_pinecone_index():
    global _pinecone_index
    if _pinecone_index is None:
        _pinecone_index = get_pinecone_index()  # reads INDEX_NAME from env
    return _pinecone_index


# Public alias used by routes/search.py
@property
def tools(_):
    return _get_tools()


# ---------------------------------------------------------------------------
# FILTER CONFIGURATIONS & MAPPINGS  (derived lazily from dataset)
# ---------------------------------------------------------------------------
ARRAY_FIELDS  = {"features", "tags", "use_cases"}
SCALAR_FIELDS = {"tool_name", "category", "pricing"}
VALID_PRICING = {"free", "freemium", "paid", "open-source"}


def _get_valid_categories():
    return {tool.get("category", "").lower() for tool in _get_tools()} - {""}


def _get_category_map():
    return {c.lower(): c for c in {tool.get("category", "") for tool in _get_tools()} if c}


def _get_use_case_map():
    return {
        u.lower(): u
        for u in {uc for tool in _get_tools() for uc in tool.get("use_cases", [])}
        if u
    }


# ---------------------------------------------------------------------------
# LLM ROUTER  (module-level — Groq client is lightweight, OK to init eagerly)
# ---------------------------------------------------------------------------
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0,
)

router_parser = JsonOutputParser(pydantic_object=RouterOutput)

router_prompt = ChatPromptTemplate.from_messages([
    ("system", ROUTER_PROMPT),
    ("human", "{query}"),
])

router_chain = router_prompt | llm | router_parser


def route_query(query: str) -> dict:
    valid_categories = _get_valid_categories()
    category_map     = _get_category_map()
    use_case_map     = _get_use_case_map()

    try:
        parsed = router_chain.invoke({
            "query": query,
            "categories": ", ".join(sorted(valid_categories)),
            "format_instructions": router_parser.get_format_instructions(),
        })
    except Exception as e:
        print(f"[Router] Chain error — falling back to hybrid.\nError: {e}")
        return {"strategy": "hybrid", "filters": {}, "semantic_query": query}

    filters  = parsed.get("filters", {})
    pricing  = (filters.get("pricing") or "").lower().strip() or None
    if pricing not in VALID_PRICING:
        pricing = None

    category = (filters.get("category") or "").lower().strip() or None
    if category and category not in valid_categories:
        category = next(
            (c for c in valid_categories if category in c or c in category), None
        )
    if category:
        category = category_map.get(category, category)

    def normalise_array(val) -> list | None:
        if not val:
            return None
        if isinstance(val, str):
            return [val.lower().strip()]
        if isinstance(val, list):
            cleaned = [v.lower().strip() for v in val if v]
            return cleaned or None
        return None

    tags      = normalise_array(filters.get("tags"))
    features  = normalise_array(filters.get("features"))
    use_cases = normalise_array(filters.get("use_cases"))
    if use_cases:
        use_cases = [use_case_map.get(uc, uc) for uc in use_cases]

    validated = {}
    if pricing:   validated["pricing"]   = pricing
    if category:  validated["category"]  = category
    if tags:      validated["tags"]      = tags
    if features:  validated["features"]  = features
    if use_cases: validated["use_cases"] = use_cases

    return {
        "strategy":       parsed.get("strategy", "hybrid"),
        "filters":        validated,
        "semantic_query": parsed.get("semantic_query") or query,
    }


# ---------------------------------------------------------------------------
# RETRIEVAL HELPERS
# ---------------------------------------------------------------------------

def build_pinecone_filter(filters: dict) -> dict | None:
    if not filters:
        return None
    pf = {}
    for key, value in filters.items():
        if key in ARRAY_FIELDS:
            pf[key] = {"$in": value if isinstance(value, list) else [value]}
        else:
            pf[key] = {"$eq": value}
    return pf or None


def passes_filters(tool: dict, filters: dict) -> bool:
    for key, value in filters.items():
        tool_val = tool.get(key)
        if key in ARRAY_FIELDS:
            if not tool_val:
                return False
            tool_list = (
                [v.lower() for v in tool_val]
                if isinstance(tool_val, list)
                else [str(tool_val).lower()]
            )
            required = value if isinstance(value, list) else [value]
            if not any(req in tool_list for req in required):
                return False
        else:
            if (tool_val or "").lower() != str(value).lower():
                return False
    return True


# ---------------------------------------------------------------------------
# SEARCH EXECUTION PATHS
# ---------------------------------------------------------------------------

def dense_search(semantic_query: str, filters: dict, top_k: int = 10) -> list[dict]:
    model           = _get_embed_model()
    index           = _get_pinecone_index()
    # Cast numpy.float32 elements to native Python float to avoid serialization issues
    embedding       = [float(x) for x in next(iter(model.embed([semantic_query])))]
    pinecone_filter = build_pinecone_filter(filters)

    kwargs = dict(vector=embedding, top_k=top_k, include_metadata=True)
    if pinecone_filter:
        kwargs["filter"] = pinecone_filter

    results = index.query(**kwargs)
    return [
        {
            "id":       match["id"],
            "rank":     rank + 1,
            "score":    float(match["score"]),
            "metadata": match["metadata"],
        }
        for rank, match in enumerate(results["matches"])
    ]


def sparse_search(query: str, filters: dict, top_k: int = 10) -> list[dict]:
    bm25       = _get_bm25()
    all_tools  = _get_tools()
    tokenized  = clean_tokens(query)
    scores     = bm25.get_scores(tokenized)
    all_ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)

    ranked = []
    for idx, score in all_ranked:
        tool = all_tools[idx]
        if not passes_filters(tool, filters):
            continue
        ranked.append({
            "id":    tool["tool_name"].lower().replace(" ", "-"),
            "rank":  len(ranked) + 1,
            "score": float(score),
            "tool":  tool,
        })
        if len(ranked) >= top_k:
            break
    return ranked


RRF_K = 60

def rrf_fusion(dense_ranked: list[dict], sparse_ranked: list[dict]) -> list[tuple]:
    rrf_scores: dict[str, float] = defaultdict(float)
    for item in dense_ranked:
        rrf_scores[item["id"]] += 1 / (RRF_K + item["rank"])
    for item in sparse_ranked:
        rrf_scores[item["id"]] += 1 / (RRF_K + item["rank"])
    return sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)


def filter_only_search(filters: dict, top_k: int = 10) -> list[tuple]:
    return [
        (tool["tool_name"].lower().replace(" ", "-"), 1.0)
        for tool in _get_tools()
        if passes_filters(tool, filters)
    ][:top_k]


# ---------------------------------------------------------------------------
# UNIFIED RETRIEVER INTERFACE
# ---------------------------------------------------------------------------

def retrieve_tools(query: str, top_k: int = 10) -> dict:
    """
    Executes routing logic and retrieves matching tools via Dense, BM25, or Hybrid path.
    """
    route          = route_query(query)
    strategy       = route["strategy"]
    filters        = route["filters"]
    semantic_query = route["semantic_query"]

    if not semantic_query.strip() and filters:
        final_results = filter_only_search(filters, top_k=top_k)
    elif strategy == "dense":
        dense_ranked  = dense_search(semantic_query, filters, top_k=top_k)
        final_results = [(item["id"], item["score"]) for item in dense_ranked]
    elif strategy == "bm25":
        sparse_ranked = sparse_search(semantic_query, filters, top_k=top_k)
        final_results = [(item["id"], item["score"]) for item in sparse_ranked]
    else:  # hybrid
        dense_ranked  = dense_search(semantic_query, filters, top_k=top_k * 2)
        sparse_ranked = sparse_search(semantic_query, filters, top_k=top_k * 2)
        final_results = rrf_fusion(dense_ranked, sparse_ranked)[:top_k]

    tool_lookup = _get_tool_lookup()
    retrieved_tools = []
    for doc_id, score in final_results:
        tool = tool_lookup.get(doc_id)
        if tool:
            tool_copy = dict(tool)
            tool_copy["score"] = score
            retrieved_tools.append(tool_copy)

    return {
        "strategy":       strategy,
        "filters":        filters,
        "semantic_query": semantic_query,
        "results":        retrieved_tools,
    }
