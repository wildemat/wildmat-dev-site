# @wildmat/gateway

Cloudflare Worker that gates all `*.wildmat.dev` subdomains behind a static password with 30-day cookie persistence. The root domain (`wildmat.dev`) and API (`api.wildmat.dev`) are unaffected.

## Setup

### 1. Set secrets

Generate a signing key and set both secrets:

```bash
openssl rand -hex 32  # use this output as AUTH_SECRET

npx wrangler secret put SITE_PASSWORD   # the password you'll enter to access the site
npx wrangler secret put AUTH_SECRET     # the HMAC signing key from above
```

### 2. Deploy

```bash
npm run deploy:gateway
```

### 3. Local development

```bash
npm run dev:gateway
```

For local dev, create a `.dev.vars` file in this directory:

```
SITE_PASSWORD=localpass
AUTH_SECRET=localsecret
```

## How it works

- Requests to `*.wildmat.dev` hit this Worker (Cloudflare route: `*.wildmat.dev/*`)
- The Worker checks for a `site_auth` cookie containing an HMAC-SHA256 token
- If valid, the request is proxied to `fallback.sevalla.page` with the original `Host` header preserved (Sevalla routes by Host)
- If missing or invalid, the user is redirected to `/auth/login`
- On successful login, a 30-day `HttpOnly; Secure` cookie is set on `.wildmat.dev`, so one login covers all subdomains
- `GET /auth/logout` clears the cookie
