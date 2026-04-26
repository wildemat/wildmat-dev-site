export type Facet =
  | 'voice'
  | 'emotions'
  | 'experiences'
  | 'interests'
  | 'struggles'
  | 'opinions'
  | 'humor'
  | 'interaction-patterns';

export const FACETS: Facet[] = [
  'voice',
  'emotions',
  'experiences',
  'interests',
  'struggles',
  'opinions',
  'humor',
  'interaction-patterns',
];

const FACET_KEY = (facet: Facet) => `references/${facet}.md`;
const SAFETY_KEY = 'rules/safety.md';
const SYNC_KEY = 'meta/last-sync.json';

export async function readFacet(bucket: R2Bucket, facet: Facet): Promise<string | null> {
  const obj = await bucket.get(FACET_KEY(facet));
  return obj ? await obj.text() : null;
}

export async function readSafetyRules(bucket: R2Bucket): Promise<string | null> {
  const obj = await bucket.get(SAFETY_KEY);
  return obj ? await obj.text() : null;
}

export type SyncMeta = { timestamp: string; commit?: string };

export async function readSyncMeta(bucket: R2Bucket): Promise<SyncMeta | null> {
  const obj = await bucket.get(SYNC_KEY);
  if (!obj) return null;
  try {
    return JSON.parse(await obj.text()) as SyncMeta;
  } catch {
    return null;
  }
}

export async function listAvailableFacets(bucket: R2Bucket): Promise<Facet[]> {
  const listing = await bucket.list({ prefix: 'references/' });
  const present = new Set(
    listing.objects
      .map((o) => o.key.replace(/^references\//, '').replace(/\.md$/, ''))
      .filter((name): name is Facet => (FACETS as string[]).includes(name)),
  );
  return FACETS.filter((f) => present.has(f));
}
