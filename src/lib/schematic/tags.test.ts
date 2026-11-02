import { describe, expect, it } from 'vitest';
import { generateErekirSiliconLayout } from '../layout/erekirSilicon';
import { decodeSchematicFromBase64 } from './decoder';
import { HEXED_BASE, OVERFLOW_GATES, PARSER_README } from './fixtures';
import { inferPlanetTags, sizeBucket, tagSchematic } from './tags';

describe('schematic auto tags', () => {
  it('tags a generated Erekir silicon layout', () => {
    const { schematic } = generateErekirSiliconLayout({
      planet: 'erekir',
      target: 'silicon',
      count: 3,
      compact: true,
    });
    const tags = tagSchematic(schematic);
    expect(tags).toContain('erekir');
    expect(tags).toContain('silicon');
    expect(tags).toContain('logistics');
    expect(tags).toContain('power');
    expect(tags).toContain('production');
    expect(tags.some((t) => t === 'small' || t === 'medium' || t === 'large')).toBe(true);
    expect(tags).not.toContain('serpulo');
  });

  it('tags public Serpulo logistics schematics', () => {
    const overflow = tagSchematic(decodeSchematicFromBase64(OVERFLOW_GATES));
    expect(overflow).toContain('serpulo');
    expect(overflow).toContain('logistics');
    expect(overflow).not.toContain('erekir');

    const sand = tagSchematic(decodeSchematicFromBase64(PARSER_README));
    expect(sand).toContain('serpulo');
    expect(sand).toContain('logistics');
  });

  it('tags the Hexed base as Serpulo', () => {
    const tags = tagSchematic(decodeSchematicFromBase64(HEXED_BASE));
    expect(tags).toContain('serpulo');
  });

  it('buckets size from the larger dimension', () => {
    expect(sizeBucket(6, 8)).toBe('small');
    expect(sizeBucket(20, 10)).toBe('medium');
    expect(sizeBucket(40, 12)).toBe('large');
  });

  it('can mark both planets when distinctive blocks mix', () => {
    expect(inferPlanetTags(['duct', 'conveyor'])).toEqual(['erekir', 'serpulo']);
  });
});
