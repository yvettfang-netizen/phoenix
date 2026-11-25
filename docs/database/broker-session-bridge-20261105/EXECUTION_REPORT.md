# Broker/session bridge 本地执行报告

2026-11-05。Jimson本人授权，Codex执行；玄武代码与权限检查流程，不冒签独立审查。

| 项 | 状态 | 实际含义 |
|---|---|---|
| 基线与编号 | PASS | main19feef190dcba13ccc9181c998d4c82527377803；源b93a0ae、PR48固定38be319。未改任何SQL，0001–0035+独立0037共36文件 |
| 最小方案及本地实现 | PASS | 选定profile的broker verifier、可信session/Store家庭解析、默认关的test-only工厂，复用原有audited pool/票据/读取 |
| 后端typecheck/build | PASS | 现有npm run typecheck / npm run build |
| 后端测试 | PASS | 现有npm test，144/144（新增8项，包含细分负例） |
| PG16完整合成及全新恢复 | PASS | 新bridge回归在fresh和restore各一次；原有数据库/浏览器验收继续通过；ledger36/tables92/policies83；清理完成 |
| PG17完整合成及全新恢复 | PASS | 同PG16：新bridge在fresh和restore各一次；原有完整合成回归通过；ledger36/tables92/policies83；清理完成 |
| SQL摘要/限定敏感扫描/差异检查 | PASS | 最终证据封包记录原始输出；35项历史摘要与独立0037不变，无敏感扫描例外 |
| GitHub准确HEAD CI | NOT RUN | 本地报告形成时尚未推送；后续准确SHA、PR、run及结果记录同步收据与Notion，不伪造自引用SHA |
| 真实provider及配置/运行事实 | HOLD | 历史值沿用；没有探测真实issuer/TLS/JWKS、读取真实配置或替代F1–F5事实 |
| 单学生/真实网站登录/BFF/生产 | HOLD | 新bridge只允许family/students，单学生默认拒绝；未接正常应用入口，不合并、不部署、不导入真实资料 |

## 可复验命令

在既有server目录运行 `npm run typecheck`、`npm run build`、`npm test`。不运行legacy业务数据库迁移。

在仓库根运行 `node database/canonical/verification/v0037/verify-source.mjs`，以及 `node database/canonical/verification/v0037/projection-e2e.mjs 16` / `17`。沿用现有Docker、后端、网站依赖；测试浏览器使用既有CI固定Playwright1.62.1，通过PLAYWRIGHT_MODULE指向单独本地工具。不要传入现有DB locator或真实口令。

新增broker-session-regression.mjs已纳入该永久runner的fresh和restore阶段；现有0037 CI检查名称不变，扫描范围扩展到新增代码与报告，没有放宽Required Checks。

首次针对测试文件的编译发现mock Store缺transaction，已补齐；源typecheck/build原先通过，修复后完整144项测试通过。PG16首次尝试在加载Playwright阶段退出，尚未建任何集群；按现有CI的固定工具版本补齐隔离工具后重跑。失败尝试、最终命令/输出和源摘要都保存在受控证据包，不能把启动失败记成数据库FAIL或忽略它。

报告日期采用客户端2026-11-05（Asia/Shanghai）；机器命令及GitHub原始UTC时间不改写，两者各自留证。

## 证据及下一步

原始日志、命令/退出码、修复尝试与精确源SHA-256只同步到现有私有证据分支；不归档.env、pgpass、signing key、dump、globals或fixture目录。私有证据提交与本轮公开候选提交由最终同步收据记录；原有[事实包](../identity-evidence-packet-20261104/README.md)不覆盖，F1–F5保持HOLD。

本地PASS不是已合并或已部署。唯一下一步：既定责任人补齐F1–F5当前受控证据引用，再准备真实受保护配置/会话接线与独立审核；不索要任何密钥值、token、实际subject/OpenID或逐人Canonical ID。
