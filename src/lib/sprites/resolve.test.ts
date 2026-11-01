import { describe, expect, it } from 'vitest';
import { hasAnySprite, layersForBlock } from './resolve';

describe('sprite layer lookup', () => {
  it('finds Erekir silicon layout sprites', () => {
    expect(hasAnySprite('duct')).toBe(true);
    expect(hasAnySprite('duct-router')).toBe(true);
    expect(hasAnySprite('silicon-arc-furnace')).toBe(true);
    expect(hasAnySprite('beam-node')).toBe(true);
  });

  it('finds common Serpulo blocks from community schematics', () => {
    expect(hasAnySprite('conveyor')).toBe(true);
    expect(hasAnySprite('pulverizer')).toBe(true);
    expect(hasAnySprite('sorter')).toBe(true);
    expect(hasAnySprite('overflow-gate')).toBe(true);
  });

  it('falls back for unknown blocks', () => {
    expect(hasAnySprite('not-a-real-block-xyz')).toBe(false);
  });

  it('uses autotile top/bottom-0 for ducts, not the square icon', () => {
    const layers = layersForBlock('duct');
    expect(layers.top).toBe('duct-top-0');
    expect(layers.bottom).toBe('duct-bottom-0');
    expect(layers.main).toBeUndefined();
    expect(layers.rotate).toBe('top');
  });

  it('overlays a rotated dir arrow on DirectionBridge blocks', () => {
    const duct = layersForBlock('duct-bridge');
    expect(duct.main).toBe('duct-bridge');
    expect(duct.dir).toBe('duct-bridge-dir');
    expect(duct.rotate).toBe('top');

    const liquid = layersForBlock('reinforced-bridge-conduit');
    expect(liquid.main).toBe('reinforced-bridge-conduit');
    expect(liquid.bottom).toBeUndefined();
    expect(liquid.dir).toBe('reinforced-bridge-conduit-dir');
    expect(liquid.rotate).toBe('top');
  });
});
