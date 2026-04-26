import type { Env } from '../env.js';
import type { Assessment, Platform } from './assess.js';
import type { LoadedFacet } from './select.js';

const PLATFORM_LENGTH_HINTS: Record<Platform, string> = {
  twitter: 'Keep it under 280 characters. Terse. One thought.',
  reddit: 'Can be 2-5 sentences. Conversational, paragraph form allowed.',
  youtube: 'Casual comment voice. 1-3 sentences.',
  slack: 'Informal, can use lowercase and short fragments. 1-3 sentences.',
  discord: 'Chatty, casual. 1-3 sentences.',
  imessage: 'Text-message voice. Lowercase OK. Can be fragmented.',
  email: 'Full sentences, mild structure. 2-6 sentences.',
  forum: 'Can be longer and structured. 3-8 sentences.',
  other: '1-4 sentences unless content warrants more.',
};

type SynthArgs = {
  env: Env;
  content: string;
  context?: string;
  tone_hint?: string;
  assessment: Assessment;
  facets: LoadedFacet[];
  safetyRules: string;
};

export async function synthesize(args: SynthArgs): Promise<string> {
  const { env, content, context, tone_hint, assessment, facets, safetyRules } = args;

  const personalityBlock = facets
    .map((f) => `### ${f.facet}\n\n${f.content}`)
    .join('\n\n---\n\n');

  const system = [
    'You are ghost-writing a response on behalf of a specific person. You must match their voice, emotional register, and interaction style exactly. The response will be posted as if they wrote it.',
    '',
    'Output ONLY the response text. No preamble, no explanation, no quotation marks, no "here is" framing.',
    '',
    '## Safety rules (non-negotiable, override everything else)',
    '',
    safetyRules,
    '',
    '## Personality reference',
    '',
    personalityBlock,
  ].join('\n');

  const user = [
    '## Content to respond to',
    '',
    content,
    context ? `\n## Additional context\n\n${context}` : '',
    tone_hint ? `\n## Tone hint from caller\n\n${tone_hint}` : '',
    '',
    '## Assessment',
    '',
    `- Topic: ${assessment.topic}`,
    `- Tone: ${assessment.tone}`,
    `- Emotional weight: ${assessment.emotional_weight}`,
    `- Intent: ${assessment.intent}`,
    `- Platform: ${assessment.platform}`,
    '',
    '## Platform length guidance',
    '',
    PLATFORM_LENGTH_HINTS[assessment.platform],
    '',
    'Write the response now. Output only the response text.',
  ].filter(Boolean).join('\n');

  return callAnthropic(env, system, user);
}

async function callAnthropic(env: Env, system: string, user: string): Promise<string> {
  const model = env.LLM_MODEL ?? 'claude-opus-4-7';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.LLM_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM call failed (${res.status}): ${body}`);
  }

  const data = await res.json() as {
    content: Array<{ type: string; text?: string }>;
  };

  const text = data.content
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text!)
    .join('')
    .trim();

  if (!text) throw new Error('LLM returned empty response');
  return text;
}
