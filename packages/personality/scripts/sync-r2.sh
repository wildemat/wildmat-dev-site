#!/usr/bin/env bash
# Manual sync of personality references + safety rules into the personality-refs R2 bucket.
# Run from the root of ~/Github/personality/ (or pass PERSONALITY_REPO=/path).

set -euo pipefail

REPO="${PERSONALITY_REPO:-$HOME/Github/personality}"
BUCKET="personality-refs"
WRANGLER="${WRANGLER:-npx wrangler}"

if [[ ! -d "$REPO/references" ]]; then
  echo "references/ not found in $REPO" >&2
  exit 1
fi

echo "Syncing from $REPO to r2://$BUCKET"

for file in "$REPO"/references/*.md; do
  name="$(basename "$file")"
  echo "  references/$name"
  $WRANGLER r2 object put "$BUCKET/references/$name" --file "$file" --remote
done

if [[ -f "$REPO/rules/safety.md" ]]; then
  echo "  rules/safety.md"
  $WRANGLER r2 object put "$BUCKET/rules/safety.md" --file "$REPO/rules/safety.md" --remote
fi

commit="$(git -C "$REPO" rev-parse --short HEAD 2>/dev/null || echo unknown)"
timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
tmp="$(mktemp)"
printf '{"timestamp":"%s","commit":"%s"}' "$timestamp" "$commit" > "$tmp"
echo "  meta/last-sync.json"
$WRANGLER r2 object put "$BUCKET/meta/last-sync.json" --file "$tmp" --content-type application/json --remote
rm -f "$tmp"

echo "Done."
