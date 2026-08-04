import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env.js';
import { requireApiKey } from './lib/auth.js';
import { handleMcpRequest } from './mcp.js';

const BASE_PATH = '/todo';

const app = new Hono<{ Bindings: Env }>().basePath(BASE_PATH);

app.use('*', cors({ origin: '*', allowHeaders: ['content-type', 'x-api-key', 'mcp-session-id'] }));

app.get('/health', (c) =>
  c.json({ ok: true, configured: Boolean(c.env.TODOIST_API_TOKEN) }),
);

app.use('*', requireApiKey);

app.all('/mcp', (c) => handleMcpRequest(c.env, c.req.raw));

app.get('/', (c) =>
  c.json({
    name: 'wildmat-todo',
    description: 'Family OS task connector — Todoist MCP server',
    base: BASE_PATH,
    endpoints: {
      mcp: `${BASE_PATH}/mcp`,
      health: `${BASE_PATH}/health`,
    },
  }),
);

export default app;
