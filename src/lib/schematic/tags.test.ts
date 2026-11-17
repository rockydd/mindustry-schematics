import { describe, expect, it } from 'vitest';
import { generateErekirSiliconLayout } from '../layout/erekirSilicon';
import { decodeSchematicFromBase64 } from './decoder';
import { HEXED_BASE, OVERFLOW_GATES, PARSER_README } from './fixtures';
import { MAX_TAGS, inferPlanetTags, sizeBucket, tagSchematic } from './tags';
import type { Schematic, Tile } from './types';

function schem(blocks: string[]): Schematic {
  const tiles: Tile[] = blocks.map((block, i) => ({
    block,
    x: i,
    y: 0,
    rotation: 0,
    config: null,
  }));
  return { width: Math.max(1, blocks.length), height: 1, tiles, tags: {} };
}

describe('schematic auto tags', () => {
  it('tags a generated Erekir silicon layout by product, not conveyors or nodes', () => {
    const { schematic } = generateErekirSiliconLayout({
      planet: 'erekir',
      target: 'silicon',
      count: 3,
      compact: true,
    });
    const tags = tagSchematic(schematic);
    expect(tags).toContain('erekir');
    expect(tags).toContain('silicon');
    expect(tags.some((t) => t === 'small' || t === 'medium' || t === 'large')).toBe(true);
    expect(tags).not.toContain('serpulo');
    expect(tags).not.toContain('logistics');
    expect(tags).not.toContain('power');
    expect(tags.length).toBeLessThanOrEqual(MAX_TAGS);
  });

  it('tags public Serpulo logistics schematics', () => {
    const overflow = tagSchematic(decodeSchematicFromBase64(OVERFLOW_GATES));
    expect(overflow).toContain('serpulo');
    expect(overflow).toContain('logistics');
    expect(overflow).not.toContain('erekir');
    expect(overflow).not.toContain('power');
    expect(overflow.length).toBeLessThanOrEqual(MAX_TAGS);

    const sand = tagSchematic(decodeSchematicFromBase64(PARSER_README));
    expect(sand).toContain('serpulo');
    expect(sand).toContain('production');
    expect(sand).not.toContain('logistics');
  });

  it('tags the Hexed base as Serpulo without treating every conveyor as logistics', () => {
    const tags = tagSchematic(decodeSchematicFromBase64(HEXED_BASE));
    expect(tags).toContain('serpulo');
    expect(tags).not.toContain('logistics');
    expect(tags.length).toBeLessThanOrEqual(MAX_TAGS);
  });

  it('does not tag power for nodes or batteries alone', () => {
    const tags = tagSchematic(schem(['power-node', 'power-node-large', 'battery', 'beam-node']));
    expect(tags).not.toContain('power');
  });

  it('tags power when generators are the point of the schematic', () => {
    const tags = tagSchematic(
      schem(['thorium-reactor', 'thorium-reactor', 'impact-reactor', 'power-node']),
    );
    expect(tags).toContain('power');
    expect(tags).not.toContain('logistics');
  });

  it('tags defense from turrets, units from factories, logic from processors', () => {
    expect(tagSchematic(schem(['duo', 'scatter', 'copper-wall']))).toContain('defense');
    expect(tagSchematic(schem(['ground-factory', 'air-factory']))).toContain('units');
    expect(tagSchematic(schem(['micro-processor', 'logic-processor']))).toContain('logic');
    expect(tagSchematic(schem(['micro-processor', 'conveyor', 'conveyor']))).not.toContain(
      'logistics',
    );
  });

  it('keeps logistics for sorter / junction designs without crafters', () => {
    const tags = tagSchematic(schem(['sorter', 'junction', 'overflow-gate', 'router']));
    expect(tags).toContain('logistics');
    expect(tags).not.toContain('production');
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
