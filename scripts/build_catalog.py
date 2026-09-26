#!/usr/bin/env python3
"""Package the complete extracted catalogue for static hosting.

Usage: python3 scripts/build_catalog.py /path/to/magazines.json
The source JSON is the unabridged extraction, including the source note.
"""
from __future__ import annotations

import argparse
import base64
import gzip
import hashlib
import json
from pathlib import Path

CHUNK_SIZE = 12000
ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"


def build(source: Path) -> None:
    records = json.loads(source.read_text(encoding="utf-8"))
    if not isinstance(records, list) or not records:
        raise ValueError("Expected a nonempty array of source records")
    # The extracted PDF has a recurring reversed-letter typo in Persian text.
    records = [
        {key: value.replace("اعالم", "اعلام") if isinstance(value, str) else value
         for key, value in record.items()}
        for record in records
    ]
    ids = [record["record_id"] for record in records]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate record IDs")
    payload = json.dumps(records, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    encoded = base64.b64encode(gzip.compress(payload, compresslevel=9, mtime=0)).decode("ascii")
    chunks = [encoded[i:i + CHUNK_SIZE] for i in range(0, len(encoded), CHUNK_SIZE)]
    DATA_DIR.mkdir(exist_ok=True)
    for old in DATA_DIR.glob("catalog-??.txt"):
        old.unlink()
    for i, chunk in enumerate(chunks):
        (DATA_DIR / f"catalog-{i:02d}.txt").write_text(chunk, encoding="ascii")
    manifest = {
        "format": "gzip-base64", "prefix": "catalog", "parts": len(chunks),
        "records": len(records),
        "journals": sum(r.get("record_type") == "journal" for r in records),
        "sha256": hashlib.sha256(payload).hexdigest(),
    }
    (DATA_DIR / "catalog-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Packaged {manifest['journals']} journals and {len(records) - manifest['journals']} source notes in {len(chunks)} parts")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    build(parser.parse_args().source)
