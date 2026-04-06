import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { MetricsRelay } from '../MetricsRelay.js';

type Bindings = {
  METRICS_RELAY: DurableObjectNamespace<MetricsRelay>;
};

function getRelay(env: Bindings): DurableObjectStub<MetricsRelay> {
  const id = env.METRICS_RELAY.idFromName('default');
  return env.METRICS_RELAY.get(id);
}

export const fitness = new Hono<{ Bindings: Bindings }>();

fitness.get('/events', (c) => {
  const relay = getRelay(c.env);

  return streamSSE(c, async (stream) => {
    let lastSeen = '';

    // Send the cached payload only if it's recent enough to still be relevant.
    const current = await relay.peek();
    if (current) {
      try {
        const parsed = JSON.parse(current);
        if (typeof parsed._ts === 'number' && Date.now() - parsed._ts < 30_000) {
          lastSeen = current;
          await stream.writeSSE({ event: 'metrics', data: current });
        }
      } catch { /* stale or unparseable — skip */ }
    }

    while (true) {
      const raw = await relay.waitForUpdate(15_000);

      if (raw && raw !== lastSeen) {
        lastSeen = raw;
        await stream.writeSSE({ event: 'metrics', data: raw });
      } else {
        // Timeout with no new data — send a comment keepalive.
        await stream.writeSSE({ event: 'ping', data: '' });
      }
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
  const raw = JSON.stringify(payload);

  const relay = getRelay(c.env);
  await relay.ingest(raw);

  console.log('[fitness]', raw);
  return c.json({ ok: true });
});
