# Phoenix Sprint Execution Protocol V1.0

- Organization: Phoenix Nova™
- Project: Phoenix Family OS™ Mini Program MVP V0.1
- Protocol owner: Phoenix Nova™ AI Engineering Lead
- Version: 1.0
- Effective date: 2026-08-15（Asia/Shanghai）
- Status: Active Sprint governance protocol
- Parent rules: repository root `AGENTS.md` and `docs/engineering-memory/CHANGE_MANAGEMENT_RULES.md`

## 1. 目标

本 Protocol 训练并约束 AI Engineering Lead 将已批准的工程目标自主拆解为可实现、可测试、可验收、可回退的 Sprint，同时保持产品和权限边界。

核心原则：

```text
Autonomous decomposition ≠ autonomous product decision
Autonomous planning ≠ authorization to modify code
Test completion ≠ release authorization
```

- 可以在确认前自主 inspection、分析、拆解和生成 Sprint Proposal。
- 未经用户/项目负责人明确确认，不得修改业务代码、配置、依赖、schema、资产或测试实现。
- 确认后必须先建立 checkpoint，再执行 Implementation → Test → Report。
- 不新增未经批准功能，不改变当前 MVP 核心闭环，不重新引入历史架构。

## 2. Sprint 状态机

```text
GOAL RECEIVED
→ INSPECTING
→ PROPOSAL DRAFT
→ AWAITING CONFIRMATION
→ APPROVED
→ CHECKPOINTED
→ IMPLEMENTING
→ TESTING
→ REPORTING
→ COMPLETE
```

异常终态：

- `BLOCKED`：存在无法在当前权限或环境内解除的阻断条件。
- `CANCELLED`：项目负责人明确取消目标。
- `SUPERSEDED`：原 Proposal 被新版本替代；旧版本保留，不静默覆盖。

任何 Scope、产品契约、数据结构、权限边界或 Acceptance Criteria 的实质变化，都必须返回 `PROPOSAL DRAFT → AWAITING CONFIRMATION`。

## 3. Sprint 启动流程

### Step 0｜建立只读安全基线

收到开发目标后，在修改任何代码之前执行并记录：

```text
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short --branch
git remote -v
```

必须确认：

- 真实 repository root；
- 当前 branch 不是 `main` / `master`；
- 当前 commit SHA；
- 工作树中的已有差异及其所有者；
- 是否存在 remote，但未经授权不得 push；
- 当前任务只允许 inspection/proposal，尚未获得代码修改授权。

如果仓库状态无法确认，或无法保护已有修改，停止 Implementation，只完成 inspection 和风险报告。

### Step 1｜读取强制工程上下文

每个 Sprint Proposal 前必须完整读取：

1. `AGENTS.md`
2. `docs/codex-audit/CURRENT_BASELINE.md`
3. `docs/engineering-memory/CHANGELOG.md`
4. `docs/engineering-memory/TECHNICAL_DEBT_REGISTER.md`

根据目标还必须读取相关：

- `PROJECT_CONTEXT.md` 与 `ARCHITECTURE_MEMORY.md`；
- `ENGINEERING_DECISION_LOG.md` 与 `CHANGE_MANAGEMENT_RULES.md`；
- Product Contract、Freeze、ADR、QA、Acceptance 和 Handover；
- 目标页面、components、services、models、schema/API/permission 和 tests。

#### 上下文冲突处理

- 文档是证据来源，不是对真实实现的替代。
- `CURRENT_BASELINE.md` 可能是历史 checkpoint；必须与当前 Git、代码和更新日期核对。
- 事实优先级：真实 repository/运行证据 → 当前批准的产品契约与 `AGENTS.md` → 更新且已确认的工程记忆/报告 → 历史基线/建议。
- 发现冲突时，在 Sprint Proposal 中列出冲突、当前事实、影响和需要的决定；不得静默选择有利于实施的版本。
- 历史 P0/P1 被后续提交修复时，必须引用修复 commit/test；不能仅凭文档措辞判定 CLOSED。

### Step 2｜分析当前状态、影响范围与风险

#### 2.1 当前状态

至少确认：

- repository / branch / SHA / worktree；
- 当前版本、交付阶段和 Release Gate；
- 目标相关功能的 Implemented / Partial / Missing；
- 当前数据流、调用链、路由和权限检查；
- 已有测试、可用命令、环境限制和最近结果；
- 关联 Technical Debt、P0/P1 blockers 和已批准延期项；
- 是否存在用户未提交修改或并行工作冲突。

#### 2.2 影响范围

按直接与间接影响分析：

| 领域 | 必查内容 |
| --- | --- |
| Product | 核心闭环、业务规则、AI Prompt/评分、品牌定位 |
| UI | 页面、components、navigation、safe area、设备兼容性 |
| Data | schema、Storage、migration、已有记录、幂等、恢复 |
| Identity/Security | login、ownership、RBAC、Consent、Audit、隐私 |
| Integration | API、AI provider、微信能力、第三方依赖 |
| Quality | unit/integration/E2E、route/resource、平台/真机 |
| Delivery | Changelog、Debt、ADR、Acceptance、rollback、release gate |

Files affected 必须来自真实调用链检查，不能只猜测单个入口文件。对尚未确定的文件写 `TBD after inspection` 并说明确认方法，不虚构路径。

#### 2.3 风险

- 按 P0/P1/P2/P3 分级，并标记是否阻断当前 Sprint 或 Release Gate。
- 按 C0/C1/C2/C3/C4 确定最低流程和测试矩阵。
- 明确数据丢失、跨家庭访问、隐私、品牌、兼容性和回退风险。
- 区分“本 Sprint 要修复”“已批准延期”“超出范围”“需要人工/外部环境验证”。
- P3 只登记，不自动纳入 Sprint。

### Step 3｜生成 Sprint Proposal

完成 Step 0–2 后，生成 Proposal 并进入 `AWAITING CONFIRMATION`。Proposal 必须包含以下内容。

#### 3.1 Sprint Proposal 标准模板

```text
# Phoenix Family OS™ Sprint <N> Proposal V<version>

Status: AWAITING CONFIRMATION
Repository:
Branch:
Baseline SHA:
Date:
Change class: C0 / C1 / C2 / C3 / C4
Target release stage:

## Goal
- 一个可验证的工程结果，不写泛化愿景。

## Evidence / Current state
- Implemented / Partial / Missing
- 真实文件、调用链、测试和文档冲突
- 关联 Technical Debt / Decision / Release blocker

## Scope
### In scope
- 本 Sprint 明确处理的内容

### Out of scope
- 不新增的功能、Future modules、产品规则或发布动作

## Work breakdown
### Task 1｜名称
- Purpose:
- Dependencies:
- Files affected:
- Implementation boundary:
- Risk:
- Targeted tests:
- Acceptance criteria:

## Files affected
| Path | Create/Modify/Delete | Reason | Impact | Risk |

## Data / Security / Brand impact
- Schema/migration:
- Existing user data:
- Auth/RBAC/Consent/Audit:
- Sensitive data:
- Brand assets/text:

## Testing plan
| Check | Command/Steps | Expected evidence | Required status |

## Acceptance criteria
- AC-01 ...
- AC-02 ...
- 每条可观察、可复现，并映射到 Task/Test。

## Checkpoint and rollback plan
- Checkpoint method/name:
- Baseline files/data/hash:
- Rollback order:
- Post-rollback verification:

## Risks and blockers
| ID | P0/P1/P2/P3 | Risk | Mitigation | Gate |

## Approval
- Decision: PENDING
- Approved proposal version:
- Approved scope changes:
- Approver:
- Date:
```

#### 3.2 Proposal 质量标准

- Goal 必须单一、具体，能用 Acceptance Criteria 判定完成。
- Scope 必须同时包含 In scope 与 Out of scope。
- Work breakdown 按依赖顺序排列，每个 Task 可独立验证。
- Files affected 必须说明修改原因和影响；删除默认禁止，除非明确批准并有恢复方案。
- Testing plan 必须写真实存在的命令/人工步骤、覆盖范围和环境限制。
- Acceptance Criteria 不使用“正常”“优化完成”等不可测描述。
- Checkpoint/rollback 在确认前设计，在确认后、代码修改前执行。
- Proposal 不得把 Technical Debt 自动转换为开发范围。

## 4. 确认 Gate

### 4.1 未经确认

允许：

- 只读 repository inspection；
- 执行非破坏性诊断和现状验证；
- 创建/修订 Sprint Proposal 文档；
- 报告冲突、风险和阻断项。

禁止：

- 修改业务代码、配置、依赖、lockfile、tests 或 runtime assets；
- 执行 schema/data migration；
- 改变路由、数据结构、AI Prompt、评分或品牌资产；
- 配置 remote、push、deploy、upload 或提交微信审核；
- 用“先做一部分”绕过确认 Gate。

### 4.2 有效确认

有效确认必须能映射到具体 Proposal 版本和 Scope，例如：

```text
确认 Phoenix Family OS Sprint 2 Proposal V1.0，按 In scope 执行。
```

如果用户只确认部分 Task，只执行被确认部分并生成新的批准 Scope 记录。若用户修改 Goal、数据契约、Files affected 或 Acceptance Criteria，先更新 Proposal 并重新确认。

## 5. Checkpoint

确认后、任何代码修改前，状态必须从 `APPROVED` 进入 `CHECKPOINTED`。

### 5.1 Git checkpoint

1. 再次记录 repository / branch / SHA / status / remotes。
2. 确认非 `main` / `master` 分支，必要时创建批准命名的工作分支。
3. 确认现有未提交修改的所有者；不得覆盖或混入 Sprint。
4. 将批准前基线记录为 checkpoint commit/tag/受控 branch，或引用已验证的 immutable baseline。
5. 记录回退命令和回退后的验证命令。

建议命名：

```text
Phoenix Family OS Sprint <N> Pre-Implementation Checkpoint
```

### 5.2 数据/高风险 checkpoint

涉及 schema、Storage、auth、RBAC、Consent、Audit 或用户数据时，还必须：

- 保存 schema snapshot、migration ledger 和受影响数据的脱敏导出/hash；
- 证明 migration additive、idempotent、可对账；
- 记录失败恢复和 rollback rehearsal；
- 明确新写入在回退期间的处理方式。

如果无法建立可靠 checkpoint，不得修改代码；Sprint 转为 `BLOCKED` 并输出原因。

## 6. 执行规则

Checkpoint 完成后按固定顺序执行：

```text
Implementation
→ Test
→ Sprint Engineering Report
```

### 6.1 Implementation

- 按 Proposal 的 Task 顺序实施最小必要修改。
- 每个 Task 使用单一目的提交，可独立回退。
- 不修改 Proposal 未列出的文件；如确需新增影响文件，先说明原因与影响，实质 Scope 变化必须暂停并重新确认。
- 不顺带重构，不新增 Future modules，不改变产品需求。
- 对输入、空值、失败、重复提交、权限和恢复路径进行与风险相称的处理。
- 用户在执行中追加指令时，判断是补充还是替代；替代 Scope 时停止旧实施并更新 Proposal。

### 6.2 Task loop

每个 Task 执行：

```text
Confirm task boundary
→ Implement minimum change
→ Review diff
→ Run targeted checks
→ Record result
→ Commit independently
→ Continue or stop on gate
```

每完成一个 Task，提供简短进度：修改文件、修改原因、测试结果、剩余风险。进度不是最终 Sprint Report。

### 6.3 Stop conditions

出现以下任一情况必须停止受影响实施：

- 发现未经批准的产品/架构/数据契约变化；
- 工作树差异归属不明或 checkpoint 不可靠；
- P0 数据丢失、越权、隐私或 secret 风险；
- 需要破坏性 migration 或删除页面/用户数据；
- 正式 Logo/品牌文字需要人工决定；
- 关键测试失败且继续修改会扩大影响；
- 需要新的外部权限、生产环境或发布授权；
- 实现依赖 Future modules 或历史 Phoenix OS / Family Passport 架构。

停止时保留现场，报告证据、已完成项、回退选择和所需决定，不以大范围重写绕过阻断。

## 7. 测试协议

### 7.1 测试计划映射

每条 Acceptance Criterion 必须至少映射一项测试或人工验收。每条测试必须记录：

- 命令/步骤；
- 环境、设备和版本；
- exit code 或人工状态；
- 关键输出和证据路径；
- 覆盖范围；
- PASS / FAIL / BLOCKED / NOT RUN / NOT CONFIGURED。

### 7.2 当前仓库命令

```text
pnpm test
pnpm typecheck
pnpm build
```

必须保留范围说明：

- `pnpm build` 是静态 validator，不是微信开发者工具编译。
- `pnpm typecheck` 只覆盖 `tsconfig.files` 当前列出的有限 TypeScript 范围。
- `pnpm lint` 当前 NOT CONFIGURED。
- 微信开发者工具 CLI 当前未配置；平台编译、模拟器和真机必须单独记录。

### 7.3 最低测试要求

- C0：Markdown/contract/diff 检查；业务测试 N/A 或 NOT RUN 并说明原因。
- C1：targeted tests + 适用的 full regression、typecheck/static validation。
- C2：full tests、核心/异常路径、route/resource、微信编译和适用设备验收。
- C3：C2 + migration/rollback/reconciliation + server RBAC/Consent/Audit 负向测试 + security review。
- C4：C3 + Release Gate、目标 artifact、生产 smoke、监控和回退演练。

测试失败不能通过修改报告措辞变成 PASS。环境缺失时使用 BLOCKED/NOT CONFIGURED，并说明完成条件。

## 8. Sprint Engineering Report

所有批准并执行的 Sprint 结束时必须生成可追踪的 `Sprint Engineering Report`。

### 8.1 标准模板

```text
# Phoenix Family OS™ Sprint <N> Engineering Report V<version>

Repository:
Branch:
Baseline SHA:
Checkpoint:
Final SHA:
Proposal version / approval:
Date:
Status: COMPLETE / PARTIAL / BLOCKED / CANCELLED

## Completed
- Implemented:
- Verified:
- Documented:
- Deferred:
- Blocked:

## Modified files
| File | Change | Technical reason | Impact | Commit |

## Tests
| Command/Step | Exit/Status | Key result | Coverage | Evidence |
- NOT RUN / NOT CONFIGURED / BLOCKED items:

## Acceptance criteria result
| AC | PASS/FAIL/BLOCKED | Evidence |

## Risks
### P0
### P1
### P2
### P3

## Rollback
- Commit/checkpoint:
- Order:
- Data impact:
- Post-rollback verification:

## Release recommendation
- Development / Testing / Acceptance / Internal RC / Public RC / Production

## Next recommendation
- 只写一个最高价值、当前已授权边界内的下一步。
```

### 8.2 报告规则

- Completed 必须区分 Implemented、Verified、Documented、Deferred、Blocked。
- Modified files 列出全部新增/修改/删除文件；没有业务代码时写“代码修改：0”。
- Tests 必须包含真实命令、退出码和覆盖限制，不能只写“通过”。
- Risks 必须说明是否已修复、是否阻断 Release Gate、是否需要人工确认。
- Report 必须能由新工程师在没有聊天上下文时复现。
- 完成 Report 后检查 Changelog、Technical Debt、Decision Log、Architecture Memory 和 Acceptance 文档是否需要同步。

## 9. Definition of Ready

Sprint 只有同时满足以下条件才可进入确认：

1. Goal 明确且不改变未批准的产品契约。
2. 真实 repository / branch / SHA / worktree 已记录。
3. 强制上下文已读取，文档冲突已列明。
4. In scope / Out of scope、Tasks 和 Files affected 已拆解。
5. P0/P1、数据、权限、隐私、品牌和设备风险已识别。
6. Testing plan、Acceptance Criteria、checkpoint 和 rollback 可执行。
7. 所需外部环境/人工签字已标出。
8. Proposal 状态为 `AWAITING CONFIRMATION`，尚未实施代码。

## 10. Definition of Done

Sprint 只有同时满足以下条件才可标记 COMPLETE：

1. 获批 Scope 已实现，或每个未完成项已明确 Deferred/Blocked。
2. 所有修改与 Proposal/批准变更可追踪。
3. 相关测试已真实执行并记录；未运行项已明确。
4. Acceptance Criteria 逐项给出 PASS/FAIL/BLOCKED 证据。
5. 没有未解释的工作树差异或未授权功能。
6. P0/P1 已关闭或明确阻断交付，不能以延期隐藏。
7. 回退可执行且不依赖破坏性操作。
8. Sprint Engineering Report 和需要更新的工程记忆已完成。
9. 当前 Release Gate、风险和下一步可由新工程师独立理解。

## 11. Phoenix Family OS™ 当前专用边界

- 保持当前 MVP 核心闭环和 Phoenix Nova™ / Phoenix Family OS™ 品牌定位。
- 不自动新增支付、会员、CRM、医疗、财富、商城、Portal 或 Future Agent modules。
- 不重新引入 Family Passport / Phoenix OS 历史架构。
- 不重绘、生成或自动替换 Logo。
- 不改变 AI Prompt、评分规则或用户数据结构，除非新 Proposal 获得明确批准。
- 当前 Public RC 保持 HOLD，Production 与 Family Growth Agent™ 保持 NO-GO/HOLD。
- 默认下一阶段仍是执行 Acceptance Test Plan，而不是继续新增功能。

## 12. Protocol 维护

- 本 Protocol 的修改必须由 Phoenix Nova™ 项目负责人明确批准并升级版本。
- 新版本必须记录变化原因、影响范围和是否替代旧 Protocol。
- 不静默删除历史 Proposal、Approval、Checkpoint 或 Sprint Report。
- 如本 Protocol 与当前 Product Contract、法律/安全要求或 `AGENTS.md` 冲突，以更高优先级规则为准，并停止受影响实施。
