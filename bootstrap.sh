#!/usr/bin/env bash
set -uo pipefail  # intentionally no -e: we handle exit codes explicitly

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Check dependencies ───────────────────────────────────────────────────────

if ! command -v wrangler &>/dev/null; then
  echo "Error: wrangler is not installed. Run: npm install -g wrangler" >&2
  exit 1
fi

if ! wrangler whoami &>/dev/null; then
  echo "Error: not logged in to Cloudflare. Run: wrangler login" >&2
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo "Error: jq is not installed. Install it via your package manager." >&2
  exit 1
fi

# ─── Helpers ──────────────────────────────────────────────────────────────────

slugify() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-\|-$//g'
}

add_monitor_interactive() {
  local monitors_json="$1"

  read -rp "Type [http/tcp]: " TYPE
  if [[ "$TYPE" != "http" && "$TYPE" != "tcp" ]]; then
    echo "Error: type must be 'http' or 'tcp'" >&2
    return 1
  fi

  read -rp "Name (human-readable label): " NAME
  if [[ -z "$NAME" ]]; then
    echo "Error: name cannot be empty" >&2
    return 1
  fi

  local ID
  ID=$(slugify "$NAME")
  echo "Generated ID: $ID"
  read -rp "Accept ID '$ID'? [Y/n]: " CONFIRM_ID
  if [[ "${CONFIRM_ID,,}" == "n" ]]; then
    read -rp "Enter custom ID: " ID
    ID=$(slugify "$ID")
    echo "Using ID: $ID"
  fi

  local NEW_ENTRY
  if [[ "$TYPE" == "http" ]]; then
    read -rp "URL: " URL
    NEW_ENTRY=$(jq -n \
      --arg id "$ID" --arg name "$NAME" --arg url "$URL" \
      '{id: $id, name: $name, type: "http", url: $url}')
  else
    read -rp "Host: " HOST
    read -rp "Port: " PORT
    NEW_ENTRY=$(jq -n \
      --arg id "$ID" --arg name "$NAME" --arg host "$HOST" \
      --argjson port "$PORT" \
      '{id: $id, name: $name, type: "tcp", host: $host, port: $port}')
  fi

  echo "$monitors_json" | jq --argjson entry "$NEW_ENTRY" '. + [$entry]'
}

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

# ─── Configure monitors ───────────────────────────────────────────────────────

echo ""
echo "Now let's configure your monitors."
echo "Add at least one monitor to get started."

MONITORS_JSON="[]"
while true; do
  echo ""
  echo "─────────────────"
  MONITORS_JSON=$(add_monitor_interactive "$MONITORS_JSON") || exit 1
  echo ""
  read -rp "Add another monitor? [y/N]: " MORE
  [[ "${MORE,,}" == "y" ]] || break
done

echo ""
echo "Monitors to be configured:"
echo "$MONITORS_JSON" | jq -r '.[] | "  [\(.type)] \(.name) — \(if .type == "http" then .url else "\(.host):\(.port)" end)"'
echo ""

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
