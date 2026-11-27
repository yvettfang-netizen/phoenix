#!/bin/bash
# pm2 进程 phoenix_uat_api 的启动脚本。
#
# 用 node --env-file 读配置，不要用 `source`：source 会让 bash 解释值里的
# 元字符，例如 DATABASE_URL 的 `?sslmode=verify-full&sslrootcert=...` 里的 `&`
# 会被当成后台执行符，变量只剩前半截。生产的 systemd 单元用的也是 --env-file，
# 两边保持一致。
cd "/home/ubuntu/education-compass/Phoenix Compass/education compass/server" || exit 1
export LISTEN_HOST=127.0.0.1
# dist-candidate 是 update-education-compass.sh 暂存的候选构建：存在时联调跑候选，
# 生产仍跑 dist；--promote 成功后候选目录被清掉，这里自动回落到 dist。
DIST_DIR=dist
[ -d dist-candidate ] && DIST_DIR=dist-candidate
exec /home/ubuntu/.nvm/versions/node/v24.20.0/bin/node --env-file=./.env.uat "$DIST_DIR/index.js"
