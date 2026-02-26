import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { health } from './routes/health.js';
import { feedback } from './routes/feedback.js';

const ALLOWED_IP = '136.57.91.121';

const app = new Hono().basePath('/api');

app.use('*', async (c, next) => {
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for');
  if (clientIp !== ALLOWED_IP) {
    return c.json({ error: 'forbidden' }, 403);
  }
  await next();
});

app.use('*', cors({
  origin: `http://${ALLOWED_IP}`,
}));

app.route('/health', health);
app.route('/feedback', feedback);

export default app;
