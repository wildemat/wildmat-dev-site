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

class UnknownToolError extends Error {}

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
    name: 'create_project',
    description:
      'Create a new project (e.g. Moving, Homeschool). Duplicate-safe: if a project with a near-identical name exists it is returned instead of creating a second one.',
    inputSchema: {
      type: 'object',
      properties: {
        name: str('Project name'),
        parent: str('Optional parent project name, to nest this one under it'),
      },
      required: ['name'],
    },
  },
  {
    name: 'create_section',
    description:
      'Create a section inside a project (e.g. Utilities, Packing). Duplicate-safe. Sections are also created automatically when create_task or move_task names an unknown one.',
    inputSchema: {
      type: 'object',
      properties: { name: str('Section name'), project: PROJECT },
      required: ['name'],
    },
  },
  {
    name: 'create_label',
    description: 'Create a label (e.g. Waiting, Errand). Duplicate-safe.',
    inputSchema: { type: 'object', properties: { name: str('Label name') }, required: ['name'] },
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
    name: 'batch',
    description:
      'Apply several changes in ONE call. Prefer this whenever a message implies more than one change ("Matt scheduled the inspection, we still need to call movers, and Courtney is handling the school forms"). Operations run in order and are independent: one failure does not stop the rest. Each operation takes the same fields as its single tool.',
    inputSchema: {
      type: 'object',
      properties: {
        operations: {
          type: 'array',
          description: 'Changes to apply, in order',
          items: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                description: 'Which change to make',
                enum: [
                  'create', 'update', 'complete', 'reopen', 'delete',
                  'assign', 'comment', 'move', 'project', 'section', 'label',
                ],
              },
              task: TASK_REF,
              title: str('create/update: task title'),
              description: str('create/update: task details'),
              name: str('project/section/label: the name to create'),
              project: PROJECT,
              section: str('Section name'),
              labels: strArr('Label names'),
              priority: { type: 'string', enum: ['P1', 'P2', 'P3', 'P4'] },
              due_date: str('YYYY-MM-DD or natural language'),
              assignee: str('create: assign to this first name'),
              person: str('assign: first name to assign to'),
              parent_id: str('create: parent task id for a subtask'),
              content: str('comment: the comment text'),
              speaker: str('complete: who reported it done'),
              quote: str('complete: their exact words'),
              context: str('Why — kept as an audit comment'),
            },
            required: ['action'],
          },
        },
      },
      required: ['operations'],
    },
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


/* ---- output schemas (MCP 2025-06-18) --------------------------------- */

const TASK_SHAPE = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    project: { type: 'string' },
    section: { type: 'string' },
    priority: { type: 'string' },
    labels: { type: 'array', items: { type: 'string' } },
    due: {
      type: 'object',
      properties: { date: { type: 'string' }, string: { type: 'string' } },
    },
    assignee: { type: 'string' },
    completed: { type: 'boolean' },
    match_score: { type: 'number' },
  },
  required: ['id', 'title', 'completed'],
} as const;

const NAMED = (extra: Record<string, unknown> = {}) => ({
  type: 'object',
  properties: { id: { type: 'string' }, name: { type: 'string' }, ...extra },
  required: ['id', 'name'],
});

const listOf = (key: string, items: unknown) => ({
  type: 'object',
  properties: { [key]: { type: 'array', items } },
  required: [key],
});

const mutation = (extra: Record<string, unknown> = {}) => ({
  type: 'object',
  properties: {
    action: { type: 'string', description: 'What happened, e.g. created / updated_existing / exists' },
    reason: { type: 'string' },
    ...extra,
  },
  required: ['action'],
});

const TASK_GROUPS = { type: 'object', additionalProperties: { type: 'array', items: TASK_SHAPE } };

const SECTION_TASKS = {
  type: 'object',
  properties: { name: { type: 'string' }, tasks: { type: 'array', items: TASK_SHAPE } },
};

const OUTPUT_SCHEMAS: Record<string, unknown> = {
  list_projects: listOf('projects', NAMED({ shared: { type: 'boolean' } })),
  get_project: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      sections: { type: 'array', items: SECTION_TASKS },
      unsectioned_tasks: { type: 'array', items: TASK_SHAPE },
      open_task_count: { type: 'number' },
    },
    required: ['name', 'sections', 'open_task_count'],
  },
  list_sections: listOf('sections', {
    type: 'object',
    properties: { name: { type: 'string' }, open_tasks: { type: 'number' } },
  }),
  list_labels: listOf('labels', NAMED()),
  search_tasks: listOf('tasks', TASK_SHAPE),
  next: listOf('tasks', TASK_SHAPE),
  waiting: listOf('tasks', TASK_SHAPE),
  blocked: listOf('tasks', TASK_SHAPE),
  create_project: mutation({ project: NAMED({ shared: { type: 'boolean' } }) }),
  create_section: mutation({
    section: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, project: { type: 'string' } } },
  }),
  create_label: mutation({ label: NAMED() }),
  create_task: mutation({ task: TASK_SHAPE }),
  update_task: mutation({ task: TASK_SHAPE }),
  complete_task: mutation({ task: TASK_SHAPE }),
  reopen_task: mutation({ task: TASK_SHAPE }),
  delete_task: mutation({ task: TASK_SHAPE }),
  move_task: mutation({ task: TASK_SHAPE }),
  add_comment: mutation({ task: TASK_SHAPE }),
  assign_task: mutation({ assignee: { type: 'string' }, task: TASK_SHAPE }),
  today: {
    type: 'object',
    properties: { overdue: TASK_GROUPS, today: TASK_GROUPS, upcoming_7_days: TASK_GROUPS },
    required: ['overdue', 'today', 'upcoming_7_days'],
  },
  sync: {
    type: 'object',
    properties: {
      synced: { type: 'boolean' },
      projects: { type: 'number' },
      open_tasks: { type: 'number' },
      labels: { type: 'number' },
    },
    required: ['synced'],
  },
  batch: {
    type: 'object',
    properties: {
      applied: { type: 'number' },
      failed: { type: 'number' },
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            index: { type: 'number' },
            action: { type: 'string' },
            status: { type: 'string', enum: ['ok', 'error'] },
            error: { type: 'string' },
          },
          required: ['index', 'action', 'status'],
        },
      },
    },
    required: ['applied', 'failed', 'results'],
  },
  extract_action_items: listOf('items', { type: 'string' }),
  extract_completed_items: listOf('items', { type: 'string' }),
  extract_people: listOf('items', { type: 'string' }),
  extract_dates: listOf('items', { type: 'string' }),
};

// Structured output must be a JSON object, so array results are named.
const ARRAY_KEYS: Record<string, string> = {
  list_projects: 'projects',
  list_sections: 'sections',
  list_labels: 'labels',
  search_tasks: 'tasks',
  next: 'tasks',
  waiting: 'tasks',
  blocked: 'tasks',
  extract_action_items: 'items',
  extract_completed_items: 'items',
  extract_people: 'items',
  extract_dates: 'items',
};

function ok(id: JsonRpcRequest['id'], result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id: id ?? null, result };
}

function err(id: JsonRpcRequest['id'], code: number, message: string): JsonRpcResponse {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

function toolContent(payload: unknown, isError = false) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  return {
    ...(isError ? { isError: true } : {}),
    // The text block stays for clients that ignore structured output.
    content: [{ type: 'text', text }],
    ...(isError || typeof payload !== 'object' || payload === null
      ? {}
      : { structuredContent: payload }),
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

/** Runs one tool against a shared provider, returning its raw result. */
async function execTool(provider: TodoProvider, name: string, args: any): Promise<unknown> {
  switch (name) {
    case 'list_projects':
      return (await provider.listProjects());
    case 'get_project':
      return (await provider.getProject(args.name));
    case 'create_project':
      return (await provider.createProject(args.name, args.parent));
    case 'create_section':
      return (await provider.createSection(args.name, args.project));
    case 'create_label':
      return (await provider.createLabel(args.name));
    case 'list_sections': {
      const detail: any = await provider.getProject(args.project);
      return (
        detail.sections.map((s: any) => ({ name: s.name, open_tasks: s.tasks.length }))
      );
    }
    case 'search_tasks':
      return (await provider.searchTasks(args.query, args.project, args.include_completed));
    case 'create_task':
      return (
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
        })
      );
    case 'update_task':
      return (
        await provider.updateTask(args.task, {
          title: args.title,
          description: args.description,
          priority: args.priority,
          due: args.due_date,
          labels: args.labels,
          section: args.section,
          context: args.context,
        })
      );
    case 'complete_task':
      return (
        await provider.completeTask(args.task, {
          comment: args.comment,
          speaker: args.speaker,
          quote: args.quote,
        })
      );
    case 'reopen_task':
      return (await provider.reopenTask(args.task));
    case 'delete_task':
      return (await provider.deleteTask(args.task));
    case 'move_task':
      return (await provider.moveTask(args.task, { section: args.section, project: args.project }));
    case 'assign_task':
      return (await provider.assignTask(args.task, args.person));
    case 'add_comment':
      return (await provider.addComment(args.task, args.content));
    case 'list_labels':
      return (await provider.listLabels());
    case 'today':
      return (await provider.today());
    case 'next':
      return (await provider.nextActions(args.limit ?? 8));
    case 'waiting':
      return (await provider.waiting());
    case 'blocked':
      return (await provider.blocked());
    case 'sync':
      return (await provider.sync());
    case 'extract_action_items':
      return (intelligence.extractActionItems(args.text ?? ''));
    case 'extract_completed_items':
      return (intelligence.extractCompletedItems(args.text ?? ''));
    case 'extract_people':
      return (intelligence.extractPeople(args.text ?? ''));
    case 'extract_dates':
      return (intelligence.extractDates(args.text ?? ''));
    default:
      throw new UnknownToolError(`unknown tool: ${name}`);
  }
}


const BATCH_ALIASES: Record<string, string> = {
  create: 'create_task',
  update: 'update_task',
  complete: 'complete_task',
  reopen: 'reopen_task',
  delete: 'delete_task',
  assign: 'assign_task',
  comment: 'add_comment',
  move: 'move_task',
  project: 'create_project',
  section: 'create_section',
  label: 'create_label',
};

/**
 * Applies operations in order against one provider. A failing operation is
 * recorded and the rest still run — a bad reference in step 2 must not
 * silently drop steps 3..n.
 */
async function runBatch(provider: TodoProvider, operations: any[]): Promise<unknown> {
  const results = [];
  for (const [index, op] of operations.entries()) {
    const action = String(op?.action ?? '');
    const tool = BATCH_ALIASES[action] ?? action;
    try {
      results.push({ index, action, status: 'ok', result: await execTool(provider, tool, op) });
    } catch (e) {
      results.push({
        index,
        action,
        status: 'error',
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return {
    applied: results.filter((r) => r.status === 'ok').length,
    failed: results.filter((r) => r.status === 'error').length,
    results,
  };
}

async function handleToolCall(env: Env, name: string, args: any): Promise<unknown> {
  const provider = buildProvider(env);
  try {
    const result =
      name === 'batch'
        ? await runBatch(provider, Array.isArray(args.operations) ? args.operations : [])
        : await execTool(provider, name, args);
    const key = ARRAY_KEYS[name];
    return toolContent(key && Array.isArray(result) ? { [key]: result } : result);
  } catch (e) {
    if (e instanceof UnknownToolError) return toolContent(e.message, true);
    throw e;
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
        return ok(req.id, {
          tools: TOOL_DEFS.map((tool) => {
            const outputSchema = OUTPUT_SCHEMAS[tool.name];
            return outputSchema ? { ...tool, outputSchema } : tool;
          }),
        });
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
  // Streamable HTTP requires a GET to open an SSE stream or answer 405; this
  // server never initiates messages, so 405 is the correct signal.
  if (request.method !== 'POST') {
    return new Response('method not allowed', {
      status: 405,
      headers: { allow: 'POST' },
    });
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
