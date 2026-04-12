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

parse_duration() {
  local input="$1"
  if ! [[ "$input" =~ ^([0-9]+)([mhd])$ ]]; then
    echo "Error: invalid duration '$input'. Use format: 30m, 2h, 1d" >&2
    exit 1
  fi
  local value="${BASH_REMATCH[1]}"
  local unit="${BASH_REMATCH[2]}"
  case "$unit" in
    m) echo $((value * 60)) ;;
    h) echo $((value * 3600)) ;;
    d) echo $((value * 86400)) ;;
  esac
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

cmd_maintenance() {
  check_deps
  local SUB="${1:-}"
  shift || true

  case "$SUB" in
    on)
      local ID="${1:-}"
      if [[ -z "$ID" ]]; then
        echo "Usage: $0 maintenance on <id> [duration] [message]" >&2
        exit 1
      fi
      local DURATION="${2:-}"
      local MESSAGE="${3:-}"

      local NOW
      NOW=$(date +%s)
      local EXPIRES_AT="null"

      if [[ -n "$DURATION" ]]; then
        local SECS
        SECS=$(parse_duration "$DURATION")
        EXPIRES_AT=$((NOW + SECS))
      fi

      local MAINT_JSON
      MAINT_JSON=$(jq -n \
        --argjson active true \
        --arg message "$MESSAGE" \
        --argjson startedAt "$NOW" \
        --argjson expiresAt "$EXPIRES_AT" \
        '{active: $active, message: (if $message == "" then null else $message end), startedAt: $startedAt, expiresAt: $expiresAt}')

      echo "$MAINT_JSON" | wrangler kv key put --binding=UPTIME_KV --remote "maintenance:${ID}" --stdin

      # Append maintenance_start event immediately
      local CUTOFF=$((NOW - 90 * 24 * 3600))
      local EXISTING_EVENTS
      EXISTING_EVENTS=$(wrangler kv key get --binding=UPTIME_KV --remote "events:${ID}" 2>/dev/null) || EXISTING_EVENTS="[]"
      if ! echo "$EXISTING_EVENTS" | jq -e . >/dev/null 2>&1; then
        EXISTING_EVENTS="[]"
      fi

      local NEW_EVENT
      NEW_EVENT=$(jq -n \
        --arg type "maintenance_start" \
        --argjson ts "$NOW" \
        --arg message "$MESSAGE" \
        '{type: $type, ts: $ts, message: (if $message == "" then null else $message end)}')

      local UPDATED_EVENTS
      UPDATED_EVENTS=$(echo "$EXISTING_EVENTS" | jq \
        --argjson cutoff "$CUTOFF" \
        --argjson event "$NEW_EVENT" \
        '[.[] | select(.ts >= $cutoff)] + [$event]')

      echo "$UPDATED_EVENTS" | wrangler kv key put --binding=UPTIME_KV --remote "events:${ID}" --expiration-ttl=7776000 --stdin

      echo ""
      echo "Maintenance mode enabled for '$ID'."
      if [[ -n "$DURATION" ]]; then
        echo "Expires in: $DURATION"
      else
        echo "No expiry set. Use 'maintenance off $ID' to disable."
      fi
      ;;

    off)
      local ID="${1:-}"
      if [[ -z "$ID" ]]; then
        echo "Usage: $0 maintenance off <id>" >&2
        exit 1
      fi

      wrangler kv key delete --binding=UPTIME_KV --remote "maintenance:${ID}"

      echo ""
      echo "Maintenance mode disabled for '$ID'."
      echo "A 'maintenance_end' event will appear after the next check cycle (≤5 min)."
      ;;

    extend)
      local ID="${1:-}"
      local DURATION="${2:-}"
      if [[ -z "$ID" ]] || [[ -z "$DURATION" ]]; then
        echo "Usage: $0 maintenance extend <id> <duration>" >&2
        exit 1
      fi

      local SECS
      SECS=$(parse_duration "$DURATION")

      local NOW
      NOW=$(date +%s)

      local EXISTING
      EXISTING=$(wrangler kv key get --binding=UPTIME_KV --remote "maintenance:${ID}" 2>/dev/null) || EXISTING=""

      if [[ -z "$EXISTING" ]] || ! echo "$EXISTING" | jq -e '.active == true' >/dev/null 2>&1; then
        echo "Error: no active maintenance mode found for '$ID'" >&2
        exit 1
      fi

      local CURRENT_EXPIRES
      CURRENT_EXPIRES=$(echo "$EXISTING" | jq 'if .expiresAt == null then empty else .expiresAt | floor end') || CURRENT_EXPIRES=""

      local NEW_EXPIRES
      if [[ -z "$CURRENT_EXPIRES" ]]; then
        NEW_EXPIRES=$((NOW + SECS))
      else
        NEW_EXPIRES=$((CURRENT_EXPIRES + SECS))
      fi

      local UPDATED
      UPDATED=$(echo "$EXISTING" | jq --argjson expires "$NEW_EXPIRES" '.expiresAt = $expires')

      echo "$UPDATED" | wrangler kv key put --binding=UPTIME_KV --remote "maintenance:${ID}" --stdin

      echo ""
      echo "Maintenance window extended for '$ID'."
      # macOS uses -r, Linux uses -d
      echo "New expiry: $(date -r "$NEW_EXPIRES" 2>/dev/null || date -d "@$NEW_EXPIRES" 2>/dev/null || echo "timestamp $NEW_EXPIRES")"
      ;;

    status)
      local ID="${1:-}"
      local MONITORS
      MONITORS=$(get_config)

      echo ""
      if [[ -n "$ID" ]]; then
        local DATA
        DATA=$(wrangler kv key get --binding=UPTIME_KV --remote "maintenance:${ID}" 2>/dev/null) || DATA=""
        echo "Maintenance status for '$ID':"
        if [[ -z "$DATA" ]] || ! echo "$DATA" | jq -e '.active == true' >/dev/null 2>&1; then
          echo "  Not in maintenance"
        else
          echo "$DATA" | jq .
        fi
      else
        echo "Maintenance status for all monitors:"
        echo ""
        while IFS= read -r mid; do
          local DATA NAME
          DATA=$(wrangler kv key get --binding=UPTIME_KV --remote "maintenance:${mid}" 2>/dev/null) || DATA=""
          NAME=$(echo "$MONITORS" | jq -r --arg id "$mid" '.[] | select(.id == $id) | .name')
          if [[ -z "$DATA" ]] || ! echo "$DATA" | jq -e '.active == true' >/dev/null 2>&1; then
            echo "  $NAME ($mid): operational"
          else
            local MSG
            MSG=$(echo "$DATA" | jq -r '.message // "(no message)"')
            echo "  $NAME ($mid): MAINTENANCE — $MSG"
          fi
        done < <(echo "$MONITORS" | jq -r '.[].id')
      fi
      ;;

    *)
      echo "Usage: $0 maintenance <on|off|extend|status>"
      echo ""
      echo "  on <id> [duration] [message]  — enable maintenance (e.g. 2h, 30m, 1d)"
      echo "  off <id>                      — disable maintenance"
      echo "  extend <id> <duration>        — extend active maintenance window"
      echo "  status [id]                   — show maintenance state"
      exit 1
      ;;
  esac
}

# ─── Entry point ──────────────────────────────────────────────────────────────

SUBCOMMAND="${1:-}"

case "$SUBCOMMAND" in
  list)        cmd_list ;;
  add)         cmd_add ;;
  remove)      cmd_remove ;;
  maintenance) shift; cmd_maintenance "$@" ;;
  *)
    echo "Usage: $0 <list|add|remove|maintenance>"
    echo ""
    echo "  list        — print current monitors from KV"
    echo "  add         — interactively add a new monitor"
    echo "  remove      — interactively remove a monitor"
    echo "  maintenance — manage maintenance mode"
    exit 1
    ;;
esac
