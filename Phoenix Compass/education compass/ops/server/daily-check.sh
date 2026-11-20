#!/usr/bin/env bash
# 原独立 Education PostgreSQL、PM2 API/Agent、数据库备份和 COS 同步均已退役。
# 本脚本只保留宿主机 HTTPS 证书与磁盘空间巡检；不代表 Canonical PostgreSQL 的备份/灾备监控。
set -uo pipefail

NODE_BIN=/home/ubuntu/.nvm/versions/node/v24.20.0/bin
export PATH="$NODE_BIN:$PATH"
NOTIFY=("$NODE_BIN/node" "${PHOENIX_ALERT_NOTIFY:-/home/ubuntu/phoenix-alert-notify.mjs}")

STATE_DIR="${PHOENIX_ALERT_STATE_DIR:-$HOME/.local/state/phoenix-alert}"
CONFIG="${PHOENIX_ALERT_CONFIG:-$HOME/.config/phoenix-alert/feishu.env}"
CERT_HOST="${CERT_HOST:-api.phoenixnova.com.cn}"
CERT_MIN_DAYS="${CERT_MIN_DAYS:-20}"
DISK_THRESHOLD="${DISK_THRESHOLD:-85}"

mkdir -p "$STATE_DIR" && chmod 700 "$STATE_DIR"
if [ ! -r "$CONFIG" ] && [ "${PHOENIX_ALERT_DRY_RUN:-}" != "1" ]; then exit 0; fi

problems=()
facts=()

end=$(echo | timeout 10 openssl s_client -connect 127.0.0.1:443 -servername "$CERT_HOST" 2>/dev/null \
      | openssl x509 -noout -enddate 2>/dev/null | sed 's/^notAfter=//')
if [ -n "$end" ]; then
  days=$(( ( $(date -d "$end" +%s) - $(date +%s) ) / 86400 ))
  facts+=("证书剩 $days 天")
  if [ "$days" -lt "$CERT_MIN_DAYS" ]; then
    problems+=("HTTPS 证书只剩 $days 天，自动续期可能失败。检查：sudo certbot renew --dry-run")
  fi
else
  problems+=("读不到 Nginx 正在使用的证书（$CERT_HOST:443）")
fi

usage=$(df --output=pcent / | tail -1 | tr -dc '0-9')
facts+=("磁盘 ${usage}%")
if [ "${usage:-0}" -ge "$DISK_THRESHOLD" ]; then
  problems+=("磁盘使用 ${usage}%，超过 ${DISK_THRESHOLD}%")
fi

summary=$(IFS='，'; echo "${facts[*]}")
if [ "${#problems[@]}" -eq 0 ]; then
  "${NOTIFY[@]}" daily "每日巡检正常" "$summary"
else
  body="${problems[*]}"
  "${NOTIFY[@]}" alert "每日巡检发现 ${#problems[@]} 个问题" "$body；其余：$summary"
fi
