# Attribution

This project vendors artwork and game data from [Mindustry](https://github.com/Anuken/Mindustry) by Anuke.

- License: GNU GPL v3.0 (`LICENSE`)
- Sprites: `public/sprites/` copied from `core/assets-raw/sprites/blocks` and `core/assets/sprites/schematic-background.png`
- Block names, sizes, build costs, and power values: parsed from `core/src/mindustry/content/Blocks.java` and `Items.java` into `src/lib/blocks/catalog.json`

To refresh assets:

```bash
python3 scripts/fetch-mindustry-assets.py
```
