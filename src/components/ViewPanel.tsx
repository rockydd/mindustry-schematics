import { useCallback, useMemo, useState } from 'react';
import { decodeSchematicBinary, fromBase64, looksLikeSchematicBase64 } from '../lib/schematic/decoder';
import { encodeSchematicBase64, encodeSchematicBinary } from '../lib/schematic/encoder';
import { summarizeSchematic } from '../lib/schematic/stats';
import { tagSchematic } from '../lib/schematic/tags';
import type { Schematic } from '../lib/schematic/types';
import { SchematicCanvas } from './SchematicCanvas';

export function ViewPanel() {
  const [paste, setPaste] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [schematic, setSchematic] = useState<Schematic | null>(null);
  const [base64, setBase64] = useState('');

  const applySchematic = useCallback((schem: Schematic, encoded?: string) => {
    setSchematic(schem);
    setBase64(encoded ?? encodeSchematicBase64(schem));
    setError(null);
  }, []);

  const viewFromText = useCallback(
    (raw: string) => {
      if (!looksLikeSchematicBase64(raw)) {
        throw new Error('Paste a schematic base64 string starting with bXNjaA.');
      }
      applySchematic(decodeSchematicBinary(fromBase64(raw)), raw.trim());
    },
    [applySchematic],
  );

  const onUpload = async (file: File) => {
    try {
      applySchematic(decodeSchematicBinary(new Uint8Array(await file.arrayBuffer())));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const stats = useMemo(() => (schematic ? summarizeSchematic(schematic) : null), [schematic]);
  const tags = useMemo(() => (schematic ? tagSchematic(schematic) : []), [schematic]);

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

  return (
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
      {error && <div className="error">{error}</div>}
      <div className="workspace" style={{ marginTop: 16 }}>
        <div className="panel">
          <h3>Preview</h3>
          <SchematicCanvas tiles={schematic?.tiles ?? []} />
          {stats && (
            <div className="meta">
              <div>
                <strong>{stats.name}</strong>
              </div>
              {stats.description && <div>{stats.description}</div>}
              <div>
                Size {stats.width}×{stats.height} · {stats.tileCount} blocks
              </div>
              <div className="block-counts">
                {tags.map((t) => (
                  <span className="chip" key={t}>
                    {t}
                  </span>
                ))}
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
            </div>
          )}
        </div>
        <div className="panel">
          <h3>Export</h3>
          <textarea value={base64} readOnly rows={10} />
          <div className="actions" style={{ marginTop: 8 }}>
            <button onClick={() => void navigator.clipboard.writeText(base64)} disabled={!base64}>
              Copy base64
            </button>
            <button onClick={download} disabled={!schematic}>
              Download .msch
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
