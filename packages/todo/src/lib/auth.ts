import type { MiddlewareHandler } from 'hono';
import type { Env } from '../env.js';

// Accepts x-api-key or ?key= — the query form is what ChatGPT connectors use,
// since custom connectors can't send arbitrary headers.
export const requireApiKey: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const provided = c.req.header('x-api-key') ?? c.req.query('key');
  if (!provided || provided !== c.env.TODO_API_KEY) {
    return c.json({ error: 'forbidden' }, 403);
  }
  await next();
};
