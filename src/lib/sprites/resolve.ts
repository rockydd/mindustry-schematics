import spriteIndexJson from './index.json' with { type: 'json' };

const spriteIndex = spriteIndexJson as Record<string, string>;

export interface SpriteLayers {
  bottom?: string;
  main?: string;
  top?: string;
  /** DirectionBridge-style overlay (e.g. duct-bridge-dir). Always rotated. */
  dir?: string;
  team?: string;
  /** Which layers to rotate with the tile facing. */
  rotate: 'all' | 'top';
}

export function spritePath(key: string): string | undefined {
  return spriteIndex[key];
}

export function publicSpriteUrl(relPath: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base}sprites/${relPath}`;
}

export function layersForBlock(block: string): SpriteLayers {
  let layers: SpriteLayers;
  // Conveyor / armored-conveyor style: name-frame-connection
  if (spriteIndex[`${block}-0-0`]) {
    layers = { main: `${block}-0-0`, rotate: 'all' };
  } else if (
    // Duct / conduit style: bottom sheet + directional top-N
    spriteIndex[`${block}-top-0`] ||
    spriteIndex[`${block}-bottom`] ||
    spriteIndex[`${block}-bottom-0`]
  ) {
    layers = {
      bottom: spriteIndex[`${block}-bottom`]
        ? `${block}-bottom`
        : spriteIndex[`${block}-bottom-0`]
          ? `${block}-bottom-0`
          : undefined,
      main: spriteIndex[block] ? block : undefined,
      top: spriteIndex[`${block}-top-0`]
        ? `${block}-top-0`
        : spriteIndex[`${block}-top`]
          ? `${block}-top`
          : undefined,
      rotate: 'top',
    };
  } else {
    layers = {
      bottom: spriteIndex[`${block}-bottom`] ? `${block}-bottom` : undefined,
      main: spriteIndex[block]
        ? block
        : spriteIndex[`${block}-icon`]
          ? `${block}-icon`
          : undefined,
      top: spriteIndex[`${block}-top`] ? `${block}-top` : undefined,
      team: spriteIndex[`${block}-team`] ? `${block}-team` : undefined,
      rotate: 'all',
    };
  }

  // DirectionBridge / DuctBridge: unrotated base + rotated dir arrow.
  if (spriteIndex[`${block}-dir`]) {
    layers.dir = `${block}-dir`;
    layers.rotate = 'top';
  }
  return layers;
}

export function hasAnySprite(block: string): boolean {
  const l = layersForBlock(block);
  return Boolean(l.main || l.bottom || l.top || l.dir);
}

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

export function loadSpriteImage(key: string): Promise<HTMLImageElement | null> {
  const path = spriteIndex[key];
  if (!path) return Promise.resolve(null);
  const url = publicSpriteUrl(path);
  const hit = imageCache.get(url);
  if (hit) return hit;
  const p = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
  imageCache.set(url, p);
  return p;
}

export function loadBackground(): Promise<HTMLImageElement | null> {
  const url = publicSpriteUrl('schematic-background.png');
  const hit = imageCache.get(url);
  if (hit) return hit;
  const p = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
  imageCache.set(url, p);
  return p;
}
