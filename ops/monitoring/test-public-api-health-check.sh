#!/usr/bin/env bash
# Isolated monitor test. No network, external notifier or production state.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/bin"
cat > "$TMP/bin/curl" <<'EOF'
#!/usr/bin/env bash
printf '%s' "${FAKE_HTTP_CODE:-200}"
EOF
cat > "$TMP/bin/node" <<'EOF'
#!/usr/bin/env bash
printf '%s %s\n' "$2" "$3" >> "$PHOENIX_NOTIFY_LOG"
EOF
chmod +x "$TMP/bin/curl" "$TMP/bin/node"

export PATH="$TMP/bin:$PATH"
export PHOENIX_NODE_BIN="$TMP/bin"
export PHOENIX_ALERT_NOTIFY="$TMP/dummy-notify.js"
export PHOENIX_ALERT_DRY_RUN=1
export PHOENIX_ALERT_STATE_DIR="$TMP/state"
export PHOENIX_NOTIFY_LOG="$TMP/notifications.log"
export PHOENIX_PUBLIC_API_FAIL_THRESHOLD=2

monitor() { FAKE_HTTP_CODE="$1" bash "$ROOT/ops/monitoring/public-api-health-check.sh"; }
count() {
  if [ -f "$PHOENIX_NOTIFY_LOG" ]; then
    grep -c "^$1 " "$PHOENIX_NOTIFY_LOG" || true
  else
    echo 0
  fi
}

monitor 503
test "$(count alert)" = 0
monitor 503
test "$(count alert)" = 1
monitor 503
test "$(count alert)" = 1
monitor 200
test "$(count recovery)" = 1
monitor 200
test "$(count recovery)" = 1
monitor 503
test "$(count alert)" = 1
monitor 503
test "$(count alert)" = 2
monitor 200
test "$(count recovery)" = 2
echo "PASS — public API monitor: alert threshold, deduplication, recovery and reset"
