import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

export const fitness = new Hono();

// In-memory pub/sub shared within a single Worker isolate.
// Isolate recycling may drop SSE connections — fine for personal use.
type Listener = (payload: Record<string, unknown>) => void;
const listeners = new Set<Listener>();

fitness.get('/events', (c) => {
  return streamSSE(c, async (stream) => {
    const pending: Record<string, unknown>[] = [];
    let notify: (() => void) | null = null;

    const listener: Listener = (payload) => {
      pending.push(payload);
      notify?.();
    };

    listeners.add(listener);
    stream.onAbort(() => { listeners.delete(listener); });

    while (true) {
      while (pending.length > 0) {
        await stream.writeSSE({
          event: 'metrics',
          data: JSON.stringify(pending.shift()),
          retry: 3000,
        });
      }

      await Promise.race([
        new Promise<void>((resolve) => { notify = resolve; }),
        stream.sleep(15_000),
      ]);
      notify = null;

      if (pending.length === 0) {
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

  console.log('[fitness]', JSON.stringify(body));

  for (const fn of listeners) {
    try {
      fn(body);
    } catch {
      listeners.delete(fn);
    }
  }

  return c.json({ ok: true });
});
