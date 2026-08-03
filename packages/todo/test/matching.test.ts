import { describe, expect, it } from 'vitest';
import { findMatch, normalize, search } from '../src/matching.js';
import { priorityToApi, priorityToLabel } from '../src/todoist.js';
import type { Task } from '../src/todoist.js';

const task = (content: string, id = 't1'): Task => ({
  id,
  content,
  description: '',
  projectId: 'p1',
  priority: 1,
  labels: [],
  completed: false,
});

describe('matching', () => {
  it('normalizes away noise words', () => {
    expect(normalize('We need to CALL the movers!')).toBe('movers');
  });

  it('matches exact duplicates', () => {
    const tasks = [task('Buy boxes')];
    expect(findMatch('Buy boxes', tasks, 0.9)).toBe(tasks[0]);
  });

  it('matches paraphrases', () => {
    const tasks = [task('Change utilities'), task('Buy boxes', 't2')];
    expect(findMatch('We finished changing the utilities', tasks, 0.85)).toBe(tasks[0]);
  });

  it('does not match unrelated text', () => {
    expect(findMatch('Book a dentist appointment', [task('Change utilities')], 0.9)).toBeUndefined();
  });

  it('scores substring hits highest in search', () => {
    const tasks = [task('Schedule home inspection'), task('Buy boxes', 't2')];
    const results = search('inspection', tasks);
    expect(results[0][0].content).toBe('Schedule home inspection');
    expect(results[0][1]).toBe(1.0);
    expect(results.map(([t]) => t.content)).not.toContain('Buy boxes');
  });
});

describe('priority mapping', () => {
  it('round-trips UI labels and API values', () => {
    expect(priorityToApi('P1')).toBe(4);
    expect(priorityToApi('p4')).toBe(1);
    expect(priorityToApi(undefined)).toBe(2); // default P3
    expect(priorityToLabel(4)).toBe('P1');
    expect(priorityToLabel(priorityToApi('P2'))).toBe('P2');
  });
});
