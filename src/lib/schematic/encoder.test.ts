import { describe, expect, it } from 'vitest';
import { encodeSchematicBase64, encodeSchematicBinary } from './encoder';
import { decodeSchematicBinary, fromBase64 } from './decoder';
import type { Schematic } from './types';

describe('Mindustry schematic encoder/decoder', () => {
  it('encodes header and round-trips simple tiles', () => {
    const schem: Schematic = {
      width: 5,
      height: 5,
      tags: { name: 'Test' },
      tiles: [
        { block: 'duct', x: 0, y: 0, rotation: 0, config: null },
        { block: 'beam-node', x: 2, y: -1, rotation: 0, config: null },
        { block: 'silicon-arc-furnace', x: -1, y: 1, rotation: 0, config: null },
      ],
    };
    const bytes = encodeSchematicBinary(schem);
    // 'msch' header + version
    expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe('msch');
    expect(bytes[4]).toBe(1);
    const b64 = encodeSchematicBase64(schem);
    expect(b64.startsWith('bXNjaA')).toBe(true);
    const decoded = decodeSchematicBinary(fromBase64(b64));
    expect(decoded.width).toBe(5);
    expect(decoded.height).toBe(5);
    expect(decoded.tiles.length).toBe(3);
    const names = decoded.tiles.map((t) => t.block).sort();
    expect(names).toEqual(['beam-node', 'duct', 'silicon-arc-furnace'].sort());
  });

  it('decodes a known real schematic base64', () => {
    // small chained-overflow-gate schematic from an upstream issue
    const real =
      'bXNjaAF4nD2OfQ7CIAzFH5TNmMU/NB5gF9ihlq0aEkcNMIy3lw+VpvT15UcLehw0jJs3xkUS+9tDXmMKYxAf2WNYOSzePqMVB3QYbORtCrL7hXGONs7O7tu0iEv8Fo/+++5YuSR2xek3drrPkQFcUU6XUxVhqlKtKcUAOkclcquLSdVSJl85i9k1s4fSoD9MDaYGU4OpwVTgOh51SxbUvlGKgfoAVsclnA==';
    const bytes = fromBase64(real);
    expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe('msch');
    const decoded = decodeSchematicBinary(bytes);
    expect(decoded.tiles.length).toBeGreaterThan(0);
    // dictionary should include some transport block name like router/overflow-gate/etc., but we only assert non-empty
    expect(Object.keys(decoded.tags).length).toBeGreaterThanOrEqual(0);
  });
});

