"""
pipeline/merge.py
=================
Merge one or more new tool JSON files into the master dataset,
deduplicating by tool_name (case-insensitive).

Usage:
    python -m pipeline.merge --new new_tools.json
    python -m pipeline.merge --new batch1.json batch2.json
    python -m pipeline.merge --new new_tools.json --dry-run

After merging, run:
    python -m pipeline.ingest --mode incremental
    python -m pipeline.ingest --mode rebuild-bm25
"""

import os
import sys
import json
import argparse
import logging
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

MASTER_PATH = PROJECT_ROOT / "app" / "ai_tools_dataset.json"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("merge")


def load_json(path: Path) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(data: list[dict], path: Path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def merge(master: list[dict], new_tools: list[dict]) -> tuple[list[dict], int]:
    """
    Merge new_tools into master, deduplicating on tool_name.
    Returns (merged_list, count_added).
    """
    existing_names = {t["tool_name"].lower() for t in master}
    added = 0
    for tool in new_tools:
        key = tool.get("tool_name", "").lower()
        if not key:
            log.warning(f"  Skipping tool with no tool_name: {tool}")
            continue
        if key in existing_names:
            log.debug(f"  Duplicate skipped: {tool['tool_name']}")
        else:
            master.append(tool)
            existing_names.add(key)
            added += 1
    return master, added


def parse_args():
    p = argparse.ArgumentParser(description="Merge new tools into master dataset")
    p.add_argument(
        "--new",
        nargs="+",
        required=True,
        help="Path(s) to new tool JSON file(s) to merge",
    )
    p.add_argument(
        "--master",
        default=str(MASTER_PATH),
        help=f"Master dataset path (default: {MASTER_PATH})",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview merge without saving",
    )
    return p.parse_args()


def main():
    args = parse_args()
    master_path = Path(args.master)

    log.info(f"Loading master dataset: {master_path}")
    master = load_json(master_path)
    log.info(f"  → {len(master)} existing tools")

    total_added = 0
    for new_path_str in args.new:
        new_path = Path(new_path_str)
        if not new_path.is_absolute():
            new_path = PROJECT_ROOT / new_path
        log.info(f"Loading new file: {new_path}")
        new_tools = load_json(new_path)
        log.info(f"  → {len(new_tools)} tools in file")
        master, added = merge(master, new_tools)
        total_added += added
        log.info(f"  → {added} new tools added from {new_path.name}")

    log.info(f"\nTotal after merge: {len(master)} tools (+{total_added} new)")

    if args.dry_run:
        log.info("DRY RUN — nothing saved.")
    else:
        save_json(master, master_path)
        log.info(f"✅ Master dataset saved: {master_path}")
        log.info("\nNext steps:")
        log.info("  python -m pipeline.ingest --mode incremental")
        log.info("  python -m pipeline.ingest --mode rebuild-bm25")


if __name__ == "__main__":
    main()
