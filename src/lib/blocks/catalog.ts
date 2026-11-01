import catalogJson from './catalog.json' with { type: 'json' };

export type ItemCost = Record<string, number>;

export interface BlockSpec {
  name: string;
  size: number;
  rotate: boolean;
  buildCost: ItemCost;
  powerUse: number;
  powerProd: number;
  className: string;
}

type CatalogFile = {
  blocks: Record<
    string,
    {
      name: string;
      className: string;
      size: number;
      rotate: boolean;
      buildCost: Record<string, number>;
      powerUse: number;
      powerProd: number;
    }
  >;
};

const data = catalogJson as CatalogFile;

export const BLOCKS: Record<string, BlockSpec> = {};
for (const [name, b] of Object.entries(data.blocks)) {
  BLOCKS[name] = {
    name: b.name,
    size: b.size,
    rotate: b.rotate,
    buildCost: b.buildCost,
    powerUse: b.powerUse,
    powerProd: b.powerProd,
    className: b.className,
  };
}

export function getBlockSpec(name: string): BlockSpec | undefined {
  return BLOCKS[name];
}

export function getBlockSize(name: string): number {
  return BLOCKS[name]?.size ?? 1;
}

export function sumCosts(blockNames: string[]): ItemCost {
  const out: ItemCost = {};
  for (const bn of blockNames) {
    const b = BLOCKS[bn];
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
    const b = BLOCKS[bn];
    if (b) total += b.powerUse;
  }
  return total;
}

export function estimatePowerProduction(blockNames: string[]): number {
  let total = 0;
  for (const bn of blockNames) {
    const b = BLOCKS[bn];
    if (b) total += b.powerProd;
  }
  return total;
}

export function countBlocks(blockNames: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const bn of blockNames) out[bn] = (out[bn] ?? 0) + 1;
  return out;
}
