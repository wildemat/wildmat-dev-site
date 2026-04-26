# Personality MCP Server -- Build Plan

## What this is

A Cloudflare Worker that serves the personality engine as an MCP server at `personality.wildmat.dev`. Agents connect via the MCP protocol and call tools to generate personality-matched responses or read personality data -- no local filesystem access required.

## Source personality repo

The personality data and engine logic live at **`~/Github/personality/`**. Read the following files to understand what this server needs to replicate:

| File | Why you need it |
|------|----------------|
| `~/Github/personality/AGENTS.md` | Entry point -- understand the overall system |
| `~/Github/personality/rules/safety.md` | Safety validation rules the server must enforce |
| `~/Github/personality/skills/respond-to-content/SKILL.md` | The response generation workflow this server replicates (Steps 2-6) |
| `~/Github/personality/skills/respond-to-content/references/response-calibration.md` | Response style patterns by content type |
| `~/Github/personality/references/*.md` | The 8 personality facet files the server reads from R2 |
| `~/Github/personality/REMOTE.md` | Full architectural design doc for this server |

**Read `~/Github/personality/REMOTE.md` first** -- it contains the complete design including tool schemas, worker structure, wrangler config, sync pipeline, and implementation order.

## Existing patterns in this monorepo

This package follows the same conventions as the sibling packages:

| Concern | Reference |
|---------|-----------|
| Hono + Cloudflare Worker setup | `packages/api/src/index.ts` |
| Wrangler config with custom domain routing | `packages/api/wrangler.toml` |
| API key auth middleware | `packages/api/src/index.ts` (the `x-api-key` / `FITNESS_API_KEY` gate) |
| GitHub Actions deploy | `.github/workflows/deploy-api.yml` |
| Workspace registration | Root `package.json` (workspaces array) |

## Tech stack

- **Hono 4** (same as `packages/api`)
- **Cloudflare Workers** via **Wrangler** (same as `packages/api`)
- **`@modelcontextprotocol/sdk`** for MCP tool definitions and SSE transport
- **Cloudflare R2** bucket `personality-refs` for serving reference files
- **TypeScript** (same as everything else)

## MCP tools to implement

### 1. `health`

Simplest tool. Implement first to prove the MCP transport works.

- Returns: server status, last-sync timestamp (from R2 metadata), list of available facets
- No parameters

### 2. `get_personality`

Reads a single personality facet from R2 and returns it.

- Input: `facet` (enum: voice, emotions, experiences, interests, struggles, opinions, humor, interaction-patterns, safety-rules)
- Returns: the raw markdown content of that reference file
- Read `~/Github/personality/references/*.md` to see what these files look like when populated

### 3. `respond`

The core tool. Replicates the logic in `~/Github/personality/skills/respond-to-content/SKILL.md`.

- Input: `content` (required), `platform` (optional), `context` (optional), `tone_hint` (optional)
- Server-side logic:
  1. Load `rules/safety.md` from R2
  2. Assess the content (topic, tone, emotional weight) -- see Step 3 in the respond-to-content skill
  3. Select which personality facets are relevant -- see Step 4 in the respond-to-content skill for the selection logic
  4. Load the selected facets from R2
  5. Synthesize a response using the personality data + content assessment + platform context
  6. Validate the response against safety rules -- see Step 6 in the respond-to-content skill
  7. Return the response with metadata (facets used, platform adjustment, safety validation status)
- Returns: `{ response, facets_used, platform_adjusted, safety_validated }`

**Important for the `respond` tool:** The synthesis step needs an LLM call. The worker should use Cloudflare Workers AI or an external LLM API (OpenAI, Anthropic) to generate the actual response text given the personality context. The personality references are the prompt context, not the generation engine.

## REST fallback

In addition to the MCP transport, expose a simple REST endpoint for agents that don't speak MCP:

```
POST /api/respond    -- same as the respond tool
GET  /api/personality/:facet  -- same as get_personality tool
GET  /api/health     -- same as health tool
```

All REST endpoints require `x-api-key` header.

## R2 bucket structure

```
personality-refs/
├── references/
│   ├── voice.md
│   ├── emotions.md
│   ├── experiences.md
│   ├── interests.md
│   ├── struggles.md
│   ├── opinions.md
│   ├── humor.md
│   └── interaction-patterns.md
├── rules/
│   └── safety.md
└── meta/
    └── last-sync.json    # { "timestamp": "...", "commit": "..." }
```

## Worker file structure

```
packages/personality/
├── package.json
├── wrangler.toml
├── tsconfig.json
└── src/
    ├── index.ts          # Hono app + MCP server setup + REST fallback routes
    ├── tools/
    │   ├── respond.ts    # Response generation logic
    │   ├── personality.ts # Facet retrieval from R2
    │   └── health.ts     # Health check + last-sync from R2 metadata
    ├── engine/
    │   ├── assess.ts     # Content assessment (topic, tone, emotional weight, intent)
    │   ├── select.ts     # Facet selection (which refs to load based on assessment)
    │   ├── synthesize.ts # Build the LLM prompt from personality context + content, call LLM
    │   └── validate.ts   # Safety rule check on the generated response
    └── lib/
        ├── r2.ts         # R2 read helpers (get file, check existence, read metadata)
        └── auth.ts       # API key validation middleware
```

## Wrangler config

```toml
name = "wildmat-personality"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "production"

[[r2_buckets]]
binding = "PERSONALITY_REFS"
bucket_name = "personality-refs"

routes = [
  { pattern = "personality.wildmat.dev/*", zone_name = "wildmat.dev" }
]
```

Secrets to set via `wrangler secret put`:
- `PERSONALITY_API_KEY` -- for authenticating agent requests
- `LLM_API_KEY` -- for the LLM used in the `respond` tool's synthesis step (Anthropic, OpenAI, or Workers AI binding)

## Sync pipeline (lives in the personality repo, not here)

The personality repo at `~/Github/personality/` needs a GitHub Actions workflow and/or a manual script to upload reference files to the R2 bucket. See `~/Github/personality/REMOTE.md` for the sync design. The workflow triggers on push to `main` when `references/` or `rules/` change.

A manual sync script for immediate updates:

```bash
# Run from ~/Github/personality/
for file in references/*.md; do
  wrangler r2 object put "personality-refs/references/$(basename $file)" --file "$file"
done
wrangler r2 object put "personality-refs/rules/safety.md" --file "rules/safety.md"
echo '{"timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' | wrangler r2 object put "personality-refs/meta/last-sync.json" --pipe
```

## Deploy workflow

Add `.github/workflows/deploy-personality.yml` following the same pattern as `deploy-api.yml`:

```yaml
name: Deploy Personality MCP
on:
  push:
    branches: [main]
    paths: ['packages/personality/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run deploy -w @wildmat/personality
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

## Implementation order

1. Create R2 bucket `personality-refs` via Cloudflare dashboard or wrangler
2. Manually upload the current reference files to test R2 access
3. Scaffold this package: `package.json`, `wrangler.toml`, `tsconfig.json`, Hono entry point
4. Register this package in the root `package.json` workspaces (should already be covered by `packages/*` glob)
5. Implement `health` tool + REST route (proves MCP transport + R2 read work)
6. Implement `get_personality` tool + REST route (reads facet from R2)
7. Implement `respond` tool + REST route (the full pipeline: assess -> select -> load -> synthesize -> validate)
8. Add auth middleware (API key gate, same pattern as existing API)
9. Deploy and test at `personality.wildmat.dev`
10. Add deploy workflow to `.github/workflows/`
11. Add sync workflow to the personality repo for R2 auto-upload

## Security

- API key required on all requests (MCP and REST)
- R2 bucket is private, only the worker reads it
- No write operations exposed -- personality data is read-only from the server's perspective
- Safety validation runs server-side on every `respond` call
- Rate limiting via Cloudflare
- LLM API key stored as a worker secret, never in code
