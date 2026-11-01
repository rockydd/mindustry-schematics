import { useEffect, useRef, useState } from 'react';
import { getBlockSize, getBlockSpec } from '../lib/blocks/catalog';
import { schematicWorldBounds, tileFootprint } from '../lib/schematic/stats';
import type { Tile } from '../lib/schematic/types';
import {
  layersForBlock,
  loadBackground,
  loadSpriteImage,
} from '../lib/sprites/resolve';

const TEAM = { r: 255, g: 211, b: 127 }; // default Sharded team tint

export interface SchematicCanvasProps {
  tiles: Tile[];
  maxPixelSize?: number;
}

export function SchematicCanvas({ tiles, maxPixelSize = 640 }: SchematicCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [ready, setReady] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const keys = new Set<string>();
    for (const t of tiles) {
      const l = layersForBlock(t.block);
      for (const k of [l.bottom, l.main, l.top, l.team]) if (k) keys.add(k);
    }
    void Promise.all([loadBackground(), ...[...keys].map((k) => loadSpriteImage(k))]).then(() => {
      if (!cancelled) setReady((n) => n + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [tiles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    void paint(canvas, tiles, maxPixelSize);
  }, [tiles, maxPixelSize, ready]);

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !tiles.length) return;
    const bounds = schematicWorldBounds(tiles);
    const scale = Number(canvas.dataset.scale ?? '32');
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const py = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const tx = Math.floor(px / scale) + bounds.minX;
    const ty = bounds.maxY - Math.floor(py / scale);
    const hit = [...tiles].reverse().find((t) => {
      const f = tileFootprint(t);
      return tx >= f.x0 && tx <= f.x1 && ty >= f.y0 && ty <= f.y1;
    });
    setHover(hit ? hit.block : null);
  };

  if (!tiles.length) {
    return <div className="preview-empty">No tiles</div>;
  }

  return (
    <div className="schematic-canvas-wrap">
      <canvas
        ref={canvasRef}
        className="schematic-canvas"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      />
      {hover && <div className="schematic-tooltip">{hover}</div>}
    </div>
  );
}

async function paint(canvas: HTMLCanvasElement, tiles: Tile[], maxPixelSize: number) {
  const bounds = schematicWorldBounds(tiles);
  const cols = Math.max(1, bounds.width);
  const rows = Math.max(1, bounds.height);
  const scale = Math.max(8, Math.min(32, Math.floor(maxPixelSize / Math.max(cols, rows))));
  canvas.width = cols * scale;
  canvas.height = rows * scale;
  canvas.dataset.scale = String(scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;

  const bg = await loadBackground();
  if (bg) {
    const pat = ctx.createPattern(bg, 'repeat');
    if (pat) {
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  } else {
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Shadows like the in-game schematic preview
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  for (const t of tiles) {
    const f = tileFootprint(t);
    const x = (f.x0 - bounds.minX) * scale;
    const y = (bounds.maxY - f.y1) * scale;
    const s = getBlockSize(t.block) * scale;
    ctx.fillRect(x, y, s, s);
  }

  for (const t of tiles) {
    await drawTile(ctx, t, bounds, scale);
  }
}

async function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  bounds: ReturnType<typeof schematicWorldBounds>,
  scale: number,
) {
  const size = getBlockSize(tile.block);
  const f = tileFootprint(tile);
  const dx = (f.x0 - bounds.minX) * scale;
  const dy = (bounds.maxY - f.y1) * scale;
  const dw = size * scale;
  const dh = size * scale;
  const layers = layersForBlock(tile.block);
  const spec = getBlockSpec(tile.block);
  const rotatable = Boolean(spec?.rotate);
  const rot = rotatable ? tile.rotation & 3 : 0;

  const bottom = layers.bottom ? await loadSpriteImage(layers.bottom) : null;
  const main = layers.main ? await loadSpriteImage(layers.main) : null;
  const top = layers.top ? await loadSpriteImage(layers.top) : null;
  const team = layers.team ? await loadSpriteImage(layers.team) : null;

  if (!bottom && !main && !top) {
    ctx.fillStyle = '#5c5c5c';
    ctx.fillRect(dx + 1, dy + 1, dw - 2, dh - 2);
    ctx.strokeStyle = '#222';
    ctx.strokeRect(dx + 0.5, dy + 0.5, dw - 1, dh - 1);
    ctx.fillStyle = '#eee';
    ctx.font = `${Math.max(8, Math.min(11, scale * 0.4))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tile.block.slice(0, 6), dx + dw / 2, dy + dh / 2, dw - 4);
    return;
  }

  const drawImg = (img: HTMLImageElement, rotate: boolean) => {
    if (!rotate || rot === 0) {
      ctx.drawImage(img, dx, dy, dw, dh);
      return;
    }
    ctx.save();
    ctx.translate(dx + dw / 2, dy + dh / 2);
    // Game rotation 0=east, 1=north, 2=west, 3=south. Canvas Y is down, so negate.
    ctx.rotate((-rot * Math.PI) / 2);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  };

  const rotateAll = layers.rotate === 'all';
  if (bottom) drawImg(bottom, rotateAll);
  if (main) drawImg(main, rotateAll);
  if (top) drawImg(top, true);
  if (team) {
    const oc = document.createElement('canvas');
    oc.width = Math.max(1, dw);
    oc.height = Math.max(1, dh);
    const octx = oc.getContext('2d');
    if (octx) {
      octx.imageSmoothingEnabled = false;
      octx.drawImage(team, 0, 0, dw, dh);
      octx.globalCompositeOperation = 'source-in';
      octx.fillStyle = `rgb(${TEAM.r},${TEAM.g},${TEAM.b})`;
      octx.fillRect(0, 0, dw, dh);
      if (rotateAll && rot) {
        ctx.save();
        ctx.translate(dx + dw / 2, dy + dh / 2);
        ctx.rotate((-rot * Math.PI) / 2);
        ctx.drawImage(oc, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();
      } else {
        ctx.drawImage(oc, dx, dy, dw, dh);
      }
    }
  }
}
