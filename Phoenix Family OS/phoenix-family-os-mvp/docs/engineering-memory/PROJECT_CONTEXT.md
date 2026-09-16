# Phoenix Family OS™ Project Context

- Memory type: Long-term project context
- Project: Phoenix Family OS™ Mini Program MVP
- Current version: V0.1 / package `0.1.0`
- Status: Acceptance preparation; not public-release ready
- Memory baseline commit: `bb972f030994a35a1e81bd0d38ff502410127b84`
- Last reviewed: 2026-08-15（Asia/Shanghai）

## 1. 项目目标

Phoenix Family OS™ MVP V0.1 用于验证家庭是否愿意：

1. 通过微信进入家庭成长服务；
2. 建立 Family Profile 和 Child Profile；
3. 完成 Education Compass；
4. 阅读可解释的 AI Growth Insight；
5. 在 Family Timeline 中持续积累成长节点；
6. 在需要时申请 Phoenix Advisor 人工支持。

当前核心用户路径：

```text
微信登录
→ Family Profile
→ Child Profile
→ Education Compass
→ AI Growth Insight
→ Family Timeline
→ Advisor Follow-up
```

当前工程目标是完成 MVP 稳定性、验收和可交接性，不是扩展商业功能或建立完整生产平台。

## 2. 产品定位

- Phoenix Family OS™ 是 Phoenix Nova™ 旗下的家庭成长系统。
- 产品围绕长期家庭关系、教育探索、成长记录和顾问协作。
- Education Compass 用于收集真实观察和家庭期待，不是医疗、心理诊断或决定孩子唯一方向的工具。
- AI Growth Insight 当前是可解释的本地规则输出，用于支持家庭讨论，不替代学校、心理、医疗或其他专业意见。
- Family Timeline 当前用于保存档案、测评、报告和顾问协作产生的成长事件。
- Phoenix Advisor 当前仅为本地内部演示角色，不代表生产权限系统。

### Active Contract 与历史资料

- 当前批准的 Product Contract、Freeze、ADR 和用户明确指令优先。
- Family Passport、Phoenix OS 旧架构和历史 Growth Blueprint 页面不能作为当前实现依据。
- `Family Growth Core Freeze V1.0` 是未来 Family Growth Agent™ 前置契约，但当前实现 inspection 结论为 NO-GO / HOLD。

## 3. 当前版本

| 项目 | 当前值 |
| --- | --- |
| 产品版本 | Phoenix Family OS™ MVP V0.1 |
| Package version | `0.1.0` |
| 小程序项目名 | `Phoenix-Family-OS-MVP-V0.1` |
| 基础库 | `3.7.12` |
| AppID | `touristappid` |
| 页面 | 15 |
| 自定义组件 | 1 个 Brand Mark |
| 数据存储 | 微信本地 Storage，`PFS_DB_V01` |
| 会话存储 | `PFS_CURRENT_USER_ID` |
| AI engine | `phoenix_rule_engine_v0.1` |
| 交付状态 | Sprint 1 完成；等待微信工具和真机验收 |
| 公开发布状态 | 不允许 |

版本判断必须区分：

- 自动化/静态验证完成；
- 微信开发者工具编译未完成；
- 真机验收未完成；
- 生产身份、数据和权限架构未完成。

## 4. 技术范围

### 4.1 当前包含

- 原生微信小程序 JavaScript、WXML、WXSS、JSON。
- Family User 本地演示登录。
- Family Profile、Child Profile。
- 5 步 10 题 Education Compass。
- 本地规则 AI Growth Insight。
- Family Timeline 活动事件。
- Advisor Request 和本地 Admin/Advisor 演示页面。
- Phoenix Nova Brand Mark 组件和四个运行时 PNG。
- Repository/Store 抽象、本地 Analytics。
- Node assertions、结构/路由/资源验证。
- Partner Experience preview 是当前仓库已有二级体验，但不扩展为 Portal 或 marketplace。

### 4.2 当前不包含

- 真实 OpenID/session 服务端交换。
- 云数据库、REST/GraphQL API、Cloud Functions。
- 生产 AI、大模型 API 或外部知识库。
- 数据库 migration framework。
- 服务端 RBAC、Advisor assignment、Consent、Audit。
- 正式 Growth Blueprint 数据契约和版本链。
- Timeline Item 状态机、Reminder 和 Change History。
- Partner Portal、Advisor Portal、Admin Portal 的生产实现。
- 支付、会员、商城、CRM、医疗、财富或其他未来业务。

## 5. 禁止事项

未经 Phoenix Nova™ 项目负责人明确批准，不得：

- 改变当前 MVP 核心闭环或产品定位；
- 新增未经批准的页面、角色、Agent、商业功能或外部集成；
- 引入 Wealth、Health、CRM、支付、会员、商城或 marketplace；
- 重新引入 Family Passport / Phoenix OS 历史产品结构；
- 改写 AI Prompt、评分规则或当前产品规则；
- 删除页面、用户数据或执行破坏性 schema 操作；
- 重绘、生成、猜测或自动替换 Phoenix Nova Logo；
- 修改正式品牌文字或口号；
- 把真实家庭、家长、儿童或顾问信息提交到代码、日志或测试；
- 把 key、token、密码或生产配置提交到 Git；
- 直接修改 main/master；
- 未经授权 push、deploy、upload、发布或提交微信审核；
- 将未运行、未配置或被阻断的检查写成 Passed。

## 6. 当前最高优先级

默认下一步不是新增开发，而是执行 `docs/codex-audit/ACCEPTANCE_TEST_PLAN_V1.0.md`：

- 微信开发者工具清缓存编译；
- iPhone/Android 设备矩阵；
- 核心路径与异常场景；
- Logo 人工签字；
- 归档真实 PASS/FAIL/BLOCKED 证据。

如要进入生产化或 Family Growth Agent™ 开发，必须先重新进入 Architecture Review 和 Checkpoint 阶段。

## 7. 记忆维护规则

- 产品目标、定位、范围或禁止事项改变时更新本文件。
- 不在本文件记录未经批准的设想；设想放入计划或风险报告。
- 每次更新记录日期、依据和 commit。
- 与真实代码冲突时，以 inspection 结果为准并立即修正文档，不用文档覆盖事实。
- 已确认的重要工程决定追加到 `ENGINEERING_DECISION_LOG.md`，不静默改写历史原因。
