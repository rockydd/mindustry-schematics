# Mindustry Schematic Builder (MVP)

Web app that turns a plain-language prompt into a working Mindustry schematic (.msch), with a visual preview, copy-to-clipboard Base64, and .msch download.

MVP scope focuses on Erekir silicon production using the Silicon Arc Furnace. More content is easy to add.

Live site:
- https://rockydd.github.io/mindustry-schematics/

## Quick start

```bash
npm install
npm run dev
```

Open the local URL. Try the example prompt:

- "compact three silicon factories for Erekir"

You’ll see a preview grid, the total build cost and power usage, and a base64 string beginning with `bXNjaA…`. Use the Copy button or download the `.msch` file.

## Tests

```bash
npm test
```

Tests cover:
- Schematic encoder/decoder round-trip
- Decoding a known real schematic string
- Deterministic layout for Erekir silicon (3x furnaces)

## Architecture

- `src/lib/schematic/` — Binary encoder/decoder matching Mindustry v7 format
  - Header `msch`, version byte `1`
  - Zlib-compressed body with big-endian shorts/ints
  - Tags map, block dictionary, then tiles (block index, packed position, TypeIO-config, rotation)
- `src/lib/blocks/` — Minimal block metadata for Erekir (silicon-arc-furnace, duct, duct-router, beam-node)
- `src/lib/layout/` — Deterministic layout engine (Erekir silicon): places real blocks on a grid, respects sizes, wires ducts and power nodes
- `src/lib/prompt/` — Rule-based parser, with hooks to add an LLM later (read API key from `OPENAI_API_KEY`; do not hard-code)
- `src/components/PreviewGrid.tsx` — SVG grid preview using recognizable colors (no game sprites; GPL sprites not redistributed)
- `src/AppMindustry.tsx` — UI: prompt, examples, preview, copy base64, download `.msch`

## Data sources and format reference

- Schematic format is implemented from `Schematics.java` and `TypeIO.java` in Anuke/Mindustry (v7/build 146+):
  - Header `msch`, version `1`
  - Body uses `DeflaterOutputStream`/`InflaterInputStream` (zlib)
  - `writeUTF` for tag keys/values and block names (ASCII in our tags and names)
  - Tiles encode null config via `TypeIO.writeObject` tag `0` (one zero byte)
- Block names/sizes/power and Erekir transport:
  - `silicon-arc-furnace` — size 3, power use ≈ 6f in build 146, consumes 1 graphite + 4 sand/output 4 silicon
  - `duct`, `duct-router`, `beam-node`

## Deterministic layout (MVP)

- Horizontal row of N Arc Furnaces (size 3) with:
  - Two top duct buses for sand and graphite, with routers feeding each furnace
  - A bottom output duct bus
  - Beam nodes above furnaces for power linking
- Width/height are computed from block sizes for a proper bounding box.

## LLM integration (optional)

Keep the rule-based parser as a fallback. If you add an LLM:
- Read API key from `OPENAI_API_KEY`
- Never hard-code a key
- Use LLM only for turning free text into a structured spec (planet/product/count/compactness)
- Placement stays deterministic and rule-driven

## Deploy

The app deploys automatically to GitHub Pages on every push to `main` via GitHub Actions. The Vite `base` is set to `/mindustry-schematics/` for correct asset paths.

## License

This repository’s code is under MIT. Mindustry is © Anuke (GPL for game assets); this app does not redistribute sprites. Preview uses solid-color rectangles and labels only.

