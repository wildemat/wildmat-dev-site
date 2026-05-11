# NEXT — personality-package-deprecation-notice

**Branch:** `personality-package-deprecation-notice`
**Last touched:** 2026-05-11
**Status:** Notice-only commit. Proxy refactor lives on `personality-proxy-refactor`.

## What's done

- `packages/personality/PLAN.md` updated with the supersession banner.
- `packages/personality/CROSS_REPO.md` documents the cross-repo
  relationships.

## What's NOT done on this branch

- The actual code refactor (delete `src/engine/`, `src/tools/`, reduce
  `src/index.ts` to a Hono proxy). That work is on
  `personality-proxy-refactor`, which forks from this branch and is
  blocked on `personality.wildmat.dev` being deployable (i.e. the
  personality repo's `phase1-service-scaffold` branch shipping).

## How to pick this back up

1. `git checkout personality-package-deprecation-notice`
2. If the personality repo's `phase1-service-scaffold` is far enough
   along to deploy locally, switch to `personality-proxy-refactor` and
   do the code reduction there.
3. Do NOT merge to `main` until the personality service is actually
   reachable at `personality.wildmat.dev`.

## Open questions

- The current `packages/personality/src/index.ts` exports an MCP
  endpoint at `api.wildmat.dev/personality/mcp`. After the proxy
  refactor, does this stay (forwarded to the personality repo's MCP
  endpoint if/when it exists) or get removed? Decide on the
  `personality-proxy-refactor` branch after looking at what callers
  hit `/mcp` today.
