#!/usr/bin/env python3
"""Repair Persian text inside the currently published catalogue bundle."""
from __future__ import annotations

import base64
import gzip
import json
import tempfile
from pathlib import Path

from build_catalog import DATA_DIR, build


def main() -> None:
    manifest = json.loads((DATA_DIR / "catalog-manifest.json").read_text(encoding="utf-8"))
    packed = "".join(
        (DATA_DIR / f"catalog-{index:02d}.txt").read_text(encoding="ascii")
        for index in range(manifest["parts"])
    )
    records = json.loads(gzip.decompress(base64.b64decode(packed)))
    with tempfile.TemporaryDirectory() as directory:
        source = Path(directory) / "catalog.json"
        source.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
        build(source)


if __name__ == "__main__":
    main()
