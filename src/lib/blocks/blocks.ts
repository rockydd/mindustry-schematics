export type ItemCost = Record<string, number>;

export interface BlockSpec {
  name: string; // content name
  size: number; // tiles
  planet: 'erekir' | 'serpulo' | 'both';
  buildCost: ItemCost;
  powerUse?: number; // power usage (consumption) per second, approx, for displays
}

// Minimal subset of blocks for Erekir silicon chain and transport/power.
export const BLOCKS: Record<string, BlockSpec> = {
  'silicon-arc-furnace': {
    name: 'silicon-arc-furnace',
    size: 3,
    planet: 'erekir',
    // v146 consumePower(6f); requirements(beryllium 70, graphite 80)
    buildCost: { beryllium: 70, graphite: 80 },
    powerUse: 6,
  },
  duct: {
    name: 'duct',
    size: 1,
    planet: 'erekir',
    buildCost: { beryllium: 1 },
  },
  'duct-router': {
    name: 'duct-router',
    size: 1,
    planet: 'erekir',
    buildCost: { beryllium: 10 },
  },
  'beam-node': {
    name: 'beam-node',
    size: 1,
    planet: 'erekir',
    buildCost: { beryllium: 8 },
  },
};

export function getBlockSpec(name: string): BlockSpec | undefined {
  return BLOCKS[name];
}

export function sumCosts(blockNames: string[]): ItemCost {
  const out: ItemCost = {};
  for (const bn of blockNames) {
    const b = getBlockSpec(bn);
    if (!b) continue;
    for (const [item, amt] of Object.entries(b.buildCost)) {
      out[item] = (out[item] ?? 0) + amt;
    }
  }
  return out;
}

export function estimatePowerUsage(blockNames: string[]): number {
  let total = 0;
  for (const bn of blockNames) {
    const b = getBlockSpec(bn);
    if (b?.powerUse) total += b.powerUse;
  }
  return total;
}

