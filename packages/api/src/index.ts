import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { health } from './routes/health.js';
import { feedback } from './routes/feedback.js';
import { fitness } from './routes/fitness.js';

const ALLOWED_IPS = new Set(['136.57.91.121']);
const ALLOWED_IPV6_PREFIXES = ['2605:a601:90b6:3a00:'];

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const LOCAL_PREFIXES = ['192.168.', '10.', '172.16.'];

function isAllowed(ip: string): boolean {
  if (LOOPBACK.has(ip)) return true;
  if (LOCAL_PREFIXES.some((p) => ip.startsWith(p))) return true;
  if (ALLOWED_IPS.has(ip)) return true;
  return ALLOWED_IPV6_PREFIXES.some((prefix) => ip.startsWith(prefix));
}

const app = new Hono();

app.use('*', async (c, next) => {
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for');
  if (!clientIp) {
    // No CF header means local dev — allow through
    await next();
    return;
  }
  if (!isAllowed(clientIp)) {
    return c.json({ error: 'forbidden' }, 403);
  }
  await next();
});

app.use('*', cors({
  origin: '*',
}));

app.route('/health', health);
app.route('/feedback', feedback);
app.route('/fitness', fitness);

export default app;
