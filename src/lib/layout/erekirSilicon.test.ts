import { describe, expect, it } from 'vitest';
import { generateErekirSiliconLayout } from './erekirSilicon';
import { encodeSchematicBase64, encodeSchematicBinary } from '../schematic/encoder';
import { decodeSchematicBinary, fromBase64 } from '../schematic/decoder';

describe('Erekir silicon layout', () => {
  it('generates three arc furnaces compactly and round-trips encoding', () => {
    const { schematic, info } = generateErekirSiliconLayout({
      planet: 'erekir',
      target: 'silicon',
      count: 3,
      compact: true,
    });
    expect(schematic.tiles.some((t) => t.block === 'silicon-arc-furnace')).toBe(true);
    expect(info.powerUse).toBeGreaterThan(0);
    const b64 = encodeSchematicBase64(schematic);
    expect(b64.startsWith('bXNjaA')).toBe(true);
    const round = decodeSchematicBinary(fromBase64(b64));
    expect(round.tiles.length).toBe(schematic.tiles.length);
    // re-encode should produce a valid base64 header again
    const b64b = encodeSchematicBase64(round);
    expect(b64b.startsWith('bXNjaA')).toBe(true);
    expect(encodeSchematicBinary(round)[4]).toBe(1); // version byte
  });
});

