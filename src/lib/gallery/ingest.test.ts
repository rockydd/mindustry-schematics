import { describe, expect, it } from 'vitest';
import { OVERFLOW_GATES } from '../schematic/fixtures';
import { extractMschUrls, extractSchematicStrings, mergeCatalog, parseRedditAtomFeed } from './ingest';
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

  it('parses Reddit Atom search feeds into raw posts', () => {
    const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <author><name>/u/alice</name></author>
        <title>Core schematic</title>
        <link href="https://www.reddit.com/r/Mindustry/comments/abc/core_schematic/"/>
        <published>2024-05-01T12:00:00+00:00</published>
        <content type="html">&lt;p&gt;try ${OVERFLOW_GATES}&lt;/p&gt;</content>
      </entry>
    </feed>`;
    const posts = parseRedditAtomFeed(xml);
    expect(posts).toHaveLength(1);
    expect(posts[0].author).toBe('alice');
    expect(posts[0].permalink).toContain('/comments/abc/');
    expect(posts[0].title).toBe('Core schematic');
    expect(posts[0].body).toContain('bXNjaA');
    expect(posts[0].created_utc).toBe(1714564800);
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
