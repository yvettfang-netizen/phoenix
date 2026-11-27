#!/usr/bin/env bash
# Update the Education Compass checkout from a branch the dev PC pushed over SSH
#   (on the PC: git push tencent <branch>  ->  refs/remotes/relay/<branch> here),
# then, only if backend code changed: test, rebuild with Node 24, and hand the build to
# the UAT API. Production (127.0.0.1:3100) is only touched by an explicit --promote.
#
# Usage: ~/update-education-compass.sh [--promote] <分支名>
#
# Education Compass has its own git worktree (/home/ubuntu/education-compass, sparse-checked-out
# to just this project). It shares the object store with /home/ubuntu/phoenix but carries its own
# branch, so switching branches here no longer touches askwise, Identity Compass or Wealth Compass
# — which is why the old --switch guard is gone.
#
# 两种发布口径：
#   默认        构建产物暂存到 server/dist-candidate，只重启联调后端（3010）；
#               生产 dist 保持发布前的版本，生产进程即便崩溃重启也不会加载未验收的代码。
#   --promote   把 dist-candidate 落到生产 dist，重启 education-compass（3100），
#               健康检查失败自动回滚到发布前的 dist 并再次重启。
set -euo pipefail
export PATH=/home/ubuntu/.nvm/versions/node/v24.20.0/bin:$PATH

REPO=/home/ubuntu/education-compass
PROJECT="Phoenix Compass/education compass"
SERVER="$REPO/$PROJECT/server"
DIST="$SERVER/dist"
CANDIDATE="$SERVER/dist-candidate"
LAUNCHER=/home/ubuntu/phoenix_uat_start.sh
BACKUP_DIR=/home/ubuntu/backups
PROMOTED_FILE="$BACKUP_DIR/education-compass-promoted.txt"
PROD_UNIT=education-compass
PROD_HEALTH=http://127.0.0.1:3100/health
UAT_HEALTH=http://127.0.0.1:3010/health

PROMOTE=0
BRANCH=""

usage() {
  cat <<'EOF'
用法：~/update-education-compass.sh [--promote] <分支名>

  默认        更新代码 → 测试 → 构建 → 暂存到 dist-candidate → 重启联调后端（3010）
   --promote  额外发布到生产：dist-candidate → dist，重启 education-compass（3100），
              健康检查失败自动回滚

  -h, --help  显示本说明
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --promote) PROMOTE=1 ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "未知参数：$1"; usage; exit 1 ;;
    *)
      if [ -n "$BRANCH" ]; then
        echo "只接受一个分支名，收到：$BRANCH 和 $1"
        usage
        exit 1
      fi
      BRANCH="$1"
      ;;
  esac
  shift
done

cd "$REPO"
CURRENT="$(git branch --show-current)"

if [ -z "$BRANCH" ]; then
  usage
  echo
  echo "当前检出分支：$CURRENT"
  echo "电脑已推送到服务器的分支："
  git for-each-ref --format='  %(refname:strip=3)' refs/remotes/relay/ | sed 's/^/  /'
  exit 1
fi

REF="refs/remotes/relay/$BRANCH"
if ! git rev-parse -q --verify "$REF" >/dev/null; then
  echo "没有收到分支 $BRANCH 的推送（$REF 不存在）。先在电脑上执行：git push tencent $BRANCH"
  exit 1
fi

# Taken before any switch: switching to the branch already moves HEAD, and the rebuild decision
# below compares against what was running.
OLD="$(git rev-parse --short HEAD)"
SERVER_CHANGED=0

if [ "$BRANCH" != "$CURRENT" ] && git merge-base --is-ancestor "$REF" HEAD; then
  echo "当前分支 $CURRENT 已包含 $BRANCH 的全部提交，无需切换。"
else
  if [ "$BRANCH" != "$CURRENT" ]; then
    # 这个工作区只归 Education Compass 所有，切分支不会影响别的项目；
    # 但未提交的改动仍然要拦，否则会被悄悄冲掉。
    if [ -n "$(git status --porcelain)" ]; then
      echo "工作区有未提交改动，切换前请先处理："
      git status --porcelain | head -10 | sed 's/^/  /'
      exit 1
    fi
    # relay/ is not a configured remote, so the new branch starts from the ref without tracking it.
    git switch -q "$BRANCH" 2>/dev/null || git switch -q -c "$BRANCH" "$REF"
    echo "已切换到分支：$CURRENT -> $BRANCH"
  fi

  git merge --ff-only -q "$REF"
  NEW="$(git rev-parse --short HEAD)"
  if [ "$OLD" = "$NEW" ]; then
    echo "代码已是最新：$NEW（分支 $BRANCH）"
  else
    echo "代码已更新：$OLD -> $NEW（分支 $BRANCH）"
    git diff --stat "$OLD" "$NEW" -- "$PROJECT" | tail -1
    if ! git diff --quiet "$OLD" "$NEW" -- "$PROJECT/server"; then
      SERVER_CHANGED=1
    fi
  fi
fi

BUILT=0
if [ "$SERVER_CHANGED" = "0" ]; then
  echo "后端代码没有变化，跳过测试与构建。"
else
  cd "$SERVER"
  if ! npm test > /tmp/education-compass-server-test.log 2>&1; then
    echo "后端测试失败，未构建、未重启。日志：/tmp/education-compass-server-test.log"
    exit 1
  fi
  echo "后端测试通过"

  # 联调支持 dist-candidate 时直接把构建写到候选目录：生产 dist 全程不被触碰，
  # 也就不存在"生产崩溃重启加载未验收代码"的窗口。
  if grep -q 'dist-candidate' "$LAUNCHER" 2>/dev/null; then
    rm -rf "$CANDIDATE"
    if ! npm run -s build -- --outDir "$CANDIDATE"; then
      rm -rf "$CANDIDATE"
      echo "构建失败，生产 dist 与联调均未改动。"
      exit 1
    fi
    echo "新构建已生成：dist-candidate（生产 dist 未改动）。"
  else
    mkdir -p "$BACKUP_DIR"
    BACKUP="$BACKUP_DIR/education-compass-server-dist-$(date +%Y%m%d-%H%M%S).tar.gz"
    tar -czf "$BACKUP" dist
    if ! npm run -s build; then
      rm -rf dist && tar -xzf "$BACKUP"
      echo "构建失败，已恢复旧的 dist，联调后端未重启。"
      exit 1
    fi
    echo "⚠️  $LAUNCHER 不支持 dist-candidate，本次构建就地写入 dist。"
    echo "    生产进程未重启，但崩溃重启会加载新代码；请尽快用 --promote 完成切换。"
  fi
  BUILT=1
fi

if [ "$BUILT" = "1" ]; then
  pm2 restart phoenix_uat_api > /dev/null
  # The agent worker runs from the same dist/ build and must pick up the new code too.
  if pm2 describe phoenix_uat_agent_worker > /dev/null 2>&1; then
    pm2 restart phoenix_uat_agent_worker > /dev/null
    echo "AI 处理进程已重启。"
  fi
  for _ in $(seq 1 20); do
    sleep 1
    curl -sf -m 2 "$UAT_HEALTH" > /dev/null && break
  done
  if curl -sf -m 5 "$UAT_HEALTH" > /dev/null; then
    echo "联调后端已重启，健康检查正常。"
  else
    echo "联调后端重启后健康检查失败，请查看：pm2 logs phoenix_uat_api"
    exit 1
  fi
fi

if [ "$PROMOTE" = "0" ]; then
  if [ -d "$CANDIDATE" ]; then
    echo
    echo "生产未变更。验收通过后发布：~/update-education-compass.sh --promote $BRANCH"
  elif [ "$BUILT" = "1" ]; then
    echo
    echo "生产未重启。确认无问题后切换：~/update-education-compass.sh --promote $BRANCH"
  fi
  exit 0
fi

# ---- promote: 把候选构建落到生产 ----
if [ -d "$CANDIDATE" ]; then
  SOURCE="$CANDIDATE"
elif [ "$BUILT" = "1" ]; then
  SOURCE="$DIST"
else
  echo "没有待发布的构建：后端代码没有变化，也没有上次遗留的 dist-candidate。"
  exit 0
fi

if ! systemctl is-active --quiet "$PROD_UNIT"; then
  echo "生产服务 $PROD_UNIT 当前不是 active，先确认状态再发布：systemctl status $PROD_UNIT"
  exit 1
fi

PRE_PROMOTE="$BACKUP_DIR/education-compass-dist-pre-promote-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "$PRE_PROMOTE" -C "$SERVER" dist
echo "发布前 dist 已备份：$PRE_PROMOTE"

if [ "$SOURCE" = "$CANDIDATE" ]; then
  rm -rf "$DIST"
  cp -a "$CANDIDATE" "$DIST"
fi

if ! sudo -n systemctl restart "$PROD_UNIT"; then
  # 重启没成功时生产还在跑旧进程，磁盘却已是新构建：恢复 dist，避免下次崩溃重启静默换代码。
  rm -rf "$DIST"
  tar -xzf "$PRE_PROMOTE" -C "$SERVER"
  echo "生产重启失败（sudo 需要密码或权限不足），已恢复发布前的 dist。"
  echo "排查：systemctl status $PROD_UNIT；回滚备份：$PRE_PROMOTE"
  exit 1
fi

HEALTHY=0
for _ in $(seq 1 20); do
  sleep 1
  if curl -sf -m 2 "$PROD_HEALTH" > /dev/null; then HEALTHY=1; break; fi
done

if [ "$HEALTHY" != "1" ]; then
  echo "生产健康检查失败，回滚到发布前的 dist ..."
  rm -rf "$DIST"
  tar -xzf "$PRE_PROMOTE" -C "$SERVER"
  sudo -n systemctl restart "$PROD_UNIT" || true
  echo "已回滚并重启生产。请查看：journalctl -u $PROD_UNIT -n 100 --no-pager"
  exit 1
fi

SHA="$(git rev-parse --short HEAD)"
printf '%s %s\n' "$SHA" "$(date -Is)" > "$PROMOTED_FILE"
rm -rf "$CANDIDATE"
echo "生产已发布：$SHA（分支 $BRANCH），健康检查正常。"
echo "回滚备份：$PRE_PROMOTE"
