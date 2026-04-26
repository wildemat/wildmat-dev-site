import { readFacet, type Facet } from '../lib/r2.js';

export type LoadedFacet = { facet: Facet; content: string };

export async function loadFacets(bucket: R2Bucket, facets: Facet[]): Promise<LoadedFacet[]> {
  const results = await Promise.all(
    facets.map(async (facet) => {
      const content = await readFacet(bucket, facet);
      return content ? { facet, content } : null;
    }),
  );
  return results.filter((v): v is LoadedFacet => v !== null);
}

export function isScaffoldOnly(content: string): boolean {
  const stripped = content
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^#+\s.*$/gm, '')
    .trim();
  return stripped.length < 40;
}
