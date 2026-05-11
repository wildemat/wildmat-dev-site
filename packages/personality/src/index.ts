/**
 * Personality proxy worker.
 *
 * Forwards `api.wildmat.dev/personality/<path>` to
 * `${PERSONALITY_SERVICE_BASE_URL}/<path>` (i.e. drops the `/personality`
 * prefix on the way upstream).
 *
 * Design notes:
 *   - The engine implementation now lives in the personality repo
 *     (`~/Github/personality`). This worker exists only so the
 *     `api.wildmat.dev` brand domain can offer the same surface to
 *     browser callers and any legacy clients that point at the gateway.
 *   - Server-side callers (e.g. engage) should hit
 *     `personality.wildmat.dev` directly and skip this hop. See
 *     `packages/personality/CROSS_REPO.md`.
 *   - Auth: we forward `x-api-key` verbatim. The proxy itself does NOT
 *     hold or check the personality API key; the upstream service does.
 *   - CORS: enabled only on the `/health` route, which is unauthenticated
 *     upstream. `/respond` and `/facets/*` require a server-held API
 *     key, so allowing browser preflight on them would be a footgun.
 *   - `/personality/mcp` returns 410 Gone — the old MCP transport that
 *     used to live in this package has been removed and no client is
 *     known to hit it today.
 *   - Streaming: the personality service currently returns JSON for
 *     `/respond`. When SSE lands upstream, swap `await text()` for
 *     `response.body` piped through. See the comment below.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env.js';

const BASE_PATH = '/personality';
const PROXY_TIMEOUT_MS = 60_000;

// Headers we drop on the way upstream. `host` will be wrong (it's
// `api.wildmat.dev`, not the upstream origin). `cookie` is never used
// by the personality service and would leak browser auth across hosts.
// `cf-*` and `x-forwarded-*` are added back deliberately below.
const STRIP_REQUEST_HEADERS = new Set([
  'host',
  'cookie',
  'content-length',
  'connection',
  'transfer-encoding',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'x-forwarded-for',
  'x-forwarded-proto',
  'x-real-ip',
]);

// Headers we drop on the way back to the caller. Hop-by-hop headers
// and CF-internal headers must not leak through.
const STRIP_RESPONSE_HEADERS = new Set([
  'transfer-encoding',
  'connection',
  'keep-alive',
  'content-encoding', // upstream already decoded for us
  'content-length', // recompute from the buffered body
]);

const app = new Hono<{ Bindings: Env }>().basePath(BASE_PATH);

// CORS only on the explicitly browser-safe route. /respond requires a
// secret and should not be browser-callable.
app.use(
  '/health',
  cors({
    origin: '*',
    allowMethods: ['GET', 'OPTIONS'],
    allowHeaders: ['content-type', 'accept'],
    maxAge: 600,
  }),
);

// Deprecated MCP path. Nothing in this repo or known external caller
// currently uses it; keep a clear 410 with a pointer rather than
// silently 404ing.
app.all('/mcp', (c) =>
  c.json(
    {
      error: 'gone',
      message:
        'The MCP transport at /personality/mcp has been removed. The personality engine now lives at personality.wildmat.dev — see the personality repo for current tool surface.',
    },
    410,
  ),
);

// Simple service-description page at the proxy root.
app.get('/', (c) =>
  c.json({
    name: 'wildmat-personality-proxy',
    description:
      'Thin proxy for personality.wildmat.dev. See packages/personality/CROSS_REPO.md.',
    upstream: c.env.PERSONALITY_SERVICE_BASE_URL,
    base: BASE_PATH,
  }),
);

// Catch-all forwarder. Must be registered LAST so explicit routes win.
app.all('/*', async (c) => {
  return proxyRequest(c.req.raw, c.env);
});

export default app;

/**
 * Forward an incoming `api.wildmat.dev/personality/<path>` request to
 * the upstream personality service.
 */
export async function proxyRequest(request: Request, env: Env): Promise<Response> {
  const baseUrl = (env.PERSONALITY_SERVICE_BASE_URL ?? '').replace(/\/+$/, '');
  if (!baseUrl) {
    return jsonError(500, 'proxy-misconfigured', 'PERSONALITY_SERVICE_BASE_URL is not set');
  }

  const incoming = new URL(request.url);
  const subPath = stripBasePath(incoming.pathname);
  const upstreamUrl = `${baseUrl}${subPath}${incoming.search}`;

  const headers = buildUpstreamHeaders(request.headers, incoming.host);

  // For methods that have a body, stream-copy it. For GET/HEAD/OPTIONS,
  // omit the body entirely (Cloudflare workerd will throw if we pass
  // null with a non-empty body slot, and some upstreams reject empty
  // POST bodies as `0` content-length).
  const init: RequestInit = {
    method: request.method,
    headers,
    // NOTE: when the personality service grows SSE on /respond, swap
    // this to `body: request.body` + `duplex: "half"` and pipe the
    // response body through unbuffered. Today /respond is non-streaming
    // JSON, so buffering is fine.
    body: methodHasBody(request.method) ? await request.arrayBuffer() : undefined,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  (init as RequestInit & { signal?: AbortSignal }).signal = controller.signal;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, init);
  } catch (err) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : String(err);
    // AbortController fires with name "AbortError" on timeout.
    if (err instanceof Error && err.name === 'AbortError') {
      return jsonError(504, 'upstream-timeout', `Personality service did not respond within ${PROXY_TIMEOUT_MS}ms`);
    }
    return jsonError(502, 'upstream-unreachable', message);
  }
  clearTimeout(timeout);

  // Read the body up-front. This is fine for the current non-streaming
  // surface; revisit when SSE lands.
  const body = await upstream.arrayBuffer();

  const responseHeaders = new Headers();
  for (const [key, value] of upstream.headers.entries()) {
    if (STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) continue;
    responseHeaders.set(key, value);
  }
  responseHeaders.set('x-proxied-by', 'api.wildmat.dev/personality');

  return new Response(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

function stripBasePath(pathname: string): string {
  if (pathname === BASE_PATH) return '/';
  if (pathname.startsWith(`${BASE_PATH}/`)) return pathname.slice(BASE_PATH.length);
  // Defensive: if Hono routed this to us, the prefix should always be
  // present. If somehow it isn't, forward verbatim.
  return pathname;
}

function buildUpstreamHeaders(source: Headers, originalHost: string): Headers {
  const headers = new Headers();
  for (const [key, value] of source.entries()) {
    if (STRIP_REQUEST_HEADERS.has(key.toLowerCase())) continue;
    headers.set(key, value);
  }
  headers.set('x-forwarded-from', originalHost || 'api.wildmat.dev');
  // Hint to the upstream about the original protocol — workers are
  // always https-terminated.
  if (!headers.has('x-forwarded-proto')) {
    headers.set('x-forwarded-proto', 'https');
  }
  return headers;
}

function methodHasBody(method: string): boolean {
  const m = method.toUpperCase();
  return m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS';
}

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: code, message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
