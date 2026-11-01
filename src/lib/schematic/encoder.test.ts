import { describe, expect, it } from 'vitest';
import { generateErekirSiliconLayout } from '../layout/erekirSilicon';
import { decodeSchematicBinary, decodeSchematicFromBase64, fromBase64 } from './decoder';
import { encodeSchematicBase64, encodeSchematicBinary } from './encoder';
import { HEXED_BASE, OVERFLOW_GATES, PARSER_README } from './fixtures';
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
    expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe('msch');
    expect(bytes[4]).toBe(1);
    const b64 = encodeSchematicBase64(schem);
    expect(b64.startsWith('bXNjaA')).toBe(true);
    const decoded = decodeSchematicBinary(fromBase64(b64));
    expect(decoded.width).toBe(5);
    expect(decoded.height).toBe(5);
    expect(decoded.tiles.map((t) => t.block).sort()).toEqual(
      ['beam-node', 'duct', 'silicon-arc-furnace'].sort(),
    );
  });

  it('decodes a known overflow-gate schematic', () => {
    const decoded = decodeSchematicFromBase64(OVERFLOW_GATES);
    expect(decoded.tiles.length).toBeGreaterThan(0);
    expect(decoded.width).toBeGreaterThan(0);
    expect(decoded.tiles.every((t) => typeof t.block === 'string' && t.block.length > 0)).toBe(true);
  });

  it('decodes the public schematic-parser README example', () => {
    const decoded = decodeSchematicFromBase64(PARSER_README);
    expect(decoded.tiles.length).toBeGreaterThan(0);
    expect(decoded.tags.name || decoded.tiles[0].block).toBeTruthy();
  });

  it('decodes the HexedPlugin base schematic', () => {
    const decoded = decodeSchematicFromBase64(HEXED_BASE);
    expect(decoded.tiles.length).toBeGreaterThan(5);
    const names = new Set(decoded.tiles.map((t) => t.block));
    expect(names.size).toBeGreaterThan(1);
  });

  it('round-trips a generated Erekir silicon schematic through our encoder', () => {
    const { schematic } = generateErekirSiliconLayout({
      planet: 'erekir',
      target: 'silicon',
      count: 3,
      compact: true,
    });
    const encoded = encodeSchematicBase64(schematic);
    const decoded = decodeSchematicFromBase64(encoded);
    expect(decoded.tiles.length).toBe(schematic.tiles.length);
    expect(decoded.tiles.filter((t) => t.block === 'silicon-arc-furnace').length).toBe(3);
    const again = decodeSchematicBinary(encodeSchematicBinary(decoded));
    expect(again.tiles.map((t) => t.block).sort()).toEqual(decoded.tiles.map((t) => t.block).sort());
  });

  it('re-encodes a real schematic with null configs and still decodes', () => {
    const decoded = decodeSchematicFromBase64(PARSER_README);
    const rebuilt: Schematic = {
      ...decoded,
      tiles: decoded.tiles.map((t) => ({ ...t, config: null })),
    };
    const round = decodeSchematicBinary(encodeSchematicBinary(rebuilt));
    expect(round.tiles.length).toBe(decoded.tiles.length);
    expect(round.tiles.map((t) => t.block).sort()).toEqual(decoded.tiles.map((t) => t.block).sort());
  });
});
