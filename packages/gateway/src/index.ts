import { Hono } from 'hono';
import { createToken, verifyToken, parseCookie, buildSetCookie, buildClearCookie } from './auth.js';
import { loginPage } from './login.js';

const ORIGIN_HOST = 'fallback.sevalla.page';

type Bindings = {
  SITE_PASSWORD: string;
  AUTH_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// --- Auth routes (excluded from the auth middleware) ---

app.get('/auth/login', (c) => {
  return c.html(loginPage());
});

app.post('/auth/login', async (c) => {
  const body = await c.req.parseBody();
  const password = body['password'];

  if (typeof password !== 'string' || password !== c.env.SITE_PASSWORD) {
    return c.html(loginPage('Incorrect password'), 401);
  }

  const token = await createToken(c.env.AUTH_SECRET);
  const redirect = c.req.query('redirect') || '/';

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirect,
      'Set-Cookie': buildSetCookie(token),
    },
  });
});

app.get('/auth/logout', (c) => {
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': buildClearCookie(),
    },
  });
});

// --- Auth middleware (runs on everything except /auth/* routes above) ---

app.use('*', async (c, next) => {
  const cookieHeader = c.req.header('cookie');
  const token = parseCookie(cookieHeader);

  if (!token || !(await verifyToken(token, c.env.AUTH_SECRET))) {
    const loginUrl = new URL('/auth/login', c.req.url);
    loginUrl.searchParams.set('redirect', new URL(c.req.url).pathname);
    return c.redirect(loginUrl.toString(), 302);
  }

  await next();
});

// --- Proxy catch-all ---

app.all('*', async (c) => {
  const url = new URL(c.req.url);

  // Build a request to the Sevalla origin. Cloudflare Workers derive the
  // Host header from the fetch URL, so we keep the original hostname in the
  // URL (e.g. fitness.wildmat.dev) and use `resolveOverride` to resolve DNS
  // via the Sevalla CNAME instead.
  const proxyUrl = new URL(url.pathname + url.search, url.origin);

  const headers = new Headers(c.req.raw.headers);
  headers.delete('cookie');

  const originResponse = await fetch(proxyUrl.toString(), {
    method: c.req.method,
    headers,
    body: c.req.raw.body,
    redirect: 'manual',
    // @ts-expect-error -- cf property is Cloudflare-specific
    cf: { resolveOverride: ORIGIN_HOST },
  });

  return new Response(originResponse.body, {
    status: originResponse.status,
    headers: originResponse.headers,
  });
});

export default app;
