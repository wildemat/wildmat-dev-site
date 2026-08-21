import { describe, expect, it } from 'vitest';
import app from '../src/index.js';
import type { Env } from '../src/env.js';

const env: Env = {
  TODOIST_API_TOKEN: 'test-token',
  TODO_API_KEY: 'secret',
};

const rpc = (method: string, params?: unknown, id = 1) =>
  app.request(
    '/todo/mcp?key=secret',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    },
    env,
  );

describe('mcp endpoint', () => {
  it('rejects requests without the api key', async () => {
    const res = await app.request('/todo/mcp', { method: 'POST' }, env);
    expect(res.status).toBe(403);
  });

  it('accepts the key as a query param (ChatGPT connector style)', async () => {
    const res = await rpc('initialize', { protocolVersion: '2025-03-26' });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.result.protocolVersion).toBe('2025-03-26');
    expect(body.result.serverInfo.name).toBe('family-os-tasks');
    expect(body.result.instructions).toContain('Todoist contains the truth');
  });

  it('lists the full toolset', async () => {
    const res = await rpc('tools/list');
    const body: any = await res.json();
    const names = body.result.tools.map((t: any) => t.name);
    for (const expected of [
      'list_projects', 'get_project', 'list_sections', 'search_tasks',
      'create_project', 'create_section', 'create_label',
      'create_task', 'update_task', 'complete_task', 'reopen_task',
      'delete_task', 'move_task', 'assign_task', 'add_comment', 'list_labels',
      'today', 'next', 'waiting', 'blocked', 'sync', 'batch',
      'extract_action_items', 'extract_completed_items', 'extract_people', 'extract_dates',
    ]) {
      expect(names).toContain(expected);
    }
  });

  it('advertises an output schema for every tool', async () => {
    const res = await rpc('tools/list');
    const body: any = await res.json();
    const missing = body.result.tools
      .filter((t: any) => !t.outputSchema)
      .map((t: any) => t.name);
    expect(missing).toEqual([]);
  });

  it('returns structuredContent matching the declared shape', async () => {
    const res = await rpc('tools/call', {
      name: 'extract_people',
      arguments: { text: 'Court and Matt are handling it' },
    });
    const body: any = await res.json();
    expect(body.result.structuredContent).toEqual({ items: ['Matt', 'Courtney'] });
    expect(JSON.parse(body.result.content[0].text)).toEqual({ items: ['Matt', 'Courtney'] });
  });

  it('runs extraction tools without touching Todoist', async () => {
    const res = await rpc('tools/call', {
      name: 'extract_action_items',
      arguments: { text: 'We should hire movers.' },
    });
    const body: any = await res.json();
    expect(body.result.content[0].text).toContain('hire movers');
  });

  it('batch isolates failures and keeps going', async () => {
    const res = await rpc('tools/call', {
      name: 'batch',
      arguments: {
        operations: [
          { action: 'extract_action_items', text: 'We should hire movers.' },
          { action: 'not_a_real_action', task: 'whatever' },
          { action: 'extract_people', text: 'Matt is handling it' },
        ],
      },
    });
    const body: any = await res.json();
    const summary = JSON.parse(body.result.content[0].text);
    expect(summary.applied).toBe(2);
    expect(summary.failed).toBe(1);
    expect(summary.results[1].error).toContain('unknown tool');
    expect(summary.results[2].result).toContain('Matt');
  });

  it('accepts operations sent as a JSON string', async () => {
    const res = await rpc('tools/call', {
      name: 'batch',
      arguments: {
        operations: JSON.stringify([{ action: 'extract_people', text: 'Matt said so' }]),
      },
    });
    const body: any = await res.json();
    expect(body.result.structuredContent.applied).toBe(1);
  });

  it('accepts a single operation without the array wrapper', async () => {
    const res = await rpc('tools/call', {
      name: 'batch',
      arguments: { action: 'extract_people', text: 'Court said so' },
    });
    const body: any = await res.json();
    expect(body.result.structuredContent.applied).toBe(1);
  });

  it('errors instead of silently reporting an empty batch', async () => {
    const res = await rpc('tools/call', { name: 'batch', arguments: {} });
    const body: any = await res.json();
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain('No operations were supplied');
  });

  it('serves the maintain_tasks prompt', async () => {
    const res = await rpc('prompts/get', { name: 'maintain_tasks' });
    const body: any = await res.json();
    expect(body.result.messages[0].content.text).toContain('extract_action_items');
  });
});
