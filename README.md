# Mindustry Schematic Builder

Web app that generates Mindustry schematics from a plain-language prompt and previews **any** community schematic (paste base64 or upload `.msch`) using the real game sprites.

Live site: https://rockydd.github.io/mindustry-schematics/

## Quick start

```bash
npm install
npm run dev
```

Try:

- Generate: `compact three silicon factories for Erekir`
- View: paste a schematic string that starts with `bXNjaA`, or upload a `.msch` file

## Tests

```bash
npm test
```

Covers the `.msch` encoder/decoder (including public community schematics), round-trip with our encoder, and the Erekir silicon layout engine.

## Architecture

- `src/lib/schematic/` — `.msch` encoder/decoder (`msch` header, version 1, zlib body, tags, dictionary, TypeIO configs, tiles)
- `src/lib/blocks/catalog.json` — names, sizes, build costs, power, parsed from Anuke/Mindustry `Blocks.java`
- `src/lib/layout/` — deterministic Erekir silicon layout (no LLM coordinates)
- `src/lib/sprites/` — sprite filename index; PNGs live in `public/sprites/`
- `src/components/SchematicCanvas.tsx` — canvas renderer (multi-tile size/offset, rotation, bottom/top/team layers)
- `src/AppMindustry.tsx` — generate + view UI, mobile stacked layout

## License

**GNU GPL v3.0** (`LICENSE`).

Mindustry (game, sprites, block data) is © Anuke and GPL-3.0. This repo vendors a subset of block sprites and parsed block metadata so previews look like the in-game schematic view. See `ATTRIBUTION.md` and `public/sprites/NOTICE`.

Refreshing vendored assets:

```bash
python3 scripts/fetch-mindustry-assets.py
```

## Deploy

Pushes to `main` deploy via GitHub Actions to GitHub Pages. Vite `base` is `/mindustry-schematics/`.
