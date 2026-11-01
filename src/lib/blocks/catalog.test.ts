import { describe, expect, it } from 'vitest';
import { getBlockSize, getBlockSpec } from './catalog';

describe('block catalog from Mindustry source', () => {
  it('knows Erekir silicon-arc-furnace', () => {
    const b = getBlockSpec('silicon-arc-furnace');
    expect(b?.size).toBe(3);
    expect(b?.buildCost.beryllium).toBe(70);
    expect(b?.powerUse).toBeGreaterThan(0);
  });

  it('marks ducts and conveyors as rotatable 1x1', () => {
    expect(getBlockSize('duct')).toBe(1);
    expect(getBlockSpec('duct')?.rotate).toBe(true);
    expect(getBlockSpec('conveyor')?.rotate).toBe(true);
  });
});
