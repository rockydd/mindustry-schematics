/**
 * Generate UI is hidden from v1 navigation. Keep this module so we can
 * restore the Create page later without rewriting the layout engine.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { generateErekirSiliconLayout } from '../lib/layout/erekirSilicon';
import { parsePrompt } from '../lib/prompt/parse';
import { encodeSchematicBase64, encodeSchematicBinary } from '../lib/schematic/encoder';
import { summarizeSchematic } from '../lib/schematic/stats';
import type { Schematic } from '../lib/schematic/types';
import { SchematicCanvas } from './SchematicCanvas';

const examplePrompts = [
  'compact three silicon factories for Erekir',
  '5 silicon factories, Erekir, small footprint',
  'Erekir silicon 2',
];

export function GeneratePanel() {
  const [prompt, setPrompt] = useState(examplePrompts[0]);
  const [error, setError] = useState<string | null>(null);
  const [schematic, setSchematic] = useState<Schematic | null>(null);
  const [base64, setBase64] = useState('');

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
      setSchematic(schem);
      setBase64(encodeSchematicBase64(schem));
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [prompt]);

  useEffect(() => {
    generate();
  }, [generate]);

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

  return (
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
      {error && <div className="error">{error}</div>}
      <div className="workspace" style={{ marginTop: 16 }}>
        <div className="panel">
          <h3>Preview</h3>
          <SchematicCanvas tiles={schematic?.tiles ?? []} />
        </div>
        <div className="panel">
          <h3>Export</h3>
          <textarea value={base64} readOnly rows={8} />
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
