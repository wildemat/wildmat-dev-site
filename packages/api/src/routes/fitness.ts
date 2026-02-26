import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

type Bindings = {
  FITNESS_METRICS: KVNamespace;
};

const KV_KEY = 'latest';

export const fitness = new Hono<{ Bindings: Bindings }>();

fitness.get('/events', (c) => {
  return streamSSE(c, async (stream) => {
    let lastSeen = '';

    while (true) {
      const raw = await c.env.FITNESS_METRICS.get(KV_KEY);

      if (raw && raw !== lastSeen) {
        lastSeen = raw;
        await stream.writeSSE({ event: 'metrics', data: raw });
      } else {
        await stream.writeSSE({ event: 'ping', data: '' });
      }

      await stream.sleep(2000);
    }
  });
});

fitness.post('/', async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid JSON' }, 400);
  }

  const payload = { ...body, _ts: Date.now() };
  await c.env.FITNESS_METRICS.put(KV_KEY, JSON.stringify(payload), {
    expirationTtl: 3600,
  });

  console.log('[fitness]', JSON.stringify(payload));
  return c.json({ ok: true });
});
