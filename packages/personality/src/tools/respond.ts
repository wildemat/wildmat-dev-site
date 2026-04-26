import type { Env } from '../env.js';
import { assess, facetsFromAssessment } from '../engine/assess.js';
import { isScaffoldOnly, loadFacets } from '../engine/select.js';
import { synthesize } from '../engine/synthesize.js';
import { validateResponse } from '../engine/validate.js';
import { readFacet, readSafetyRules } from '../lib/r2.js';

export type RespondInput = {
  content: string;
  platform?: string;
  context?: string;
  tone_hint?: string;
};

export type RespondResult = {
  response: string;
  facets_used: string[];
  platform_adjusted: boolean;
  safety_validated: boolean;
};

export async function runRespond(env: Env, input: RespondInput): Promise<RespondResult> {
  if (!input.content || typeof input.content !== 'string') {
    throw new Error('content is required');
  }

  const [safetyRules, voice] = await Promise.all([
    readSafetyRules(env.PERSONALITY_REFS),
    readFacet(env.PERSONALITY_REFS, 'voice'),
  ]);

  if (!safetyRules) throw new Error('safety rules not found in R2 — sync personality-refs bucket');
  if (!voice) throw new Error('voice.md not found in R2 — sync personality-refs bucket');
  if (isScaffoldOnly(voice)) {
    throw new Error(
      'personality references have not been populated yet. Run an update session against the source repo and re-sync.',
    );
  }

  const assessment = assess(input);
  const selected = facetsFromAssessment(assessment);
  const loaded = await loadFacets(env.PERSONALITY_REFS, selected);

  if (!loaded.some((l) => l.facet === 'voice')) {
    loaded.unshift({ facet: 'voice', content: voice });
  }

  const response = await synthesize({
    env,
    content: input.content,
    context: input.context,
    tone_hint: input.tone_hint,
    assessment,
    facets: loaded,
    safetyRules,
  });

  const validation = validateResponse(response);
  if (!validation.ok) {
    throw new Error(`generated response failed safety validation: ${validation.violations.join('; ')}`);
  }

  return {
    response,
    facets_used: loaded.map((l) => l.facet),
    platform_adjusted: assessment.platform !== 'other',
    safety_validated: true,
  };
}
