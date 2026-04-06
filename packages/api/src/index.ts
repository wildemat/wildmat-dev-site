import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { health } from './routes/health.js';
import { feedback } from './routes/feedback.js';
import { fitness } from './routes/fitness.js';

type Bindings = {
  FITNESS_METRICS: KVNamespace;
  FITNESS_API_KEY: string;
  OVERLAYS_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/fitness/*', cors({
  origin: 'https://fitness.wildmat.dev',
}));

app.use('*', async (c, next) => {
  const apiKey = c.req.header('x-api-key') ?? c.req.query('key');
  if (apiKey && (apiKey === c.env.FITNESS_API_KEY || apiKey === c.env.OVERLAYS_API_KEY)) {
    await next();
    return;
  }
  return c.json({ error: 'forbidden' }, 403);
});

app.route('/health', health);
app.route('/feedback', feedback);
app.route('/fitness', fitness);

export default app;
