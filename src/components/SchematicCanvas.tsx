import { useEffect, useRef, useState } from 'react';
import { getBlockSize, getBlockSpec } from '../lib/blocks/catalog';
import { schematicWorldBounds, tileFootprint } from '../lib/schematic/stats';
import type { Tile } from '../lib/schematic/types';
import {
  buildBlending,
  buildOccupancy,
  conveyorKey,
  drawKind,
  ductBottomKey,
  ductTopKey,
  spriteKeysForBlock,
  type Occupancy,
} from '../lib/sprites/autotile';
import { layersForBlock, loadSpriteImage } from '../lib/sprites/resolve';

/** Empty tiles around the build so it isn't flush to the edge. */
export const CANVAS_PAD_TILES = 2;
/** Plain dark floor; not the striped schematic-background atlas. */
const FLOOR = '#2a2b32';

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
      for (const k of spriteKeysForBlock(t.block, getBlockSpec(t.block))) keys.add(k);
    }
    void Promise.all([...keys].map((k) => loadSpriteImage(k))).then(() => {
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
    const pad = Number(canvas.dataset.pad ?? String(CANVAS_PAD_TILES));
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const py = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const col = Math.floor(px / scale) - pad;
    const rowFromTop = Math.floor(py / scale) - pad;
    const tx = col + bounds.minX;
    const ty = bounds.maxY - rowFromTop;
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
  const pad = CANVAS_PAD_TILES;
  const scale = Math.max(
    8,
    Math.min(32, Math.floor(maxPixelSize / Math.max(cols + pad * 2, rows + pad * 2))),
  );
  canvas.width = (cols + pad * 2) * scale;
  canvas.height = (rows + pad * 2) * scale;
  canvas.dataset.scale = String(scale);
  canvas.dataset.pad = String(pad);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = FLOOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const occupancy = buildOccupancy(tiles);
  for (const t of tiles) {
    await drawTile(ctx, t, bounds, scale, pad, occupancy);
  }
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  rot: number,
  xscl = 1,
  yscl = 1,
) {
  if (!rot && xscl === 1 && yscl === 1) {
    ctx.drawImage(img, dx, dy, dw, dh);
    return;
  }
  ctx.save();
  ctx.translate(dx + dw / 2, dy + dh / 2);
  ctx.rotate((-rot * Math.PI) / 2);
  ctx.scale(xscl, yscl);
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

async function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  bounds: ReturnType<typeof schematicWorldBounds>,
  scale: number,
  pad: number,
  occupancy: Occupancy,
) {
  const size = getBlockSize(tile.block);
  const f = tileFootprint(tile);
  const dx = (f.x0 - bounds.minX + pad) * scale;
  const dy = (bounds.maxY - f.y1 + pad) * scale;
  const dw = size * scale;
  const dh = size * scale;
  const spec = getBlockSpec(tile.block);
  const kind = drawKind(tile.block, spec);
  const rot = tile.rotation & 3;

  if (kind === 'duct') {
    const blend = buildBlending('duct', occupancy, tile);
    const botKey = ductBottomKey(tile.block, blend.bits);
    const topKey = ductTopKey(tile.block, blend.bits);
    const bot = botKey ? await loadSpriteImage(botKey) : null;
    const top = topKey ? await loadSpriteImage(topKey) : null;
    if (bot) drawSprite(ctx, bot, dx, dy, dw, dh, rot, blend.xscl, blend.yscl);
    if (top) drawSprite(ctx, top, dx, dy, dw, dh, rot, blend.xscl, blend.yscl);
    if (bot || top) return;
  }

  if (kind === 'conveyor') {
    const blend = buildBlending('conveyor', occupancy, tile);
    const convKey = conveyorKey(tile.block, blend.bits);
    const main = convKey ? await loadSpriteImage(convKey) : null;
    if (main) {
      drawSprite(ctx, main, dx, dy, dw, dh, rot, blend.xscl, blend.yscl);
      return;
    }
  }

  const layers = layersForBlock(tile.block);
  const bottom = layers.bottom ? await loadSpriteImage(layers.bottom) : null;
  const main = layers.main ? await loadSpriteImage(layers.main) : null;
  const top = layers.top ? await loadSpriteImage(layers.top) : null;
  const dir = layers.dir ? await loadSpriteImage(layers.dir) : null;

  if (!bottom && !main && !top && !dir) {
    ctx.fillStyle = '#5c5c5c';
    ctx.fillRect(dx + 1, dy + 1, dw - 2, dh - 2);
    ctx.fillStyle = '#eee';
    ctx.font = `${Math.max(8, Math.min(11, scale * 0.4))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tile.block.slice(0, 6), dx + dw / 2, dy + dh / 2, dw - 4);
    return;
  }

  const overlayRot = layers.dir || layers.rotate === 'top' || spec?.rotate ? rot : 0;
  const rotateBase = layers.rotate === 'all' && !layers.dir && kind !== 'overlay';
  if (bottom) drawSprite(ctx, bottom, dx, dy, dw, dh, rotateBase ? overlayRot : 0);
  if (main) drawSprite(ctx, main, dx, dy, dw, dh, rotateBase ? overlayRot : 0);
  if (top) drawSprite(ctx, top, dx, dy, dw, dh, overlayRot);
  if (dir) drawSprite(ctx, dir, dx, dy, dw, dh, overlayRot);
}
