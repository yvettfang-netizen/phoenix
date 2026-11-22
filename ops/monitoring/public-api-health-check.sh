#!/usr/bin/env bash
# Public Phoenix API uptime monitor, independent of the retired Education DB and UAT runtime.
# Uses the existing Feishu alert notifier and the 2-minute cron cadence.
# Does not query legacy PostgreSQL, inspect PM2, or touch Canonical data.
set -uo pipefail

NODE_BIN=${PHOENIX_NODE_BIN:-/home/ubuntu/.nvm/versions/node/v24.20.0/bin}
export PATH="$NODE_BIN:$PATH"
NOTIFY=("$NODE_BIN/node" "${PHOENIX_ALERT_NOTIFY:-/home/ubuntu/phoenix-alert-notify.mjs}")
STATE_DIR="${PHOENIX_ALERT_STATE_DIR:-$HOME/.local/state/phoenix-alert}"
CONFIG="${PHOENIX_ALERT_CONFIG:-$HOME/.config/phoenix-alert/feishu.env}"
HEALTH_URL="${PHOENIX_PUBLIC_API_HEALTH_URL:-https://api.phoenixnova.com.cn/health}"
FAIL_THRESHOLD="${PHOENIX_PUBLIC_API_FAIL_THRESHOLD:-2}"

mkdir -p "$STATE_DIR" && chmod 700 "$STATE_DIR"
if [ ! -r "$CONFIG" ] && [ "${PHOENIX_ALERT_DRY_RUN:-}" != "1" ]; then exit 0; fi
if ! [[ "$FAIL_THRESHOLD" =~ ^[1-9][0-9]*$ ]]; then
  echo "Invalid PHOENIX_PUBLIC_API_FAIL_THRESHOLD" >&2
  exit 2
fi

FAIL_FILE="$STATE_DIR/public-api.fails"
DOWN_FILE="$STATE_DIR/public-api.down"
HTTP_CODE=$(curl -sS --connect-timeout 5 --max-time 10 --output /dev/null --write-out '%{http_code}' "$HEALTH_URL" 2>/dev/null) || HTTP_CODE=000

if [ "$HTTP_CODE" = 200 ]; then
  if [ -f "$DOWN_FILE" ]; then
    SINCE=$(cat "$DOWN_FILE")
    if "${NOTIFY[@]}" recovery "Phoenix 公网 API 已恢复" "故障开始：$SINCE；当前健康检查 200：$HEALTH_URL"; then
      rm -f "$DOWN_FILE"
    fi
  fi
  rm -f "$FAIL_FILE"
  exit 0
fi

COUNT=$(cat "$FAIL_FILE" 2>/dev/null || echo 0)
if ! [[ "$COUNT" =~ ^[0-9]+$ ]]; then COUNT=0; fi
COUNT=$(( COUNT + 1 ))
printf '%s\n' "$COUNT" > "$FAIL_FILE"
if [ "$COUNT" -ge "$FAIL_THRESHOLD" ] && [ ! -f "$DOWN_FILE" ]; then
  WHEN=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
  if "${NOTIFY[@]}" alert "Phoenix 公网 API 不可用" "连续 $COUNT 次健康检查失败（HTTP $HTTP_CODE）：$HEALTH_URL"; then
    printf '%s\n' "$WHEN" > "$DOWN_FILE"
  fi
fi
