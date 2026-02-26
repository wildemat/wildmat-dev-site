import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { health } from './routes/health.js';
import { feedback } from './routes/feedback.js';

const ALLOWED_IPS = new Set([
  '136.57.91.121',
  '2605:a601:90b6:3a00:192d:2818:4b0e:3c5d',
]);

const app = new Hono();

app.use('*', async (c, next) => {
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for');
  if (!clientIp || !ALLOWED_IPS.has(clientIp)) {
    return c.json({ error: 'forbidden' }, 403);
  }
  await next();
});

app.use('*', cors({
  origin: '*',
}));

app.route('/health', health);
app.route('/feedback', feedback);

export default app;
