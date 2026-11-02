import { useEffect, useMemo, useState } from 'react';
import { decodeSchematicFromBase64 } from '../lib/schematic/decoder';
import { encodeSchematicBinary } from '../lib/schematic/encoder';
import type { CatalogEntry, SchematicCatalog } from '../lib/gallery/types';
import { SchematicCanvas } from './SchematicCanvas';

function catalogUrl(): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base}data/schematics.json`;
}

function tilesFor(entry: CatalogEntry) {
  try {
    return decodeSchematicFromBase64(entry.base64).tiles;
  } catch {
    return [];
  }
}

function downloadEntry(entry: CatalogEntry) {
  try {
    const schem = decodeSchematicFromBase64(entry.base64);
    const bytes = encodeSchematicBinary(schem);
    const blob = new Blob([new Uint8Array(bytes).buffer], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${entry.title.replace(/[^\w.-]+/g, '_')}.msch`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    /* ignore */
  }
}

function AuthorSource({ entry }: { entry: CatalogEntry }) {
  const handle = entry.author.startsWith('u/') ? entry.author : `u/${entry.author}`;
  return (
    <p className="source-line">
      by{' '}
      <a href={entry.authorUrl} target="_blank" rel="noreferrer">
        {handle}
      </a>
      ,{' '}
      <a href={entry.permalink} target="_blank" rel="noreferrer">
        original post
      </a>
    </p>
  );
}

export function BrowseGallery({ selectedId }: { selectedId: string | null }) {
  const [catalog, setCatalog] = useState<SchematicCatalog | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    fetch(catalogUrl())
      .then((r) => {
        if (!r.ok) throw new Error(`Catalog HTTP ${r.status}`);
        return r.json() as Promise<SchematicCatalog>;
      })
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const entries = catalog?.schematics ?? [];
  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const e of entries) for (const t of e.tags) s.add(t);
    return [...s].sort();
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (tag !== 'all' && !e.tags.includes(tag)) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.decodedName.toLowerCase().includes(q) ||
        e.author.toLowerCase().includes(q)
      );
    });
  }, [entries, query, tag]);

  const selected = selectedId ? entries.find((e) => e.id === selectedId) : undefined;

  if (loadError) {
    return <div className="error">Could not load the schematic catalog ({loadError}).</div>;
  }
  if (!catalog) {
    return <p className="lede">Loading gallery…</p>;
  }

  if (selected) {
    return (
      <article className="detail">
        <button className="back-btn" onClick={() => { window.location.hash = 'browse'; }}>
          ← Back to gallery
        </button>
        <h2>{selected.title}</h2>
        <AuthorSource entry={selected} />
        <div className="block-counts">
          {selected.tags.map((t) => (
            <span className="chip" key={t}>
              {t}
            </span>
          ))}
        </div>
        <div className="panel detail-preview">
          <SchematicCanvas tiles={tilesFor(selected)} maxPixelSize={720} />
          <div className="meta">
            <div>
              In-game name: <strong>{selected.decodedName}</strong>
            </div>
            <div>
              Size {selected.width}×{selected.height} · {selected.tileCount} blocks
            </div>
            {selected.score != null && <div>Reddit score {selected.score}</div>}
            <div>
              Posted {selected.postDate.slice(0, 10)}
            </div>
          </div>
        </div>
        <div className="actions" style={{ marginTop: 12 }}>
          <button onClick={() => void navigator.clipboard.writeText(selected.base64)}>
            Copy base64
          </button>
          <button onClick={() => downloadEntry(selected)}>Download .msch</button>
        </div>
        <AuthorSource entry={selected} />
      </article>
    );
  }

  return (
    <section>
      <div className="gallery-toolbar">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, name, or author"
          aria-label="Search schematics"
        />
        <select value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Filter by tag">
          <option value="all">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      {entries.length === 0 ? (
        <div className="empty-state">
          <p>
            No community schematics in the catalog yet. The gallery fills from r/Mindustry once
            ingest can reach Reddit. You can still paste or upload a schematic in View.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="lede">No schematics match that search.</p>
      ) : (
        <div className="gallery-grid">
          {filtered.map((entry) => (
            <article key={entry.id} className="gallery-card">
              <button
                className="card-preview"
                onClick={() => {
                  window.location.hash = `s/${entry.id}`;
                }}
              >
                <SchematicCanvas tiles={tilesFor(entry)} maxPixelSize={280} />
              </button>
              <div className="card-body">
                <h3>
                  <a href={`#s/${entry.id}`}>{entry.title}</a>
                </h3>
                <AuthorSource entry={entry} />
                <div className="block-counts">
                  {entry.tags.slice(0, 6).map((t) => (
                    <span className="chip" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
