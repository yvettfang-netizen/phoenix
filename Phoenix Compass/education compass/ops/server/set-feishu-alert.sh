#!/usr/bin/env bash
# 配置飞书群机器人告警通道。
#
#   ~/set-feishu-alert.sh           录入 webhook 与 secret（隐藏输入），发测试消息，成功后安装每日巡检
#   ~/set-feishu-alert.sh --test    用已保存的配置再发一条测试消息
#
# 当前仅保留主机证书和磁盘巡检；Education 独立 PG、UAT API/Agent、PM2 健康检查与旧数据库备份任务已退役。
set -euo pipefail
umask 077

NODE=/home/ubuntu/.nvm/versions/node/v24.20.0/bin/node
NOTIFY=/home/ubuntu/phoenix-alert-notify.mjs
CONFIG_DIR="$HOME/.config/phoenix-alert"
CONFIG="$CONFIG_DIR/feishu.env"
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

echo "在飞书群里：设置 → 群机器人 → 添加机器人 → 自定义机器人。"
echo "安全设置建议勾选「签名校验」并复制 secret；如果用「自定义关键词」，关键词填 Phoenix。"
echo
read -rsp "粘贴 webhook 地址（输入不显示），然后按 Enter: " WEBHOOK
echo
if [[ ! "$WEBHOOK" =~ ^https://open\\.(feishu\\.cn|larksuite\\.com)/open-apis/bot/v2/hook/[A-Za-z0-9-]+$ ]]; then
  echo "格式不对。没有做任何修改。"
  exit 1
fi
read -rsp "粘贴签名校验的 secret（用关键词校验的话直接按 Enter 留空）: " SECRET
echo

mkdir -p "$CONFIG_DIR" && chmod 700 "$CONFIG_DIR"
TMP=$(mktemp "$CONFIG_DIR/feishu.env.XXXXXX")
printf 'FEISHU_ALERT_WEBHOOK=%s\\nFEISHU_ALERT_SECRET=%s\\n' "$WEBHOOK" "$SECRET" > "$TMP"
unset WEBHOOK SECRET
chmod 600 "$TMP"

if ! PHOENIX_ALERT_CONFIG="$TMP" "$NODE" "$NOTIFY" test "告警通道已接通" \
    "每天 05:00 检查主机 HTTPS 证书和磁盘空间。Canonical PostgreSQL 备份与灾备监控由其独立运维流程负责。"; then
  rm -f "$TMP"
  echo "测试消息没有发出去，原配置未改动、定时任务未安装。"
  exit 1
fi
mv "$TMP" "$CONFIG"

# 移除旧 Education 高频健康检查，只保留每日主机巡检；保留其他 crontab 项。
( crontab -l 2>/dev/null | grep -vF '/home/ubuntu/health-check.sh' | grep -vF '/home/ubuntu/daily-check.sh'
  echo "$CRON_DAILY" ) | crontab -

echo "完成：告警通道已验证，每天 05:00 进行主机证书与磁盘巡检。"
