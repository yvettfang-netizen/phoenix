# Phoenix Family OS™ Change Management Rules

- Rule type: Project change, checkpoint, test and release governance
- Version: 1.0
- Effective date: 2026-08-15（Asia/Shanghai）
- Parent rule: repository root `AGENTS.md`

## 1. 修改流程

所有修改必须遵循：

```text
Phase 1 Understand
→ Phase 2 Plan
→ Phase 3 Architecture Review
→ Phase 4 Checkpoint
→ Phase 5 Implementation
→ Phase 6 Testing
→ Phase 7 Handover
```

### 1.1 Change request 最小输入

每项变更开始前必须明确：

- 业务/工程目标；
- 当前产品契约依据；
- In scope / Out of scope；
- 目标页面、服务、模型和数据；
- 是否影响身份、权限、隐私、品牌、路由或核心闭环；
- 验收标准；
- 发布目标：本地验证、内部 RC 或公开发布；
- 批准人。

输入不完整但风险低时可先 inspection；任何会扩大产品或改变数据契约的缺失决策必须阻断实现。

### 1.2 变更分类

| 类型 | 例子 | 最低流程 |
| --- | --- | --- |
| C0 文档/记忆 | 报告、Runbook、Decision Log | Understand → edit → document validation → Handover |
| C1 低风险修复 | 明确路径、语法、空值、样式 | Understand → Plan → local checkpoint → Implementation → targeted/full tests |
| C2 核心功能 | 登录、Family、Compass、Report、Timeline | 完整 Phase 1–7 |
| C3 数据/安全 | schema、migration、auth、RBAC、Consent、Audit | 完整 Phase 1–7 + 数据备份 + security review + rollback rehearsal |
| C4 发布变更 | AppID、环境、上传、部署、微信审核 | 明确外部授权 + Release Gate + 审批签字 |

### 1.3 优先级

- P0：启动/闭环阻断、数据丢失、越权、隐私和安全风险。
- P1：核心页面/交互、严重适配、正式品牌错误。
- P2：局部样式、提示、空状态、输入边界和代码质量。
- P3：未来优化，不在收口/验收 Sprint 自动实施。

处理顺序：P0 → P1 → 经批准且低风险的 P2；P3 记录延期。

### 1.4 实施纪律

- 先定位根因，再修改最小必要文件。
- 不覆盖工作树中的用户修改。
- 不顺带重构或新增 Future modules。
- 每个提交单一目的、说明原因和测试。
- 数据写入考虑校验、幂等、错误恢复和权限。
- 大改按 Task 分批，每个 Task 完成立即验证。

## 2. Checkpoint 要求

### 2.1 何时必须建立

- 首次接管无 Git 项目；
- 跨多个核心模块；
- 修改 schema、storage、migration、auth、permission 或 route；
- 修改核心用户闭环；
- 可能影响已有数据或难以手工恢复；
- 大范围 UI/品牌/资产调整。

### 2.2 Git 项目 checkpoint

1. 运行并记录：

```text
git rev-parse --show-toplevel
git status --short --branch
git branch --show-current
git rev-parse HEAD
git remote -v
```

2. 不在 main/master 直接开发。
3. 确认现有未提交修改的所有者和范围。
4. 建立基线 commit/tag 或受控 checkpoint branch。
5. 记录恢复命令和验证命令。

### 2.3 非 Git checkpoint

- 保存到项目外或明确 backup 目录。
- 不覆盖原文件。
- 包含完整源文件、配置、lockfile、测试和文档。
- 排除可重建依赖时必须写明恢复命令。
- 建立文件数量、字节数和 SHA-256 manifest。
- 如果无法验证恢复点，禁止实施代码修改。

### 2.4 数据 checkpoint

- 记录 schema snapshot 和 migration ledger。
- 导出受影响数据并 hash。
- migration 优先 additive、idempotent、可重跑和可对账。
- 不使用会删除家庭数据的破坏性 down migration。
- 回退优先停止新写入、回退应用、保留新表用于 reconciliation。

### 2.5 当前项目恢复点

Pre-Development Checkpoint：

`backups/Phoenix Family OS MVP V0.1 Pre-Development Checkpoint`

基线 commit：`e742368`。

## 3. 测试要求

### 3.1 通用证据

每条测试记录：

- 命令或操作步骤；
- 环境/设备；
- exit code；
- 关键输出；
- 覆盖范围；
- PASS / FAIL / BLOCKED / NOT RUN / NOT CONFIGURED；
- 日志、截图或录屏位置。

### 3.2 变更类型测试矩阵

| 检查 | C0 | C1 | C2 | C3 | C4 |
| --- | --- | --- | --- | --- | --- |
| Markdown/diff check | Required | Required | Required | Required | Required |
| JS/JSON syntax | If touched | Required | Required | Required | Required |
| Unit/targeted tests | N/A | Required | Required | Required | Required |
| Full existing tests | N/A | Usually required | Required | Required | Required |
| Typecheck | N/A | If affected | Required | Required | Required |
| Lint | N/A | If configured | Required if configured | Required | Required |
| Route/resource check | N/A | If affected | Required | Required | Required |
| Migration test | N/A | N/A | If applicable | Required | Required |
| RBAC negative test | N/A | If permission-related | If applicable | Required | Required |
| WeChat compile | N/A | If platform code | Required | Required | Required |
| iOS/Android device | N/A | If UI/platform | Required for RC | Required for RC | Required |
| Rollback rehearsal | Doc revert | If high impact | Required for high risk | Required | Required |

### 3.3 当前命令

```text
pnpm test
pnpm typecheck
pnpm build
```

当前限制：

- `pnpm lint` 未配置，必须写 NOT CONFIGURED。
- `pnpm typecheck` 只覆盖 `tsconfig.files` 中的 Partner 类型/配置。
- `pnpm build` 是 `tests/validate-project.js` 静态 validator，不是微信编译。
- 微信开发者工具 CLI 当前未配置。

### 3.4 核心验收

核心流程至少验证：

```text
登录
→ Family Profile
→ Child Profile
→ Education Compass
→ AI Growth Insight
→ Family Timeline
→ Advisor Request
```

异常至少覆盖：网络、登录失效、跨家庭/非法 ID、重复提交、空数据、非法输入、存储失败、刷新/返回/重复进入。

## 4. 发布流程

### 4.1 Release stages

```text
Development Complete
→ Automated/Static Verification
→ WeChat DevTools Compile
→ Simulator Acceptance
→ iPhone/Android Device Acceptance
→ Brand/Product Sign-off
→ Internal Demo RC
→ Security/Privacy/Production Architecture Gate
→ Public RC Approval
→ Upload/Review/Release Authorization
```

### 4.2 Internal Demo RC gate

必须满足：

- 现有 tests/typecheck/static build 结果已记录；
- 微信开发者工具编译无 error；
- 核心流程和异常测试通过；
- 规定 iPhone/Android 设备覆盖完成；
- P0/P1 验收缺陷关闭；
- Logo 正式来源签字；
- 明确 demo identity、虚构测试数据和禁止公开发布。

### 4.3 Public RC gate

除 Internal Demo RC 外，还必须满足：

- 正式 AppID 和受控环境；
- 服务端微信身份/session；
- 可信数据库和 migration；
- server-side RBAC、Consent、Audit；
- 数据最小化、传输保护、保留/删除策略；
- 依赖、安全、隐私、性能和恢复评审；
- 生产 API/AI 监控、错误和回退机制；
- 产品、工程、QA、品牌、数据安全批准。

当前 V0.1 不满足 Public RC gate。

### 4.4 发布授权

- 测试完成不等于上传授权。
- Internal RC 通过不等于公开发布授权。
- 未获得用户/项目负责人明确批准，不得配置 remote、push、deploy、upload 或提交微信审核。
- 发布操作必须记录操作者、时间、commit、环境、版本、审批和回退点。

## 5. 回退要求

每次交付必须提供：

- 回退目标 commit/checkpoint；
- commit 倒序或 feature flag 关闭步骤；
- 数据/资产影响；
- 是否会丢失新写入；
- 恢复依赖和配置步骤；
- 回退后的 test/typecheck/build/平台验证。

禁止使用 `git reset --hard`、覆盖整个工作区或删除备份作为默认回退方案。

## 6. 变更报告格式

```text
Repository / Branch / SHA：
Change Request / Scope：
完成内容：
修改文件：
技术原因：
执行命令与退出码：
测试结果与覆盖范围：
未运行/被阻断项：
P0/P1/P2/P3 风险：
回退方法：
发布建议：
下一步唯一建议：
```

## 7. 工程记忆更新

变更完成后判断是否需要更新：

- 产品目标/范围改变：`PROJECT_CONTEXT.md`；
- 架构、页面、模型、数据流改变：`ARCHITECTURE_MEMORY.md`；
- 已确认新决策或旧决策被替代：`ENGINEERING_DECISION_LOG.md`；
- 流程、checkpoint、测试或发布 gate 改变：本文件；
- 真实测试结果：对应 QA/Acceptance/Handover 报告，不写入没有证据的 PASS。

记忆文件必须与同一变更一同 review，但不得用更新文档掩盖实现缺口。
