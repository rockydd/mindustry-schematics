import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { SchematicCanvas } from './components/SchematicCanvas';
import { generateErekirSiliconLayout } from './lib/layout/erekirSilicon';
import { parsePrompt } from './lib/prompt/parse';
import { decodeSchematicBinary, fromBase64, looksLikeSchematicBase64 } from './lib/schematic/decoder';
import { encodeSchematicBase64, encodeSchematicBinary } from './lib/schematic/encoder';
import { summarizeSchematic } from './lib/schematic/stats';
import type { Schematic } from './lib/schematic/types';

const examplePrompts = [
  'compact three silicon factories for Erekir',
  '5 silicon factories, Erekir, small footprint',
  'Erekir silicon 2',
];

type Mode = 'generate' | 'view';

export default function AppMindustry() {
  const [mode, setMode] = useState<Mode>('generate');
  const [prompt, setPrompt] = useState(examplePrompts[0]);
  const [paste, setPaste] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [schematic, setSchematic] = useState<Schematic | null>(null);
  const [base64, setBase64] = useState('');

  const applySchematic = useCallback((schem: Schematic, encoded?: string) => {
    setSchematic(schem);
    setBase64(encoded ?? encodeSchematicBase64(schem));
    setError(null);
  }, []);

  const generate = useCallback(() => {
    try {
      const spec = parsePrompt(prompt);
      if (spec.planet !== 'erekir' || spec.product !== 'silicon') {
        throw new Error('Generator currently supports Erekir silicon builds.');
      }
      const { schematic: schem } = generateErekirSiliconLayout({
        planet: 'erekir',
        target: 'silicon',
        count: spec.count,
        compact: spec.compact,
      });
      applySchematic(schem);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [prompt, applySchematic]);

  const viewFromText = useCallback(
    (raw: string) => {
      if (!looksLikeSchematicBase64(raw)) {
        throw new Error('Paste a schematic base64 string starting with bXNjaA.');
      }
      const bytes = fromBase64(raw);
      const schem = decodeSchematicBinary(bytes);
      applySchematic(schem, raw.trim());
    },
    [applySchematic],
  );

  const onUpload = async (file: File) => {
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const schem = decodeSchematicBinary(buf);
      applySchematic(schem);
      setMode('view');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => (schematic ? summarizeSchematic(schematic) : null), [schematic]);

  const download = () => {
    if (!schematic) return;
    const bytes = encodeSchematicBinary(schematic);
    const clone = new Uint8Array(bytes);
    const blob = new Blob([clone.buffer], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(stats?.name ?? 'schematic').replace(/[^\w.-]+/g, '_')}.msch`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const copy = async () => {
    if (base64) await navigator.clipboard.writeText(base64);
  };

  return (
    <div className="app-shell">
      <header>
        <h1>Mindustry Schematic Builder</h1>
        <p className="lede">
          Generate an Erekir silicon layout, or paste a community schematic to preview it with the
          real game sprites.
        </p>
      </header>

      <div className="mode-toggle">
        <button className={mode === 'generate' ? 'active' : ''} onClick={() => setMode('generate')}>
          Generate
        </button>
        <button className={mode === 'view' ? 'active' : ''} onClick={() => setMode('view')}>
          View schematic
        </button>
      </div>

      {mode === 'generate' ? (
        <section>
          <p>Describe a build in plain language. Examples:</p>
          <div className="examples">
            {examplePrompts.map((p) => (
              <button key={p} onClick={() => setPrompt(p)}>
                {p}
              </button>
            ))}
          </div>
          <div className="prompt-row" style={{ marginTop: 8 }}>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., compact three silicon factories for Erekir"
            />
            <button onClick={generate}>Generate</button>
          </div>
        </section>
      ) : (
        <section>
          <p>Paste a base64 schematic (starts with bXNjaA) or upload a .msch file.</p>
          <textarea
            rows={6}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="bXNjaA..."
          />
          <div className="actions" style={{ marginTop: 8 }}>
            <button
              onClick={() => {
                try {
                  viewFromText(paste);
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : String(e));
                }
              }}
            >
              Decode
            </button>
            <label className="chip" style={{ cursor: 'pointer' }}>
              Upload .msch
              <input
                type="file"
                accept=".msch,application/octet-stream"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onUpload(f);
                }}
              />
            </label>
          </div>
        </section>
      )}

      {error && <div className="error">{error}</div>}

      <div className="workspace">
        <div className="panel">
          <h3>Preview</h3>
          <SchematicCanvas tiles={schematic?.tiles ?? []} />
          {stats && (
            <div className="meta">
              <div>
                <strong>{stats.name}</strong>
                {stats.labels.length ? ` · ${stats.labels.join(', ')}` : ''}
              </div>
              {stats.description && <div>{stats.description}</div>}
              <div>
                Size {stats.width}×{stats.height} · {stats.tileCount} blocks
              </div>
              <div>
                Power {stats.powerProd - stats.powerUse >= 0 ? '+' : ''}
                {(stats.powerProd - stats.powerUse).toFixed(1)}
                {stats.powerUse ? ` (use ${stats.powerUse.toFixed(1)})` : ''}
              </div>
              <div>
                Cost:{' '}
                {Object.keys(stats.cost).length
                  ? Object.entries(stats.cost)
                      .map(([k, v]) => `${k} ${v}`)
                      .join(', ')
                  : 'unknown blocks only'}
              </div>
              <div className="block-counts">
                {Object.entries(stats.blockCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 16)
                  .map(([name, n]) => (
                    <span className="chip" key={name}>
                      {name} ×{n}
                    </span>
                  ))}
              </div>
              {stats.unknownBlocks.length > 0 && (
                <div>Unknown blocks (placeholder tiles): {stats.unknownBlocks.join(', ')}</div>
              )}
            </div>
          )}
        </div>
        <div className="panel">
          <h3>Export</h3>
          <textarea value={base64} readOnly rows={10} />
          <div className="actions" style={{ marginTop: 8 }}>
            <button onClick={() => void copy()} disabled={!base64}>
              Copy base64
            </button>
            <button onClick={download} disabled={!schematic}>
              Download .msch
            </button>
          </div>
          <p className="lede" style={{ marginTop: 8 }}>
            Mindustry copies schematics from the clipboard as this base64 string.
          </p>
        </div>
      </div>

      <p className="footer">
        Block sprites and names © Anuke / Mindustry, licensed under{' '}
        <a href="https://www.gnu.org/licenses/gpl-3.0.html">GPL-3.0</a>. This site is also GPL-3.0
        and vendors those sprites with attribution. Source:{' '}
        <a href="https://github.com/Anuken/Mindustry">Anuken/Mindustry</a>.
      </p>
    </div>
  );
}
