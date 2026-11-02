import { describe, expect, it } from 'vitest';
import { OVERFLOW_GATES } from '../schematic/fixtures';
import { extractMschUrls, extractSchematicStrings, mergeCatalog } from './ingest';
import type { CatalogEntry } from './types';

function stub(partial: Partial<CatalogEntry>): CatalogEntry {
  return {
    id: 'r_a',
    title: 'A',
    base64: 'bXNjaA',
    author: 'alice',
    authorUrl: 'https://www.reddit.com/user/alice',
    permalink: 'https://www.reddit.com/r/Mindustry/comments/aaa/',
    postDate: '2024-01-01T00:00:00.000Z',
    score: 1,
    decodedName: 'A',
    width: 2,
    height: 2,
    tileCount: 2,
    blockCounts: { duct: 2 },
    tags: ['erekir'],
    contentHash: 'hash-a',
    ...partial,
  };
}

describe('reddit ingest helpers', () => {
  it('extracts schematic base64 from post text', () => {
    const text = `try this\n\n\`${OVERFLOW_GATES}\`\n\nand ignore bXNjaAtooShort`;
    const found = extractSchematicStrings(text);
    expect(found.length).toBe(1);
    expect(found[0].startsWith('bXNjaA')).toBe(true);
  });

  it('finds .msch links', () => {
    const urls = extractMschUrls('file at https://example.com/foo.msch?dl=1 and http://x.test/a.msch');
    expect(urls).toHaveLength(2);
  });

  it('dedupes by content hash and keeps the higher score', () => {
    const a = stub({ score: 4, postDate: '2023-01-01T00:00:00.000Z' });
    const b = stub({
      id: 'r_b',
      title: 'Later copy',
      score: 20,
      postDate: '2025-01-01T00:00:00.000Z',
      permalink: 'https://www.reddit.com/r/Mindustry/comments/bbb/',
    });
    const merged = mergeCatalog([a], [b]);
    expect(merged).toHaveLength(1);
    expect(merged[0].score).toBe(20);
    expect(merged[0].permalink).toContain('/aaa/');
  });
});
