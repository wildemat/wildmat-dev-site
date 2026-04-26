import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env.js';
import { requireApiKey } from './lib/auth.js';
import { runHealth } from './tools/health.js';
import { getPersonality, isFacetName } from './tools/personality.js';
import { runRespond } from './tools/respond.js';
import { handleMcpRequest } from './mcp.js';

const BASE_PATH = '/personality';

const app = new Hono<{ Bindings: Env }>().basePath(BASE_PATH);

app.use('*', cors({ origin: '*', allowHeaders: ['content-type', 'x-api-key', 'mcp-session-id'] }));

app.use('*', requireApiKey);

app.all('/mcp', (c) => handleMcpRequest(c.env, c.req.raw));

app.get('/health', async (c) => c.json(await runHealth(c.env)));

app.get('/facets/:facet', async (c) => {
  const facet = c.req.param('facet');
  if (!isFacetName(facet)) return c.json({ error: `invalid facet: ${facet}` }, 400);
  const result = await getPersonality(c.env, facet);
  if (!result) return c.json({ error: `facet '${facet}' not found` }, 404);
  return c.json(result);
});

app.post('/respond', async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid JSON body' }, 400);
  }
  try {
    const result = await runRespond(c.env, {
      content: String(body.content ?? ''),
      platform: typeof body.platform === 'string' ? body.platform : undefined,
      context: typeof body.context === 'string' ? body.context : undefined,
      tone_hint: typeof body.tone_hint === 'string' ? body.tone_hint : undefined,
    });
    return c.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return c.json({ error: message }, 400);
  }
});

app.get('/', (c) =>
  c.json({
    name: 'wildmat-personality',
    description: 'Personality engine MCP server',
    base: BASE_PATH,
    endpoints: {
      mcp: `${BASE_PATH}/mcp`,
      health: `${BASE_PATH}/health`,
      facet: `${BASE_PATH}/facets/:facet`,
      respond: `POST ${BASE_PATH}/respond`,
    },
  }),
);

export default app;
