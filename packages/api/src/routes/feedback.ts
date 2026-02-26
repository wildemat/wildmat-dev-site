import { Hono } from 'hono';

export const feedback = new Hono();

feedback.post('/', async (c) => {
  const { vote, task_summary, timestamp } = await c.req.json();
  return c.json({ status: 'ok', vote, task_summary, timestamp });
});

feedback.get('/', (c) => {
  const vote = c.req.query('vote');
  const task_summary = c.req.query('task_summary');
  const timestamp = c.req.query('timestamp');
  return c.json({
    message: 'thank you for your feedback',
    vote,
    task_summary,
    timestamp,
  });
});
