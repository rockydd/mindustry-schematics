#!/usr/bin/env python3
"""Sparse-clone Mindustry and vendor block sprites + catalog JSON."""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TMP = Path("/tmp/mindustry-src")
REPO = TMP / "Mindustry"


def ensure_clone() -> None:
    TMP.mkdir(parents=True, exist_ok=True)
    if not (REPO / ".git").exists():
        subprocess.check_call(
            [
                "git",
                "clone",
                "--depth",
                "1",
                "--filter=blob:none",
                "--sparse",
                "https://github.com/Anuken/Mindustry.git",
            ],
            cwd=TMP,
        )
    subprocess.check_call(
        [
            "git",
            "-C",
            str(REPO),
            "sparse-checkout",
            "set",
            "core/assets-raw/sprites/blocks",
            "core/src/mindustry/content",
            "core/assets/sprites",
        ]
    )


def copy_sprites() -> dict[str, str]:
    sprites_root = REPO / "core/assets-raw/sprites/blocks"
    out = ROOT / "public/sprites/blocks"
    skip = {"environment", "props", "fire", "extra"}
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    index: dict[str, str] = {}
    for dirpath, dirnames, filenames in os.walk(sprites_root):
        rel = Path(dirpath).relative_to(sprites_root)
        top = rel.parts[0] if rel.parts else ""
        if top in skip:
            dirnames[:] = []
            continue
        for fn in filenames:
            if not fn.endswith(".png"):
                continue
            dest_dir = out / rel
            dest_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(Path(dirpath) / fn, dest_dir / fn)
            key = fn[:-4]
            if key not in index:
                index[key] = str(Path("blocks") / rel / fn).replace("\\", "/")
    bg = REPO / "core/assets/sprites/schematic-background.png"
    if bg.exists():
        shutil.copy2(bg, ROOT / "public/sprites/schematic-background.png")
    (ROOT / "src/lib/sprites").mkdir(parents=True, exist_ok=True)
    (ROOT / "src/lib/sprites/index.json").write_text(json.dumps(index, indent=2, sort_keys=True))
    return index


def parse_blocks() -> None:
    text = (REPO / "core/src/mindustry/content/Blocks.java").read_text()
    items_java = (REPO / "core/src/mindustry/content/Items.java").read_text()
    item_map = dict(re.findall(r'(\w+)\s*=\s*new Item\("([a-z0-9\-]+)"', items_java))
    assign_re = re.compile(r'(\w+)\s*=\s*new\s+(\w+)\("([a-z0-9\-]+)"\)\s*(\{\{)?')
    rotatable_suffixes = (
        "Turret",
        "Conveyor",
        "Conduit",
        "Duct",
        "Bridge",
        "Sorter",
        "Gate",
        "Junction",
        "Unloader",
        "Router",
    )
    blocks = {}
    pos = 0
    while True:
        m = assign_re.search(text, pos)
        if not m:
            break
        _ident, cls, name, has_body = m.group(1), m.group(2), m.group(3), m.group(4)
        body = ""
        if has_body:
            brace_start = text.find("{{", m.end() - 2)
            depth = 0
            j = brace_start
            while j < len(text):
                if text[j] == "{":
                    depth += 1
                elif text[j] == "}":
                    depth -= 1
                    if depth == 0:
                        body = text[brace_start : j + 1]
                        pos = j + 1
                        break
                j += 1
            else:
                pos = m.end()
        else:
            pos = m.end()
        size_m = re.search(r"\bsize\s*=\s*(\d+)", body)
        size = int(size_m.group(1)) if size_m else 1
        rotate = any(cls.endswith(s) or cls == s for s in rotatable_suffixes)
        if re.search(r"\brotate\s*=\s*true\b", body):
            rotate = True
        if re.search(r"\brotate\s*=\s*false\b", body):
            rotate = False
        cost = {}
        req = re.search(r"requirements\([^;]*?with\(([^)]*)\)", body, re.S)
        if req:
            for item, amt in re.findall(r"Items\.(\w+)\s*,\s*([\d.]+)f?", req.group(1)):
                cost[item_map.get(item, item)] = int(float(amt))
        pm = re.search(r"consumePower\(\s*([\d.]+)f?\s*\)", body)
        prod = re.search(r"powerProduction\s*=\s*([\d.]+)f?", body)
        blocks[name] = {
            "name": name,
            "className": cls,
            "size": size,
            "rotate": rotate,
            "buildCost": cost,
            "powerUse": float(pm.group(1)) if pm else 0.0,
            "powerProd": float(prod.group(1)) if prod else 0.0,
        }
    out = ROOT / "src/lib/blocks/catalog.json"
    out.write_text(
        json.dumps(
            {
                "source": "Anuken/Mindustry core/src/mindustry/content/Blocks.java",
                "blocks": blocks,
                "items": item_map,
            },
            indent=2,
        )
    )


def main() -> None:
    ensure_clone()
    copy_sprites()
    parse_blocks()
    print("Updated public/sprites, src/lib/sprites/index.json, src/lib/blocks/catalog.json")


if __name__ == "__main__":
    main()
