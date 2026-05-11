# Cutover: engine worker → thin proxy

This worker used to be the full personality engine (R2-backed,
LLM-calling). It is now a thin HTTP proxy that forwards
`api.wildmat.dev/personality/*` to `${PERSONALITY_SERVICE_BASE_URL}/*`.
The engine lives in `~/Github/personality`, deployed as a container at
`personality.wildmat.dev`.

## Preconditions

Before deploying this branch:

1. **Personality service must be live.** Smoke-test it:
   ```sh
   curl -fsS https://personality.wildmat.dev/health
   ```
   Expect `200` with a JSON body. If it fails, halt — the proxy will
   work but every request will 502 until the upstream is live.

2. **Server-side callers are aware they should bypass the proxy.**
   Engage's `engage/personality-http-swap-plan` design says server-side
   integrations point at `personality.wildmat.dev` directly. Confirm no
   server-side caller is depending on `api.wildmat.dev/personality/*`
   any more.

3. **Confirm no client hits `/personality/mcp`.** This proxy returns
   `410 Gone` for that path. Search engage + this repo for callers:
   ```sh
   rg "personality/mcp" ~/Github
   ```

## Deploy

From the repo root:

```sh
npm install                              # picks up vitest as a devDep
npm run test -w @wildmat/personality     # green light required
npm run build -w @wildmat/personality    # wrangler dry-run
npm run deploy -w @wildmat/personality   # wrangler deploy
```

Wrangler should report the worker bound to the route
`api.wildmat.dev/personality/*`. The `[[r2_buckets]]` block is gone, so
no R2 binding will be set — that is intentional.

## Post-deploy verification

Run these from a machine outside CF (laptop, not a worker):

```sh
# Health proxy
curl -fsS https://api.wildmat.dev/personality/health | jq .

# /respond with the personality API key (sourced from 1Password / env)
curl -fsS https://api.wildmat.dev/personality/respond \
  -H "x-api-key: $PERSONALITY_API_KEY" \
  -H "content-type: application/json" \
  -d '{"content":"hello"}' | jq .

# Deprecated MCP path
curl -i https://api.wildmat.dev/personality/mcp
# expect 410 Gone
```

The `x-proxied-by: api.wildmat.dev/personality` header should appear on
every proxied response. If you see it, the proxy is in the loop.

## Rollback

If the proxy misbehaves and the upstream service is fine, revert to the
last engine-bearing commit on `main`:

```sh
git checkout main
git revert <merge commit for personality-proxy-refactor>
# or, if not yet merged anywhere:
git checkout 67b3c42 -- packages/personality
git commit -m "rollback: restore engine-resident personality worker"
npm run deploy -w @wildmat/personality
```

`67b3c42` is the last commit on `main` that contains the full
engine + tools + MCP transport, prior to the deprecation-notice and
proxy-refactor branches.

Note: rolling back the worker DOES NOT roll back the personality repo.
If you need both halves reverted (because the personality service was
the actual problem), also revert the corresponding deploy in
`~/Github/personality`.

## Cross-repo coordination

- **personality repo** (`~/Github/personality`): branch
  `phase1-service-scaffold` must be deployed first.
- **engage**: `engage/personality-http-swap-plan` documents the
  HTTP swap. Server-side engage flows are expected to hit
  `personality.wildmat.dev` directly, not the proxy.

See `packages/personality/CROSS_REPO.md` for the full graph.
