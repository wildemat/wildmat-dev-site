# Branch: personality-package-deprecation-notice

Documentation-only branch. Marks `packages/personality/` as superseded
by the personality engine repo at `~/Github/personality/`.

## What this branch contains

- `packages/personality/PLAN.md` — adds a supersession banner at the
  top noting that `~/Github/personality/PLAN.md` (revision 2026-04-26)
  is now the single source of truth. This package is slated for
  reduction to a thin HTTP proxy.

## Cross-repo dependencies

- **personality** repo, branch `phase1-pre-mvp-prereqs` — defines the
  audience-tier system this package will route to once it becomes a
  proxy.
- **personality** repo, branch `phase1-service-scaffold` — implements
  the `personality.wildmat.dev/respond` service that this package's
  proxy will forward to.

## What comes after this branch

The actual proxy refactor (delete `src/engine/`, `src/tools/`, reduce
`src/index.ts` to a Hono proxy) lives on:

- `personality-proxy-refactor` (this repo) — fork from this branch once
  the personality service is deployed.

## Next pickup

See `NEXT.md` (root of this branch).
