# Phoenix Multi-Project Engineering Governance V1.1

- Governance scope: Phoenix Nova™ and KAIDE engineering portfolios
- Governance owner: Phoenix Nova™ AI Engineering Lead, subject to each portfolio/project owner
- Version: 1.1
- Effective date: 2026-08-15（Asia/Shanghai）
- Status: Active multi-project engineering governance
- Supersedes: `PHOENIX_MULTI_PROJECT_ENGINEERING_GOVERNANCE_V1.0.md`
- Current host repository: Phoenix Nova / Family OS
- Parent rule: repository-local `AGENTS.md`

## 1. V1.1 权威结构修正

V1.1 根据项目负责人确认的组织结构，将 V1.0 的“四个同级项目”模型修正为两个独立 portfolio namespace、七个工程项目单元：

```text
Phoenix Nova
├── Family OS
├── Website
├── AI Lab
└── Knowledge System

KAIDE
├── Website
├── Product Platform
└── Technical Documents
```

治理含义：

- `Phoenix Nova` 与 `KAIDE` 是两个独立 portfolio/brand namespace，不是同一个产品树。
- `KAIDE` 不再作为与 Family OS 同级的单一工程项目识别。
- `Phoenix Nova Website` 与 `KAIDE Website` 是两个不同项目；单独写 `Website` 不足以识别目标。
- `Phoenix Nova Knowledge System` 是正式项目单元，不等同于可自由共享的通用 Knowledge Base。
- `KAIDE Technical Documents` 是 KAIDE 项目单元，不自动成为 Phoenix Nova Knowledge System 的内容来源。
- V1.0 保留为历史治理记录，但不再作为新任务的 active structure。

## 2. 治理目标与不变量

本规范确保每个项目拥有独立产品契约、repository、工程规则、数据、测试、版本和发布责任，同时允许经过批准、最小范围、版本化和可回退的协作。

```text
Same portfolio ≠ same repository
Same word “Website” ≠ same project
Cross-portfolio sharing ≠ inherited authorization
Shared API ≠ shared database
Knowledge access ≠ data ownership
```

- 不创建其他项目仓库或占位业务目录。
- 不根据名称推断未检查项目的技术栈、版本、数据模型或发布状态。
- 不把 Phoenix Nova 的规则、品牌、数据或签字自动应用到 KAIDE，反之亦然。
- 不因共同工程负责人而合并 repository、credentials、Changelog 或 Release Gate。

## 3. Canonical Project Registry

### 3.1 正式项目标识

| Portfolio | Project Name | Canonical Project ID | Required isolation |
| --- | --- | --- | --- |
| Phoenix Nova | Family OS | `phoenix-nova/family-os` | 独立 Repository / AGENTS / CHANGELOG / Release Process |
| Phoenix Nova | Website | `phoenix-nova/website` | 独立 Repository / AGENTS / CHANGELOG / Release Process |
| Phoenix Nova | AI Lab | `phoenix-nova/ai-lab` | 独立 Repository / AGENTS / CHANGELOG / Release Process |
| Phoenix Nova | Knowledge System | `phoenix-nova/knowledge-system` | 独立 Repository / AGENTS / CHANGELOG / Release Process |
| KAIDE | Website | `kaide/website` | 独立 Repository / AGENTS / CHANGELOG / Release Process |
| KAIDE | Product Platform | `kaide/product-platform` | 独立 Repository / AGENTS / CHANGELOG / Release Process |
| KAIDE | Technical Documents | `kaide/technical-documents` | 独立 Repository / AGENTS / CHANGELOG / Release Process |

Canonical Project ID 是治理标识，不声明 Git remote 名称或本地目录已存在。真实 repository 必须在任务开始时单独验证。

### 3.2 当前证据状态

| Canonical Project ID | Verification in this task |
| --- | --- |
| `phoenix-nova/family-os` | VERIFIED：repository `phoenix-family-os-mvp`；V0.1 / package `0.1.0` |
| `phoenix-nova/website` | UNVERIFIED：未检查 repository/version/stack |
| `phoenix-nova/ai-lab` | UNVERIFIED：未检查 repository/version/stack |
| `phoenix-nova/knowledge-system` | UNVERIFIED：仅确认项目层级，不代表实现存在 |
| `kaide/website` | UNVERIFIED：未检查 repository/version/stack |
| `kaide/product-platform` | UNVERIFIED：未检查 repository/version/stack |
| `kaide/technical-documents` | UNVERIFIED：仅确认项目层级，不代表 repository 已建立 |

`UNVERIFIED` 不表示不存在；它禁止工程人员在错误 repository 中代建、复制或猜测。

## 4. 项目隔离原则

### 4.1 独立 Repository

七个项目单元必须分别拥有：

- 独立 repository root、Git history、branches、commits、tags 和 remote；
- 独立 dependency manifest/lockfile、CI、build cache 和 release artifact；
- 独立 issue、Sprint Proposal、checkpoint、tests、report 和 rollback；
- 独立 credentials、AppID、cloud project、database、Storage、analytics 和 monitoring；
- 独立 backup、migration ledger、incident 和 access review；
- 不使用另一个项目的 live working tree、相对路径、symlink/reparse point 或未发布 branch 作为依赖。

Portfolio 根目录可以用于只读导航或治理索引，但不得成为多个项目共用的业务 repository，除非未来另有明确批准的 monorepo ADR、ownership 和 release isolation；当前默认禁止。

### 4.2 独立 AGENTS 规则

每个 repository root 必须有项目专属 `AGENTS.md`，至少记录：

- Portfolio、Project Name、Canonical Project ID；
- 产品目标、当前版本、Active Contract 和不可改变事项；
- 技术栈、目录、数据/权限/品牌边界；
- 开发、测试、checkpoint、发布和回退规则；
- Definition of Ready/Done 与报告格式。

组织级治理不能替代本地规则。不得把 Family OS 的 `AGENTS.md` 复制成 Phoenix Website、Knowledge System 或 KAIDE 项目的有效规则。

### 4.3 独立 CHANGELOG

每个项目维护自己的 `CHANGELOG.md`：

- Version、Date、Commit、Changes、Impact、Testing、Rollback；
- 只记录本项目真实变更和本项目测试证据；
- 共享依赖只记录 provider 的 artifact/API/knowledge version；
- 一个项目升级不自动提升另一个项目版本；
- 两个 Website 的版本和 Release 状态不得混写。

### 4.4 独立 Release Process

每个项目独立执行：

```text
Development
→ Testing
→ Acceptance
→ Release Candidate
→ Production
```

- 独立 Release Gate、审批、环境、artifact、monitoring 和 rollback。
- Provider 发布不等于 consumer 可发布。
- Phoenix Nova 的 Go/No-Go 不覆盖 KAIDE，KAIDE 的签字也不覆盖 Phoenix Nova。
- AI Lab 实验结果不能替代 Family OS、Website、Knowledge System 或 KAIDE Production Gate。
- Technical Documents 发布完成不能自动改变 Product Platform 或任一 Website 的运行版本。

## 5. 项目识别机制

### 5.1 每次任务开始必须确认

1. **Portfolio**：`Phoenix Nova` 或 `KAIDE`。
2. **Project Name**：Family OS / Website / AI Lab / Knowledge System / Product Platform / Technical Documents。
3. **Canonical Project ID**：从第 3 节选择完整 namespaced ID。
4. **Repository**：真实 repository root 和 remote identity（如有）。
5. **Branch**：当前工作 branch，禁止直接修改 `main` / `master`。
6. **Current Version**：来自项目 package/app/release manifest/Changelog，并注明 Release Stage。

同时记录 commit SHA、worktree、适用 `AGENTS.md`、environment/data classification 和 task scope。

### 5.2 Project Identity Card V1.1

```text
Portfolio:
Project Name:
Canonical Project ID:
Repository Root:
Remote Identity: NONE / URL
Branch:
Commit SHA:
Worktree: CLEAN / DIRTY（列出归属）
Current Version:
Release Stage:
AGENTS Rule:
CHANGELOG:
Release Process:
Environment/Data classification:
Task Scope:
Cross-project dependencies:
```

Identity Card 不允许只写 `Website`。必须写 `phoenix-nova/website` 或 `kaide/website`。

### 5.3 识别命令

```text
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short --branch
git remote -v
```

如果 Project ID、repository metadata、AGENTS 或 version 不能一致，标记 `PROJECT IDENTITY CONFLICT`，停止写入并只做 inspection/report。

### 5.4 Mismatch Gate

以下情况禁止修改：

- 任务目标是 `kaide/website`，当前 repository 属于 `phoenix-nova/family-os`；
- 任务只写 “Website”，未说明 Portfolio，且无法从 repository 证据唯一识别；
- 目标是 Knowledge System，但文件实际位于 Family OS 或 AI Lab；
- 目标是 KAIDE Technical Documents，但准备写入 Phoenix Nova Knowledge System；
- 目标文件解析后位于 repository root 外或指向另一项目；
- 需要修改多个 Project ID，但只批准一个项目 Scope。

不得在错误 repository 新建同名目录来规避 mismatch。

## 6. 跨项目与跨 Portfolio 协作总规则

共享默认 `DENY`。只有同时满足以下条件才允许：

1. 明确 provider、consumer、所属 Portfolio 和批准责任人；
2. 共享对象属于 Brand Assets、Design System、API 或受控 Knowledge；
3. 有版本、来源、owner、license/usage rights 和完整性/契约标识；
4. 有数据分类、purpose、最小权限、retention 和 revoke 条件；
5. 不暴露 provider 内部 database、secret、admin endpoint 或 working tree；
6. provider/consumer 可独立构建、测试、发布和回退；
7. 两个项目分别记录 Changelog、tests、risks 和 Go/No-Go；
8. 跨 Portfolio 还必须获得双方品牌/产品/数据责任人的明确批准。

```text
Cross-project request
→ Identify both Portfolio/Project IDs
→ Contract + brand/data/security review
→ Versioned provider release
→ Consumer pins approved version
→ Consumer integration/negative tests
→ Independent acceptance and release
```

## 7. Brand Assets 共享规则

### 7.1 同一 Portfolio 内允许共享

仅当：

- 资产由该 Portfolio 品牌负责人确认为 canonical；
- 有名称、版本、适用项目、格式、dimensions、hash 和 usage guide；
- consumer 不重绘、生成、改色、变形或自动替换；
- consumer Changelog/asset manifest 记录来源与版本；
- 每个项目发布前分别完成品牌签字。

同属于 Phoenix Nova 也不意味着 Family OS Logo、Website Logo、AI Lab 图形或 Knowledge System 标识完全相同；以 asset registry 的适用项目为准。

### 7.2 跨 Phoenix Nova / KAIDE

默认禁止共享品牌资产。只有明确的 co-branding/partnership contract、双方品牌批准、适用范围、期限和撤回机制齐备时才允许。

不得：

- 将 Phoenix Nova Logo 用作 KAIDE Logo，或反向使用；
- 因共同工程团队而复用品牌色、口号、图标或字体许可；
- 从截图、旧 build、设计草稿或 AI 生成结果提取近似资产；
- 用一个项目的品牌签字替代另一个项目的签字；
- 看到文件名含 `phoenix`、`kaide` 或 `logo` 就推断可以共享。

来源不明时标记 `NEEDS HUMAN REVIEW`，不自动替换。

## 8. Design System 共享规则

### 8.1 允许共享

- 共享对象是已批准的 semantic tokens、基础组件契约、accessibility guidance 或中立工程 primitives；
- 有 provider、version、compatibility、Changelog、migration 和 rollback；
- 区分 organization-neutral core、Portfolio theme 和 project-specific component；
- consumer 通过 adapter/theme 使用，不修改 provider 未发布源码；
- 各项目分别执行视觉、交互和平台测试。

### 8.2 禁止共享

- 把完整页面、路由、业务表单或产品流程称为 Design System；
- 组件包含 Family OS、Knowledge System、KAIDE Product Platform 等专属业务规则；
- 强迫不同项目使用同一 runtime 或同步发布；
- 通过 filesystem path 引用另一个 repository working tree；
- 未经双方品牌批准，将 Phoenix Nova theme 直接用于 KAIDE，或反向使用；
- 用 `Website` 名称相同作为共享组件的充分理由。

## 9. API 共享规则

### 9.1 允许共享

- API 有 service owner、provider/consumer Project ID、purpose 和 data classification；
- 有 OpenAPI/GraphQL/schema 或等价版本化契约；
- 有 authentication、authorization、rate limit、Consent/Audit（如适用）和 error contract；
- 每个项目/环境使用独立 credential、tenant 和 scope；
- provider 有 contract/security tests，consumer 有 integration/negative tests；
- 有 deprecation window、observability、SLA 和 rollback；
- external DTO 与 provider persistence schema 分离。

### 9.2 禁止共享

- 直接连接另一个项目 database、Storage、internal table 或 admin endpoint；
- 共用用户 session、root token、service account、AppID secret 或 production credential；
- 把 Family/Child、KAIDE user 或其他敏感数据提供给未授权项目；
- 用 AI Lab prototype endpoint 直接替代生产 API；
- consumer 以 provider tests PASS 为理由跳过自身测试；
- 无 version/owner/data contract 或无法独立回退。

## 10. Knowledge System 与受控知识共享

### 10.1 项目身份区分

- `phoenix-nova/knowledge-system`：Phoenix Nova 正式项目单元。
- `kaide/technical-documents`：KAIDE 正式项目单元。
- “Knowledge Base”：一种可能被项目提供或消费的受控资源类型，不是默认公共仓库。

三者不能互换命名、repository、权限或发布状态。

### 10.2 允许共享

知识内容必须具有：

- owner、source、version、updated_at 和 copyright/license；
- PUBLIC / INTERNAL / CONFIDENTIAL / RESTRICTED 分类；
- provider/consumer Project ID、purpose、allowed query/output 和 retention；
- review、expiration、correction、revoke 和 downstream deletion 机制；
- 敏感访问的 identity、scope、audit 和索引隔离；
- AI 输出的 citation/source version 与 unknown/pending 行为。

`kaide/technical-documents` 向 `phoenix-nova/knowledge-system` 提供内容时，必须视为跨 Portfolio 数据/版权协作，不能自动同步。

### 10.3 禁止共享

- 真实家庭、儿童、客户、员工、顾问或合作伙伴敏感数据；
- 未脱敏 logs、emails、chats、support records 或 production exports；
- confidential Prompt、评分、商业策略、security config 或 unreleased roadmap；
- 来源、版权、Consent 或撤回机制不明的文档；
- 将 Family OS 或 KAIDE 数据导入 AI Lab 训练/评测而无单独批准；
- Knowledge System 获得读取权后反向修改源项目数据；
- Technical Documents 发布即自动触发 Product Platform/Website 生产变更。

## 11. 默认禁止共享清单

无论在同一 Portfolio 还是跨 Portfolio，以下对象默认禁止直接共享：

- 产品页面、业务流程、领域规则、AI Prompt、评分、资格和状态机；
- internal schema、migrations、primary keys、production fixtures 和 backups；
- secrets、tokens、passwords、certificates、sessions 和 service accounts；
- 真实用户数据、logs、analytics payload、support records；
- 未发布 branches、working tree、build cache、dependencies 和 release artifacts；
- admin/production console access、cloud ownership 和 root roles；
- 未批准 Logo、图标、口号、字体和 partner assets；
- 一个项目的 P0/P1 risk acceptance、test PASS、brand sign-off 或 Release approval；
- 历史/弃用架构，除非 consumer Active Contract 明确批准。

需要共享时必须转换为第 6–10 节规定的 versioned contract/artifact，不复制内部实现。

## 12. 跨项目执行协议

当一个目标需要两个或更多 Project ID：

1. 为每个项目建立独立 Project Identity Card。
2. 明确 provider/consumer、Portfolio owner 和 dependency direction。
3. 分别建立 Sprint Proposal、approval 和 checkpoint。
4. 先冻结 API/asset/design/knowledge contract version。
5. 每个 repository 分别 commit、test、report 和 rollback。
6. 使用 compatibility matrix 记录 provider version ↔ consumer version。
7. 各项目独立 Go/No-Go；允许 provider COMPLETE、consumer BLOCKED。
8. 分别记录 release/rollback order，不用一个全局 PASS 覆盖差异。

同一任务可以协调多个项目，但不得在单一 repository 提交其他项目文件。

## 13. 风险控制

### 13.1 防止文件混用

- 写入前验证 resolved absolute path 位于 Project Identity Card 的 repository root。
- 不使用 `..`、广泛 glob、symlink、reparse point 或未解析变量跨项目写入。
- 不通过 shell 批量复制另一个 repository；使用批准 artifact/version。
- 提交前检查 `git status`、`git diff --name-only` 和 staged allowlist。
- 发现错误项目文件时停止，不删除、不覆盖，先确认所有权和回退。

### 13.2 防止产品逻辑混用

- 每个项目只使用自己的 Active Contract、ADR 和 AGENTS。
- `phoenix-nova/website` 与 `kaide/website` 的页面、受众、业务规则默认完全独立。
- Prompt、评分、推荐、资格、权限和状态机默认 project-private。
- Design System/API 共享不能绕过 domain boundary。
- Review 时检查其他 Portfolio/Project ID、route、model 或 product copy 是否误入。

### 13.3 防止数据结构混用

- 每个项目独立 schema、migration ledger、ID namespace、fixtures 和 backup。
- Consumer 使用 API DTO/adapter，不导入 provider internal model。
- 禁止复制 migration 或因字段同名推断相同语义。
- 任何跨项目数据流必须有 purpose、Consent/RBAC/Audit、retention 和 revoke。
- Knowledge System、Technical Documents 与 AI Lab 的索引/实验数据分别隔离。

### 13.4 防止品牌资产混用

- Phoenix Nova 与 KAIDE 分别维护 canonical asset registry 和品牌批准人。
- 资产 manifest 必须记录 Portfolio、project applicability、version 和 hash。
- 不从 Logo 文件名、颜色相似或共同团队推断使用权。
- 每个 consumer release 分别签字；来源不明即 `NEEDS HUMAN REVIEW`。

### 13.5 防止身份、环境与凭据混用

- Portfolio、项目、环境和角色分别使用 credential/secret。
- 禁止共用 root token、admin account、production AppID 或 cloud owner。
- Production 操作二次确认 Portfolio、Canonical Project ID、environment、version 和 approval。
- 测试结果不能跨项目、跨环境或跨 Portfolio 外推。

### 13.6 风险等级

| Priority | 示例 | 处理 |
| --- | --- | --- |
| P0 | 写入错误 repository、跨 Portfolio 数据污染、secret/identity 混用、越权共享 | 立即停止、隔离、事件处理、阻断发布 |
| P1 | 错误 Website/产品逻辑、正式品牌、API contract、release artifact 混入 | 阻断合入/验收，回退并重新验证 |
| P2 | 依赖/知识版本漂移、文档/Design System 不一致、缺 consumer test | 登记 Owner/解决条件，按 Gate 决定延期 |
| P3 | 可能减少重复但尚无稳定共享契约 | 只登记，不自动抽取 shared module |

## 14. 检查清单

### 任务开始

- [ ] Portfolio、Project Name、Canonical Project ID 已确认。
- [ ] Repository、Branch、SHA、Current Version、AGENTS 已确认。
- [ ] 对 `Website` 等重名项目已使用完整 namespace。
- [ ] 单项目/多项目 Scope 已拆分。
- [ ] Shared resource owner/version/classification 已确认。

### 修改前

- [ ] 各项目 Proposal 分别批准。
- [ ] 各 repository checkpoint 分别建立。
- [ ] Files affected 均位于正确 root。
- [ ] Contract/artifact version 已冻结。
- [ ] Brand/data/security 审批没有跨 Portfolio 借用。

### 提交前

- [ ] staged file allowlist 与 Project ID 一致。
- [ ] 没有其他项目 route/model/schema/asset/secret 误入。
- [ ] Provider/consumer tests 分别执行并记录范围。
- [ ] Changelog、Technical Debt、compatibility 和 rollback 分别更新。
- [ ] 每个项目拥有独立 commit 和 Engineering Report。

### 发布前

- [ ] 每个项目独立完成 Testing/Acceptance/Release Gate。
- [ ] 两个 Portfolio 分别完成适用品牌/产品/数据批准。
- [ ] compatibility/deprecation、release/rollback order 已确认。
- [ ] 未借用其他项目 PASS、risk acceptance 或签字。

## 15. 违规处理与回退

发现项目混用时：

1. 停止受影响 repository 的写入、合入和发布。
2. 分别记录 Portfolio、Project ID、branch、SHA、worktree 和文件。
3. 不删除、不覆盖疑似他人文件；先确认所有权和数据影响。
4. Secret/data/permission 问题按 P0 事件处理并执行批准的凭据轮换。
5. 使用各 repository 的 checkpoint/`git revert`，不执行跨目录 `git reset --hard`。
6. 分别运行 tests、schema/data reconciliation、brand 和 acceptance。
7. 更新各项目 Incident、Changelog、Technical Debt 和 preventive action。

一个项目回退不得覆盖另一个项目工作树，也不得删除 provider 已发布的历史版本。

## 16. Definition of Compliance

多项目任务只有同时满足以下条件才合规：

1. 每个项目 Identity Card 含 Portfolio 和完整 Canonical Project ID。
2. Repository、AGENTS、CHANGELOG、Release Process 和凭据独立。
3. 共享对象有 provider/consumer、owner、version、contract 和分类。
4. 文件、逻辑、schema、brand、knowledge、identity 没有未经批准混用。
5. 每个项目有独立 Proposal、checkpoint、commits、tests、report 和 rollback。
6. 未运行/阻断项真实标记，没有借用其他项目 PASS。
7. 每个项目独立作出 Go/No-Go。
8. 没有未经授权 push、deploy、upload 或 production mutation。

## 17. Governance 维护

- V1.1 是当前 active 版本；V1.0 保留并标记 Superseded。
- 本规范升级必须由适用 Portfolio/项目负责人明确批准并创建新版本。
- 新增项目时先登记 Portfolio、Canonical Project ID、repository owner 和 data/release boundary。
- 新增 shared capability 时先指定 provider 和 versioned contract，不直接建立无 owner 的 `shared/` 业务目录。
- 各项目在自身 AGENTS/engineering memory 中引用适用版本，但仍保持本地规则。
- 如本规范与法律、安全、品牌或 Active Contract 冲突，以更严格要求为准并停止受影响实施。
