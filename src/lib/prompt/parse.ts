import { z } from 'zod';

export type Planet = 'erekir' | 'serpulo';

export interface BuildSpec {
  planet: Planet;
  product: 'silicon';
  count: number;
  compact: boolean;
}

const PromptSchema = z.object({
  planet: z.enum(['erekir', 'serpulo']).default('erekir'),
  product: z.literal('silicon'),
  count: z.number().int().positive().default(1),
  compact: z.boolean().default(true),
});

// Simple rule-based parser with a few heuristics.
export function parsePrompt(input: string): BuildSpec {
  const text = input.toLowerCase();
  const planet: Planet = text.includes('erekir') ? 'erekir' : text.includes('serpulo') ? 'serpulo' : 'erekir';
  const product: 'silicon' = 'silicon'; // MVP supports silicon only
  const compact = text.includes('compact') || text.includes('small');
  const countMatch = text.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)/);
  const wordToNum: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };
  let count = 1;
  if (countMatch) {
    const g = countMatch[1];
    count = /^\d+$/.test(g) ? parseInt(g, 10) : wordToNum[g] ?? 1;
  }
  const raw = { planet, product, count, compact };
  return PromptSchema.parse(raw);
}

