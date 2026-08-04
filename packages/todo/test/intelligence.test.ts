import { describe, expect, it } from 'vitest';
import {
  extractActionItems,
  extractCompletedItems,
  extractDates,
  extractPeople,
} from '../src/intelligence.js';

describe('intelligence', () => {
  it('extracts action items', () => {
    const items = extractActionItems(
      'We should hire movers. Also we need to call Duke Energy about the transfer.',
    );
    expect(items).toContain('hire movers');
    expect(items.some((i) => i.toLowerCase().includes('call duke energy'))).toBe(true);
  });

  it('extracts imperative action items', () => {
    expect(extractActionItems("Don't forget to buy boxes!")).toEqual(['buy boxes']);
  });

  it('extracts completed items', () => {
    const items = extractCompletedItems(
      'I called Duke Energy. We already scheduled the inspection.',
    );
    expect(items.some((i) => i.toLowerCase().includes('called duke energy'))).toBe(true);
    expect(items.some((i) => i.toLowerCase().includes('scheduled the inspection'))).toBe(true);
  });

  it('normalizes the Court nickname', () => {
    expect(extractPeople('Court said Matt is handling it')).toEqual(['Matt', 'Courtney']);
  });

  it('extracts date expressions', () => {
    const found = extractDates(
      'Inspection is on 2026-08-15, movers come next week, closing not until October.',
    ).map((d) => d.toLowerCase());
    expect(found).toContain('2026-08-15');
    expect(found).toContain('next week');
    expect(found).toContain('not until october');
  });
});
