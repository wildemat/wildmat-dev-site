import { beforeEach, describe, expect, it } from 'vitest';
import { TaskLookupError, TodoProvider } from '../src/provider.js';
import { FakeApi, testConfig } from './fake.js';

let api: FakeApi;
let provider: TodoProvider;

beforeEach(() => {
  api = new FakeApi();
  provider = new TodoProvider(api, testConfig);
});

describe('create', () => {
  it('applies smart defaults (project Moving, priority P3)', async () => {
    const result: any = await provider.createTask({ title: 'Order packing tape' });
    expect(result.action).toBe('created');
    const [, fields]: any = api.calls.at(-1);
    expect(fields.project_id).toBe('p1');
    expect(fields.priority).toBe(2);
  });

  it('updates the existing task instead of duplicating', async () => {
    const result: any = await provider.createTask({ title: 'Buy boxes' });
    expect(result.action).toBe('updated_existing');
    expect(result.task.id).toBe('t3');
    expect(api.calls.every(([name]) => name !== 'createTask')).toBe(true);
  });

  it('sends ISO dates as due_date and phrases as due_string', async () => {
    await provider.createTask({ title: 'Return modem', due: '2026-09-01' });
    expect((api.calls.at(-1)![1] as any).due_date).toBe('2026-09-01');
    await provider.createTask({ title: 'Book truck', due: 'next Friday' });
    expect((api.calls.at(-1)![1] as any).due_string).toBe('next Friday');
  });
});

describe('containers', () => {
  it('creates a project', async () => {
    const result: any = await provider.createProject('Homeschool');
    expect(result.action).toBe('created');
    expect(result.project.name).toBe('Homeschool');
    expect(api.calls.some(([name]) => name === 'createProject')).toBe(true);
  });

  it('returns the existing project instead of duplicating', async () => {
    const result: any = await provider.createProject('Moving');
    expect(result.action).toBe('exists');
    expect(result.project.id).toBe('p1');
    expect(api.calls.every(([name]) => name !== 'createProject')).toBe(true);
  });

  it('nests under a parent project', async () => {
    await provider.createProject('Closing docs', 'Moving');
    const call: any = api.calls.find(([name]) => name === 'createProject');
    expect(call[1]).toEqual(['Closing docs', 'p1']);
  });

  it('creates a section in the default project and dedupes', async () => {
    const created: any = await provider.createSection('School');
    expect(created.action).toBe('created');
    expect(created.section.project).toBe('Moving');
    const dupe: any = await provider.createSection('Utilities');
    expect(dupe.action).toBe('exists');
    expect(dupe.section.id).toBe('s1');
  });

  it('creates a label and dedupes', async () => {
    expect((await provider.createLabel('Errand') as any).action).toBe('created');
    expect((await provider.createLabel('Waiting') as any).action).toBe('exists');
  });
});

describe('complete', () => {
  it('resolves paraphrases and leaves an audit comment', async () => {
    const result: any = await provider.completeTask('changing the utilities', {
      speaker: 'Matt',
      quote: 'I called Duke Energy.',
    });
    expect(result.task.id).toBe('t1');
    expect(result.task.completed).toBe(true);
    expect(api.calls).toContainEqual(['closeTask', 't1']);
    const comment = api.comments.at(-1)!.content;
    expect(comment).toContain('Completed from ChatGPT conversation');
    expect(comment).toContain('Matt said:\n"I called Duke Energy."');
  });
});

describe('assign', () => {
  it('matches first names to collaborators', async () => {
    const result: any = await provider.assignTask('home inspection', 'Matt');
    expect(result.assignee).toBe('Matt Wilde');
    const update: any = api.calls.find(([name]) => name === 'updateTask');
    expect(update[1][1].assignee_id).toBe('u1');
  });

  it('matches the Court nickname', async () => {
    const result: any = await provider.assignTask('Buy boxes', 'Court');
    expect(result.assignee).toBe('Courtney Wilde');
  });
});

describe('completed tasks', () => {
  it('reopens a completed task found by name', async () => {
    await provider.completeTask('Buy boxes');
    const result: any = await provider.reopenTask('Buy boxes');
    expect(result.task.id).toBe('t3');
    expect(result.task.completed).toBe(false);
    expect(api.calls.some(([name]) => name === 'completedTasks')).toBe(true);
  });

  it('reaches a completed task by id', async () => {
    await provider.completeTask('Buy boxes');
    const result: any = await provider.addComment('t3', 'late note');
    expect(result.task.id).toBe('t3');
  });

  it('search includes completed tasks only when asked', async () => {
    await provider.completeTask('Buy boxes');
    expect((await provider.searchTasks('boxes')).length).toBe(0);
    const withDone: any = await provider.searchTasks('boxes', undefined, true);
    expect(withDone[0].id).toBe('t3');
  });
});

describe('move and update', () => {
  it('moves to an existing section', async () => {
    const result: any = await provider.moveTask('Buy boxes', { section: 'Utilities' });
    expect(result.task.section).toBe('Utilities');
  });

  it('creates a missing section on move', async () => {
    await provider.moveTask('Research schools', { section: 'School' });
    expect(api.calls.some(([name]) => name === 'createSection')).toBe(true);
  });

  it('updates due dates', async () => {
    const result: any = await provider.updateTask('home inspection', { due: '2026-10-01' });
    expect(result.task.due.date).toBe('2026-10-01');
  });
});

describe('views', () => {
  it('groups today by bucket and priority', async () => {
    const view: any = await provider.today();
    expect(view.overdue.P2[0].id).toBe('t2');
    expect(view.today.P4[0].id).toBe('t3');
    expect(view.upcoming_7_days.P4[0].id).toBe('t5');
  });

  it('next skips waiting and blocked, overdue first', async () => {
    const ids = (await provider.nextActions()).map((t: any) => t.id);
    expect(ids).not.toContain('t4');
    expect(ids).not.toContain('t5');
    expect(ids[0]).toBe('t2');
  });

  it('waiting and blocked views', async () => {
    expect((await provider.waiting()).map((t: any) => t.id)).toEqual(['t4']);
    expect((await provider.blocked()).map((t: any) => t.id)).toEqual(['t5']);
  });

  it('search resolves paraphrases', async () => {
    const hits: any = await provider.searchTasks('the movers');
    expect(hits[0].id).toBe('t4');
  });

  it('get_project returns the hierarchy', async () => {
    const detail: any = await provider.getProject('Moving');
    expect(detail.sections.map((s: any) => s.name)).toEqual(['Utilities', 'Packing']);
    expect(detail.sections[0].tasks[0].title).toBe('Change utilities');
    expect(detail.unsectioned_tasks.map((t: any) => t.id).sort()).toEqual(['t2', 't4', 't5']);
  });
});

describe('errors', () => {
  it('unknown project raises with known names', async () => {
    await expect(provider.getProject('Garage Sale')).rejects.toThrow(/Moving/);
  });

  it('unknown task raises TaskLookupError', async () => {
    await expect(provider.completeTask('negotiate salary review')).rejects.toThrow(TaskLookupError);
  });
});
