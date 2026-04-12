#!/usr/bin/env bash
set -euo pipefail

# ─── Preflight ────────────────────────────────────────────────────────────────

check_deps() {
  if ! command -v wrangler &>/dev/null; then
    echo "Error: wrangler is not installed. Run: npm install -g wrangler" >&2
    exit 1
  fi
  if ! wrangler whoami &>/dev/null 2>&1; then
    echo "Error: not logged in to Cloudflare. Run: wrangler login" >&2
    exit 1
  fi
  if ! command -v jq &>/dev/null; then
    echo "Error: jq is not installed. Install it via your package manager." >&2
    exit 1
  fi
}

get_config() {
  local raw
  raw=$(wrangler kv key get --binding=UPTIME_KV --remote "config:monitors" 2>/dev/null) || true
  if echo "$raw" | jq -e . >/dev/null 2>&1; then
    echo "$raw"
  else
    echo "[]"
  fi
}

put_config() {
  local json="$1"
  # Write to KV
  echo "$json" | wrangler kv key put --binding=UPTIME_KV --remote "config:monitors" --stdin
  # Re-set the secret
  echo "$json" | wrangler secret put MONITORS_CONFIG
}

slugify() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-\|-$//g'
}

# ─── Subcommands ──────────────────────────────────────────────────────────────

cmd_list() {
  check_deps
  echo ""
  echo "Current monitors (from config:monitors KV key):"
  echo ""
  get_config | jq .
}

cmd_add() {
  check_deps
  echo ""
  echo "Add a new monitor"
  echo "─────────────────"

  # Type
  read -rp "Type [http/tcp]: " TYPE
  if [[ "$TYPE" != "http" && "$TYPE" != "tcp" ]]; then
    echo "Error: type must be 'http' or 'tcp'" >&2
    exit 1
  fi

  # Name
  read -rp "Name (human-readable label): " NAME
  if [[ -z "$NAME" ]]; then
    echo "Error: name cannot be empty" >&2
    exit 1
  fi

  # Auto-generate ID from name
  ID=$(slugify "$NAME")
  echo "Generated ID: $ID"
  read -rp "Accept ID '$ID'? [Y/n]: " CONFIRM_ID
  if [[ "${CONFIRM_ID,,}" == "n" ]]; then
    read -rp "Enter custom ID: " ID
    ID=$(slugify "$ID")
    echo "Using ID: $ID"
  fi

  if [[ "$TYPE" == "http" ]]; then
    read -rp "URL: " URL
    read -rp "Expected status codes (comma-separated) [200]: " STATUS_RAW
    STATUS_RAW="${STATUS_RAW:-200}"
    # Build JSON array of ints
    STATUS_JSON=$(echo "$STATUS_RAW" | tr ',' '\n' | sed 's/[[:space:]]//g' | jq -R 'tonumber' | jq -s '.')

    NEW_ENTRY=$(jq -n \
      --arg id "$ID" \
      --arg name "$NAME" \
      --arg url "$URL" \
      --argjson expectedStatus "$STATUS_JSON" \
      '{id: $id, name: $name, type: "http", url: $url, expectedStatus: $expectedStatus}')
  else
    read -rp "Host: " HOST
    read -rp "Port: " PORT
    NEW_ENTRY=$(jq -n \
      --arg id "$ID" \
      --arg name "$NAME" \
      --arg host "$HOST" \
      --argjson port "$PORT" \
      '{id: $id, name: $name, type: "tcp", host: $host, port: $port}')
  fi

  echo ""
  echo "New entry:"
  echo "$NEW_ENTRY" | jq .

  read -rp "Add this monitor? [Y/n]: " CONFIRM
  if [[ "${CONFIRM,,}" == "n" ]]; then
    echo "Aborted."
    exit 0
  fi

  CURRENT=$(get_config)
  # Check for duplicate ID
  EXISTS=$(echo "$CURRENT" | jq --arg id "$ID" '[.[] | select(.id == $id)] | length')
  if [[ "$EXISTS" -gt 0 ]]; then
    echo "Error: a monitor with id '$ID' already exists." >&2
    exit 1
  fi

  UPDATED=$(echo "$CURRENT" | jq --argjson entry "$NEW_ENTRY" '. + [$entry]')
  put_config "$UPDATED"

  echo ""
  echo "Monitor '$NAME' added successfully."
}

cmd_remove() {
  check_deps
  echo ""
  echo "Remove a monitor"
  echo "────────────────"

  CURRENT=$(get_config)
  COUNT=$(echo "$CURRENT" | jq 'length')

  if [[ "$COUNT" -eq 0 ]]; then
    echo "No monitors configured."
    exit 0
  fi

  echo ""
  echo "Current monitors:"
  echo "$CURRENT" | jq -r 'to_entries[] | "  \(.key + 1). [\(.value.type)] \(.value.name) (\(.value.id))"'
  echo ""

  read -rp "Enter number to remove [1-$COUNT]: " NUM
  if ! [[ "$NUM" =~ ^[0-9]+$ ]] || [[ "$NUM" -lt 1 ]] || [[ "$NUM" -gt "$COUNT" ]]; then
    echo "Error: invalid selection" >&2
    exit 1
  fi

  IDX=$((NUM - 1))
  ENTRY=$(echo "$CURRENT" | jq --argjson idx "$IDX" '.[$idx]')
  ENTRY_NAME=$(echo "$ENTRY" | jq -r '.name')
  ENTRY_ID=$(echo "$ENTRY" | jq -r '.id')

  echo ""
  echo "About to remove: $ENTRY_NAME (id: $ENTRY_ID)"
  read -rp "Confirm removal? [y/N]: " CONFIRM
  if [[ "${CONFIRM,,}" != "y" ]]; then
    echo "Aborted."
    exit 0
  fi

  UPDATED=$(echo "$CURRENT" | jq --argjson idx "$IDX" 'del(.[$idx])')
  put_config "$UPDATED"

  echo ""
  echo "Monitor '$ENTRY_NAME' removed successfully."
}

# ─── Entry point ──────────────────────────────────────────────────────────────

SUBCOMMAND="${1:-}"

case "$SUBCOMMAND" in
  list)   cmd_list ;;
  add)    cmd_add ;;
  remove) cmd_remove ;;
  *)
    echo "Usage: $0 <list|add|remove>"
    echo ""
    echo "  list    — print current monitors from KV"
    echo "  add     — interactively add a new monitor"
    echo "  remove  — interactively remove a monitor"
    exit 1
    ;;
esac
