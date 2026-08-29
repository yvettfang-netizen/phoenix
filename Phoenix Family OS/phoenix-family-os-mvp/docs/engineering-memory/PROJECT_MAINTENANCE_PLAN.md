# Phoenix Family OS™ Project Maintenance Plan

- Plan type: Long-term engineering maintenance
- Version: 1.0
- Effective date: 2026-08-15（Asia/Shanghai）
- Project version: Phoenix Family OS™ Mini Program MVP V0.1 / package `0.1.0`
- Parent rules: repository root `AGENTS.md` and `CHANGE_MANAGEMENT_RULES.md`
- Current release posture: Acceptance preparation; not Public RC or Production ready

## 1. 目标与边界

本计划用于保持 Phoenix Family OS™ 的代码、配置、依赖、测试证据、工程记忆和发布状态长期可维护。维护工作必须保持当前 MVP 架构与核心闭环：

```text
微信登录
→ Family Profile
→ Child Profile
→ Education Compass
→ AI Growth Insight
→ Family Timeline
→ Advisor Follow-up
```

维护不等于产品扩展。未经批准，不得新增商业功能、Future modules、历史 Family Passport / Phoenix OS 架构、生产集成或品牌替代资产。

## 2. 维护记录规则

每次检查必须记录：

- 日期、执行人、repository、branch、commit SHA 和工作树状态；
- 实际命令、环境、退出码、关键结果和证据位置；
- PASS / FAIL / BLOCKED / NOT RUN / NOT CONFIGURED；
- 新增或变化的 P0/P1/P2/P3 问题、责任角色和解决条件；
- 是否影响 `CHANGELOG.md`、`TECHNICAL_DEBT_REGISTER.md`、架构记忆或发布状态；
- 回退方法和下一步唯一建议。

检查结果优先写入对应 QA、Acceptance 或 Handover 报告。不得只在聊天、口头说明或未追踪的本地笔记中保存关键证据。

## 3. 日常检查

“日常”指有工程活动的工作日；没有开发、测试或发布活动时不要求制造空记录。

### 3.1 开始工作前

1. 读取根目录 `AGENTS.md` 与本目录四个核心记忆文件。
2. 记录 Git 基线：

   ```text
   git rev-parse --show-toplevel
   git branch --show-current
   git rev-parse HEAD
   git status --short --branch
   git remote -v
   ```

3. 确认不在 `main` / `master` 直接修改；识别并保护已有未提交修改。
4. 确认任务范围、验收标准、非目标和数据/品牌/权限边界。
5. 涉及核心闭环、数据、认证、权限、路由或大范围 UI 时，先建立 checkpoint。

### 3.2 修改过程中

- 只修改当前任务必要文件，按单一目的形成小批次提交。
- 不把真实家庭、儿童、顾问、密钥或生产配置写入源码、测试或日志。
- 每个 Task 完成后运行最小相关检查；错误不得留到任务末尾集中解释。
- 新发现问题立即按 P0/P1/P2/P3 登记；不得在缺陷修复中顺带实施 P3。
- Schema、API、UI、权限和 tests 的契约变化必须保持可追踪。

### 3.3 结束工作前

- 运行 `git diff --check`，检查意外空白、冲突标记和格式问题。
- 运行与本次变更类型匹配的测试；未运行项明确标记。
- 检查 `git status --short --branch`，解释每个差异。
- 更新适用的 Changelog、Technical Debt、Decision Log、QA/Handover 文档。
- 记录回退目标 commit/checkpoint；禁止以 `git reset --hard` 作为默认回退。

## 4. 每周检查

每个有工程活动的自然周至少执行一次，由 Engineering Lead 或其明确委派者负责归档。

| 检查域 | 检查内容 | 最低证据 |
| --- | --- | --- |
| Repository hygiene | 分支、未提交变更、异常大文件、未追踪资产、remote 变化 | Git 命令及 SHA |
| Automated checks | `pnpm test`、`pnpm typecheck`、`pnpm build` | 命令、exit code、摘要 |
| Tooling gaps | lint、微信 CLI、E2E、设备测试的配置状态 | NOT CONFIGURED / BLOCKED 记录 |
| Route/resource integrity | `app.json` 页面、tabBar、WXML/WXSS/JS、Logo/图片路径 | 静态验证结果 |
| Core-flow regression | 登录至 Advisor Follow-up 的核心路径及空数据/失效状态 | 自动化或人工用例编号 |
| Error hygiene | 新增 console error/warning、TODO/FIXME、临时代码 | 搜索结果与处置 |
| Security hygiene | Secret、敏感测试数据、权限绕过、依赖风险 | 扫描工具/人工复核记录 |
| Documentation drift | 架构、命令、版本、风险与真实实现是否一致 | 变更或“无变化”记录 |
| Debt review | 新债、状态变化、到期未处理 P0/P1 | Register 更新 |

当前命令的真实含义：

- `pnpm test`：Node assertions 与仓库现有静态/回归测试。
- `pnpm typecheck`：只覆盖 `tsconfig.files` 指定的 Partner 类型/配置。
- `pnpm build`：运行 `tests/validate-project.js`，是静态 validator，不是微信编译或生产 build。
- `pnpm lint`：当前 NOT CONFIGURED。

## 5. 每月技术审查

每个有持续开发或验收活动的自然月至少一次；如果项目暂停，恢复开发前补做一次。

### 5.1 Architecture and contract review

- 对照真实代码复核 `PROJECT_CONTEXT.md` 与 `ARCHITECTURE_MEMORY.md`。
- 检查页面、组件、数据表、Repository、AI provider、路由和测试数量变化。
- 复核 Active Contract 与历史资料边界，避免重新引入旧架构。
- 重要架构决定追加到 `ENGINEERING_DECISION_LOG.md`，不静默重写历史。

### 5.2 Data and security review

- 复核身份、Family ownership、Advisor access、Consent、Audit 和数据生命周期边界。
- 验证备份/checkpoint 可读、manifest/hash 可复核、恢复步骤仍可执行。
- 检查日志、错误信息、测试 fixture 和 Storage 是否包含真实敏感数据。
- 如果出现数据丢失、越权、隐私泄露或 secret 暴露，立即按 P0 阻断发布。

### 5.3 Quality and operability review

- 汇总一个月的失败测试、重复缺陷、console 问题和人工验收缺口。
- 复核微信开发者工具版本、基础库版本和设备矩阵覆盖。
- 检查依赖过期、安全公告、lockfile 可复现性和 Node/pnpm 环境。
- 复核 `TECHNICAL_DEBT_REGISTER.md` 的 Priority、Status、Owner role 与解决条件。
- 对 Internal Demo RC / Public RC / Production gate 重新作出 PASS / FAIL / BLOCKED 判断。

### 5.4 月审输出

至少产出一个可追踪记录，包含：

- 基线 SHA 与审查范围；
- 新增、关闭、接受延期或升级的问题；
- 依赖和安全审查结果；
- Release Gate 状态；
- 下一月唯一最高优先级。

## 6. 依赖更新规则

### 6.1 基本原则

- 以 `package.json` 和 `pnpm-lock.yaml` 为唯一安装基线，使用项目要求的 pnpm。
- 不在业务修复提交中夹带依赖升级；每次升级使用独立 branch/commit。
- 不使用未锁定的通配版本；不得手工编辑 lockfile 模拟安装结果。
- 不因“最新版”自动升级微信基础库、AppID、TypeScript 或其他工具。
- Major update 必须先完成兼容性评估、checkpoint、完整测试和回退演练。

### 6.2 更新节奏

- Critical/High 安全更新：确认适用性后立即评估；影响生产/真实数据时按 P0/P1 加急。
- Patch：在隔离分支完成，可进入常规维护窗口。
- Minor：先读官方变更与弃用说明，完成完整回归后合入。
- Major：单独 Architecture Review，不与普通维护批次合并。
- 微信基础库：只在受控 AppID、开发者工具和设备矩阵可用时更新并验收。

### 6.3 标准步骤

1. 记录升级前 SHA、版本、lockfile hash 与测试基线。
2. 在网络可用时运行 `pnpm outdated`、`pnpm audit`；无网络时写 BLOCKED，不写 PASS。
3. 查阅依赖官方 release/security notes，确认是否影响小程序运行环境。
4. 只升级批准的最小依赖集合并审查 lockfile diff。
5. 运行 install reproducibility、test、typecheck、static validator；平台相关更新另做微信编译和真机验收。
6. 更新 Changelog、Technical Debt 和回退说明。

## 7. 安全检查规则

### 7.1 每次变更

- 检查 staged diff 中是否有 token、password、private key、真实手机号、家庭/儿童姓名或生产 AppID。
- 检查新增日志、错误提示和 analytics properties 是否暴露敏感字段。
- 身份、权限、Consent、Audit、Storage 或网络边界变化必须按 C3 处理。
- 客户端 session guard 只能作为 demo safeguard，不得描述为生产 RBAC。

### 7.2 每周与每月

- 使用组织批准的 secret/dependency scanner；工具不可用时明确记录 NOT CONFIGURED/BLOCKED。
- 审查 `project.config.json`、环境配置和 ignore 规则，确保 secret 与本地调试文件不入库。
- 检查依赖安全公告；记录 advisory、适用性、修复版本、临时缓解和责任角色。
- 对 Family/Child 数据执行最小化、访问、保留、删除和恢复评审。
- 生产化前必须完成服务端身份、RBAC、Consent、Audit、传输保护和数据生命周期验证。

### 7.3 事件响应

发现疑似 secret 或敏感数据泄露时：

1. 停止发布和进一步扩散，不在聊天或普通日志中复制敏感值。
2. 记录受影响文件、commit、环境和时间范围。
3. 通知项目负责人/安全责任角色，执行凭据轮换或数据事件流程。
4. 在保留取证的前提下实施最小修复；历史清理必须另行批准。
5. 完成回归、安全复核和关闭证据后才解除 Gate。

## 8. 当前维护基线

- 当前包版本：`0.1.0`。
- 当前依赖：开发依赖 TypeScript `5.9.3`。
- 当前 lint：NOT CONFIGURED。
- 当前微信开发者工具 CLI：NOT CONFIGURED / NOT FOUND。
- 当前公开发布：HOLD。
- 当前唯一默认下一阶段：按 `docs/codex-audit/ACCEPTANCE_TEST_PLAN_V1.0.md` 执行微信开发者工具和设备验收。
