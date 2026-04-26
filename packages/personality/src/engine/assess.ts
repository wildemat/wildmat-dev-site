import type { Facet } from '../lib/r2.js';

export type Platform =
  | 'twitter'
  | 'reddit'
  | 'youtube'
  | 'slack'
  | 'discord'
  | 'imessage'
  | 'email'
  | 'forum'
  | 'other';

export type Assessment = {
  topic: string;
  tone: 'serious' | 'casual' | 'provocative' | 'humorous' | 'educational' | 'inflammatory' | 'emotional' | 'neutral';
  emotional_weight: 'high' | 'medium' | 'low';
  intent: 'question' | 'statement' | 'validation' | 'troll' | 'teaching' | 'share';
  platform: Platform;
  signals: {
    disagreement: boolean;
    expertise_adjacent: boolean;
    passion_adjacent: boolean;
    sensitive: boolean;
    needs_humor: boolean;
  };
};

type AssessInput = {
  content: string;
  platform?: string;
  context?: string;
  tone_hint?: string;
};

const POSITIVE = /\b(love|amazing|great|excited|awesome|incredible|beautiful|happy)\b/i;
const NEGATIVE = /\b(hate|awful|terrible|angry|furious|disgusting|horrible|sad|frustrat\w*)\b/i;
const QUESTION = /\?\s*$/;
const TROLL = /\b(cope|seethe|ratio|lol no|get a life|triggered)\b/i;
const SENSITIVE = /\b(addiction|depress\w*|anxiety|suicide|grief|loss|death|bankrupt\w*|divorce|trauma|abuse)\b/i;
const EXPERTISE_TERMS = /\b(framework|architecture|api|database|typescript|react|deploy\w*|cloud|infra|llm|model|agent|mcp)\b/i;
const PASSION_TERMS = /\b(music|running|coffee|hiking|travel|cycling|skiing|cooking|book|reading|gaming)\b/i;

function normalizePlatform(p?: string): Platform {
  const valid: Platform[] = [
    'twitter', 'reddit', 'youtube', 'slack', 'discord',
    'imessage', 'email', 'forum', 'other',
  ];
  if (p && (valid as string[]).includes(p.toLowerCase())) {
    return p.toLowerCase() as Platform;
  }
  return 'other';
}

export function assess(input: AssessInput): Assessment {
  const text = input.content;
  const hint = (input.tone_hint ?? '').toLowerCase();

  const isQuestion = QUESTION.test(text);
  const isTroll = TROLL.test(text) || /bad faith/i.test(hint);
  const isSensitive = SENSITIVE.test(text);
  const hasPositive = POSITIVE.test(text);
  const hasNegative = NEGATIVE.test(text);
  const needsHumor = /\b(joke|funny|haha|lol|lmao)\b/i.test(text) || /humor/i.test(hint);

  let tone: Assessment['tone'] = 'neutral';
  if (isSensitive) tone = 'emotional';
  else if (isTroll) tone = 'inflammatory';
  else if (needsHumor) tone = 'humorous';
  else if (hasNegative) tone = 'serious';
  else if (hasPositive) tone = 'casual';

  let emotional_weight: Assessment['emotional_weight'] = 'low';
  if (isSensitive || isTroll) emotional_weight = 'high';
  else if (hasPositive || hasNegative) emotional_weight = 'medium';

  let intent: Assessment['intent'] = 'statement';
  if (isTroll) intent = 'troll';
  else if (isQuestion) intent = 'question';
  else if (/\b(thoughts|what do you think|agree|opinion)\b/i.test(text)) intent = 'validation';
  else if (/\b(learn|tutorial|guide|how to)\b/i.test(text)) intent = 'teaching';
  else if (/\b(just|sharing|posted|check out)\b/i.test(text)) intent = 'share';

  return {
    topic: deriveTopic(text),
    tone,
    emotional_weight,
    intent,
    platform: normalizePlatform(input.platform),
    signals: {
      disagreement: /\b(disagree|wrong|actually|nah)\b/i.test(text),
      expertise_adjacent: EXPERTISE_TERMS.test(text),
      passion_adjacent: PASSION_TERMS.test(text),
      sensitive: isSensitive,
      needs_humor: needsHumor,
    },
  };
}

function deriveTopic(text: string): string {
  const firstSentence = text.split(/[.!?\n]/)[0] ?? text;
  return firstSentence.length > 140 ? firstSentence.slice(0, 137) + '...' : firstSentence.trim();
}

export function facetsFromAssessment(a: Assessment): Facet[] {
  const selected = new Set<Facet>(['voice', 'interaction-patterns']);

  if (a.emotional_weight !== 'low' || a.tone === 'emotional' || a.tone === 'inflammatory') {
    selected.add('emotions');
  }
  if (a.signals.expertise_adjacent || a.intent === 'teaching') {
    selected.add('experiences');
  }
  if (a.signals.passion_adjacent) {
    selected.add('interests');
  }
  if (a.signals.sensitive) {
    selected.add('struggles');
  }
  if (a.intent === 'validation' || a.signals.disagreement || a.tone === 'inflammatory') {
    selected.add('opinions');
  }
  if (a.tone === 'humorous' || a.signals.needs_humor) {
    selected.add('humor');
  }

  return Array.from(selected);
}
