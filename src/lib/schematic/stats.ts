import {
  countBlocks,
  estimatePowerProduction,
  estimatePowerUsage,
  getBlockSize,
  getBlockSpec,
  sumCosts,
  type ItemCost,
} from '../blocks/catalog';
import type { Schematic, Tile } from './types';

export interface SchematicStats {
  name: string;
  description: string;
  labels: string[];
  width: number;
  height: number;
  tileCount: number;
  blockCounts: Record<string, number>;
  cost: ItemCost;
  powerUse: number;
  powerProd: number;
  unknownBlocks: string[];
}

export function tileFootprint(tile: Tile): { x0: number; y0: number; x1: number; y1: number } {
  const size = getBlockSize(tile.block);
  const offset = -Math.floor((size - 1) / 2);
  return {
    x0: tile.x + offset,
    y0: tile.y + offset,
    x1: tile.x + offset + size - 1,
    y1: tile.y + offset + size - 1,
  };
}

export function schematicWorldBounds(tiles: Tile[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (!tiles.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const t of tiles) {
    const f = tileFootprint(t);
    minX = Math.min(minX, f.x0);
    minY = Math.min(minY, f.y0);
    maxX = Math.max(maxX, f.x1);
    maxY = Math.max(maxY, f.y1);
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function parseLabels(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v.map(String);
  } catch {
    /* ignore */
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function summarizeSchematic(schem: Schematic): SchematicStats {
  const names = schem.tiles.map((t) => t.block);
  const unknown = [...new Set(names.filter((n) => !getBlockSpec(n)))];
  const bounds = schematicWorldBounds(schem.tiles);
  return {
    name: schem.tags.name ?? 'Untitled schematic',
    description: schem.tags.description ?? '',
    labels: parseLabels(schem.tags.labels),
    width: schem.width || bounds.width,
    height: schem.height || bounds.height,
    tileCount: schem.tiles.length,
    blockCounts: countBlocks(names),
    cost: sumCosts(names),
    powerUse: estimatePowerUsage(names),
    powerProd: estimatePowerProduction(names),
    unknownBlocks: unknown,
  };
}
