/**
 * Heuristic conversation extractors. Deterministic regex pre-digestion —
 * the LLM on the other side of MCP does the actual judgment.
 */

const SENTENCE_SPLIT = /(?<=[.!?])\s+|\n+/;

const ACTION_LEAD =
  /\b(?:we|i|you)?\s*(?:should|need to|needs to|have to|must|gotta)\s+(.{3,100}?)(?:[.!?]|$)/i;
const ACTION_IMPERATIVE = /^(?:let'?s|remember to|don'?t forget to|todo:?)\s+(.{3,100}?)(?:[.!?]|$)/i;

const DONE =
  /\b(?:i|we|matt|court(?:ney)?)\s+(?:already\s+)?(called|finished|completed|scheduled|booked|paid|sent|signed|canceled|cancelled|submitted|ordered|picked up|dropped off|did|handled|set up)\s+(.{3,100}?)(?:[.!?]|$)/i;

const FAMILY = ['Matt', 'Courtney', 'Court'];

const DATE = new RegExp(
  '\\b(?:' +
    '\\d{4}-\\d{2}-\\d{2}' +
    '|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?' +
    '|\\d{1,2}/\\d{1,2}(?:/\\d{2,4})?' +
    '|(?:mon|tues?|wednes|thurs?|fri|satur|sun)day' +
    '|tomorrow|today|tonight' +
    '|next\\s+(?:week|month|weekend|mon|tues?|wednes|thurs?|fri|satur|sun)[a-z]*' +
    '|(?:not\\s+until|by|before|after)\\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*' +
    ')\\b',
  'gi',
);

function clean(fragment: string): string {
  return fragment.trim().replace(/^"|"$/g, '').replace(/[,;:]+$/, '').trim();
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}

/** Phrases that look like new commitments ("we should hire movers"). */
export function extractActionItems(text: string): string[] {
  const items: string[] = [];
  for (const sentence of text.split(SENTENCE_SPLIT)) {
    for (const pattern of [ACTION_LEAD, ACTION_IMPERATIVE]) {
      const match = pattern.exec(sentence.trim());
      if (match) {
        items.push(clean(match[1]));
        break;
      }
    }
  }
  return dedupe(items);
}

/** Phrases that report finished work ("I called Duke Energy"). */
export function extractCompletedItems(text: string): string[] {
  const items: string[] = [];
  for (const sentence of text.split(SENTENCE_SPLIT)) {
    const match = DONE.exec(sentence.trim());
    if (match) items.push(clean(`${match[1]} ${match[2]}`));
  }
  return dedupe(items);
}

export function extractPeople(text: string): string[] {
  const found = FAMILY.filter((name) => new RegExp(`\\b${name}\\b`).test(text));
  const canonical = found.map((name) => (name === 'Court' ? 'Courtney' : name));
  return dedupe(canonical);
}

export function extractDates(text: string): string[] {
  return dedupe([...text.matchAll(DATE)].map((m) => m[0]));
}
