import spriteIndexJson from './index.json' with { type: 'json' };

const spriteIndex = spriteIndexJson as Record<string, string>;

export interface SpriteLayers {
  bottom?: string;
  main?: string;
  top?: string;
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
  // Conveyor / armored-conveyor style: name-frame-connection
  if (spriteIndex[`${block}-0-0`]) {
    return { main: `${block}-0-0`, rotate: 'all' };
  }
  // Duct / conduit style: bottom sheet + directional top-N
  if (
    spriteIndex[`${block}-top-0`] ||
    spriteIndex[`${block}-bottom`] ||
    spriteIndex[`${block}-bottom-0`]
  ) {
    return {
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
  }
  return {
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

export function hasAnySprite(block: string): boolean {
  const l = layersForBlock(block);
  return Boolean(l.main || l.bottom || l.top);
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
