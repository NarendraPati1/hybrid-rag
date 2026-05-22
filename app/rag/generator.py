import os
import json
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

from app.rag.prompts import GENERATION_PROMPT
from app.rag.schemas import SearchResponse

load_dotenv()

# ---------------------------------------------------------------------------
# PATHS
# ---------------------------------------------------------------------------
CURRENT_DIR  = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(CURRENT_DIR, "..", "ai_tools_dataset.json")

# ---------------------------------------------------------------------------
# LAZY-LOADED METADATA LOOKUP
# Avoids reading the JSON file at import time (saves Lambda cold-start I/O).
# ---------------------------------------------------------------------------
_tool_metadata_map = None


def _get_tool_metadata_map():
    global _tool_metadata_map
    if _tool_metadata_map is None:
        with open(DATASET_PATH, "r", encoding="utf-8") as f:
            _tools = json.load(f)
        _tool_metadata_map = {
            t["tool_name"].lower(): {
                "category": t.get("category"),
                "pricing":  t.get("pricing"),
                "logo_url": t.get("logo_url"),
                "website":  t.get("website"),
            }
            for t in _tools
        }
    return _tool_metadata_map


# ---------------------------------------------------------------------------
# LLM CHAIN  (Groq client is lightweight — init eagerly is fine)
# ---------------------------------------------------------------------------
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.1,
)

generation_parser = JsonOutputParser(pydantic_object=SearchResponse)

generation_prompt = ChatPromptTemplate.from_messages([
    ("system", GENERATION_PROMPT),
    ("human", "User Query: {query}\n\nRetrieved Context:\n{context}"),
])

generation_chain = generation_prompt | llm | generation_parser


# ---------------------------------------------------------------------------
# PUBLIC API
# ---------------------------------------------------------------------------

def generate_response(query: str, retrieval_data: dict) -> dict:
    """
    Takes the query + retrieval results, constructs context, runs the LLM
    generation chain, and returns a SearchResponse-compatible dict.
    """
    retrieved_tools  = retrieval_data.get("results", [])
    tool_metadata    = _get_tool_metadata_map()

    context_parts = []
    for idx, tool in enumerate(retrieved_tools):
        info = (
            f"[{idx + 1}] Tool Name: {tool['tool_name']}\n"
            f"Category: {tool.get('category', '-')}\n"
            f"Pricing: {tool.get('pricing', '-')}\n"
            f"Website: {tool.get('website', '-')}\n"
            f"Logo URL: {tool.get('logo_url', '-')}\n"
            f"Description: {tool.get('description', '')}\n"
            f"Features: {', '.join(tool.get('features', []))}\n"
            f"Use Cases: {', '.join(tool.get('use_cases', []))}\n"
        )
        context_parts.append(info)

    context_str = "\n---\n".join(context_parts) if context_parts else "No tools found matching the filters/semantics."

    try:
        response_json = generation_chain.invoke({
            "query":               query,
            "context":             context_str,
            "format_instructions": generation_parser.get_format_instructions(),
        })

        # Enrich LLM recommendations with metadata from local lookup
        for tool_rec in response_json.get("tools", []):
            name_lower = tool_rec.get("tool_name", "").lower()
            meta = tool_metadata.get(name_lower)
            if meta:
                tool_rec["category"] = meta.get("category")
                tool_rec["pricing"]  = meta.get("pricing")
                if not tool_rec.get("logo_url") or tool_rec.get("logo_url") == "-":
                    tool_rec["logo_url"] = meta.get("logo_url")
                if not tool_rec.get("website") or tool_rec.get("website") == "-":
                    tool_rec["website"] = meta.get("website")

        response_json["query"]    = query
        response_json["strategy"] = retrieval_data.get("strategy", "unknown")
        response_json["filters"]  = retrieval_data.get("filters", {})

        return response_json

    except Exception as e:
        print(f"[Generator] LLM invocation failed: {e}. Executing fallback.")

        fallback_tools = [
            {
                "tool_name":  tool["tool_name"],
                "reasoning":  f"Matched tool in {tool.get('category')} category. {tool.get('description')}",
                "confidence": 0.8 if tool.get("score", 1.0) > 0.0 else 0.5,
                "citations":  [f"Category match: {tool.get('category')}"],
                "logo_url":   tool.get("logo_url"),
                "website":    tool.get("website"),
                "category":   tool.get("category"),
                "pricing":    tool.get("pricing"),
            }
            for tool in retrieved_tools
        ]

        return {
            "query":    query,
            "strategy": retrieval_data.get("strategy", "unknown"),
            "filters":  retrieval_data.get("filters", {}),
            "tools":    fallback_tools,
        }
