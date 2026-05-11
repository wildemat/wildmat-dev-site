# NEXT — personality-proxy-refactor

**Branch:** `personality-proxy-refactor`
**Forked from:** `personality-package-deprecation-notice`
**Last touched:** 2026-05-11
**Status:** Code refactor complete + tests in place. Deploy is gated on
the upstream personality service being live.

## What's done on this branch

- `packages/personality/src/` reduced from a full engine
  (`engine/`, `tools/`, `mcp.ts`, `lib/`) to a single-file Hono proxy
  in `src/index.ts` plus a minimal `src/env.ts`.
- `wrangler.toml`: dropped R2 binding, dropped LLM model var, added
  `PERSONALITY_SERVICE_BASE_URL`. Route binding for
  `api.wildmat.dev/personality/*` is unchanged.
- `package.json`: added vitest, added `test` / `test:watch` scripts.
- `tests/proxy.test.ts`: covers health forward, respond forward,
  header strip, path rewrite, 502/504/500/410 error mapping.
- `docs/cutover.md`: deploy + verification + rollback playbook.
- `CROSS_REPO.md` + this `NEXT.md` updated.

## What's NOT done

- **Not deployed.** Wait for the personality repo's
  `phase1-service-scaffold` to land at `personality.wildmat.dev` first.
- **Not merged to `main`.** Merge after a successful smoke test (see
  `packages/personality/docs/cutover.md`).
- **No browser-facing UI on `api.wildmat.dev/personality/health`.**
  CORS is enabled on that route so a future status page could use it.
  We haven't built that page yet.

## Deploy gate

Run, in order:

```sh
curl -fsS https://personality.wildmat.dev/health     # must return 200
cd ~/Github/wildmat-dev-site-wt/personality-proxy-refactor
npm install
npm run test -w @wildmat/personality                 # vitest, expect green
npm run build -w @wildmat/personality                # wrangler dry-run
npm run deploy -w @wildmat/personality               # publishes the proxy
```

After deploy, run the curl verifications in
`packages/personality/docs/cutover.md`.

## Rollback target

Last engine-bearing commit on `main`: `67b3c42`. See
`packages/personality/docs/cutover.md` for the revert recipe.

## Open questions

- Engage `engage/personality-http-swap-plan` says server-side flows
  should bypass this proxy. Once that swap actually ships, audit whether
  anything still needs `api.wildmat.dev/personality/*`. If nothing
  does, this whole worker can be retired and the DNS route freed.
