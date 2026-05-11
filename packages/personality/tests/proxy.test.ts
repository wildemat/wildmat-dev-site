/**
 * Proxy behaviour tests.
 *
 * We exercise the Hono app directly (`app.fetch`) and stub the global
 * `fetch` so we can assert on the exact upstream request the proxy
 * builds. This keeps the tests environment-agnostic — no miniflare or
 * workerd boot required.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/index.js';
import type { Env } from '../src/env.js';

type UpstreamHandler = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const BASE_URL = 'https://personality.wildmat.dev';

const ENV: Env = {
  PERSONALITY_SERVICE_BASE_URL: BASE_URL,
  ENVIRONMENT: 'test',
};

const realFetch = globalThis.fetch;

function mockUpstream(handler: UpstreamHandler): {
  calls: { url: string; init?: RequestInit }[];
} {
  const calls: { url: string; init?: RequestInit }[] = [];
  const stub: UpstreamHandler = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    calls.push({ url, init });
    return handler(input, init);
  };
  // @ts-expect-error — replacing global fetch for the duration of one test.
  globalThis.fetch = stub;
  return { calls };
}

function request(path: string, init?: RequestInit): Request {
  return new Request(`https://api.wildmat.dev${path}`, init);
}

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('GET /personality/health', () => {
  it('forwards to ${BASE_URL}/health and returns the upstream body', async () => {
    const upstreamBody = { status: 'ok', service: 'personality', uptime_s: 42 };
    const { calls } = mockUpstream(async () => {
      return new Response(JSON.stringify(upstreamBody), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const res = await app.fetch(request('/personality/health'), ENV);

    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${BASE_URL}/health`);
    expect(calls[0].init?.method).toBe('GET');

    const json = await res.json();
    expect(json).toEqual(upstreamBody);
  });
});

describe('POST /personality/respond', () => {
  it('forwards x-api-key + JSON body and returns the upstream response', async () => {
    const upstreamBody = { response: 'hello', facets_used: ['voice'] };
    const { calls } = mockUpstream(async (_input, init) => {
      // Echo upstream body back so we can assert the proxy passed it through.
      expect(init?.method).toBe('POST');
      const headers = new Headers(init?.headers);
      expect(headers.get('x-api-key')).toBe('test-key-123');
      expect(headers.get('content-type')).toBe('application/json');
      expect(headers.get('host')).toBeNull(); // host must be stripped
      expect(headers.get('cookie')).toBeNull(); // cookies must be stripped
      expect(headers.get('x-forwarded-from')).toBe('api.wildmat.dev');
      return new Response(JSON.stringify(upstreamBody), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const res = await app.fetch(
      request('/personality/respond', {
        method: 'POST',
        headers: {
          'x-api-key': 'test-key-123',
          'content-type': 'application/json',
          cookie: 'session=abc',
        },
        body: JSON.stringify({ content: 'hi there' }),
      }),
      ENV,
    );

    expect(res.status).toBe(200);
    expect(calls[0].url).toBe(`${BASE_URL}/respond`);

    // Body should be forwarded verbatim.
    const upstreamReqBody = calls[0].init?.body;
    const bodyText =
      upstreamReqBody instanceof ArrayBuffer ? new TextDecoder().decode(upstreamReqBody) : String(upstreamReqBody);
    expect(JSON.parse(bodyText)).toEqual({ content: 'hi there' });

    const json = await res.json();
    expect(json).toEqual(upstreamBody);
  });

  it('preserves upstream non-2xx status codes', async () => {
    mockUpstream(async () => new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }));
    const res = await app.fetch(
      request('/personality/respond', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: 'x' }),
      }),
      ENV,
    );
    expect(res.status).toBe(401);
  });
});

describe('upstream errors', () => {
  it('maps a network failure to 502', async () => {
    mockUpstream(async () => {
      throw new TypeError('fetch failed');
    });

    const res = await app.fetch(request('/personality/health'), ENV);

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toMatchObject({ error: 'upstream-unreachable' });
  });

  it('maps an AbortError to 504', async () => {
    mockUpstream(async () => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      throw err;
    });

    const res = await app.fetch(request('/personality/health'), ENV);

    expect(res.status).toBe(504);
    const body = await res.json();
    expect(body).toMatchObject({ error: 'upstream-timeout' });
  });

  it('returns 500 when PERSONALITY_SERVICE_BASE_URL is missing', async () => {
    mockUpstream(async () => new Response('should not be called', { status: 200 }));
    const res = await app.fetch(request('/personality/health'), {
      // @ts-expect-error — exercising the misconfigured-env branch.
      PERSONALITY_SERVICE_BASE_URL: '',
      ENVIRONMENT: 'test',
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toMatchObject({ error: 'proxy-misconfigured' });
  });
});

describe('deprecated MCP route', () => {
  it('returns 410 Gone for /personality/mcp', async () => {
    const { calls } = mockUpstream(async () => new Response('should not be called', { status: 200 }));
    const res = await app.fetch(request('/personality/mcp', { method: 'POST', body: '{}' }), ENV);
    expect(res.status).toBe(410);
    expect(calls).toHaveLength(0);
    const body = await res.json();
    expect(body).toMatchObject({ error: 'gone' });
  });
});

describe('path rewriting', () => {
  it('strips the /personality prefix when forwarding', async () => {
    const { calls } = mockUpstream(async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));
    await app.fetch(request('/personality/facets/voice?foo=bar'), ENV);
    expect(calls[0].url).toBe(`${BASE_URL}/facets/voice?foo=bar`);
  });

  it('handles a trailing-slash-free base URL', async () => {
    const { calls } = mockUpstream(async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));
    await app.fetch(request('/personality/health'), {
      ...ENV,
      PERSONALITY_SERVICE_BASE_URL: `${BASE_URL}/`,
    });
    expect(calls[0].url).toBe(`${BASE_URL}/health`);
  });
});
