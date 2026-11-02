import { decodeSchematicBinary, fromBase64, looksLikeSchematicBase64, sanitizeBase64 } from '../schematic/decoder';
import { toBase64 } from '../schematic/encoder';
import { summarizeSchematic } from '../schematic/stats';
import { tagSchematic } from '../schematic/tags';
import type { CatalogEntry, RawSeedPost, SchematicCatalog } from './types';

const SCHEM_RE = /bXNjaA[A-Za-z0-9+/=\-_]+/g;
const MSCH_URL_RE = /https?:\/\/[^\s"'<>]+?\.msch(?:\?[^\s"'<>]*)?/gi;

export function extractSchematicStrings(text: string): string[] {
  if (!text) return [];
  const cleaned = text.replace(/`+/g, ' ');
  const found: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  SCHEM_RE.lastIndex = 0;
  while ((m = SCHEM_RE.exec(cleaned))) {
    const raw = m[0];
    if (raw.length < 40 || !looksLikeSchematicBase64(raw)) continue;
    const key = sanitizeBase64(raw);
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(raw);
  }
  return found;
}

export function extractMschUrls(text: string): string[] {
  if (!text) return [];
  return [...new Set(text.match(MSCH_URL_RE) ?? [])];
}

function fnvHash(bytes: Uint8Array): string {
  let h = 2166136261;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0') + bytes.length.toString(16).padStart(8, '0');
}

export async function contentHash(bytes: Uint8Array): Promise<string> {
  const subtle = (globalThis as { crypto?: Crypto }).crypto?.subtle;
  if (subtle) {
    const buf = await subtle.digest('SHA-256', bytes.slice());
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  try {
    const { createHash } = await import('node:crypto');
    return createHash('sha256').update(bytes).digest('hex');
  } catch {
    return fnvHash(bytes);
  }
}

export function redditAuthorUrl(author: string): string {
  const name = author.replace(/^u\//, '');
  if (!name || name === '[deleted]' || name === 'AutoModerator') {
    return `https://www.reddit.com/user/${encodeURIComponent(name || 'deleted')}`;
  }
  return `https://www.reddit.com/user/${encodeURIComponent(name)}`;
}

export function normalizePermalink(permalink: string): string {
  if (!permalink) return '';
  if (permalink.startsWith('http')) return permalink;
  return `https://www.reddit.com${permalink.startsWith('/') ? '' : '/'}${permalink}`;
}

export async function entryFromSchematicBytes(
  bytes: Uint8Array,
  meta: {
    title: string;
    author: string;
    permalink: string;
    postDate: string;
    score?: number;
    base64?: string;
  },
): Promise<CatalogEntry | null> {
  try {
    const schem = decodeSchematicBinary(bytes);
    if (!schem.tiles.length) return null;
    const stats = summarizeSchematic(schem);
    const hash = await contentHash(bytes);
    const author = (meta.author || '[deleted]').replace(/^u\//, '');
    const permalink = normalizePermalink(meta.permalink);
    if (!permalink) return null;
    const title = (meta.title || stats.name || 'Untitled schematic').trim();
    return {
      id: `r_${hash.slice(0, 12)}`,
      title,
      base64: meta.base64 ? sanitizeBase64(meta.base64) : toBase64(bytes),
      author,
      authorUrl: redditAuthorUrl(author),
      permalink,
      postDate: meta.postDate,
      score: meta.score,
      decodedName: stats.name,
      width: stats.width,
      height: stats.height,
      tileCount: stats.tileCount,
      blockCounts: stats.blockCounts,
      tags: tagSchematic(schem),
      contentHash: hash,
    };
  } catch {
    return null;
  }
}

export async function entryFromBase64(
  raw: string,
  meta: {
    title: string;
    author: string;
    permalink: string;
    postDate: string;
    score?: number;
  },
): Promise<CatalogEntry | null> {
  if (!looksLikeSchematicBase64(raw)) return null;
  const cleaned = sanitizeBase64(raw);
  try {
    return await entryFromSchematicBytes(fromBase64(cleaned), { ...meta, base64: cleaned });
  } catch {
    return null;
  }
}

export function mergeCatalog(existing: CatalogEntry[], incoming: CatalogEntry[]): CatalogEntry[] {
  const byHash = new Map<string, CatalogEntry>();
  for (const e of existing) byHash.set(e.contentHash, e);
  for (const e of incoming) {
    const prev = byHash.get(e.contentHash);
    if (!prev) {
      byHash.set(e.contentHash, e);
      continue;
    }
    const score = Math.max(prev.score ?? 0, e.score ?? 0);
    const older = prev.postDate <= e.postDate ? prev : e;
    byHash.set(e.contentHash, { ...older, score, title: older.title || e.title });
  }
  return [...byHash.values()].sort((a, b) => {
    const s = (b.score ?? 0) - (a.score ?? 0);
    if (s) return s;
    return b.postDate.localeCompare(a.postDate);
  });
}

export function emptyCatalog(): SchematicCatalog {
  return {
    updatedAt: new Date().toISOString(),
    source: 'reddit:r/Mindustry',
    schematics: [],
  };
}

export function collectText(post: RawSeedPost): string {
  return [post.title, post.body, post.selftext, post.url].filter(Boolean).join('\n');
}

function stripHtml(html: string): string {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ');
}

function xmlText(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}

function xmlAttr(xml: string, tag: string, attr: string): string {
  const m = xml.match(new RegExp(`<${tag}\\b[^>]*\\b${attr}="([^"]+)"`, 'i'));
  return m ? m[1] : '';
}

/** Parse a Reddit Atom/RSS feed into raw posts (anonymous-friendly). */
export function parseRedditAtomFeed(xml: string): RawSeedPost[] {
  const posts: RawSeedPost[] = [];
  const chunks = xml.split(/<entry\b/i).slice(1);
  for (const raw of chunks) {
    const entry = raw.split(/<\/entry>/i)[0] ?? raw;
    const authorRaw = xmlText(entry, 'name').replace(/^\/u\//, '');
    const permalink = xmlAttr(entry, 'link', 'href') || xmlText(entry, 'id');
    const title = xmlText(entry, 'title');
    const published = xmlText(entry, 'published') || xmlText(entry, 'updated');
    const content = stripHtml(xmlText(entry, 'content') || xmlText(entry, 'summary'));
    let created_utc: number | undefined;
    if (published) {
      const ms = Date.parse(published);
      if (Number.isFinite(ms)) created_utc = Math.floor(ms / 1000);
    }
    if (!permalink && !content) continue;
    posts.push({
      author: authorRaw,
      permalink,
      created_utc,
      title,
      body: content,
    });
  }
  return posts;
}
