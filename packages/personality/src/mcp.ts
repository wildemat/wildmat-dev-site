import type { Env } from './env.js';
import { runHealth } from './tools/health.js';
import { getPersonality, isFacetName, EXTENDED_FACETS } from './tools/personality.js';
import { runRespond } from './tools/respond.js';

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = { name: 'wildmat-personality', version: '1.0.0' };

type JsonRpcRequest = {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: unknown;
};

type JsonRpcResponse =
  | { jsonrpc: '2.0'; id: string | number | null; result: unknown }
  | { jsonrpc: '2.0'; id: string | number | null; error: { code: number; message: string; data?: unknown } };

const TOOL_DEFS = [
  {
    name: 'health',
    description: 'Check if the personality engine is available and when personality data was last synced.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_personality',
    description:
      'Retrieve personality reference data for a specific facet. Use to understand voice, emotions, interests, etc. without generating a response.',
    inputSchema: {
      type: 'object',
      properties: {
        facet: {
          type: 'string',
          description: 'Which personality facet to retrieve',
          enum: [...EXTENDED_FACETS],
        },
      },
      required: ['facet'],
    },
  },
  {
    name: 'respond',
    description:
      "Generate a response to online content matching the personality owner's voice, tone, emotions, and interaction style.",
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The content being responded to (a post, comment, article excerpt, message, etc.)',
        },
        platform: {
          type: 'string',
          description: 'Where the response will be posted',
          enum: ['twitter', 'reddit', 'youtube', 'slack', 'discord', 'imessage', 'email', 'forum', 'other'],
        },
        context: {
          type: 'string',
          description: 'Optional additional context: who posted it, the thread so far, the relationship to the author, etc.',
        },
        tone_hint: {
          type: 'string',
          description: "Optional nudge for the response tone if the caller has insight the server doesn't",
        },
      },
      required: ['content'],
    },
  },
] as const;

function ok(id: JsonRpcRequest['id'], result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id: id ?? null, result };
}

function err(id: JsonRpcRequest['id'], code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message, data } };
}

function toolContent(payload: unknown) {
  return {
    content: [{ type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2) }],
  };
}

async function handleToolCall(env: Env, name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'health': {
      return toolContent(await runHealth(env));
    }
    case 'get_personality': {
      const facet = args.facet;
      if (typeof facet !== 'string' || !isFacetName(facet)) {
        return { isError: true, ...toolContent(`invalid facet: ${String(facet)}`) };
      }
      const result = await getPersonality(env, facet);
      if (!result) {
        return { isError: true, ...toolContent(`facet '${facet}' not found in R2`) };
      }
      return toolContent(result.content);
    }
    case 'respond': {
      const content = args.content;
      if (typeof content !== 'string' || !content.trim()) {
        return { isError: true, ...toolContent('content is required') };
      }
      const result = await runRespond(env, {
        content,
        platform: typeof args.platform === 'string' ? args.platform : undefined,
        context: typeof args.context === 'string' ? args.context : undefined,
        tone_hint: typeof args.tone_hint === 'string' ? args.tone_hint : undefined,
      });
      return toolContent(result);
    }
    default:
      return { isError: true, ...toolContent(`unknown tool: ${name}`) };
  }
}

export async function handleRpc(env: Env, req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  if (req.jsonrpc !== '2.0' || typeof req.method !== 'string') {
    return err(req.id ?? null, -32600, 'invalid request');
  }

  try {
    switch (req.method) {
      case 'initialize':
        return ok(req.id, {
          protocolVersion: PROTOCOL_VERSION,
          serverInfo: SERVER_INFO,
          capabilities: { tools: {} },
        });
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
        const result = await handleToolCall(env, params.name, params.arguments ?? {});
        return ok(req.id, result);
      }
      case 'resources/list':
        return ok(req.id, { resources: [] });
      case 'prompts/list':
        return ok(req.id, { prompts: [] });
      default:
        return err(req.id, -32601, `method not found: ${req.method}`);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(req.id, -32000, message);
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
