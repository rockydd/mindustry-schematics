import type { CatalogEntry } from './types';

/** Exact duplicates (same schematic bytes) never appear twice. */
export function uniqueByContentHash(entries: CatalogEntry[]): CatalogEntry[] {
  const byHash = new Map<string, CatalogEntry>();
  for (const e of entries) {
    if (!e.contentHash || byHash.has(e.contentHash)) continue;
    byHash.set(e.contentHash, e);
  }
  return [...byHash.values()];
}
