# Family OS 契约审查与合成演练范围 V1

状态：`SYNTHETIC-ONLY REFERENCE PROFILE / FOUNDER POLICY ALIGNED / RUNTIME NO-GO`

## 基线与非目标

- 仓库：`yvettfang-netizen/phoenix`。
- 当前主线父提交：PR #10 squash merge `c695d19128999395ab047b1df73f0b350c8aa338`。
- PR #10 Founder-approved contract head：`eba5828142c6bb1db7f9c0effd4c6287f9d458c8`。
- 后续分支：`codex/family-os-synthetic-contract-validation-20260906`。
- 新增文件仅在 `backend/contract-rehearsal/` 与 `docs/contracts/`；不修改已有 6 份契约、运行代码、依赖清单、打包配置、数据库迁移或任何其他项目。

这是已合并 PR #10 的独立后续演练，用于验证已批准政策的受限参考实现。不能凭“自动跑完”宣称生产权限、安全机制、数据库隔离或产品运行时已经生效。

## 审查发现与受限处理

| 发现 | 本次可验证处理 | 仍待批准/实现 |
|---|---|---|
| 单个 `consent_id` 不能表达多个独立目的 | 测试 profile 保留主 `consent_id`，另加按目的索引的 `consent_refs`；按实际副作用逐条校验 | 正式多目的 wire schema 与政策版本来源 |
| Family Context 提案包含 FAMILY，但 Core 同意主体是 User/Guardian/Student | 演练只接收三个已支持主体，不把家庭自身当作同意主体 | 家庭级财富评测应由谁作为数据主体，需要明确映射 |
| 通用 `journey_seed` 和 Identity PR #8 的字段不完全相同 | Identity 样例保留 `current_scheme/current_status/limit_of_stay_expiry` 等上游键，未任意改写为通用 current_state | 正式按领域区分的 schema 与转换规则 |
| `HUMAN_REVIEW_REQUIRED` 同时出现在失败列表和结果结构中 | 模拟接收 `human_review.required=true`，保留待审，不自动给结果、排路径或联系顾问 | 业务上哪些人工复核应阻断接收、展示或仅阻断后续动作 |
| PARTIAL/INVALIDATED/SUPERSEDED 没有完整交接语义 | 演练仅支持 COMPLETED，其他状态拒绝 | 作废、替代、部分提交与历史更正流程 |
| 权益与纵向记录边界已由 Founder 冻结 | 新增最小报告路径：仅评测同意、无纵向同意、无 entitlement；Timeline/Journey 路径仍强制纵向同意；提供 entitlement 时严格校验 | Product/Catalogue 继续参数化 SKU→entitlement；不得由 null 值推断真实产品价格 |
| Timeline 可见性与顾问词表已冻结 | 事件可见性限制为四个批准值；Compass 事件为 SUBJECT；顾问 Timeline 只显示“顾问跟进” | 正式页面文案映射、Advisor topic/channel/SLA 继续参数化 |
| 现有本地前缀与 Core ID 外形可能重合 | 只使用固定虚构 ID 常量和模拟映射；不存在签发/迁移 API | 真正 Core identity mapping、角色与监护权验证 |
| 已成功提交的重放可能绕过新撤回 | 在查重复回执之前重验全部当前授权；模拟撤回后拒绝读取 Timeline | 真实账本、RLS、撤回传播、缓存失效与保留/删除规则 |

## 验收矩阵的对应关系

- FC-01～05：合成成功、缺少家庭上下文、跨家庭主体、映射冲突、缺失/撤回监护权。
- CH-01～05：相同输入重放、修改内容冲突、未知版本、Health 拒绝、超范围数据拒绝。
- TL-01～02：注册事件对、快照不可反向修改。通用事件摄取/更正、独立账本不可变性未实现。
- AF-01～04：主动跟进、分离同意、顾问分配撤回/过期、笔记不得进入 Timeline。
- 新增：每种写操作在模拟审计前/提交前失败，业务状态不得部分写入；重试只产生一份逻辑记录。

固定样例覆盖完整的“合成输入 → 交接回执 → Timeline → 主动跟进 → 分配顾问 → 笔记引用”流程，不等于任何正式 Compass、真实家庭或微信环境的 E2E 验收。

## 工程决定与后续唯一入口

本次只新增隔离测试模型，没有新增产品 API 或更改 Core 架构。PR #10 merge commit `c695d191` 是本轮父提交。无需数据库回退：停止运行演练即可；若后续要撤回代码，用独立审查的 revert 提交，不删除目录或重置工作树。

下一步：工程审阅本 rehearsal 的新 exact head 与证据，再单独决定是否合并此测试包及是否继续 PR #14 Core synthetic sandbox。真实家庭、生产迁移、部署、公开小程序、CRM/飞书/Notion 写回仍为 `NO-GO`。
