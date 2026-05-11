# @wildmat/personality

Thin Cloudflare Worker proxy.

This package forwards `api.wildmat.dev/personality/*` to
`${PERSONALITY_SERVICE_BASE_URL}/*` (production: `https://personality.wildmat.dev`).
It holds no business logic and no secrets — the personality API key is
forwarded from the caller as `x-api-key` and validated upstream.

The engine implementation lives in the personality repo at
`~/Github/personality`. See that repo's `PLAN.md`,
`REMOTE.md`, and `src/server/` for the surface this proxy targets.

Server-side callers should hit `personality.wildmat.dev` directly and
skip this proxy. The proxy exists for the `api.wildmat.dev` brand
domain (browser-side `/health` checks, legacy clients).

See also:
- `CROSS_REPO.md` — cross-repo branch coordination
- `docs/cutover.md` — deploy + rollback playbook
- `wrangler.toml` — route binding + env vars
