import { getBlockSize, getBlockSpec, type BlockSpec } from '../blocks/catalog';
import { tileFootprint } from '../schematic/stats';
import type { Tile } from '../schematic/types';
import { spriteExists } from './resolve';

/** Mindustry Geometry.d4: east, north, west, south. */
export const D4 = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
] as const;

export function mod4(n: number): number {
  return ((n % 4) + 4) % 4;
}

export interface Occupant {
  tile: Tile;
  spec: BlockSpec | undefined;
  size: number;
}

export type Occupancy = Map<string, Occupant>;

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function buildOccupancy(tiles: Tile[]): Occupancy {
  const map: Occupancy = new Map();
  for (const tile of tiles) {
    const spec = getBlockSpec(tile.block);
    const size = spec?.size ?? getBlockSize(tile.block);
    const occ: Occupant = { tile, spec, size };
    const f = tileFootprint(tile);
    for (let x = f.x0; x <= f.x1; x++) {
      for (let y = f.y0; y <= f.y1; y++) {
        map.set(cellKey(x, y), occ);
      }
    }
  }
  return map;
}

export type DrawKind = 'duct' | 'conveyor' | 'bridge' | 'overlay' | 'generic';

export function drawKind(block: string, spec?: BlockSpec): DrawKind {
  if (spriteExists(`${block}-dir`)) return 'bridge';
  if (spriteExists(`${block}-0-0`)) return 'conveyor';
  if (spriteExists(`${block}-top-0`)) return 'duct';
  if (spriteExists(`${block}-top`) && spec?.rotate) return 'overlay';
  return 'generic';
}

const NO_ROTATED_OUTPUT = new Set([
  'DuctRouter',
  'Router',
  'Junction',
  'Sorter',
  'OverflowGate',
  'OverflowDuct',
  'GenericCrafter',
  'Separator',
  'AttributeCrafter',
  'HeatCrafter',
  'GraphiteCrafter',
  'LiquidRouter',
  'LiquidJunction',
  'CoreBlock',
  'StorageBlock',
]);

export function rotatedOutput(spec: BlockSpec | undefined): boolean {
  if (!spec?.rotate) return false;
  return !NO_ROTATED_OUTPUT.has(spec.className);
}

const ITEM_CLASSES = new Set([
  'Duct',
  'Conveyor',
  'StackConveyor',
  'Junction',
  'Router',
  'DuctRouter',
  'Sorter',
  'OverflowDuct',
  'OverflowGate',
  'ItemBridge',
  'BufferedItemBridge',
  'DuctBridge',
  'DirectionalUnloader',
  'Unloader',
  'MassDriver',
  'GenericCrafter',
  'Separator',
  'AttributeCrafter',
  'HeatCrafter',
  'GraphiteCrafter',
  'Incinerator',
  'StackRouter',
]);

const LIQUID_CLASSES = new Set([
  'Conduit',
  'ArmoredConduit',
  'LiquidRouter',
  'LiquidJunction',
  'LiquidBridge',
  'DirectionLiquidBridge',
  'Pump',
  'SolidPump',
  'LiquidVoid',
  'GenericCrafter',
  'HeatCrafter',
  'AttributeCrafter',
]);

export function outputsItems(spec: BlockSpec | undefined, name: string): boolean {
  if (spec && ITEM_CLASSES.has(spec.className)) return true;
  return /duct|conveyor|router|junction|sorter|unloader|crafter|furnace|smelter|press/.test(name);
}

export function hasItems(spec: BlockSpec | undefined, name: string): boolean {
  if (outputsItems(spec, name)) return true;
  const c = spec?.className ?? '';
  return c === 'CoreBlock' || c === 'StorageBlock' || /core-|container|vault|unloader/.test(name);
}

export function outputsLiquids(spec: BlockSpec | undefined, name: string): boolean {
  if (spec && LIQUID_CLASSES.has(spec.className)) return true;
  return /conduit|pump|tank|liquid/.test(name);
}

export interface BlendResult {
  bits: number;
  xscl: number;
  yscl: number;
}

function transformCase(num: number, bits: BlendResult): void {
  switch (num) {
    case 0:
      bits.bits = 3;
      break;
    case 1:
      bits.bits = 4;
      break;
    case 2:
      bits.bits = 2;
      break;
    case 3:
      bits.bits = 2;
      bits.yscl = -1;
      break;
    case 4:
      bits.bits = 1;
      bits.yscl = -1;
      break;
    case 5:
      bits.bits = 1;
      break;
    default:
      bits.bits = 0;
  }
}

function facingEdge(
  other: Occupant,
  thisX: number,
  thisY: number,
): { x: number; y: number } | null {
  const f = tileFootprint(other.tile);
  if (thisX >= f.x0 && thisX <= f.x1 && thisY >= f.y0 && thisY <= f.y1) return null;
  if (thisX >= f.x0 && thisX <= f.x1) {
    return { x: thisX, y: thisY < f.y0 ? f.y0 : f.y1 };
  }
  if (thisY >= f.y0 && thisY <= f.y1) {
    return { x: thisX < f.x0 ? f.x0 : f.x1, y: thisY };
  }
  return {
    x: Math.max(f.x0, Math.min(f.x1, thisX)),
    y: Math.max(f.y0, Math.min(f.y1, thisY)),
  };
}

function lookingAt(tile: Tile, rotation: number, other: Occupant): boolean {
  const edge = facingEdge(other, tile.x, tile.y);
  if (!edge) return false;
  const d = D4[mod4(rotation)];
  return tile.x + d.x === edge.x && tile.y + d.y === edge.y;
}

function lookingAtEither(tile: Tile, rotation: number, other: Occupant): boolean {
  const d = D4[mod4(rotation)];
  const od = D4[mod4(other.tile.rotation)];
  if (tile.x + d.x === other.tile.x && tile.y + d.y === other.tile.y) return true;
  if (!rotatedOutput(other.spec)) return true;
  if (other.tile.x + od.x === tile.x && other.tile.y + od.y === tile.y) return true;
  // Multi-tile: other origin may not be the adjacent cell.
  const edge = facingEdge(other, tile.x, tile.y);
  if (edge && tile.x + d.x === edge.x && tile.y + d.y === edge.y) return true;
  return false;
}

function blendsWith(kind: DrawKind, tile: Tile, rotation: number, other: Occupant): boolean {
  const name = other.tile.block;
  if (kind === 'duct' && /conduit/.test(tile.block)) {
    return (
      (outputsLiquids(other.spec, name) || lookingAt(tile, rotation, other)) &&
      lookingAtEither(tile, rotation, other)
    );
  }
  return (
    (outputsItems(other.spec, name) ||
      (lookingAt(tile, rotation, other) && hasItems(other.spec, name))) &&
    lookingAtEither(tile, rotation, other)
  );
}

function neighbor(
  occupancy: Occupancy,
  tile: Tile,
  rotation: number,
  direction: number,
): Occupant | undefined {
  const realDir = mod4(rotation - direction);
  const d = D4[realDir];
  return occupancy.get(cellKey(tile.x + d.x, tile.y + d.y));
}

function blendsDir(
  kind: DrawKind,
  occupancy: Occupancy,
  tile: Tile,
  rotation: number,
  direction: number,
): boolean {
  const other = neighbor(occupancy, tile, rotation, direction);
  if (!other || other.tile === tile) return false;
  return blendsWith(kind, tile, rotation, other);
}

/** Port of Autotiler.buildBlending (blendbits + xy scale). */
export function buildBlending(
  kind: DrawKind,
  occupancy: Occupancy,
  tile: Tile,
): BlendResult {
  const rotation = tile.rotation & 3;
  const b = (d: number) => blendsDir(kind, occupancy, tile, rotation, d);
  const num =
    b(2) && b(1) && b(3)
      ? 0
      : b(1) && b(3)
        ? 1
        : b(1) && b(2)
          ? 2
          : b(3) && b(2)
            ? 3
            : b(1)
              ? 4
              : b(3)
                ? 5
                : -1;
  const out: BlendResult = { bits: 0, xscl: 1, yscl: 1 };
  transformCase(num, out);
  return out;
}

export function ductTopKey(block: string, bits: number): string | undefined {
  const k = `${block}-top-${bits}`;
  return spriteExists(k) ? k : spriteExists(`${block}-top-0`) ? `${block}-top-0` : undefined;
}

export function ductBottomKey(block: string, bits: number): string | undefined {
  const k = `${block}-bottom-${bits}`;
  if (spriteExists(k)) return k;
  if (spriteExists(`duct-bottom-${bits}`)) return `duct-bottom-${bits}`;
  return undefined;
}

export function conveyorKey(block: string, bits: number): string | undefined {
  const k = `${block}-${bits}-0`;
  if (spriteExists(k)) return k;
  return spriteExists(`${block}-0-0`) ? `${block}-0-0` : undefined;
}

export function spriteKeysForBlock(block: string, spec?: BlockSpec): string[] {
  const kind = drawKind(block, spec);
  const keys: string[] = [];
  const add = (k?: string) => {
    if (k && spriteExists(k)) keys.push(k);
  };
  if (kind === 'duct') {
    for (let i = 0; i <= 4; i++) {
      add(ductTopKey(block, i));
      add(ductBottomKey(block, i));
    }
  } else if (kind === 'conveyor') {
    for (let i = 0; i <= 4; i++) add(conveyorKey(block, i));
  } else if (kind === 'bridge') {
    add(block);
    add(`${block}-dir`);
  } else if (kind === 'overlay') {
    add(block);
    add(`${block}-top`);
  } else {
    add(block);
    if (spriteExists(`${block}-bottom`) && !spriteExists(`${block}-bottom-0`)) {
      add(`${block}-bottom`);
    }
  }
  return keys;
}
