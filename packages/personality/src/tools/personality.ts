import type { Env } from '../env.js';
import { readFacet, readSafetyRules, FACETS, type Facet } from '../lib/r2.js';

const EXTENDED_FACETS = [...FACETS, 'safety-rules'] as const;
export type FacetName = typeof EXTENDED_FACETS[number];

export function isFacetName(value: string): value is FacetName {
  return (EXTENDED_FACETS as readonly string[]).includes(value);
}

export async function getPersonality(env: Env, facet: FacetName): Promise<{ facet: FacetName; content: string } | null> {
  if (facet === 'safety-rules') {
    const content = await readSafetyRules(env.PERSONALITY_REFS);
    return content ? { facet, content } : null;
  }
  const content = await readFacet(env.PERSONALITY_REFS, facet as Facet);
  return content ? { facet, content } : null;
}

export { EXTENDED_FACETS };
