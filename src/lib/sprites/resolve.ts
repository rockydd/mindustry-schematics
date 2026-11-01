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

export function spriteExists(key: string): boolean {
  return Boolean(spriteIndex[key]);
}

export function publicSpriteUrl(relPath: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base}sprites/${relPath}`;
}

export function layersForBlock(block: string): SpriteLayers {
  // DirectionBridge: unrotated base + rotated dir.
  if (spriteIndex[`${block}-dir`]) {
    return {
      main: spriteIndex[block] ? block : undefined,
      dir: `${block}-dir`,
      rotate: 'top',
    };
  }
  // Conveyor autotile (straight frame 0; caller picks blendbits).
  if (spriteIndex[`${block}-0-0`]) {
    return { main: `${block}-0-0`, rotate: 'all' };
  }
  // Duct / conduit autotile: never use the square icon `-bottom`.
  if (spriteIndex[`${block}-top-0`]) {
    return {
      bottom: spriteIndex[`${block}-bottom-0`]
        ? `${block}-bottom-0`
        : spriteIndex['duct-bottom-0']
          ? 'duct-bottom-0'
          : undefined,
      top: `${block}-top-0`,
      rotate: 'top',
    };
  }
  // DuctRouter / overflow-duct: unrotated base + rotated top.
  if (spriteIndex[`${block}-top`]) {
    return {
      main: spriteIndex[block] ? block : undefined,
      top: `${block}-top`,
      rotate: 'top',
    };
  }
  return {
    bottom:
      spriteIndex[`${block}-bottom`] && !spriteIndex[`${block}-bottom-0`]
        ? `${block}-bottom`
        : undefined,
    main: spriteIndex[block]
      ? block
      : spriteIndex[`${block}-icon`]
        ? `${block}-icon`
        : undefined,
    rotate: 'all',
  };
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

