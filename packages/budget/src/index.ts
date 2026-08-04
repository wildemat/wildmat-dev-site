import { OAuthProvider, type OAuthHelpers } from '@cloudflare/workers-oauth-provider';
import { Hono } from 'hono';
import { createToken, verifyToken, parseCookie, buildSetCookie, buildClearCookie } from './auth.js';
import { loginPage, authorizePage } from './login.js';
import { budgetPage } from './page.js';
import { handleMcp } from './mcp.js';
import {
  budgetStatus,
  createLinkToken,
  exchangePublicToken,
  listConnections,
  removeConnection,
  type Env,
} from './service.js';

type HonoEnv = { Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } };

const app = new Hono<HonoEnv>();

// --- OAuth authorize UI (ChatGPT lands here during connector setup) ---

app.get('/budget/oauth/authorize', async (c) => {
  const oauthReq = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  const client = await c.env.OAUTH_PROVIDER.lookupClient(oauthReq.clientId);
  return c.html(authorizePage(client?.clientName ?? oauthReq.clientId));
});

app.post('/budget/oauth/authorize', async (c) => {
  const body = await c.req.parseBody();
  const oauthReq = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  const client = await c.env.OAUTH_PROVIDER.lookupClient(oauthReq.clientId);

  if (typeof body['password'] !== 'string' || body['password'] !== c.env.SITE_PASSWORD) {
    return c.html(authorizePage(client?.clientName ?? oauthReq.clientId, 'Incorrect password'), 401);
  }

  const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
    request: oauthReq,
    userId: 'wildmat',
    metadata: {},
    scope: oauthReq.scope,
    props: {},
  });
  return c.redirect(redirectTo, 302);
});

// --- Cookie auth routes for the web page ---

app.get('/budget/auth/login', (c) => {
  return c.html(loginPage());
});

app.post('/budget/auth/login', async (c) => {
  const body = await c.req.parseBody();
  const password = body['password'];

  if (typeof password !== 'string' || password !== c.env.SITE_PASSWORD) {
    return c.html(loginPage('Incorrect password'), 401);
  }

  const token = await createToken(c.env.AUTH_SECRET);
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/budget',
      'Set-Cookie': buildSetCookie(token),
    },
  });
});

app.get('/budget/auth/logout', (c) => {
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/budget/auth/login',
      'Set-Cookie': buildClearCookie(),
    },
  });
});

// --- Auth middleware: browser cookie or bearer token ---

app.use('*', async (c, next) => {
  const authz = c.req.header('authorization');
  if (authz?.startsWith('Bearer ')) {
    if (authz.slice(7) === c.env.API_TOKEN) return next();
    return c.json({ error: 'invalid token' }, 401);
  }

  const token = parseCookie(c.req.header('cookie'));
  if (token && (await verifyToken(token, c.env.AUTH_SECRET))) return next();

  if (c.req.path.startsWith('/budget/api')) {
    return c.json({ error: 'unauthenticated' }, 401);
  }
  return c.redirect('/budget/auth/login', 302);
});

// --- Page ---

app.get('/budget', (c) => c.html(budgetPage(c.env.PLAID_ENV)));

// --- Bearer-token MCP alias (for clients that can send headers, e.g. Claude Code) ---

app.post('/budget/api/mcp', (c) => handleMcp(c.req.raw, c.env));

// --- REST API (used by the page's JS) ---

app.post('/budget/api/link-token', async (c) => c.json(await createLinkToken(c.env)));

app.post('/budget/api/exchange', async (c) => {
  const { public_token, institution_name } = await c.req.json<{
    public_token: string;
    institution_name?: string | null;
  }>();
  if (!public_token) return c.json({ error: 'public_token required' }, 400);
  return c.json(await exchangePublicToken(c.env, public_token, institution_name ?? null));
});

app.get('/budget/api/connections', async (c) => {
  const includeTokens =
    c.req.query('tokens') === '1' &&
    c.req.header('authorization') === `Bearer ${c.env.API_TOKEN}`;
  return c.json({ connections: await listConnections(c.env, includeTokens) });
});

app.get('/budget/api/status', async (c) => c.json(await budgetStatus(c.env)));

app.delete('/budget/api/connections/:itemId', async (c) => {
  try {
    const result = await removeConnection(c.env, c.req.param('itemId'));
    return c.json(result);
  } catch (err) {
    return c.json({ error: String(err) }, 404);
  }
});

// --- OAuth provider wraps everything; /budget/mcp requires a valid OAuth token ---

export default new OAuthProvider({
  apiRoute: '/budget/mcp',
  apiHandler: {
    fetch: (request: Request, env: Env) => handleMcp(request, env),
  },
  defaultHandler: { fetch: app.fetch },
  authorizeEndpoint: '/budget/oauth/authorize',
  tokenEndpoint: '/budget/oauth/token',
  clientRegistrationEndpoint: '/budget/oauth/register',
});
