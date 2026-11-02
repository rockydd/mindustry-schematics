/**
 * Collect schematics from r/Mindustry (or a local seed file) and merge
 * them into public/data/schematics.json.
 *
 * Auth: try anonymous JSON first. If that 403s, use official OAuth
 * client-credentials via REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectText,
  emptyCatalog,
  entryFromBase64,
  entryFromSchematicBytes,
  extractMschUrls,
  extractSchematicStrings,
  mergeCatalog,
} from '../src/lib/gallery/ingest.ts';
import type { CatalogEntry, RawSeedFile, RawSeedPost, SchematicCatalog } from '../src/lib/gallery/types.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'public/data/schematics.json');
const UA =
  process.env.REDDIT_USER_AGENT ??
  'mindustry-schematics-ingest/0.1 (by /u/rockydd; +https://github.com/rockydd/mindustry-schematics)';
const SUB = 'Mindustry';
const SLEEP_MS = 1100;

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i < 0 || i + 1 >= process.argv.length) return undefined;
  return process.argv[i + 1];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function loadCatalog(): SchematicCatalog {
  try {
    return JSON.parse(readFileSync(OUT, 'utf8')) as SchematicCatalog;
  } catch {
    return emptyCatalog();
  }
}

async function redditFetch(url: string, token?: string): Promise<Response> {
  const headers: Record<string, string> = {
    'User-Agent': UA,
    Accept: 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { headers });
}

async function clientCredentialsToken(): Promise<string | null> {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;
  const basic = Buffer.from(`${id}:${secret}`).toString('base64');
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    console.warn(`OAuth token failed: HTTP ${res.status}`);
    return null;
  }
  const json = (await res.json()) as { access_token?: string };
  return json.access_token ?? null;
}

function listingChildren(json: unknown): Record<string, unknown>[] {
  const data = json as { data?: { children?: { data?: Record<string, unknown> }[] } };
  return (data.data?.children ?? []).map((c) => c.data ?? {});
}

function postDate(created: unknown): string {
  const n = typeof created === 'number' ? created : Number(created);
  if (!Number.isFinite(n)) return new Date().toISOString();
  return new Date(n * 1000).toISOString();
}

async function entriesFromPost(post: RawSeedPost, fetchBinary: (url: string) => Promise<Uint8Array | null>): Promise<CatalogEntry[]> {
  const text = collectText(post);
  const author = post.author || '[deleted]';
  const permalink = post.permalink || '';
  const title = post.title || 'Untitled schematic';
  const date =
    post.createdAt ??
    (post.created_utc != null ? postDate(post.created_utc) : new Date().toISOString());
  const meta = { title, author, permalink, postDate: date, score: post.score };
  const out: CatalogEntry[] = [];
  for (const raw of extractSchematicStrings(text)) {
    const entry = await entryFromBase64(raw, meta);
    if (entry) out.push(entry);
  }
  for (const url of extractMschUrls(text)) {
    const bytes = await fetchBinary(url);
    if (!bytes) continue;
    const entry = await entryFromSchematicBytes(bytes, meta);
    if (entry) out.push(entry);
  }
  return out;
}

async function collectFromReddit(token?: string): Promise<CatalogEntry[]> {
  const host = token ? 'https://oauth.reddit.com' : 'https://www.reddit.com';
  const queries = ['bXNjaA', 'msch', 'schematic'];
  const posts: Record<string, unknown>[] = [];
  const seen = new Set<string>();

  for (const q of queries) {
    const url = `${host}/r/${SUB}/search.json?q=${encodeURIComponent(q)}&restrict_sr=1&sort=new&limit=100`;
    const res = await redditFetch(url, token);
    console.log(`search ${q}: HTTP ${res.status}`);
    if (!res.ok) {
      if (res.status === 403 || res.status === 401) {
        throw new Error(`Reddit blocked anonymous/search access (HTTP ${res.status})`);
      }
      continue;
    }
    for (const child of listingChildren(await res.json())) {
      const id = String(child.id ?? child.name ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      posts.push(child);
    }
    await sleep(SLEEP_MS);
  }

  const newUrl = `${host}/r/${SUB}/new.json?limit=100`;
  const newRes = await redditFetch(newUrl, token);
  console.log(`listing new: HTTP ${newRes.status}`);
  if (newRes.ok) {
    for (const child of listingChildren(await newRes.json())) {
      const id = String(child.id ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      posts.push(child);
    }
  }
  await sleep(SLEEP_MS);

  const found: CatalogEntry[] = [];
  const download = async (fileUrl: string) => {
    try {
      const r = await fetch(fileUrl, { headers: { 'User-Agent': UA } });
      if (!r.ok) return null;
      return new Uint8Array(await r.arrayBuffer());
    } catch {
      return null;
    }
  };

  for (const child of posts) {
    const title = String(child.title ?? '');
    const selftext = String(child.selftext ?? child.body ?? '');
    const permalink = String(child.permalink ?? '');
    const blob = `${title}\n${selftext}\n${String(child.url ?? '')}`;
    const looksRelevant = /bXNjaA|\.msch|schematic/i.test(blob);
    const seed: RawSeedPost = {
      author: String(child.author ?? '[deleted]'),
      permalink,
      created_utc: typeof child.created_utc === 'number' ? child.created_utc : undefined,
      score: typeof child.score === 'number' ? child.score : undefined,
      title,
      body: selftext,
      url: String(child.url ?? ''),
    };
    found.push(...(await entriesFromPost(seed, download)));

    if (looksRelevant && permalink) {
      const id = String(child.id ?? '');
      if (!id) continue;
      const cUrl = `${host}/r/${SUB}/comments/${id}.json?limit=200&depth=8`;
      await sleep(SLEEP_MS);
      const cRes = await redditFetch(cUrl, token);
      if (!cRes.ok) continue;
      const tree = (await cRes.json()) as unknown[];
      const comments: RawSeedPost[] = [];
      const collect = (node: unknown) => {
        if (!node || typeof node !== 'object') return;
        const n = node as { kind?: string; data?: Record<string, unknown> };
        if (n.kind === 't1' && n.data) {
          comments.push({
            author: String(n.data.author ?? '[deleted]'),
            permalink: String(n.data.permalink ?? permalink),
            created_utc: typeof n.data.created_utc === 'number' ? n.data.created_utc : undefined,
            score: typeof n.data.score === 'number' ? n.data.score : undefined,
            title,
            body: String(n.data.body ?? ''),
          });
        }
        const replies = n.data?.replies as { data?: { children?: unknown[] } } | string | undefined;
        if (Array.isArray(n.data?.children)) (n.data.children as unknown[]).forEach(collect);
        if (replies && typeof replies === 'object') {
          for (const ch of replies.data?.children ?? []) collect(ch);
        }
      };
      for (const part of tree) collect(part);
      for (const c of comments) found.push(...(await entriesFromPost(c, download)));
    }
  }
  return found;
}

async function collectFromSeed(path: string): Promise<CatalogEntry[]> {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as RawSeedFile;
  const download = async (fileUrl: string) => {
    if (fileUrl.startsWith('http')) {
      try {
        const r = await fetch(fileUrl, { headers: { 'User-Agent': UA } });
        if (!r.ok) return null;
        return new Uint8Array(await r.arrayBuffer());
      } catch {
        return null;
      }
    }
    try {
      return new Uint8Array(readFileSync(resolve(path, '..', fileUrl)));
    } catch {
      return null;
    }
  };
  const found: CatalogEntry[] = [];
  for (const post of raw.posts ?? []) {
    found.push(...(await entriesFromPost(post, download)));
  }
  return found;
}

async function main() {
  const existing = loadCatalog();
  const seedPath = argValue('--seed');
  let incoming: CatalogEntry[] = [];

  if (seedPath) {
    incoming = await collectFromSeed(resolve(process.cwd(), seedPath));
    console.log(`seed file produced ${incoming.length} valid schematics`);
  } else {
    try {
      incoming = await collectFromReddit();
      console.log(`anonymous Reddit produced ${incoming.length} valid schematics`);
    } catch (e) {
      console.warn(String(e));
      const token = await clientCredentialsToken();
      if (!token) {
        console.warn(
          'Reddit is unreachable and REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET are not set. Skipping ingest.',
        );
        process.exit(0);
      }
      incoming = await collectFromReddit(token);
      console.log(`OAuth Reddit produced ${incoming.length} valid schematics`);
    }
  }

  const merged = mergeCatalog(existing.schematics, incoming);
  const next: SchematicCatalog = {
    updatedAt: new Date().toISOString(),
    source: 'reddit:r/Mindustry',
    schematics: merged,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`catalog now has ${merged.length} schematics → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
