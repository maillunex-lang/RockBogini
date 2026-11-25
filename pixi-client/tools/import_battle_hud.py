#!/usr/bin/env python3
"""Import original battle HUD atlases (copy only; never mutate hardlinked natives)."""
from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "pixi-client/public/battle-hud"
BATTLE_UI = ROOT / "runtime/client/G123Live/Queen-Blade/assets/BattleUI"
MULTILANG = ROOT / "runtime/client/G123Live/Queen-Blade/assets/Multilang"
CATALOG = ROOT / "next-audit/hero-catalog.json"

BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
ASCII64 = [0] * 128
for i, c in enumerate(BASE64):
    ASCII64[ord(c)] = i
HEX = "0123456789abcdef"


def decode_uuid(uuid: str) -> str:
    if len(uuid) != 22:
        return uuid
    tpl = [""] * 36
    for d in (8, 13, 18, 23):
        tpl[d] = "-"
    indices = [i for i in range(36) if i not in (8, 13, 18, 23)]
    tpl[indices[0]] = uuid[0]
    tpl[indices[1]] = uuid[1]
    i = 2
    for j in range(2, 22, 2):
        lhs = ASCII64[ord(uuid[j])]
        rhs = ASCII64[ord(uuid[j + 1])]
        tpl[indices[i]] = HEX[lhs >> 2]
        i += 1
        tpl[indices[i]] = HEX[((lhs & 3) << 2) | (rhs >> 4)]
        i += 1
        tpl[indices[i]] = HEX[rhs & 0xF]
        i += 1
    return "".join(tpl)


def walk_frames(node, out: dict) -> None:
    if isinstance(node, dict):
        if "name" in node and "rect" in node:
            out[str(node["name"])] = {
                "rect": node["rect"],
                "offset": node.get("offset", [0, 0]),
                "originalSize": node.get("originalSize", node["rect"][2:]),
                "rotated": bool(node.get("rotated")),
            }
        for v in node.values():
            walk_frames(v, out)
    elif isinstance(node, list):
        for v in node:
            walk_frames(v, out)


def copy_atlas(import_json: Path, native_root: Path, name: str) -> dict:
    data = json.loads(import_json.read_text())
    frames: dict = {}
    walk_frames(data, frames)
    tex_uuid = decode_uuid(data[1][0])
    src = next((native_root / "native" / tex_uuid[:2]).glob(f"{tex_uuid}*.webp"))
    sha = hashlib.sha256(src.read_bytes()).hexdigest()
    dest = OUT / f"{name}.webp"
    shutil.copyfile(src, dest)  # copy: source may be hardlinked
    assert hashlib.sha256(dest.read_bytes()).hexdigest() == sha
    meta = {
        "name": name,
        "source": str(src.relative_to(ROOT)),
        "sha256": sha,
        "width": Image.open(dest).width,
        "height": Image.open(dest).height,
        "frames": frames,
    }
    (OUT / f"{name}.json").write_text(json.dumps(meta, ensure_ascii=False, separators=(",", ":")))
    return {"name": name, "frames": len(frames), "sha256": sha, "file": dest.name}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    report = {"atlases": [], "heroes": 0, "buffs": 0}

    report["atlases"].append(
        copy_atlas(
            BATTLE_UI / "import/03/034487edf.f3e29.json",
            BATTLE_UI,
            "buff-list",
        )
    )
    report["atlases"].append(
        copy_atlas(
            BATTLE_UI / "import/03/033c0e72b.d0995.json",
            BATTLE_UI,
            "player-numbers",
        )
    )
    report["atlases"].append(
        copy_atlas(
            MULTILANG / "import/03/03c772af7.4721d.json",
            MULTILANG,
            "float-labels",
        )
    )

    catalog = json.loads(CATALOG.read_text())
    offsets = {str(h["Id"]): int(h["HUDOffsetY"]) for h in catalog["HeroBase"]}
    (OUT / "hero-hud-offsets.json").write_text(json.dumps(offsets, separators=(",", ":")))
    report["heroes"] = len(offsets)
    report["offsetValues"] = sorted({v for v in offsets.values()})

    desc = {b["Id"]: b for b in catalog["BuffDescription"]}
    buffs = {}
    for b in catalog["BuffBase"]:
        d = desc.get(b["DescriptionId"])
        if not d:
            continue
        buffs[str(b["Id"])] = {
            "descriptionId": d["Id"],
            "noIcon": bool(d["NoIcon"]),
            "buffIcon": int(d.get("BuffIcon") or 0),
            "floatTextColor": int(d.get("FloatTextColor") or 0),
        }
    (OUT / "buff-icon-map.json").write_text(json.dumps(buffs, separators=(",", ":")))
    report["buffs"] = len(buffs)
    report["gapBetweenAvatarAndHUD"] = 15
    report["energy"] = {
        "battleHeroEnergy": False,
        "petEnergy": "PetEnergy/PetEnergyMax only when PetId>0 (AJBattlePlayer.js)",
        "genreEnergy": "meta stamina, not battle HUD (NEXT-003 GenreEnergy gap)",
        "nextServerCampaignPets": False,
    }
    (OUT / "import-report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
