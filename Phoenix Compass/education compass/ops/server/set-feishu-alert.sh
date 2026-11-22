#!/usr/bin/env bash
# 配置飞书群机器人告警通道。保留公网 API 2 分钟健康检查和每日主机证书/磁盘巡检；不依赖旧 Education 数据库。
set -euo pipefail
umask 077

NODE=/home/ubuntu/.nvm/versions/node/v24.20.0/bin/node
NOTIFY=/home/ubuntu/phoenix-alert-notify.mjs
CONFIG_DIR="$HOME/.config/phoenix-alert"
CONFIG="$CONFIG_DIR/feishu.env"
CRON_HEALTH="*/2 * * * * /home/ubuntu/public-api-health-check.sh >/dev/null 2>&1"
CRON_DAILY="0 5 * * * /home/ubuntu/daily-check.sh >/dev/null 2>&1"

send_test() {
  "$NODE" "$NOTIFY" test "告警通道已接通" \
    "每天 05:00 检查主机 HTTPS 证书和磁盘空间。Canonical PostgreSQL 备份与灾备监控由其独立运维流程负责。"
}

if [ "${1:-}" = "--test" ]; then
  [ -r "$CONFIG" ] || { echo "还没有配置，先不带参数运行一次。"; exit 1; }
  send_test && echo "测试消息已发送，去飞书群里看一眼。"
  exit
fi

if [ ! -x /home/ubuntu/public-api-health-check.sh ]; then
  echo "公网 API 新健康检查尚未部署且不可执行。保留原 cron，不安装新的告警配置。"
  exit 1
fi

echo "在飞书群里：设置 → 群机器人 → 添加机器人 → 自定义机器人。"
echo "安全设置建议勾选「签名校验」并复制 secret；如果用「自定义关键词」，关键词填 Phoenix。"
echo
read -rsp "粘贴 webhook 地址（输入不显示），然后按 Enter: " WEBHOOK
echo
if [[ ! "$WEBHOOK" =~ ^https://open[.](feishu[.]cn|larksuite[.]com)/open-apis/bot/v2/hook/[A-Za-z0-9-]+$ ]]; then
  echo "格式不对。没有做任何修改。"
  exit 1
fi
read -rsp "粘贴签名校验的 secret（用关键词校验的话直接按 Enter 留空）: " SECRET
echo

mkdir -p "$CONFIG_DIR" && chmod 700 "$CONFIG_DIR"
TMP=$(mktemp "$CONFIG_DIR/feishu.env.XXXXXX")
cat > "$TMP" <<EOF
FEISHU_ALERT_WEBHOOK=$WEBHOOK
FEISHU_ALERT_SECRET=$SECRET
EOF
unset WEBHOOK SECRET
chmod 600 "$TMP"

if ! PHOENIX_ALERT_CONFIG="$TMP" "$NODE" "$NOTIFY" test "告警通道已接通" \
    "每天 05:00 检查主机 HTTPS 证书和磁盘空间。Canonical PostgreSQL 备份与灾备监控由其独立运维流程负责。"; then
  rm -f "$TMP"
  echo "测试消息没有发出去，原配置未改动、定时任务未安装。"
  exit 1
fi
mv "$TMP" "$CONFIG"

( crontab -l 2>/dev/null | grep -vF '/home/ubuntu/health-check.sh' | grep -vF '/home/ubuntu/daily-check.sh'
  echo "$CRON_HEALTH"
  echo "$CRON_DAILY" ) | crontab -

echo "完成：公网 API 每 2 分钟健康检查；每天 05:00 主机证书与磁盘巡检。"
