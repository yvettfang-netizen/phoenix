# 四层恢复证据边界

| 层 | 已准备的真实本地恢复目标 | 最终验收 |
|---|---|---|
| Frontend | 本候选SHA的维护页，服务端开关优先；无family/student渲染或DB访问；中文/英文/390/1440检查 | 本地恢复PASS；Staging/独立签收HOLD |
| API/Gateway | 原BFF关闭直接URL404；恢复原函数/源后重新读200；每次重绑定/清理 | 本地子项PASS；完整Session拒绝审计/身份事实/Agent幂等缺口HOLD |
| Canonical | 自有新集群logical restore与原backup/migration工具；无覆盖任何现有数据库 | HOLD：RPO/RTO目标和WAL/PITR未批准 |
| HARMONY | 没有实际Runtime、capability/task恢复目标；真实能力默认关闭 | HOLD / NOT RUN |

FULL ROLLBACK READY = HOLD。不得将可构建的旧页面或草拟脚本当作已通过安全恢复的生产目标。

注入隔离：只操作带本轮nonce标签的容器；DB暂停使用finally解除；原函数定义在finally恢复；退出只删除本轮生成配置且内容相同才删。实际发现越权或完整性破坏时停止相关演练/发布，保存FAIL记录，执行既定本地隔离/清理；不自动解除S3，等待真实安全审核。

原始证据：browser/browser-pgN_A.json的R01/R13及五张PNG；pg16/pg17中的fresh/restored场景记录、logical-restore-pg*.json；同名文本日志末尾记录专有容器/卷、临时配置及合成fixture清理成功。恢复目标是同一候选中的安全维护模式，不是旧演示页面。源与目标版本均写入application_commit_sha/rollback_version；所有具名独立签收仍待完成。详见[执行报告](FAMILY_CENTER_FAILURE_INJECTION_REPORT.md)。
