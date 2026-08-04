/**
 * Stateless JSON-RPC 2.0 MCP handler (same shape as the personality worker).
 * ChatGPT's streamable-HTTP client POSTs messages here; plain JSON responses
 * are valid per the MCP streamable HTTP transport.
 */

import type { Env } from './env.js';
import * as intelligence from './intelligence.js';
import { INSTRUCTIONS, MAINTAIN_TASKS_PROMPT } from './prompts.js';
import { TaskLookupError, TodoProvider } from './provider.js';
import { TodoistClient } from './todoist.js';

const SERVER_INFO = { name: 'family-os-tasks', version: '1.0.0' };
const SUPPORTED_PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];

type JsonRpcRequest = {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: unknown;
};

type JsonRpcResponse =
  | { jsonrpc: '2.0'; id: string | number | null; result: unknown }
  | { jsonrpc: '2.0'; id: string | number | null; error: { code: number; message: string } };

const str = (description: string) => ({ type: 'string', description });
const strArr = (description: string) => ({ type: 'array', items: { type: 'string' }, description });

const TASK_REF = str("Task id, or a natural-language reference like 'the inspection' — fuzzy matching finds it");
const PROJECT = str('Project name; omit for the default project (Moving)');

const TOOL_DEFS = [
  {
    name: 'list_projects',
    description: 'List all Todoist projects (Moving, House, Homeschool, ...).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_project',
    description:
      'Full hierarchy for one project: sections, tasks, subtasks, due dates, priorities, labels, and comments.',
    inputSchema: { type: 'object', properties: { name: PROJECT } },
  },
  {
    name: 'list_sections',
    description: 'List the sections of a project.',
    inputSchema: { type: 'object', properties: { project: PROJECT } },
  },
  {
    name: 'search_tasks',
    description:
      'Find tasks by meaning, not exact wording — "inspection", "movers", "changing the utilities" all locate the right task. Returns matches with scores, best first.',
    inputSchema: {
      type: 'object',
      properties: {
        query: str('What to look for'),
        project: PROJECT,
        include_completed: { type: 'boolean', description: 'Also search completed tasks' },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_task',
    description:
      'Create a task. Duplicate-safe: if a near-identical open task already exists it is updated instead of duplicated. Defaults: project Moving, priority P3.',
    inputSchema: {
      type: 'object',
      properties: {
        title: str('Short imperative title, e.g. "Hire movers"'),
        description: str('Optional details'),
        project: PROJECT,
        section: str('Section name; created if missing'),
        labels: strArr('Label names, e.g. ["Waiting", "Phone Call"]'),
        priority: { type: 'string', enum: ['P1', 'P2', 'P3', 'P4'], description: 'P1 = urgent' },
        due_date: str('YYYY-MM-DD or natural language ("next Friday")'),
        assignee: str('Family member first name (Matt, Courtney)'),
        parent_id: str('Parent task id to create a subtask'),
        context: str('Why this was created — kept as an audit comment'),
      },
      required: ['title'],
    },
  },
  {
    name: 'update_task',
    description: 'Update a task. Only supplied fields change.',
    inputSchema: {
      type: 'object',
      properties: {
        task: TASK_REF,
        title: str('New title'),
        description: str('New description'),
        priority: { type: 'string', enum: ['P1', 'P2', 'P3', 'P4'] },
        due_date: str('YYYY-MM-DD or natural language'),
        labels: strArr('Replacement label list'),
        section: str('Move to this section'),
        context: str('Why — kept as an audit comment'),
      },
      required: ['task'],
    },
  },
  {
    name: 'complete_task',
    description:
      'Mark a task complete. Pass speaker + quote (who said it, their exact words) so the audit comment records why it was closed.',
    inputSchema: {
      type: 'object',
      properties: {
        task: TASK_REF,
        comment: str('Optional completion note'),
        speaker: str('Who reported it done'),
        quote: str('Their exact words'),
      },
      required: ['task'],
    },
  },
  {
    name: 'reopen_task',
    description: 'Reopen a completed task.',
    inputSchema: { type: 'object', properties: { task: TASK_REF }, required: ['task'] },
  },
  {
    name: 'delete_task',
    description: 'Delete a task permanently. Prefer complete_task unless it was created by mistake.',
    inputSchema: { type: 'object', properties: { task: TASK_REF }, required: ['task'] },
  },
  {
    name: 'move_task',
    description: 'Move a task to another section and/or project.',
    inputSchema: {
      type: 'object',
      properties: { task: TASK_REF, section: str('Destination section'), project: str('Destination project') },
      required: ['task'],
    },
  },
  {
    name: 'assign_task',
    description: 'Assign a task to a family member by first name (Matt, Courtney).',
    inputSchema: {
      type: 'object',
      properties: { task: TASK_REF, person: str('First name') },
      required: ['task', 'person'],
    },
  },
  {
    name: 'add_comment',
    description: 'Add a comment to a task.',
    inputSchema: {
      type: 'object',
      properties: { task: TASK_REF, content: str('Comment text') },
      required: ['task', 'content'],
    },
  },
  {
    name: 'list_labels',
    description: 'List available labels (Waiting, Errand, Quick Win, ...).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'today',
    description: 'Overdue, due-today, and next-7-days tasks, grouped by priority.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'next',
    description:
      'The next logical actions: overdue and high-priority first, skipping anything Waiting, Blocked, or Someday.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Max results (default 8)' } },
    },
  },
  {
    name: 'waiting',
    description: 'Tasks labeled Waiting — blocked on someone else.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'blocked',
    description:
      "Tasks that are blocked (Blocked label, or 'blocked by' / 'waiting on' / 'depends on' in the description).",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'sync',
    description: 'Verify Todoist connectivity and report workspace counts.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'extract_action_items',
    description:
      'Pull candidate new tasks out of conversation text ("we should hire movers" → "hire movers"). Check each against search_tasks before creating.',
    inputSchema: { type: 'object', properties: { text: str('Conversation text') }, required: ['text'] },
  },
  {
    name: 'extract_completed_items',
    description:
      'Pull finished-work reports out of conversation text ("I called Duke Energy" → "called Duke Energy"). Match each against open tasks and complete them.',
    inputSchema: { type: 'object', properties: { text: str('Conversation text') }, required: ['text'] },
  },
  {
    name: 'extract_people',
    description: 'Family members mentioned in the text (canonical names).',
    inputSchema: { type: 'object', properties: { text: str('Conversation text') }, required: ['text'] },
  },
  {
    name: 'extract_dates',
    description: 'Date expressions mentioned in the text, verbatim.',
    inputSchema: { type: 'object', properties: { text: str('Conversation text') }, required: ['text'] },
  },
] as const;

function ok(id: JsonRpcRequest['id'], result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id: id ?? null, result };
}

function err(id: JsonRpcRequest['id'], code: number, message: string): JsonRpcResponse {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

function toolContent(payload: unknown, isError = false) {
  return {
    ...(isError ? { isError: true } : {}),
    content: [
      { type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2) },
    ],
  };
}

function buildProvider(env: Env): TodoProvider {
  return new TodoProvider(new TodoistClient(env.TODOIST_API_TOKEN), {
    defaultProject: env.DEFAULT_PROJECT ?? 'Moving',
    defaultPriority: env.DEFAULT_PRIORITY ?? 'P3',
    duplicateThreshold: Number(env.DUPLICATE_THRESHOLD ?? '0.9'),
  });
}

/* eslint-disable @typescript-eslint/no-explicit-any */

async function handleToolCall(env: Env, name: string, args: any): Promise<unknown> {
  const provider = buildProvider(env);
  switch (name) {
    case 'list_projects':
      return toolContent(await provider.listProjects());
    case 'get_project':
      return toolContent(await provider.getProject(args.name));
    case 'list_sections': {
      const detail: any = await provider.getProject(args.project);
      return toolContent(
        detail.sections.map((s: any) => ({ name: s.name, open_tasks: s.tasks.length })),
      );
    }
    case 'search_tasks':
      return toolContent(await provider.searchTasks(args.query, args.project, args.include_completed));
    case 'create_task':
      return toolContent(
        await provider.createTask({
          title: args.title,
          description: args.description,
          project: args.project,
          section: args.section,
          labels: args.labels,
          priority: args.priority,
          due: args.due_date,
          assignee: args.assignee,
          parentId: args.parent_id,
          context: args.context,
        }),
      );
    case 'update_task':
      return toolContent(
        await provider.updateTask(args.task, {
          title: args.title,
          description: args.description,
          priority: args.priority,
          due: args.due_date,
          labels: args.labels,
          section: args.section,
          context: args.context,
        }),
      );
    case 'complete_task':
      return toolContent(
        await provider.completeTask(args.task, {
          comment: args.comment,
          speaker: args.speaker,
          quote: args.quote,
        }),
      );
    case 'reopen_task':
      return toolContent(await provider.reopenTask(args.task));
    case 'delete_task':
      return toolContent(await provider.deleteTask(args.task));
    case 'move_task':
      return toolContent(await provider.moveTask(args.task, { section: args.section, project: args.project }));
    case 'assign_task':
      return toolContent(await provider.assignTask(args.task, args.person));
    case 'add_comment':
      return toolContent(await provider.addComment(args.task, args.content));
    case 'list_labels':
      return toolContent(await provider.listLabels());
    case 'today':
      return toolContent(await provider.today());
    case 'next':
      return toolContent(await provider.nextActions(args.limit ?? 8));
    case 'waiting':
      return toolContent(await provider.waiting());
    case 'blocked':
      return toolContent(await provider.blocked());
    case 'sync':
      return toolContent(await provider.sync());
    case 'extract_action_items':
      return toolContent(intelligence.extractActionItems(args.text ?? ''));
    case 'extract_completed_items':
      return toolContent(intelligence.extractCompletedItems(args.text ?? ''));
    case 'extract_people':
      return toolContent(intelligence.extractPeople(args.text ?? ''));
    case 'extract_dates':
      return toolContent(intelligence.extractDates(args.text ?? ''));
    default:
      return toolContent(`unknown tool: ${name}`, true);
  }
}

export async function handleRpc(env: Env, req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  if (req.jsonrpc !== '2.0' || typeof req.method !== 'string') {
    return err(req.id ?? null, -32600, 'invalid request');
  }
  try {
    switch (req.method) {
      case 'initialize': {
        const requested = (req.params as any)?.protocolVersion;
        return ok(req.id, {
          protocolVersion: SUPPORTED_PROTOCOLS.includes(requested) ? requested : '2025-03-26',
          serverInfo: SERVER_INFO,
          capabilities: { tools: {}, prompts: {} },
          instructions: INSTRUCTIONS,
        });
      }
      case 'notifications/initialized':
      case 'notifications/cancelled':
        return null;
      case 'ping':
        return ok(req.id, {});
      case 'tools/list':
        return ok(req.id, { tools: TOOL_DEFS });
      case 'tools/call': {
        const params = (req.params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
        if (!params.name) return err(req.id, -32602, 'missing tool name');
        try {
          return ok(req.id, await handleToolCall(env, params.name, params.arguments ?? {}));
        } catch (e) {
          if (e instanceof TaskLookupError) return ok(req.id, toolContent(e.message, true));
          throw e;
        }
      }
      case 'prompts/list':
        return ok(req.id, {
          prompts: [
            {
              name: 'maintain_tasks',
              description: 'Sweep the current conversation and reconcile Todoist to match it.',
            },
          ],
        });
      case 'prompts/get': {
        const params = (req.params ?? {}) as { name?: string };
        if (params.name !== 'maintain_tasks') return err(req.id, -32602, `unknown prompt: ${params.name}`);
        return ok(req.id, {
          messages: [{ role: 'user', content: { type: 'text', text: MAINTAIN_TASKS_PROMPT } }],
        });
      }
      case 'resources/list':
        return ok(req.id, { resources: [] });
      default:
        return err(req.id, -32601, `method not found: ${req.method}`);
    }
  } catch (e) {
    return err(req.id ?? null, -32000, e instanceof Error ? e.message : String(e));
  }
}

export async function handleMcpRequest(env: Env, request: Request): Promise<Response> {
  if (request.method === 'GET') {
    return new Response('MCP endpoint — POST JSON-RPC 2.0 messages here.', {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    });
  }
  if (request.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonRpcResponse(err(null, -32700, 'parse error'));
  }

  if (Array.isArray(body)) {
    const responses = await Promise.all(body.map((msg) => handleRpc(env, msg as JsonRpcRequest)));
    const filtered = responses.filter((r): r is JsonRpcResponse => r !== null);
    if (filtered.length === 0) return new Response(null, { status: 202 });
    return jsonRpcResponse(filtered);
  }

  const response = await handleRpc(env, body as JsonRpcRequest);
  if (response === null) return new Response(null, { status: 202 });
  return jsonRpcResponse(response);
}

function jsonRpcResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
