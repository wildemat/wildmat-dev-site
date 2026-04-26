import type { MiddlewareHandler } from 'hono';
import type { Env } from '../env.js';

export const requireApiKey: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const provided = c.req.header('x-api-key') ?? c.req.query('key');
  if (!provided || provided !== c.env.PERSONALITY_API_KEY) {
    return c.json({ error: 'forbidden' }, 403);
  }
  await next();
};
