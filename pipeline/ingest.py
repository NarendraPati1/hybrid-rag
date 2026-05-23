"""
pipeline/ingest.py
==================
Production Data Ingestion Pipeline for doomStack AI Tools Directory.

Supports three modes:
  --mode full        → Wipe Pinecone namespace + reindex everything from scratch
  --mode incremental → Only upsert tools NOT already in Pinecone (safe for new data)
  --mode rebuild-bm25 → Rebuild only the BM25 index from the current dataset (no Pinecone touch)

Usage:
  python -m pipeline.ingest --source app/ai_tools_dataset.json --mode full
  python -m pipeline.ingest --source new_tools.json --mode incremental
  python -m pipeline.ingest --mode rebuild-bm25

Environment variables required (from .env):
  PINECONE_API_KEY
  PINECONE_INDEX  (optional, defaults to "rag-demo")
"""

import os
import sys
import json
import pickle
import argparse
import logging
from pathlib import Path
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi

# ── project root on sys.path so app.* imports work ────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from app.db.pinecone_client import get_pinecone_index
from app.utils.helpers import clean_tokens

load_dotenv(PROJECT_ROOT / ".env")

# ── constants ──────────────────────────────────────────────────────────────────
DEFAULT_INDEX_NAME  = os.getenv("PINECONE_INDEX", "rag-demo")
EMBED_MODEL_ID      = "BAAI/bge-small-en-v1.5"
EMBED_BATCH_SIZE    = 32          # how many texts to embed at once
UPSERT_BATCH_SIZE   = 50          # Pinecone upsert batch size (max 100)
BM25_INDEX_PATH     = PROJECT_ROOT / "app" / "bm25_index.pkl"

# ── logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("ingest")


# ══════════════════════════════════════════════════════════════════════════════
# TEXT BUILDERS
# ══════════════════════════════════════════════════════════════════════════════

def build_embed_text(tool: dict) -> str:
    """Build the rich sentence used for dense embedding."""
    parts = []
    if tool.get("tool_name"):
        parts.append(f"{tool['tool_name']} is an AI tool.")
    if tool.get("category"):
        parts.append(f"Category: {tool['category']}.")
    if tool.get("description"):
        parts.append(tool["description"])
    if tool.get("features"):
        parts.append("Key features include " + ", ".join(tool["features"]) + ".")
    if tool.get("use_cases"):
        parts.append("Common use cases are " + ", ".join(tool["use_cases"]) + ".")
    if tool.get("problems_solved"):
        parts.append("It helps solve " + ", ".join(tool["problems_solved"]) + ".")
    if tool.get("similar_to"):
        parts.append("Similar tools include " + ", ".join(tool["similar_to"]) + ".")
    if tool.get("keywords"):
        parts.append("Relevant keywords: " + ", ".join(tool["keywords"]) + ".")
    if tool.get("pricing"):
        parts.append(f"Pricing model: {tool['pricing']}.")
    return " ".join(parts)


def build_bm25_tokens(tool: dict) -> list[str]:
    """Build tokenised document for BM25 sparse index."""
    parts = [
        tool.get("tool_name", ""),
        tool.get("category", ""),
        " ".join(tool.get("tags", [])),
        " ".join(tool.get("features", [])),
        " ".join(tool.get("use_cases", [])),
        " ".join(tool.get("problems_solved", [])),
        " ".join(tool.get("similar_to", [])),
    ]
    return clean_tokens(" ".join(parts))


def make_vector_id(tool: dict) -> str:
    return tool["tool_name"].lower().replace(" ", "-")


def make_metadata(tool: dict) -> dict:
    return {
        "tool_name":   tool.get("tool_name", ""),
        "category":    tool.get("category", ""),
        "description": tool.get("description", ""),
        "pricing":     tool.get("pricing", ""),
        "website":     tool.get("website", ""),
        "github":      tool.get("github", ""),
        "tags":        tool.get("tags", []),
        "use_cases":   tool.get("use_cases", []),
        "logo_url":    tool.get("logo_url", ""),
    }


# ══════════════════════════════════════════════════════════════════════════════
# PINECONE HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def get_existing_ids(index) -> set[str]:
    """Return the set of vector IDs already in the Pinecone index."""
    stats = index.describe_index_stats()
    total = stats.get("total_vector_count", 0)
    if total == 0:
        return set()

    log.info(f"Fetching existing IDs from Pinecone ({total} vectors) …")
    # list() returns a paginator; collect all IDs
    existing = set()
    for page in index.list():
        existing.update(page)
    log.info(f"  → {len(existing)} IDs fetched")
    return existing


def upsert_vectors(index, vectors: list[dict]):
    """Batch-upsert vectors into Pinecone."""
    total = len(vectors)
    for i in range(0, total, UPSERT_BATCH_SIZE):
        batch = vectors[i : i + UPSERT_BATCH_SIZE]
        index.upsert(vectors=batch)
        log.info(f"  Upserted batch {i // UPSERT_BATCH_SIZE + 1} / {-(-total // UPSERT_BATCH_SIZE)}")


# ══════════════════════════════════════════════════════════════════════════════
# PIPELINE STAGES
# ══════════════════════════════════════════════════════════════════════════════

def load_tools(source_path: str) -> list[dict]:
    path = Path(source_path)
    if not path.is_absolute():
        path = PROJECT_ROOT / path
    log.info(f"Loading tools from: {path}")
    with open(path, "r", encoding="utf-8") as f:
        tools = json.load(f)
    log.info(f"  → {len(tools)} tools loaded")
    return tools


def embed_tools(tools: list[dict], model: SentenceTransformer) -> list[dict]:
    """
    Attach embeddings to each tool dict.
    Returns a list of ready-to-upsert Pinecone vector dicts.
    """
    log.info("Generating embeddings …")
    vectors = []

    for i in range(0, len(tools), EMBED_BATCH_SIZE):
        batch = tools[i : i + EMBED_BATCH_SIZE]
        texts = [build_embed_text(t) for t in batch]
        embeddings = model.encode(texts, show_progress_bar=False)

        for tool, emb in zip(batch, embeddings):
            vectors.append({
                "id":       make_vector_id(tool),
                "values":   emb.tolist(),
                "metadata": make_metadata(tool),
            })

        pct = min(i + EMBED_BATCH_SIZE, len(tools))
        log.info(f"  Embedded {pct}/{len(tools)} tools")

    return vectors


def rebuild_bm25(tools: list[dict]):
    """Rebuild BM25 pickle from the given tool list."""
    log.info("Rebuilding BM25 index …")
    corpus = [build_bm25_tokens(t) for t in tools]
    bm25 = BM25Okapi(corpus)
    with open(BM25_INDEX_PATH, "wb") as f:
        pickle.dump(bm25, f)
    log.info(f"  BM25 saved → {BM25_INDEX_PATH}  ({len(corpus)} docs)")


# ══════════════════════════════════════════════════════════════════════════════
# MODES
# ══════════════════════════════════════════════════════════════════════════════

def run_full(tools: list[dict], index, model: SentenceTransformer):
    """Wipe namespace and reindex everything."""
    log.info("MODE: FULL  —  deleting all existing vectors …")
    index.delete(delete_all=True)

    vectors = embed_tools(tools, model)
    log.info(f"Upserting {len(vectors)} vectors …")
    upsert_vectors(index, vectors)
    rebuild_bm25(tools)
    log.info(f"✅ Full index complete — {len(vectors)} vectors")


def run_incremental(tools: list[dict], index, model: SentenceTransformer):
    """Only add tools whose IDs don't exist in Pinecone yet."""
    log.info("MODE: INCREMENTAL  —  checking existing IDs …")
    existing_ids = get_existing_ids(index)

    new_tools = [t for t in tools if make_vector_id(t) not in existing_ids]
    log.info(f"  {len(tools) - len(new_tools)} already indexed, {len(new_tools)} new")

    if not new_tools:
        log.info("Nothing new to index.")
        return

    vectors = embed_tools(new_tools, model)
    log.info(f"Upserting {len(vectors)} new vectors …")
    upsert_vectors(index, vectors)

    # Rebuild BM25 with the FULL merged dataset
    # (existing tools are not in this file, so only do this if source is the master dataset)
    log.warning("Tip: run --mode rebuild-bm25 --source app/ai_tools_dataset.json "
                "after merging new tools into the master JSON.")
    log.info(f"✅ Incremental update complete — {len(vectors)} vectors added")


def run_rebuild_bm25_only(tools: list[dict]):
    log.info("MODE: REBUILD-BM25 only")
    rebuild_bm25(tools)
    log.info("✅ BM25 rebuilt — Pinecone untouched")


# ══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def parse_args():
    p = argparse.ArgumentParser(description="doomStack Ingestion Pipeline")
    p.add_argument(
        "--source",
        default="app/ai_tools_dataset.json",
        help="Path to JSON dataset (relative to project root or absolute)",
    )
    p.add_argument(
        "--mode",
        choices=["full", "incremental", "rebuild-bm25"],
        default="incremental",
        help=(
            "full         → delete all + reindex everything\n"
            "incremental  → only add new tools (default)\n"
            "rebuild-bm25 → rebuild BM25 pickle only, no Pinecone changes"
        ),
    )
    p.add_argument(
        "--index",
        default=DEFAULT_INDEX_NAME,
        help=f"Pinecone index name (default: {DEFAULT_INDEX_NAME})",
    )
    return p.parse_args()


def main():
    args = parse_args()
    tools = load_tools(args.source)

    if args.mode == "rebuild-bm25":
        run_rebuild_bm25_only(tools)
        return

    log.info(f"Loading embedding model: {EMBED_MODEL_ID} …")
    model = SentenceTransformer(EMBED_MODEL_ID)
    log.info("  Model ready")

    index = get_pinecone_index(args.index)

    if args.mode == "full":
        run_full(tools, index, model)
    elif args.mode == "incremental":
        run_incremental(tools, index, model)


if __name__ == "__main__":
    main()
