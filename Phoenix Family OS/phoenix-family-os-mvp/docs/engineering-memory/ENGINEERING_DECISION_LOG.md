# Phoenix Family OS™ Engineering Decision Log

- Log type: Append-only confirmed engineering decisions
- Project: Phoenix Family OS™ MVP V0.1
- Initial memory baseline: `bb972f030994a35a1e81bd0d38ff502410127b84`
- Log initialized: 2026-08-15（Asia/Shanghai）

## 1. 记录规则

- 只记录已经明确确认并有代码、报告、ADR 或用户指令依据的决定。
- 每条必须包含日期、状态、决定、原因、影响范围和证据。
- 新决定替代旧决定时，旧记录保持不变并标记 `Superseded by DEC-xxx`。
- 不把建议、设想或 Future modules 写成 Accepted。
- 产品决策与工程决策冲突时，停止高风险实现并请求正式确认。

## 2. Decision index

| ID | 日期 | 决策 | 状态 |
| --- | --- | --- | --- |
| DEC-001 | 2026-08-15 | 保持当前 MVP 核心闭环 | Accepted |
| DEC-002 | 2026-08-15 | 使用原生微信小程序架构 | Accepted |
| DEC-003 | 2026-08-15 | 通过 Repository/Store 隔离本地持久化 | Accepted for V0.1 demo |
| DEC-004 | 2026-08-15 | V0.1 使用可解释本地规则 Insight | Accepted for V0.1 demo |
| DEC-005 | 2026-08-15 | 旧本地数据 normalization 必须非破坏性 | Accepted |
| DEC-006 | 2026-08-15 | 权限在页面提交和读取处重复校验 | Accepted as demo safeguard |
| DEC-007 | 2026-08-15 | 状态栏与胶囊使用运行时尺寸和 safe-area | Accepted |
| DEC-008 | 2026-08-15 | 品牌资产采用允许清单且禁止自动替换 | Accepted |
| DEC-009 | 2026-08-15 | 所有实施使用 checkpoint 与非主分支 | Accepted |
| DEC-010 | 2026-08-15 | 测试结果必须按真实覆盖范围描述 | Accepted |
| DEC-011 | 2026-08-15 | V0.1 暂不进入公开 Release Candidate | Active hold |
| DEC-012 | 2026-08-15 | Family Growth Agent™ 暂时 NO-GO | Active hold |
| DEC-013 | 2026-08-15 | 下一默认阶段为受控 Acceptance Testing | Accepted |

## 3. Decision records

### DEC-001｜保持当前 MVP 核心闭环

- 日期：2026-08-15
- 状态：Accepted
- 决策：保持微信登录 → Family Profile → Child Profile → Education Compass → AI Growth Insight → Family Timeline → Advisor Follow-up。
- 为什么这样设计：这是当前 MVP 用于验证家庭建档、测评、洞察、长期记录和人工支持意愿的最小产品闭环。
- 决策原因：避免工程收口和验收阶段被新商业模块分散。
- 影响范围：页面、路由、数据模型、测试、报告和后续 Sprint scope。
- 证据：README、Current Baseline、Sprint 1 Engineering Report、用户明确指令。

### DEC-002｜使用原生微信小程序架构

- 日期：2026-08-15
- 状态：Accepted
- 决策：V0.1 保持 JavaScript、WXML、WXSS、JSON 和 CommonJS 的原生小程序结构。
- 为什么这样设计：当前 15 页项目已在该架构下运行，改框架会扩大风险且不增加 MVP 验证价值。
- 决策原因：降低工具链和迁移成本，保留微信平台原生能力。
- 影响范围：`app.*`、`pages/`、`components/`、构建与测试方式。
- 证据：当前 repository、Architecture、Development Readiness Report。

### DEC-003｜通过 Repository/Store 隔离本地持久化

- 日期：2026-08-15
- 状态：Accepted for V0.1 demo
- 决策：页面通过 Services/Repository 访问数据，由 Store 负责 `PFS_DB_V01`。
- 为什么这样设计：避免页面直接绑定存储细节，并保留未来替换受信任数据层的边界。
- 决策原因：当前无需后端即可演示，同时降低未来页面改写范围。
- 影响范围：`services/store.js`、`services/repository.js`、所有数据页面。
- 限制：这不是生产数据库、事务或安全边界。
- 证据：Architecture、Data Schema、真实代码 inspection。

### DEC-004｜V0.1 使用可解释本地规则 Insight

- 日期：2026-08-15
- 状态：Accepted for V0.1 demo
- 决策：`ai-provider` 调用 `phoenix_rule_engine_v0.1`，不发送家庭/儿童数据到外部 AI。
- 为什么这样设计：输出稳定、可解释、无需 API key，适合先验证用户流程。
- 决策原因：减少隐私、网络和外部依赖风险。
- 影响范围：Compass 提交、Report 输出和测试确定性。
- 限制：不能描述为正式 Growth Blueprint/生产 AI。
- 证据：`services/ai-provider.js`、`services/insight.js`、Architecture。

### DEC-005｜旧本地数据 normalization 必须非破坏性

- 日期：2026-08-15
- 状态：Accepted
- 决策：Store 加载旧 schema 时保留现有记录和未知字段，只补齐当前缺失表并更新 schemaVersion。
- 为什么这样设计：初始化会保存加载结果，返回空数据库会造成历史家庭数据丢失。
- 决策原因：数据安全优先于严格拒绝未知版本。
- 影响范围：App launch、所有 Repository 读写和 schema compatibility。
- 证据：Sprint 1 commit `cc1960a`、Sprint 1 regression tests。

### DEC-006｜权限在页面读取和提交处重复校验

- 日期：2026-08-15
- 状态：Accepted as demo safeguard
- 决策：Family/Student/Compass/Report/Advisor 的关键入口和提交重新执行 session/ownership 检查。
- 为什么这样设计：页面打开后 session 或数据可能变化，单次 onLoad guard 不足。
- 决策原因：减少空用户写入和跨家庭 ID 误用。
- 影响范围：核心页面和提交错误处理。
- 限制：客户端 guard 不构成生产 RBAC。
- 证据：Sprint 1 commits `4df5ac8`、`870897b` 及相关 tests。

### DEC-007｜状态栏与胶囊使用运行时尺寸和 safe-area

- 日期：2026-08-15
- 状态：Accepted
- 决策：使用微信运行时状态栏/胶囊数据、`safeArea.top` fallback、compact header 和底部 safe-area。
- 为什么这样设计：固定 padding 无法覆盖 iPhone 刘海/灵动岛和 Android 状态栏差异。
- 决策原因：避免标题重叠、底部遮挡和窄屏横向溢出。
- 影响范围：全局 WXSS、自定义导航、固定底部按钮和多设备测试。
- 证据：Sprint 1 commit `ecce067`、navigation tests。

### DEC-008｜品牌资产采用允许清单且禁止自动替换

- 日期：2026-08-15
- 状态：Accepted
- 决策：运行时只允许四个已登记 Phoenix Nova PNG，并通过 Brand Mark 引用；不自动重绘、生成或替换。
- 为什么这样设计：工程工具能验证路径/hash，不能替代品牌所有者确认正式版本。
- 决策原因：防止旧版、近似图或临时 Logo 混入。
- 影响范围：`assets/brand/`、Brand Mark、静态验证和发布签字。
- 证据：Sprint 1 commit `086d7d3`、Sprint 1 Engineering Report。

### DEC-009｜所有实施使用 checkpoint 与非主分支

- 日期：2026-08-15
- 状态：Accepted
- 决策：修改前建立可验证 checkpoint，并在非 main/master 分支工作。
- 为什么这样设计：原项目无 Git 历史，需要在实现前建立独立恢复点。
- 决策原因：确保每次变更可审计、可回退且不覆盖用户文件。
- 影响范围：所有 Sprint、migration、交付和紧急修复。
- 证据：Pre-Development Checkpoint、baseline commit `e742368`、AGENTS.md。

### DEC-010｜测试结果必须按真实覆盖范围描述

- 日期：2026-08-15
- 状态：Accepted
- 决策：区分 Node tests、typecheck scope、static validator、lint、微信编译和真机验收。
- 为什么这样设计：命令 exit 0 不能证明未覆盖平台或契约。
- 决策原因：建立企业可审计的质量证据。
- 影响范围：所有 QA、Release、Handover 和 Go/No-Go 报告。
- 证据：Sprint 1 Report、Family Growth Core Inspection、AGENTS.md。

### DEC-011｜V0.1 暂不进入公开 Release Candidate

- 日期：2026-08-15
- 状态：Active hold
- 决策：在真实认证、服务端权限、数据安全、微信编译、真机验收和品牌签字完成前，不进入公开 RC。
- 为什么这样设计：当前使用 `touristappid`、共享 local identity 和本地明文数据。
- 决策原因：P0 身份、越权和隐私风险阻断生产发布。
- 影响范围：部署、上传、真实数据、微信审核和外部演示。
- 证据：Development Readiness、Sprint 1 Report、Acceptance Test Plan。

### DEC-012｜Family Growth Agent™ 暂时 NO-GO

- 日期：2026-08-15
- 状态：Active hold
- 决策：在 Family Member/history、Growth Blueprint versioning、Timeline/Reminder、Consent/Audit、API/RBAC 和闭环 E2E 完成前，不部署正式 Agent。
- 为什么这样设计：产品契约已冻结，但可信数据和权限证据链未建立。
- 决策原因：Agent 无法可靠区分事实、推断、授权和可见范围。
- 影响范围：Agent、数据库、API、Timeline 和 Advisor 架构。
- 证据：Family Growth Core Engineering Inspection V1.0。

### DEC-013｜下一默认阶段为受控 Acceptance Testing

- 日期：2026-08-15
- 状态：Accepted
- 决策：Sprint 1 后默认下一动作是执行 Acceptance Test Plan，不继续新增功能。
- 为什么这样设计：代码和静态回归完成，但微信编译与设备证据缺失。
- 决策原因：遵循开发完成 → 测试 → 交接的企业交付顺序。
- 影响范围：下一工程任务、QA 资源、设备准备和缺陷修复优先级。
- 证据：Engineering Handover Report、Acceptance Test Plan。

## 4. 新决策模板

```text
### DEC-XXX｜标题

- 日期：YYYY-MM-DD
- 状态：Proposed / Accepted / Active hold / Superseded / Rejected
- 决策：
- 为什么这样设计：
- 决策原因：
- 影响范围：
- 限制：
- 证据：
- Supersedes / Superseded by：
```
