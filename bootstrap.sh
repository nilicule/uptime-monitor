#!/usr/bin/env bash
set -uo pipefail  # intentionally no -e: we handle exit codes explicitly

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Check wrangler ───────────────────────────────────────────────────────────

if ! command -v wrangler &>/dev/null; then
  echo "Error: wrangler is not installed. Run: npm install -g wrangler" >&2
  exit 1
fi

if ! wrangler whoami &>/dev/null; then
  echo "Error: not logged in to Cloudflare. Run: wrangler login" >&2
  exit 1
fi

# ─── Create KV namespaces ─────────────────────────────────────────────────────

echo ""
echo "Creating KV namespace UPTIME_KV (production)..."
PROD_OUTPUT=$(wrangler kv namespace create UPTIME_KV 2>&1) || true
echo "$PROD_OUTPUT"
PROD_ID=$(echo "$PROD_OUTPUT" | grep -oE '"id": "[a-f0-9]+"' | head -1 | grep -oE '[a-f0-9]{32}' || true)

echo ""
echo "Creating KV namespace UPTIME_KV (preview)..."
PREVIEW_OUTPUT=$(wrangler kv namespace create UPTIME_KV --preview 2>&1) || true
echo "$PREVIEW_OUTPUT"
PREVIEW_ID=$(echo "$PREVIEW_OUTPUT" | grep -oE '"preview_id": "[a-f0-9]+"' | head -1 | grep -oE '[a-f0-9]{32}' || true)

# ─── Generate wrangler.toml from template ─────────────────────────────────────

if [[ -z "${PROD_ID:-}" || -z "${PREVIEW_ID:-}" ]]; then
  echo "" >&2
  echo "Error: could not parse KV namespace IDs from wrangler output." >&2
  echo "" >&2
  echo "This usually means:" >&2
  echo "  - The namespace already exists (check: wrangler kv:namespace list)" >&2
  echo "  - The wrangler output format has changed" >&2
  echo "" >&2
  echo "To recover, run:" >&2
  echo "  wrangler kv:namespace list" >&2
  echo "Then manually copy the IDs into wrangler.toml.example and rename it to wrangler.toml." >&2
  exit 1
fi

echo ""
echo "Generating wrangler.toml with KV namespace IDs..."
sed \
  -e "s/id = \"placeholder\"/id = \"$PROD_ID\"/" \
  -e "s/preview_id = \"placeholder\"/preview_id = \"$PREVIEW_ID\"/" \
  "$SCRIPT_DIR/wrangler.toml.example" > "$SCRIPT_DIR/wrangler.toml"

echo "wrangler.toml created (gitignored — never committed)."

# ─── Set MONITORS_CONFIG secret ───────────────────────────────────────────────

echo ""
echo "Now let's configure your monitors."
echo ""
echo "Paste your monitors JSON (single line), then press Enter:"
echo ""
echo "Example:"
cat <<'EXAMPLE'
[{"id":"plex","name":"Plex","type":"http","url":"https://plex.example.com","expectedStatus":[200,401]},{"id":"nas","name":"NAS","type":"tcp","host":"nas.example.com","port":5000}]
EXAMPLE
echo ""
read -r MONITORS_JSON

if [[ -z "$MONITORS_JSON" ]]; then
  echo "Error: no JSON provided. Run this script again to set the secret." >&2
  exit 1
fi

echo "$MONITORS_JSON" | wrangler secret put MONITORS_CONFIG

echo ""
echo "════════════════════════════════════════════════════════════════"
echo " Bootstrap complete!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  Deploy:       wrangler deploy"
echo "  Test locally: wrangler dev"
echo "  Manual run:   curl 'localhost:8787/__scheduled?cron=*%2F5+*+*+*+*'"
echo "  View logs:    wrangler tail"
echo "  Manage monitors: ./scripts/monitors.sh list|add|remove"
