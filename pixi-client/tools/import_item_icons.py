#!/usr/bin/env python3
"""Hardlink original ItemIcon natives into public/item-icons/{itemId}.webp (no duplicate bytes)."""
from __future__ import annotations

import base64
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUNDLE = ROOT / "runtime/client/G123Live/Queen-Blade/assets/ItemIcon"
OUT = ROOT / "pixi-client/public/item-icons"


def decode_uuid(u: str) -> str:
    if len(u) != 22:
        return u if "-" in u else u
    pad = "=" * ((4 - len(u[2:]) % 4) % 4)
    h = u[:2] + base64.b64decode(u[2:] + pad).hex()
    return f"{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:]}"


def main() -> None:
    cfg = json.loads(next(BUNDLE.glob("config.*.json")).read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    # clear previous linked icons (keep dir)
    for old in OUT.glob("*.webp"):
        old.unlink()
    records = []
    linked = missing = 0
    for k, v in cfg["paths"].items():
        item_id = str(v[0])
        if not item_id.isdigit():
            continue
        uuid = decode_uuid(cfg["uuids"][int(k)])
        files = list((BUNDLE / "native" / uuid[:2]).glob(uuid + "*.webp"))
        if not files:
            missing += 1
            continue
        src = files[0]
        dest = OUT / f"{item_id}.webp"
        if dest.exists() or dest.is_symlink():
            dest.unlink()
        os.link(src, dest)
        linked += 1
        records.append({"itemId": int(item_id), "file": dest.name, "uuid": uuid})
    (OUT / "manifest.json").write_text(json.dumps({"count": linked, "missingNative": missing, "icons": records}, separators=(",", ":")))
    print(f"linked {linked} icons, missing native/pack {missing}, out {OUT}")


if __name__ == "__main__":
    main()
