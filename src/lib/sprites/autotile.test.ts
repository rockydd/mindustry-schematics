import { describe, expect, it } from 'vitest';
import type { Tile } from '../schematic/types';
import {
  buildBlending,
  buildOccupancy,
  conveyorKey,
  drawKind,
  ductBottomKey,
  ductTopKey,
} from './autotile';
import { layersForBlock } from './resolve';

function t(block: string, x: number, y: number, rotation: number): Tile {
  return { block, x, y, rotation, config: null };
}

describe('autotile blending (Mindustry Autotiler)', () => {
  it('uses straight pieces for a horizontal duct run', () => {
    const tiles = [t('duct', 0, 0, 0), t('duct', 1, 0, 0), t('duct', 2, 0, 0)];
    const occ = buildOccupancy(tiles);
    expect(buildBlending('duct', occ, tiles[1]).bits).toBe(0);
    expect(ductTopKey('duct', 0)).toBe('duct-top-0');
    expect(ductBottomKey('duct', 0)).toBe('duct-bottom-0');
  });

  it('uses a curve when a side duct feeds a turning piece', () => {
    // (0,0) east into (1,0) which faces south
    const tiles = [t('duct', 0, 0, 0), t('duct', 1, 0, 3)];
    const occ = buildOccupancy(tiles);
    const corner = buildBlending('duct', occ, tiles[1]);
    expect(corner.bits).toBe(1);
  });

  it('uses a T-junction when both sides connect', () => {
    const tiles = [t('duct', 1, 0, 0), t('duct', 1, 1, 3), t('duct', 1, -1, 1)];
    const occ = buildOccupancy(tiles);
    const mid = buildBlending('duct', occ, tiles[0]);
    expect(mid.bits).toBe(4);
  });

  it('blends ducts into a furnace they face', () => {
    const tiles = [t('silicon-arc-furnace', 0, 0, 0), t('duct', 0, 2, 3)];
    const occ = buildOccupancy(tiles);
    expect(buildBlending('duct', occ, tiles[1]).bits).toBe(0);
  });
});

describe('draw kinds', () => {
  it('classifies ducts, conveyors, bridges, routers, crafters', () => {
    expect(drawKind('duct')).toBe('duct');
    expect(drawKind('armored-duct')).toBe('duct');
    expect(drawKind('conveyor')).toBe('conveyor');
    expect(drawKind('duct-bridge')).toBe('bridge');
    expect(drawKind('reinforced-bridge-conduit')).toBe('bridge');
    expect(drawKind('duct-router', { name: 'duct-router', className: 'DuctRouter', size: 1, rotate: true, buildCost: {}, powerUse: 0, powerProd: 0 })).toBe('overlay');
    expect(drawKind('silicon-arc-furnace')).toBe('generic');
  });

  it('does not use the square duct-bottom icon', () => {
    const layers = layersForBlock('duct');
    expect(layers.bottom).toBe('duct-bottom-0');
    expect(layers.top).toBe('duct-top-0');
    expect(layers.main).toBeUndefined();
  });

  it('picks conveyor blend sprites from name-bits-frame', () => {
    expect(conveyorKey('conveyor', 0)).toBe('conveyor-0-0');
    expect(conveyorKey('conveyor', 1)).toBe('conveyor-1-0');
  });
});
