# Education Compass Canonical 问卷与报告最小迁移契约

2026-11-18 · Jimson 数据库台账 · 本地审查候选

**产品规则依既有冻结件。正式迁移、真实身份和支付接入 HOLD。**

## 生效依据

| 依据 | 本契约采用的边界 |
| --- | --- |
| [Founder 产品批准](../../../Phoenix%20Compass/education%20compass/docs/product/freeze/education-compass-v1-rc1/FOUNDER_APPROVAL_EVIDENCE_V1.md)及[签署记录](../../../Phoenix%20Compass/education%20compass/docs/product/freeze/education-compass-v1-rc1/CONTENT_REVIEW_AND_SIGNATURE_RECORD_V1_RC1.md) | `PRODUCT_SPECIFICATION_ONLY`。已核对签署包 SHA-256 `e2bad68f09418289acb8801d1b322507e34f4cd4a7fd03e7465e9949f8a8861d`，批准证据按 LF 还原后与签署记录摘要一致 `bc92e23e99ba68077a3f2fbf188b35fbffe036fb38c3ebe305bcd84a73bfe7af`。 |
| [问卷路径](../../../Phoenix%20Compass/education%20compass/docs/product/freeze/education-compass-v1-rc1/ROUTING_PROFILE_SOURCE_LEVEL3_POLICY_V1_RC1.md)、[同意用途](../../../Phoenix%20Compass/education%20compass/docs/product/freeze/education-compass-v1-rc1/CONSENT_PRIVACY_AGENT_FEISHU_POLICY_V1_RC1.md)、[结果规则](../../../Phoenix%20Compass/education%20compass/docs/product/freeze/education-compass-v1-rc1/RESULT_SCORING_ACHIEVEMENT_POLICY_V1_RC1.md) | Level 1 为监护人免费家庭教育快照。Level 2 关联同一学生的已完成 Level 1，按学生本人意愿与用途中独立的授权推进。提交后问卷快照不可覆盖。 |
| [V1.1 验收](../../../Phoenix%20Compass/education%20compass/docs/product/EDUCATION_COMPASS_V1_1_IMPLEMENTATION_VERIFICATION.md) | 新问卷固定 V1.1 的版本和 schema digest。既有 V1.0 固定原题库，V1.1 文案变更保留题目 ID、答案代码和业务规则。 |
| [商业冻结](../../../Phoenix%20Compass/education%20compass/docs/product/freeze/education-compass-v1-rc1/COMMERCIAL_POLICY_V1_RC1.md)及[10 月 14 日重购记录](../../../Phoenix%20Compass/education%20compass/docs/OPEN_DECISIONS.md) | 一份 `EDUCATION_GROWTH_DISCOVERY_SINGLE_V1` 为 3990 分 CNY。提交完成后才可购买。仅受信 PAID 解锁。确认全额退款立即撤权。同一报告首次退款后可凭新订单重购一次，第二次退款后关闭购买。 |
| [D-8 Operations 生效决策](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/3af6ba19a96a458dc20cb0f4493bed10aee7028a/canonical-db/release/v1.12/FOUNDER_DECISION_D8_V1.1_EFFECTIVE.md) | 业务权益权威在 Operations。Canonical 0021 的 `EDUCATION_SERVICE`、`COURSE`、`ASKWISE` 独立。单份报告须有精确目标的受控权益引用，财务真值仍由订单和支付源管理。 |

源码基线 `phoenix/main@9db147ac3a5d135d50b90bfea5a7316ce747d90b`，继续使用本地已验收的隔离启动分支。基线 Canonical 0001–0037 的 `consent.grants` 用途包含 `DOCUMENT_READ`、`EDUCATION_CASE`、`IDENTITY_CASE`、`LEARNING_RECORD`。产品问卷中指定的两项用途及证据字段需要独立评审。共享身份继续使用 `core.families`、`core.people`、`core.student_profiles`、`auth.principals` 及现有验证映射。

## 持久化边界

以下为正式迁移审查用的最小逻辑对象。实际表名、新版本编号及部署时的 ACL 在评审后确定。

| 对象 | 最小持久数据与约束 |
| --- | --- |
| 测评与可恢复草稿 | 稳定 Assessment ID，Canonical 家庭与学生外键，层级、可信作答者与签发主体，必要的用途证据引用。记录题库版本、schema digest、体系、版本固定的选项代码及 revision。Level 1 与 Level 2 的 ID 独立，Level 2 的来源外键同时约束家庭、学生、已完成 Level 1 与 `AVAILABLE`。 |
| 提交快照 | 一次提交封存确切 revision、题库和 schema digest、经服务端校验的作答、用途证据引用、来源、服务端时间及请求幂等凭据。相同请求可返回同一快照，冲突请求拒绝。每份数据修改产生新草稿或新版本。 |
| 报告与交付 | 稳定 Report ID 关联确切提交快照、家庭和学生。记录规则、报告、题库、taxonomy、免责声明版本与来源，登记 QA、就绪与交付状态。用受信发布元数据校验关联和提交摘要。Level 2 正文沿用冻结结果 DTO。报告只允许受限发布服务写入，受控的新版本记录继承原提交关系。 |
| 用途证据 | 复用受审 Canonical Consent 机制。按照用途分别保存 grant 引用、家庭和学生、签发人及角色、文案版本与 SHA-256、语言、可信监护凭据引用、授予和撤回时间、来源及最小审计。通过现有 Canonical 权限核对有效性、监护范围、期限及撤回。 |
| 单份报告权益引用 | 按受信源记录不透明订单、事件和权益 ID、提交及报告外键、范围、状态和时间。按来源去重。同一订单始终绑定同一提交，同一提交最多一项有效单份报告权益。财务金额、付款凭证和交易内容留在结算权威，Canonical 权益引用只存授权所需关联与最小审计。 |

### 作答、阅读和撤回

- **Level 1** 由当前对该学生具有已验证 `EDUCATION` 监护权限的人作答。用途 `CORE_ASSESSMENT` 固定文案版本 `guardian_core_assessment_v1.0.0-rc1`。FP01–FP08 经服务端校验后才可提交。该家庭免费快照由已冻结的规则生成，读取时仍核对家庭、主体和授权。
- **Level 2** 由学生本人作答，独立于监护人的身份。对未成年、需监护或状态未知的学生同时检查有效监护人 Consent 和本人 `STUDENT_ASSESSMENT_ASSENT`，文案版本 `student_assent_growth_discovery_v1.0.0-rc1`。产品冻结允许监护人会话内受控设备交接。本轮合成链路使用分开的 Canonical 主体，真实交接的证据方案待审。成年已核验时冻结件有 学生本人同意 路径，其在 Canonical 中的确切用途和切换规则保留 HOLD。
- **草稿** 读写先核对当前家庭、绑定作答者、当前用途证据及适用监护权限。保存携带预期 revision，成功后加一。题目、选项、条件分支和放行由当前服务端冻结校验器决定。退出保留可暂停的草稿，`EXIT_NOT_STUDENT` 不生成结果或购买机会。等级 2 提交要求本人确认和适用必答项，EGD19 和成绩区间维持选填。IB／OTHER 使用公共题并保留 `SYSTEM_BANK_PENDING`。
- **提交** 在受控事务内核对当前身份、有效证据、题库摘要、revision 和幂等键，再封存快照。不能用付款、家长声明或开放的 Education 权益替代任何用途证据。读取和写入都重新核对权限。撤回后暂停新增使用及交付，已存在的审计依法定及已批准保留规则处理。目的证据和退款存在并行变化时，正式实现须在请求决策点重验并验证并发顺序。
- **报告** Level 1 只返回冻结的家庭快照。Level 2 的付款前投影只返回 `assessment_id`、`result_state=LOCKED`、商品、金额、币种、下一动作及体系标记。六项结果由冻结规则生成。正式完整读取及 PDF 需活跃的精确单份报告权益、当前授权与 `READY / DELIVERED / qaPassed`。完整结果只能经服务端受控接口读取。

### 受控接口最小输入

| 动作 | 可信服务接收及校验 | 失败时的边界 |
| --- | --- | --- |
| 恢复或保存草稿 | Assessment ID、预期 revision、作答的适用答案代码。由绑定会话解析主体和家庭。返回已固定的题库及最新 revision。 | 版本不同时提示刷新，记录保持完整。范围或用途失效时无答案返回。 |
| 提交 | Assessment ID、最后有效 revision、请求幂等键。服务端重验并封存提交数据，返回稳定快照引用及当前阶段。 | 缺必答项、学生退出、范围冲突或授权不完整时没有报告写入或购买。 |
| 发布和读取 | 受信发布服务传提交关联、题库摘要、报告版本和 QA 凭据。读取按绑定的授权主体和报告引用投影。 | QA 或授权缺失时无完整内容返回。支付缺失时只有冻结的锁定投影。 |
| 应用结算／退款 | 获批服务携订单和事件引用、精确关联及经验证的事实。库内核对绑定、终态与幂等。 | 异常范围或事件进入审计及复核，报告门禁保持关闭。 |

### 付款、退款与重放

1. 结算服务以服务端核验的 `PAID` 事实关联已提交版本、该报告、家庭与学生。匹配商品、3990 分 CNY、单份范围及订单对应关系。通用 `EDUCATION_SERVICE`、等价金额的旧 SKU、客户端成功提示及未知状态都不能推进。真实关联服务与字段保留 HOLD。
2. 授权发布服务为已提交快照生成并确认同一份、完成 QA 的报告。验证结果必须与提交的家庭、学生、测评及版本一致。读侧独立校验授权和权益。报告/PDF、付费 Agent 和新的 ASKWISE handoff 统一受当前权益门禁约束，各附加功能仍须独立授权。
3. 退款进行中或权威状态不明确时闭合访问。确认全额退款后撤销该订单对应权益，保持审计并重新锁定报告及后续下载。乱序或重复付款通知不能恢复已退款权益。重复同一事实可幂等处理，事件 ID 内容冲突拒绝。已发生的真实退款需由原财务权威处理，即使用户后来撤回 Assent。
4. 同一报告仅允许一次新的获准购买。通过独立且经核验的新订单建立新引用，保留旧引用的终态和原快照。第二次确认退款后停止再次购买。支付时已撤回授权的款项保持无报告权限并进入审计及退款核对。该对账与人工例外走受控财务流程。

## 角色与证据

| 角色 | 允许 | 必须拒绝 |
| --- | --- | --- |
| 绑定服务 | 核验来源、主体和关系后签发一次性上下文。应用在单独连接兑换并清空。 | 当前请求随意指定其他家庭或学生、复用前一连接上下文。 |
| 当前监护人／学生的应用角色 | 已获授权的草稿、提交、相应报告投影。 | 他人或未获授权的报告、底表读写、发布、收款及撤权事实写入。 |
| 报告发布服务 | 对精确已提交版本按冻结算法与 QA 受控发布。 | 跨家庭、绕过 QA／用途／权益、覆盖已经发布的内容。 |
| 结算引用接收服务 | 接收受审源的精确订单事件，幂等登记及撤权。 | 客户端触发授予、订单与报告错配、旧状态重活、向外返财务明细。 |

审计记录请求时间、稳定关联和原因。原始作答、学生自由内容、报告正文、支付凭据及密钥不入日志。正规 API、保留与删除策略需要独立签收。现有历史订单和报告处理保留 10 月 14 日产品决定，跨库映射与真实清理走后续审批。 [产品数据清单](../../../Phoenix%20Compass/education%20compass/docs/DATA_INVENTORY.md)

## 仍需批准的实现依据

| 门禁 | 状态 | 必须补齐的决定或凭据 |
| --- | --- | --- |
| Canonical Consent／Assent 写入 | HOLD | 确认两项用途的登记方案、谁有权签发及撤回、当前监护与生产核验方式、保持新旧授权一致的证据关联。未成年专业、隐私及保留审查。 |
| 真实作答者与报告读者 | HOLD | 真实登录及绑定、受控监护人设备交接如何证明学生本人、到期与撤回、核验成年分支和合法监护人可读范围。 |
| 精确结算与退款桥 | HOLD | 权威订单事件、单份 Report／Assessment 绑定、付款人、有效期、对账、支付后撤回、迟到退款及补偿方案。0021 通用权益保持原有作用域。 |
| 正式 Schema 与接口 | HOLD | 数据库和安全审核确定类型、ACL、幂等、并发与回滚。正式迁移未编号，原始问卷、报告及受控 PDF/Agent/ASKWISE 接入另行验证。 |
| 旧库与 PR #68 | HOLD | 真实隔离切换和实际运行依赖的证据未齐。旧库保留，PR #68 维持草稿。 [PR #68](https://github.com/yvettfang-netizen/phoenix/pull/68) |

下一步审核以上三项业务证据及迁移设计，先批准明确的写读接口和范围，再为正式候选补做 PG16/17 业务端到端。

## 合成验收复现

[隔离验证程序](../../../database/canonical/verification/education-assessment-report/acceptance.mjs) 在本地一次性实例通过 0001–0037 后才安装 `synthetic_edu_contract`。它使用实际 Canonical 家庭／学生／监护、独立数据库登录和一次性上下文，并用产品校验器与构建器生成固定的合成作答及结果。用途和结算事实由测试夹具提供。该脚本只验证获批规则的数据库行为，正式用途登记和支付来源验收保留 HOLD。

在 Education Compass 的 `server` 目录执行既有命令 `npm run typecheck`、`npm run build` 和 `npm test`。在工作树根目录执行以下命令。

```powershell
node database/canonical/verification/education-assessment-report/acceptance.mjs 16
node database/canonical/verification/education-assessment-report/acceptance.mjs 17
```

本地命令输出存放于 `out/education-assessment-report-20261118/`。

## 2026-11-18 验收结果

**合成契约 PASS。正式迁移、真实身份及支付来源 HOLD。**

| 验收范围 | PG16.15 | PG17.11 |
| --- | --- | --- |
| 空库应用 0001–0037 并重复校验。两版账本均 37 行，基线 93 表与 83 条 RLS 策略。 | PASS | PASS |
| 有效监护及 Consent 下恢复草稿，CAS 拒绝过期 revision，必答项校验、重复提交同一快照和提交封存。 | PASS | PASS |
| 同主体 Level 1、学生本人 Level 2、过期或撤回 Assent 拒绝、退出拦截、跨家庭和同家庭其他主体拒绝。 | PASS | PASS |
| Free Snapshot 与受限的付费报告发布。报告关联错配、题库摘要错配、QA 未通过、应用角色直读底表或发布均拒绝。 | PASS | PASS |
| 实际 0021 `EDUCATION_SERVICE` 允许时单份报告仍锁定。拒绝未知状态、同价旧 SKU 和金额错误，精确单份关联可解锁。 | PASS | PASS |
| 退款进行中锁定，全额退款撤权，部分退款和迟到通知拒绝恢复。一次新订单重购保留原报告 ID，第二次退款封顶。 | PASS | PASS |
| 当前授权撤回后拒绝报告读取与发布，已接受退款仍可登记。允许、拒绝有记录，绑定上下文及票据清空。 | PASS | PASS |

现有服务端 TypeScript 和构建通过。原有 146 项测试全部通过。夹具摘要（LF）为 `a954028de18ee7def32796fa571d0429edada75bdb7a40607f6a08200b7f461b`。本轮保留了首次失败输出。首次运行发现 Level 2 的冻结正文不带身份 ID，修正为在独立发布元数据内校验关联后重跑。

- `PG16_FINAL.log` SHA-256 `836c23c2a62be489c050145911940635e2329fbd362620ebe977ca541a425c86`
- `PG17_FINAL.log` SHA-256 `810e58318852f9ca1864ee848da779eb69be19231b38f3ca70e4a5c88b3c39ef`
- `SERVER_TEST.log` SHA-256 `8e1186c64d1ab3928061d47e885509b2825b3e7b6deebf50a00093e2a6879d1b`

两次验收退出码均为零，所有本轮的一次性实例及配置已经清理。本轮在本地合成层执行。真实 Provider、账单回调、设备交接签发、未成年隐私与报告正式迁移等待确证。PR #68 已只读核对为 OPEN / Draft，头提交 `b3331833c98bbcca2f5151c44d21bced0faa843e`。
