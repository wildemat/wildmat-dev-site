import type { Env } from '../env.js';
import { listAvailableFacets, readSyncMeta } from '../lib/r2.js';

export type HealthResult = {
  status: 'ok';
  last_sync: string | null;
  facets_available: string[];
  version: string;
};

export async function runHealth(env: Env): Promise<HealthResult> {
  const [facets, sync] = await Promise.all([
    listAvailableFacets(env.PERSONALITY_REFS),
    readSyncMeta(env.PERSONALITY_REFS),
  ]);

  return {
    status: 'ok',
    last_sync: sync?.timestamp ?? null,
    facets_available: facets,
    version: '1.0.0',
  };
}
