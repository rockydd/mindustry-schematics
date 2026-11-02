# Mindustry Schematics

Browse community schematics from [r/Mindustry](https://www.reddit.com/r/Mindustry/), or paste / upload a `.msch` to preview it with the real game sprites.

Live site: https://rockydd.github.io/mindustry-schematics/

The Create / generate page is hidden in v1 (code is still in `src/components/GeneratePanel.tsx`).

## Quick start

```bash
npm install
npm run dev
```

- **Browse** — gallery from `public/data/schematics.json`
- **View** — paste a `bXNjaA…` string or upload a `.msch` file

## Tests

```bash
npm test
```

## Reddit ingest

```bash
npm run ingest
# or, if Reddit is blocked from your network:
npm run ingest -- --seed scripts/seed/reddit-raw.json
```

Anonymous `www.reddit.com` JSON often returns HTTP 403. The script then tries Atom search feeds (`search.rss?q=bXNjaA`), which work from some networks. If those fail too, it uses official app-only OAuth when these env vars are set:

- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET`

Create a Reddit app at https://www.reddit.com/prefs/apps (type **script**), then add those as GitHub repo secrets. The `Ingest Reddit schematics` workflow runs daily and on `workflow_dispatch`. It exits 0 if Reddit is blocked and the secrets are missing.

Every candidate is decoded with our `.msch` decoder. Failures are dropped. Duplicates are keyed by content hash. Author + permalink are always stored.

Auto tags (planet, products, size) come from the decoded blocks in `src/lib/schematic/tags.ts`, not from the Reddit title.

## Architecture

- `src/lib/schematic/` — `.msch` encoder/decoder and auto-tags
- `src/lib/gallery/` — catalog types + ingest helpers
- `src/lib/blocks/catalog.json` — names, sizes, costs from Anuke/Mindustry
- `src/lib/layout/` — hidden Erekir silicon generator
- `src/components/SchematicCanvas.tsx` — sprite renderer
- `public/data/schematics.json` — static gallery catalog
- `scripts/ingest-reddit.ts` — Reddit / seed import

## License

**GNU GPL v3.0** (`LICENSE`).

Mindustry (game, sprites, block data) is © Anuke and GPL-3.0. This repo vendors a subset of block sprites. See `ATTRIBUTION.md` and `public/sprites/NOTICE`.

Community schematics remain the work of their Reddit authors.

## Deploy

Pushes to `main` deploy via GitHub Actions to GitHub Pages. Vite `base` is `/mindustry-schematics/`.
