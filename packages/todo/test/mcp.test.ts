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
      'today', 'next', 'waiting', 'blocked', 'sync',
      'extract_action_items', 'extract_completed_items', 'extract_people', 'extract_dates',
    ]) {
      expect(names).toContain(expected);
    }
  });

  it('runs extraction tools without touching Todoist', async () => {
    const res = await rpc('tools/call', {
      name: 'extract_action_items',
      arguments: { text: 'We should hire movers.' },
    });
    const body: any = await res.json();
    expect(body.result.content[0].text).toContain('hire movers');
  });

  it('serves the maintain_tasks prompt', async () => {
    const res = await rpc('prompts/get', { name: 'maintain_tasks' });
    const body: any = await res.json();
    expect(body.result.messages[0].content.text).toContain('extract_action_items');
  });
});
