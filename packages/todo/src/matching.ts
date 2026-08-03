/**
 * Fuzzy task matching for duplicate detection and natural-language lookup.
 * Normalization + light stemming + Levenshtein/token-set ratios, so
 * "we finished changing the utilities" matches the task "Change utilities".
 */

import type { Task } from './todoist.js';

const STOPWORDS = new Set([
  'a', 'an', 'the', 'to', 'of', 'for', 'on', 'in', 'at', 'we', 'i', 'our',
  'my', 'need', 'needs', 'should', 'must', 'have', 'has', 'already', 'did',
  'done', 'finished', 'finish', 'completed', 'complete', 'call', 'called',
  'get', 'got', 'is', 'are', 'was', 'were', 'it', 'that', 'this', 'and',
]);

export function normalize(text: string): string {
  const cleaned = text.toLowerCase().replace(/[^\w\s]/g, ' ');
  const words = cleaned.split(/\s+/).filter((w) => w && !STOPWORDS.has(w));
  return words.join(' ') || text.trim().toLowerCase();
}

function stem(word: string): string {
  for (const suffix of ['ing', 'ed', 'es', 's']) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

function stemmed(text: string): string {
  return normalize(text).split(' ').map(stem).join(' ');
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

function ratio(a: string, b: string): number {
  if (!a && !b) return 1;
  const max = Math.max(a.length, b.length);
  return max === 0 ? 1 : 1 - levenshtein(a, b) / max;
}

function tokenSetRatio(a: string, b: string): number {
  const setA = new Set(a.split(' ').filter(Boolean));
  const setB = new Set(b.split(' ').filter(Boolean));
  const both = [...setA].filter((t) => setB.has(t)).sort().join(' ');
  const onlyA = [...setA].filter((t) => !setB.has(t)).sort().join(' ');
  const onlyB = [...setB].filter((t) => !setA.has(t)).sort().join(' ');
  const combined = (base: string, extra: string) => (extra ? `${base} ${extra}`.trim() : base);
  return Math.max(
    ratio(both, combined(both, onlyA)),
    ratio(both, combined(both, onlyB)),
    ratio(combined(both, onlyA), combined(both, onlyB)),
  );
}

/** 0..1 score combining full-string and token-set similarity. */
export function similarity(a: string, b: string): number {
  const na = stemmed(a);
  const nb = stemmed(b);
  if (!na || !nb) return 0;
  return Math.max(ratio(na, nb), tokenSetRatio(na, nb));
}

export function rank(query: string, tasks: Task[]): Array<[Task, number]> {
  return tasks
    .map((task): [Task, number] => [task, similarity(query, task.content)])
    .sort((x, y) => y[1] - x[1]);
}

export function findMatch(query: string, tasks: Task[], threshold: number): Task | undefined {
  const ranked = rank(query, tasks);
  return ranked.length && ranked[0][1] >= threshold ? ranked[0][0] : undefined;
}

/** Loose search: substring hits score 1.0, otherwise fuzzy, floor 0.45. */
export function search(query: string, tasks: Task[], limit = 10): Array<[Task, number]> {
  const needle = normalize(query);
  const results: Array<[Task, number]> = [];
  for (const task of tasks) {
    const haystack = normalize(`${task.content} ${task.description}`);
    if (needle && haystack.includes(needle)) {
      results.push([task, 1.0]);
    } else {
      const score = similarity(query, task.content);
      if (score >= 0.45) results.push([task, score]);
    }
  }
  return results.sort((x, y) => y[1] - x[1]).slice(0, limit);
}
