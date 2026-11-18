# Education Compass Canonical 实施与数据库进度

2026-11-18 · Jimson 数据库台账 · 本地候选评审

本会话收到对上轮四项门禁的批准，现将其登记到[最小迁移契约](MIGRATION_CONTRACT.md)的后续实施记录。批准引用 `1d3d5a4d-3279-4955-a927-7f432ae8381a`。本轮验证使用独立本地 PostgreSQL 与合成主体。

## 实施范围

| 项目 | 数据库候选范围 | 上线证据 |
| --- | --- | --- |
| 真实身份及设备交接 | 复用 Canonical APP 与 binder 分离和短期一次性上下文。签发与读取绑定 Principal、Person 和 Family。交接后的 Assent 只接受当前已绑定的学生本人。 | 真实微信／broker 配置及各主体的合法映射、设备交接证明的签发与截止、注销和撤回传播仍待在受控环境核验。 |
| Consent／Assent 登记 | 增加 Education Compass 两个冻结用途的证据。读取审核过的监护实体，核对当前签发主体、签署证据引用、版本摘要、有效期和精确撤回权限。新增问卷使用对应的已批准 V1.1 题库摘要。保存校验 revision，提交封存并生成 SHA-256。 | 真实用途证据来源、未成年人及已验证成年分支、保留期和治理审查需在正式迁移签收时确认。 |
| 监护人报告范围 | 按最小权限验收当前测评的 Consent 签发人。数据库每次读取重新查同一家庭、相同学生、现行 `EDUCATION` 监护权限和该测评用途。作者另行持有只面向指定服务的发布权限，发布绑定摘要和 QA。 | 另一名监护人、顾问与历史报告继承规则暂不扩展。用户已批准的实际读取范围仍需真实绑定及撤回验收。 |
| 权威结算与退款 | 独立 Settlement DB 角色及 D-8 Operations 服务标签同时匹配才可接收事件。只接受提交、订单和有效期一致的 `EDUCATION_GROWTH_DISCOVERY_SINGLE_V1`。校验 3990 分 CNY 及幂等。通用权益不解锁单份报告。退款进行中关闭，确认退款后终态拒绝迟到付款恢复。 | 权威订单与退款事件验签、订单到提交关联、允许时效、对账和补偿事件需提供脱敏引用后验收。数据库只保存权限状态和不透明引用。 |

[候选 SQL](../../../database/canonical/forward-candidates/education-assessment-report/education_assessment_report.sql) 放在 `forward-candidates`。本地只对带测试标记的实例显式加载。0038、0039 已用于工作台方案，0040 已用于工作台身份候选。编号在合入评审时统一分配。本候选只依赖已合入的 0001–0037。

## 当前数据库完成进度

| 范围 | 目前进度 |
| --- | --- |
| Canonical 主线 | `main@9db147a` 已核对包含 0001–0037。PG16.15 / PG17.11 基线各成功应用 37 项，93 张表、83 条 RLS 策略。 [主线迁移目录](https://github.com/yvettfang-netizen/phoenix/tree/9db147ac3a5d135d50b90bfea5a7316ce747d90b/database/canonical/migrations) |
| Education 本地切换 | 上轮已验证旧连接拒绝后可用 Canonical 读取课程、身份投影和既有 Operations 权益。本轮独立持久化候选通过 PG16/PG17。验收使用真实 SQL 函数、四个分离数据库登录及合成数据。 |
| 腾讯隔离实机 | 11 月 18 日最近一次有据核验为 PG16.15 / 0035。15:50（北京时间）使用当日归档隔离恢复通过，账本 35/35，演练用时 6 秒。本轮沿用这份观测。 |
| 生产接管与旧库退役 | HOLD。实际旧数据库依赖待核验。PR #68 当前为 OPEN / Draft，核验头提交 `9ce484570ec5b9a494fba4da4e79e4f2f2582f81`。 [PR #68](https://github.com/yvettfang-netizen/phoenix/pull/68) |

下一步是在获准的隔离环境验收现行身份／监护与设备交接证明，以及权威结算和退款事件。证据与真实申请、发布和撤权链路对应后，再评审编号迁移并安排切换。前置证据用脱敏引用，沿用既有[身份事实清单](../identity-evidence-packet-20261104/MISSING_FACTS_CHECKLIST.md)。

## 复现

在 Education Compass `server` 目录执行现有 `npm run typecheck`、`npm run build` 和 `npm test`。从仓库根运行以下命令。测试只允许本地 Docker，且清理自身拥有的一次性实例。

```powershell
node database/canonical/verification/education-assessment-report/candidate-acceptance.mjs 16
node database/canonical/verification/education-assessment-report/candidate-acceptance.mjs 17
```

## 验收记录

| 执行项 | PG16.15 | PG17.11 |
| --- | --- | --- |
| 空库 0001–0037、未设置隔离标记的候选拒绝安装、安装后账本仍为 37 行。 | PASS | PASS |
| 8 项 V1.1 题库摘要与应用冻结 registry 一致。可合成登记和撤回两类用途，非本人 Assent、跨家庭、文案摘要错误及重放后恢复拒绝。 | PASS | PASS |
| 草稿版本冲突、缺项拒绝、提交封存及重复请求。已提交的 Level 1 快照是相同学生 Level 2 的先决条件。 | PASS | PASS |
| 只授权的发布角色可获取封存数据并发布。QA 未通过、提交摘要错配、普通 APP 访问证据底表或执行结算拒绝。该报告只向本人和当前有效的个别 Consent 签发监护人可读。 | PASS | PASS |
| 单份报告精确订单与用途匹配。旧 SKU、错金额、无效期、未知支付状态、跨报告重放拒绝。退款中和全额退款锁定。支持独立订单重购。 | PASS | PASS |
| 两类用途撤回后拒绝读取，现有退款事实仍可登记。数据库里留有读与拒绝审计，票据和会话记录已清空。 | PASS | PASS |

现有服务端构建、类型检查和 146 项测试通过。首轮发现错误提示被日志脱敏，导致测试断言未匹配。随后发现候选提交校验拼接错误。调整短提示并修正语句后，两版完整验收退出码为零。首次失败原始输出保留。测试实例已清理。

候选 SQL 摘要（LF）为 `c02cd90ea37d800571772d54ac50bfb7597c919fc675c0ed3fe93b1d8e7692f6`。原始日志存在本工作树的 `out/education-candidate-20261118/`。

- `PG16_R2.log` SHA-256 `c2aef2b859130735b294a60392299f38bc168aaead536279cf9bd6a71fa3df8c`
- `PG17_R2.log` SHA-256 `738f2a0c6188eb8f4bf7a9e85552469e483534038df542570b2c2b999cc2336d`
- `SERVER_TEST.log` SHA-256 `bef025d34733448e94feec71f4c791b5d46e9827615db2e39a3a5a45bd8e4cea`

正式应用接线须用现有题库校验器过滤完整输入，再调用候选的持久化接口。数据库候选负责作用域、版本及状态门禁。生产事件验签、HTTP/BFF 接线、现有旧库迁移及正式验收均保持 HOLD。
