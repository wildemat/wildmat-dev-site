# Branch: personality-proxy-refactor

Reduces `packages/personality/` from a full Cloudflare-Worker-hosted
personality engine to a thin HTTP proxy. The engine code now lives in
the personality repo at `~/Github/personality` and is deployed as a
container at `personality.wildmat.dev`.

Parent branch: `personality-package-deprecation-notice` (notice-only).

## What changed on this branch

- Deleted `src/engine/`, `src/tools/`, `src/mcp.ts`, `src/lib/`, and
  `scripts/sync-r2.sh` + `scripts/test-agent.mjs`. None of this is
  needed once the engine is gone.
- `src/index.ts` is now a single-file Hono proxy that forwards
  `api.wildmat.dev/personality/<path>` to
  `${PERSONALITY_SERVICE_BASE_URL}/<path>`.
- `src/env.ts` reduced to `{ PERSONALITY_SERVICE_BASE_URL, ENVIRONMENT }`.
- `wrangler.toml`: removed the `[[r2_buckets]]` binding and the
  `LLM_MODEL` var; added `PERSONALITY_SERVICE_BASE_URL` under `[vars]`.
- `package.json`: added `vitest` as a devDep; engine-only deps were
  already absent (the engine was hand-rolled, no Anthropic SDK in the
  worker).
- Added `tests/proxy.test.ts` (proxy happy path, header stripping,
  502 / 504 / 410 / 500 error mapping, path rewrite).
- Added `docs/cutover.md` with deploy + rollback procedure.
- Replaced README with a one-paragraph pointer.

## Cross-repo dependencies

- **personality** repo, branch `phase1-service-scaffold`: must be
  deployed to `personality.wildmat.dev` BEFORE this proxy is shipped.
  The proxy will 502 every request until the upstream is reachable.
- **personality** repo, branch `phase1-pre-mvp-prereqs`: defines the
  audience-tier system the upstream service implements; transitively
  required for `/respond` to work but not for the proxy itself.

## Cross-repo non-dependency: engage

Engage's `engage/personality-http-swap-plan` design recommends that
server-side callers (the engage flows) hit `personality.wildmat.dev`
DIRECTLY and skip this proxy. The proxy exists only so the
`api.wildmat.dev` brand domain keeps offering the same surface to:

- Browser callers hitting `/personality/health` (CORS enabled).
- Legacy clients still pointing at the gateway.
- Future cross-site needs we haven't designed yet.

If/when engage stops referencing `api.wildmat.dev/personality/*`
entirely, this proxy could be retired. Don't retire it without
verifying that.

## MCP transport

The old `/personality/mcp` JSON-RPC endpoint has been removed. Nothing
in this repo, the personality repo, or engage hits it today (verified
via `rg "personality/mcp" ~/Github`). The proxy returns `410 Gone` on
that path with a pointer message.

If a future MCP surface lives on the personality service, swap the 410
handler for a forwarder.

## Deploy gate

DO NOT merge this branch to `main` and DO NOT run
`npm run deploy -w @wildmat/personality` until:

1. `personality.wildmat.dev/health` returns 200 from a public network.
2. `personality.wildmat.dev/respond` accepts the production API key.
3. Engage server-side callers no longer require
   `api.wildmat.dev/personality/respond`.

The `docs/cutover.md` file has the full playbook.

## Rollback target

Last engine-bearing commit on `main`: `67b3c42` (`init personality
endpoint`). See `docs/cutover.md` for the revert recipe.

## Next pickup

See `NEXT.md` (root of this branch).
