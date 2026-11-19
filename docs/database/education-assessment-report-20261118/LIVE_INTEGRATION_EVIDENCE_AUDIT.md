# 真实联调证据核验与数据库完成进度

2026-11-19（北京时间）· Jimson 授权，Codex 受控复核与隔离环境收口。

## 2026-11-19 收口更新

数据库机制证据已补齐，外部真实事实继续 HOLD。PG16／PG17 已用分离 LOGIN、一次性票据和两组合成主体完成 broker → binder → APP → RLS／审计回归；Education 候选完成 Consent／Assent、监护人指定读取、单份报告付款与退款撤权回归。腾讯隔离非生产库已从正式账本 35 升级到 37，最终为 37 条 Migration、93 张表和 83 条 RLS 策略，升级前后备份均在无网络新实例恢复成功。

本轮没有真实登录、真实逐人映射、真实设备交接或真实支付事件。因此 I-1、I-2、H-1、P-1 的“工程机制”部分为 PASS，“外部真实事实”部分仍为 HOLD。完整脱敏结果见[0037 受控证据与腾讯隔离环境同步报告](CONTROLLED_EVIDENCE_AND_NONPROD_DEPLOYMENT_20261119.md)。

**已有审批已复用。真实联调准入 HOLD，受控联调 NOT RUN。** 工程源固定为本地 `9c50b9b074f0f6df37494ef8c0d5490207c9b4a1`。本轮完成已有证据的重新读取、来源与适用范围核验、原始输出归档及既有测试日志完整性复核。

## 审批与核验范围

继续采用此前对真实身份、设备交接、Consent／Assent、监护人报告读取及结算退款规则的批准，审批引用为 `1d3d5a4d-3279-4955-a927-7f432ae8381a`。沿用 Option A、Phoenix First-Party Canonical Identity Broker、FD-6、D-8 和已冻结的 Education 产品规则。待补项目为实际事实的证据。

读取三个现有 Jimson 页面，以及其中相关的 11 月 18 日交付清单、每日执行记录。私有仓库证据分支固定在 `42a0dc877cc9818e59e8fa61298ee81645c1673a`，默认分支仍为 `codex/canonical-private-clean-baseline@3af6ba1`。核对本工作树的真实入口、会话桥、问卷／报告候选、支付 runbook、冻结件及 PR #68 当前变更。该范围内尚未找到符合下表的当前业务接入证据。

GitHub 连接器对私有来源返回 404，已改用本机既有认证的 GitHub CLI 只读获取。16 条命令均成功，原始输出及命令、退出码、UTC 读取时间和 SHA-256 已保存于 `out/live-integration-evidence-20261118/COMMAND_RECEIPTS.json`。该读取时间是本次文档核验时间，原始服务观测时间另行保留。

## 已有证据与适用结论

| 项目 | 实际证据及本次判定 |
| --- | --- |
| 审批与责任人 | PASS。此前已批准的 broker 方向、固定算法、300 秒上限、APP／binder 分离、Operations 权威和本会话规则批准均复用。实际服务、主体与事件需有当前证据。 |
| B1 DNS／TLS／JWKS | 历史 PASS。原始 JSON 记录 2026-11-06T07:35:00.384Z–07:35:00.511Z 成功，运行 SHA `91f162f41d0d4ec5bd79bb5eea55fb49089c261b`。提前采集依据在原报告登记，保留原始批准窗口。该证据覆盖隔离测试公钥发布。 |
| 正常登录与 Canonical 桥接 | 受控机制 PASS／真实提供方 HOLD。PG16／PG17 已完成合成 JWT、APP／binder 分离、一次性票据、清理与撤权回归；未执行真实微信正常登录。 |
| 家庭／学生／监护／员工映射 | 受控机制 PASS／真实账号 HOLD。两组合成主体已验证跨家庭、未授权学生及越权拒绝；未登记真实客户或员工。 |
| 设备交接与用途证据 | 受控机制 PASS／真实交接 HOLD。Consent／Assent、用途版本、撤回、过期与重放拒绝已验收；未生成真实设备交接回执。 |
| 权威结算及退款 | 受控机制 PASS／真实事件 HOLD。固定商品、金额、支付解锁、退款中锁定、全额退款撤权和错误事件拒绝已验收；未执行真实支付提供方事件。 |
| 接口与运行版本 | 数据库 PASS／应用真实联调 HOLD。腾讯隔离库已运行正式 `0001`–`0037`；Education 候选仍未编号且未部署，真实 session/provider 接线未启用。 |

相关原件均已实际读取。

- [Option A 批准](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/42a0dc877cc9818e59e8fa61298ee81645c1673a/canonical-db/phase2-gate/evidence/approved/FOUNDER_APPLICATION_IDENTITY_OPTION_A_APPROVAL.md)、[broker 技术选型](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/42a0dc877cc9818e59e8fa61298ee81645c1673a/canonical-db/phase2-gate/evidence/approved/FOUNDER_OIDC_BROKER_TECHNICAL_SELECTION_V1.0.md)及[D-8 生效决策](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/42a0dc877cc9818e59e8fa61298ee81645c1673a/canonical-db/release/v1.12/FOUNDER_DECISION_D8_V1.1_EFFECTIVE.md)。
- [B1 原始采集结果](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/42a0dc877cc9818e59e8fa61298ee81645c1673a/canonical-db/integration/v7-b1-eight-item-reconciliation-20261106/external-collection-20261106/B1_EXTERNAL_COLLECTION.json)、[B1 时间与范围说明](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/42a0dc877cc9818e59e8fa61298ee81645c1673a/canonical-db/integration/v7-b1-eight-item-reconciliation-20261106/external-collection-20261106/B1_EXTERNAL_CLOSEOUT.md)、[B1 实际部署回执](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/42a0dc877cc9818e59e8fa61298ee81645c1673a/canonical-db/integration/v7-b1-eight-item-reconciliation-20261106/ssh-readonly-20261106/B1_BROKER_DEPLOYMENT_VERIFICATION_20261106.json)。
- [应用身份事实登记](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/42a0dc877cc9818e59e8fa61298ee81645c1673a/canonical-db/integration/auth-gateway/APPLICATION_AUTH_FACTS_REGISTER_V1.0.md)、[现有事实表](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/42a0dc877cc9818e59e8fa61298ee81645c1673a/canonical-db/integration/identity-facts-current-20261105/OWNER_RESPONSE_FORM_V1.1.md)及[事实变化说明](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/42a0dc877cc9818e59e8fa61298ee81645c1673a/canonical-db/integration/identity-facts-current-20261105/FACT_STATUS_DELTA.md)。
- [11 月 18 日 Jimson 技术交付清单](https://app.notion.com/p/41cc31ee15bb81bd8a07d138e98cae0f)、[PR #68 合成身份夹具](https://github.com/yvettfang-netizen/phoenix/blob/9ce484570ec5b9a494fba4da4e79e4f2f2582f81/database/canonical/verification/p1/canonical-auth-fixture.mjs)及[PR #68 退役边界](https://github.com/yvettfang-netizen/phoenix/blob/9ce484570ec5b9a494fba4da4e79e4f2f2582f81/docs/database/legacy-assets/CANONICAL_ONLY_RETIREMENT.md)。

## 需补充的具体引用

由 Jimson 汇集以下四组脱敏报告。每组只需填写文档／回执链接、版本、报告 SHA-256、对应环境与代码 SHA、观测 UTC 时间、核验人及结论。真实逐人标识和密钥继续保存在其既有受控系统。

| 编号 | 必需证据引用 | 应覆盖的内容 | 本次结果 |
| --- | --- | --- | --- |
| I-1 | `provider_session_validation_ref`、`runtime_config_acl_ref` | 选定微信上游及 broker 的正常登录回执，已批准 iss／aud／JWKS 与运行服务对应，当前分离 app／binder 配置条目的版本和 ACL、轮换报告。验证错误或过期令牌拒绝、同一会话注销后访问拒绝。记录准确运行 SHA 和观测时间。 | HOLD |
| I-2 | `controlled_account_mapping_sets_ref` | 两组隔离受控账号 A／B 的授权登记报告。用别名表示客户、学生、监护人，以及当前待验员工／顾问。报告核实到 Canonical Principal、Family、Person 的唯一受审映射、有效关系、用途与撤销。至少含跨家庭、同家未授权学生和顾问越权反例。 | HOLD |
| H-1 | `device_handoff_and_assent_receipts_ref` | 已验证监护人会话到学生本人确认的受控交接，指定目标学生、用途、文案版本／摘要、当前会话、确认动作、授权依据、签发与截止时间及回执关联。退出、拒绝、撤回、过期或重放均拒绝继续使用。分别核验监护人 Consent 与学生 Assent。 | HOLD |
| P-1 | `settlement_refund_validation_ref`、`operations_reconciliation_ref` | 无真实客户资料的获准沙箱事件验证。商品 `EDUCATION_GROWTH_DISCOVERY_SINGLE_V1`、3990 分 CNY、已提交测评与唯一报告、来源验签、订单／事件唯一及受限服务主体。记录 PAID 解锁、退款中锁定、全额退款撤权、部分退款拒绝、乱序／重复／错目标事件拒绝和对账结果。 | HOLD |

真实身份及系统映射的负责人沿用此前确认的 Founder，Jimson 负责汇集环境及核验回执。使用现有受控测试账号，联调业务数据保持合成。上述证据齐备并确认与目标候选对应后，才可安排正常登录 → 受控交接 → Canonical 写读 → 权威事件 → 撤权的隔离联调。

## 数据库完成进度

| 层面 | 当前结果 |
| --- | --- |
| 唯一 Canonical 主线 | PASS。GitHub `main@9db147ac3a5d135d50b90bfea5a7316ce747d90b` 仍为 0001–0037。基线 93 表、83 条 RLS，PG16.15／PG17.11 的空库及重复验收已有实际输出。 |
| Education 本地持久化候选 | PASS（已有合成执行，本轮校验来源与摘要）。固定 `9c50b9b`，两种用途登记／撤回、草稿提交封存、个别监护人报告读取、角色分离、付款及退款规则已验收。候选仍置于 `forward-candidates`。 |
| 腾讯隔离运行与备份 | PASS。11 月 19 日 PG16.15 正式升级到 0037；账本 37、表 93、RLS 83。升级前后备份均恢复通过，0037 最小权限定时维护已接管。 |
| Education 真实身份与结算联调 | 机制 PASS／真实事实 HOLD。I-1、I-2、H-1、P-1 的合成工程证据齐备；真实 provider、账号、设备和支付回执未提供。 |
| 生产接管与旧库退役 | HOLD。实际运行旧库依赖解除待验证。PR #68 为 OPEN／Draft，当前 HEAD `9ce484570ec5b9a494fba4da4e79e4f2f2582f81`，REVIEW_REQUIRED／BEHIND。 |

[主线目录](https://github.com/yvettfang-netizen/phoenix/tree/9db147ac3a5d135d50b90bfea5a7316ce747d90b/database/canonical/migrations)及[PR #68](https://github.com/yvettfang-netizen/phoenix/pull/68)。11 月 18 日恢复原始回执归档于同仓库既有工作树的 `out/education-canonical-cutover-20261118/LATEST_BACKUP_RESTORE_RECEIPT.txt`。

数据库基础和已实现的本地合成开发能力已具可复验证据。完整业务接管仍待真实身份、交接、权威事件及正式接口接线，现阶段保留旧库。唯一下一步是由 Jimson 提交 I-1、I-2、H-1、P-1 的当前脱敏引用包，以固定候选复核联调准入。

## 本轮可复验证据

- `out/live-integration-evidence-20261118/COMMAND_RECEIPTS.json` 保存 16 条 GitHub 只读命令及逐条退出码、原始输出文件与摘要。
- `LOCAL_EVIDENCE_VALIDATION.json` 已确认 37 个历史 Migration 文件与先前实际账本摘要一致，固定源码无变动，候选 LF SHA-256 仍为 `c02cd90ea37d800571772d54ac50bfb7597c919fc675c0ed3fe93b1d8e7692f6`。
- PG16、PG17 和 146 项服务端测试原始日志均通过与前报告的 SHA-256 核对。本轮审阅已有结果，新增业务测试执行 NOT RUN。
- `GATE_STATUS.json` 登记本轮联调准入状态。真实服务探测、数据库部署、编号 Migration、数据导入及 PR 状态变更执行均为 NOT RUN。
