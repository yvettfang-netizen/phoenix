# 故障注入执行报告

本提交为可执行准备，尚不能以PR57旧结果证明新增探针通过。独立分支codex/family-center-drills-20261105，源码、报告和原始证据分别固定提交。

复验：从仓库根目录，先在未占用的loopback环境运行浏览器演练，再依次运行两个PG版本（共用.dev.vars和端口，不并行）。PLAYWRIGHT_MODULE指向隔离安装的Playwright，FAMILY_DRILL_EVIDENCE_DIR指向本轮专有输出目录，DOCKER_CONTEXT固定desktop-linux（先确认是本地named pipe）。不得提供现有数据库URL或现存凭据。

```text
node database/canonical/verification/v0037/browser-failure-drills.mjs
node database/canonical/verification/v0037/projection-e2e.mjs 16 --family-center-v2 --failure-drills
node database/canonical/verification/v0037/projection-e2e.mjs 17 --family-center-v2 --failure-drills
```

每个探针保存实际阶段时间、响应码、恢复区间、关联ID、指纹、受限范围及review_status。只读HTTP探针不把数据库RPO套用于页面。已有数据只用一次性集群；SQL故障只改自有fixture中的临时函数/trigger，finally还原，源Migration不变。

服务端FAMILY_CENTER_MAINTENANCE_ENABLED默认false，true优先返回无个人资料的双语维护页。它是本地已定义的修复性恢复目标；不是自动批准的Staging版本。原页面关闭V2的行为保留，不因此给旧版安全认证。

执行结果、命令/退出码、CI和截图在最终私有同步收据记录。矩阵中的完整场景HOLD不因局部探针通过自动转PASS。
