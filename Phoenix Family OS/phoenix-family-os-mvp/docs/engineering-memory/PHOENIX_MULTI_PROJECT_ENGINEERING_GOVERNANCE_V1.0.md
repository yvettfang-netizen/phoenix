# Phoenix Multi-Project Engineering Governance V1.0

- Organization: Phoenix Nova™
- Governance owner: Phoenix Nova™ AI Engineering Lead
- Version: 1.0
- Effective date: 2026-08-15（Asia/Shanghai）
- Status: Superseded by `PHOENIX_MULTI_PROJECT_ENGINEERING_GOVERNANCE_V1.1.md`
- Current host repository: Phoenix Family OS™ Mini Program MVP
- Parent rule: repository-local `AGENTS.md`

## 1. 目标与适用范围

本规范用于隔离并协调以下 Phoenix Nova™ 工程项目：

- Phoenix Family OS
- Phoenix Website
- KAIDE
- AI Lab

目标是确保每个项目拥有独立产品契约、代码历史、规则、数据、测试和发布责任，同时允许经过批准、可追踪、版本化的跨项目协作。

```text
Shared organization ≠ shared repository
Shared brand ≠ shared product logic
Shared API ≠ shared database
Shared knowledge ≠ unrestricted data access
```

本规范只建立治理边界，不创建其他项目仓库，不移动文件，不修改业务代码，也不授权跨项目数据访问或生产发布。

## 2. 项目登记与当前证据状态

| Project Name | Repository requirement | Project-local governance | Current verification in this task |
| --- | --- | --- | --- |
| Phoenix Family OS | 独立 repository；当前验证为 `phoenix-family-os-mvp` | 独立 `AGENTS.md`、`CHANGELOG.md`、Release Process | VERIFIED：V0.1 / package `0.1.0`；branch `codex/phoenix-family-os-v0.1-closeout` |
| Phoenix Website | 必须使用独立 repository | 必须在自身仓库建立独立规则、Changelog 和 Release Process | UNVERIFIED：本任务未发现/检查其仓库、版本或技术栈 |
| KAIDE | 必须使用独立 repository | 必须在自身仓库建立独立规则、Changelog 和 Release Process | UNVERIFIED：不得从名称推断业务范围、数据模型或技术栈 |
| AI Lab | 必须使用独立 repository | 必须在自身仓库建立独立规则、Changelog 和 Release Process | UNVERIFIED：不得把实验环境视为任一生产项目的组成部分 |

`UNVERIFIED` 不表示项目不存在，只表示当前任务没有真实 repository 证据。不得为了完成任务而在错误仓库中创建占位业务目录或猜测版本。

## 3. 项目隔离原则

### 3.1 独立 Repository

每个项目必须拥有自己的 repository root 和 Git history：

- 独立 `.git`、branches、commits、tags 和 release artifacts；
- 独立 remote、访问权限和保护规则；
- 独立 dependency manifest/lockfile、CI 配置和构建缓存；
- 独立 issue、Sprint、checkpoint、rollback 和 Handover 记录；
- 独立 secrets、AppID、cloud project、database、Storage、analytics 和 monitoring；
- 不把一个项目作为另一个项目 repository 的业务子目录；
- 不通过工作区相对路径或 live symlink 直接引用另一个项目源码。

跨两个项目的目标必须拆成两个 Project Proposal、两个 checkpoint、两组 commits/tests/reports。不能用一个跨仓库 commit 或“同时完成”描述掩盖独立交付状态。

### 3.2 独立 AGENTS 规则

每个 repository root 必须有自己的 `AGENTS.md`，至少定义：

- Project Name、产品目标、当前版本和技术栈；
- 核心闭环、Active Contract 和不可改变事项；
- 目录、开发/测试命令、数据和权限边界；
- 品牌规则、checkpoint、测试、发布与回退要求；
- P0/P1/P2/P3、Definition of Ready/Done 和汇报格式。

组织级规范可作为参考，但不能替代项目本地 `AGENTS.md`。任务执行时使用目标文件所在范围内最近且适用的规则；若项目规则与组织规范冲突，先报告冲突并依据产品契约/安全要求决定，不能把另一个项目的规则复制过来直接生效。

### 3.3 独立 CHANGELOG

每个项目必须在自身 repository 维护独立 `CHANGELOG.md`：

- Version、Date、Commit、Changes、Impact、Testing、Rollback；
- 只记录该项目实际落地的变化；
- 跨项目依赖升级记录 provider artifact/API version，不复制 provider 的完整 Changelog；
- 一个项目 Release 不得自动提升另一个项目版本；
- `Unreleased`、RC、Production 状态按项目分别判断。

### 3.4 独立 Release 流程

每个项目必须有独立的：

```text
Development
→ Testing
→ Acceptance
→ Release Candidate
→ Production
```

- 独立 Release Gate、审批角色、环境、artifact、监控和 rollback。
- Provider 发布共享能力，不等于 consumer 已验收或可发布。
- Consumer 集成共享版本后，必须在自己的仓库重新测试和验收。
- 不允许用 Phoenix Website 的发布批准覆盖 Family OS，也不允许用 AI Lab 实验结果替代生产 Gate。
- 跨项目协调可以共享发布日期计划，但每个项目保留独立 Go/No-Go。

### 3.5 其他强制隔离

| 隔离域 | 规则 |
| --- | --- |
| Product contract | PRD、Freeze、ADR、Prompt、评分和业务规则按项目独立 |
| Data | schema、migration、fixtures、retention 和 backups 按项目独立 |
| Identity | 用户、角色、session、service account 和权限 scope 按项目独立 |
| Environment | dev/test/staging/production 配置与凭据按项目独立 |
| Dependencies | manifest、lockfile、升级和 vulnerability acceptance 按项目独立 |
| Tests | unit/integration/E2E/acceptance 证据按项目和 SHA 独立 |
| Documentation | Baseline、Architecture、Decision、Debt、QA、Handover 按项目独立 |

## 4. 跨项目协作总规则

跨项目共享默认是 `DENY`。只有同时满足以下条件才允许：

1. 有明确 provider、consumer 和批准责任人；
2. 共享对象属于 Brand Asset、Design System、API 或 Knowledge Base 的批准范围；
3. 有版本、来源、license/使用权、完整性 hash 或契约标识；
4. 有数据分类、最小权限和用途边界；
5. 不要求 consumer 读取 provider 的内部数据库或 secret；
6. provider 与 consumer 可以独立构建、测试、发布和回退；
7. 两个项目分别记录依赖、测试和风险；
8. 没有把共享变成未批准产品功能或同步发布耦合。

批准流程：

```text
Cross-project request
→ Provider/Consumer identification
→ Contract + data/brand/security review
→ Versioned provider artifact/API/knowledge release
→ Consumer pins approved version
→ Consumer integration tests
→ Independent acceptance and release
```

禁止通过共享工作目录、复制未发布分支、个人网盘临时文件或未经审计的 live link 绕过此流程。

## 5. Brand Assets 共享规则

### 5.1 允许共享

仅在以下条件下允许：

- 资产由 Phoenix Nova™ 指定品牌负责人确认为 canonical source；
- 有资产名称、版本、适用品牌/项目、格式、dimensions、hash 和使用说明；
- consumer 只引用批准版本，不自行重绘、生成、改色、变形或替换；
- 项目 Changelog/asset manifest 记录来源与版本；
- 发布前由各项目分别完成品牌人工验收。

建议分发方式是只读、版本化的 Brand Asset package/registry 或由品牌负责人批准的固定文件，不是从另一个产品页面目录复制。

### 5.2 禁止共享

- 来源、权属、版本、hash 或适用范围不明确；
- AI 生成的近似 Logo、草稿、截图裁剪、旧口号或临时占位图；
- Phoenix Nova 与子产品/合作伙伴品牌关系尚未确认；
- consumer 需要修改正式 Logo 才能使用；
- 从 production bundle 反向提取资产；
- 用 Family OS 已允许资产自动推定 Phoenix Website、KAIDE 或 AI Lab 也已获准。

## 6. Design System 共享规则

### 6.1 允许共享

- 共享对象是经过 owner 审核的 tokens、基础组件、图标契约或 accessibility guidance；
- 使用 semantic tokens 和版本化 package，不依赖另一个项目私有页面结构；
- 清楚区分 core tokens、project theme 和 project-specific component；
- 具有兼容性、变更日志、迁移说明、视觉测试和回退版本；
- consumer 可以通过 adapter/theme 覆盖项目差异，而不修改 provider 源码。

### 6.2 禁止共享

- 复制完整页面、路由、业务表单或产品流程并称为 Design System；
- 强迫不同技术栈共享同一 runtime implementation；
- 组件内部包含 Family、KAIDE、Website 或 AI Lab 专属业务判断；
- 未经品牌确认共享色彩、字体、图标或文案；
- 通过 filesystem path 直接引用另一个 repository 的未发布组件；
- 共享会导致所有项目必须同日升级或无法独立回退。

## 7. API 共享规则

### 7.1 允许共享

跨项目 API 只有在以下条件全部满足时才允许：

- API 有明确 service owner、consumer、purpose 和数据分类；
- 有 OpenAPI/GraphQL/schema 或等价版本化契约；
- 有认证、授权、rate limit、Consent/Audit（如适用）和错误契约；
- 每个项目使用独立 credential、tenant/scope 和环境；
- provider 有 contract/security tests，consumer 有 integration/negative tests；
- 有 deprecation window、compatibility policy、observability 和 rollback；
- 共享 DTO 与 provider 内部 persistence schema 分离。

### 7.2 禁止共享

- 直接连接另一个项目数据库、Storage、admin endpoint 或内部表；
- 共用用户 session、root token、service account 或生产 secret；
- 绕过项目 RBAC/Consent，把 Family/Child 或其他敏感数据提供给未授权项目；
- 将内部函数、源码复制或数据库 view 当作正式 API；
- 无版本、无 owner、无 SLA/错误契约或无法独立回退；
- 用 AI Lab prototype endpoint 直接替代生产服务；
- consumer 以 provider 测试通过为理由跳过自身验收。

## 8. Knowledge Base 共享规则

### 8.1 允许共享

知识内容必须具有：

- owner、来源、版本、更新时间和引用许可；
- 数据分类：PUBLIC / INTERNAL / CONFIDENTIAL / RESTRICTED；
- 明确 consumer、purpose、allowed query/output 和保留期限；
- 内容审核、更新、撤回和失效机制；
- 项目级访问控制、索引隔离和查询审计（敏感场景）；
- AI 输出所需的来源追踪、版本和“不知道/缺数据”行为。

允许共享的典型对象：已批准的公开品牌说明、通用工程标准、经过授权的 Design System 文档或明确许可的领域知识。

### 8.2 禁止共享

- 真实家庭、儿童、顾问、客户、员工或合作伙伴敏感数据；
- 未脱敏日志、聊天、邮箱、用户提交或生产数据库导出；
- 一个项目的 confidential prompt、评分规则、商业策略或安全配置；
- 来源/版权/同意范围不明的文档；
- 将 Family OS 数据导入 AI Lab 训练、评测或演示而没有单独授权、Consent 和安全审查；
- 共享撤回后无法删除索引、缓存或下游副本；
- 把 Knowledge Base 访问权解释为修改源项目数据的权限。

## 9. 跨项目禁止共享清单

无论项目名称或组织归属是否相同，以下对象默认禁止直接共享：

- 业务页面、产品流程、领域规则、AI Prompt、评分逻辑；
- 内部 database schema、migrations、primary keys 和 production fixtures；
- secrets、tokens、passwords、certificates、AppID 私密配置和 sessions；
- 真实用户数据、日志、analytics payload、support records 和 backups；
- 未发布 branches、working tree、build cache、node_modules 和 release artifacts；
- admin 权限、service accounts、cloud project ownership 和生产控制台访问；
- 未批准 Logo、图标、品牌文字、合作伙伴资产和生成式近似图；
- 一个项目的 P0/P1 风险接受、测试 PASS 或发布签字；
- 历史/弃用架构，除非 consumer 的 Active Contract 明确批准。

需要共享时必须把对象转换为第 4–8 节规定的受控、版本化、最小范围契约，而不是复制内部实现。

## 10. 项目识别机制

### 10.1 每次任务开始的四项强制确认

每次任务开始必须先确认并向记录中写入：

1. **Project Name**：使用项目正式名称，不根据目录昵称推断。
2. **Repository**：真实 repository root；如有 remote，记录 remote identity，但不自动配置或 push。
3. **Branch**：当前工作 branch；不得直接修改 `main` / `master`。
4. **Current Version**：来自项目 package/app/config/Changelog 的当前版本，并注明 Release Stage。

还应记录 commit SHA、worktree、适用 `AGENTS.md`、环境和任务目标。

### 10.2 Project Identity Card

```text
Project Name:
Project Key: FAMILY-OS / PHOENIX-WEBSITE / KAIDE / AI-LAB
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

Identity Card 必须来自真实文件和命令，不允许沿用上一任务的项目身份。

### 10.3 识别命令

```text
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short --branch
git remote -v
```

版本必须读取当前项目真实来源，例如 `package.json`、app config、release manifest 或 Changelog。不同来源不一致时写 `VERSION CONFLICT` 并停止发布判断。

### 10.4 Project mismatch Gate

出现以下情况立即停止写入，只做 inspection/report：

- 用户目标写 Phoenix Website，但 cwd/repository 是 Phoenix Family OS；
- Project Name、repository metadata、AGENTS 或 package version 无法一致；
- 目标文件位于 repository root 外或经过 symlink/reparse point 指向其他项目；
- 工作树包含另一个项目的文件或无法解释的批量复制；
- 需要同时修改多个项目但只批准了一个 Project Scope。

不得通过在错误 repository 新建同名目录来“解决” mismatch。

## 11. 跨项目任务协议

当一个目标确实需要两个或更多项目协作时：

1. 指定一个 coordination task，但为每个项目建立独立 Project Identity Card。
2. 为 provider 和每个 consumer 分别建立 Sprint Proposal 与批准记录。
3. 分别建立 checkpoint；不共享 branch 名即可视为同一 checkpoint。
4. 先冻结共享契约/asset/knowledge version，再实施 consumer integration。
5. 每个 repository 分别 commit、test、report 和 rollback。
6. 使用 compatibility matrix 记录 provider version ↔ consumer version。
7. 分别作出 Go/No-Go；任何项目失败不自动回退其他项目，按依赖风险决定。
8. 发布顺序和回退顺序必须在各项目 Release Process 中登记。

跨项目完成定义：所有参与项目都给出独立状态。允许结果为 provider COMPLETE、consumer BLOCKED；不得为追求统一结论伪造全局 PASS。

## 12. 风险控制

### 12.1 防止文件混用

- 每次写入前验证 resolved absolute path 位于目标 repository root 内。
- 不使用 `..`、未解析环境变量、广泛 glob、symlink 或 reparse point 进行跨项目写入。
- 不在 shell 中批量复制另一个 repository 的文件；共享内容使用批准 artifact/version。
- 提交前运行 `git status`、`git diff --name-only` 和 staged file allowlist。
- 报告列出全部修改文件；发现错误项目文件时停止，不覆盖、不删除，先确认所有者和回退方式。

### 12.2 防止产品逻辑混用

- 每个项目只以自身 Active Contract、ADR 和 AGENTS 为实现依据。
- 不因命名、页面相似或共同品牌复制另一个项目的业务规则。
- 跨项目复用只发生在明确的 Design System/API 层，不绕过 domain boundary。
- Prompt、评分、资格、推荐、权限和状态机默认 project-private。
- Code review 必须检查是否出现其他 Project Key、route、model 或 product copy。

### 12.3 防止数据结构混用

- 每个项目独立 schema、migration ledger、ID namespace 和 backup。
- API DTO 与内部数据库模型分离；consumer 使用 adapter，不导入 provider model。
- 禁止复制 migration 或以相同表名推断相同语义。
- 测试 fixture 标记 project/source，使用虚构或脱敏数据。
- 任何跨项目数据流必须有 data contract、purpose、Consent/RBAC/Audit 和 retention。

### 12.4 防止品牌资产混用

- 维护 canonical asset registry、版本、hash、适用项目和品牌批准记录。
- 不根据文件名包含 `phoenix` 推定资产适用。
- 不从截图、旧 build、设计草稿或 AI 生成结果恢复 Logo。
- 每个 consumer release 单独完成品牌签字。
- 发现来源不明时标记 `NEEDS HUMAN REVIEW`，不自动替换。

### 12.5 防止环境与凭据混用

- 项目、环境和角色使用独立 secret/credential；禁止共用 root token。
- 日志、截图和报告不得显示 secret 或真实敏感数据。
- production 操作必须二次核对 Project Name、environment、version 和 approval。
- 测试环境结果不能自动外推到另一个项目或生产环境。

### 12.6 风险等级

| Priority | 跨项目示例 | 处理 |
| --- | --- | --- |
| P0 | 写入错误 repository、跨项目数据污染、secret/身份混用、越权共享 | 立即停止，隔离影响，安全/数据事件处理，阻断发布 |
| P1 | 错误业务逻辑、正式品牌资产、API contract 或 release artifact 混入 | 阻断合入/验收，回退受影响提交，重新验证 |
| P2 | 依赖版本漂移、文档/Design System 不一致、缺少 consumer test | 登记 Owner/解决条件，按 Gate 决定延期 |
| P3 | 可减少重复但尚未形成稳定共享契约 | 只登记，不自动抽取共享模块 |

## 13. 跨项目检查清单

### 开始前

- [ ] Project Name、Repository、Branch、Current Version 已确认。
- [ ] Commit SHA、worktree、AGENTS 和 Release Stage 已记录。
- [ ] 目标只涉及一个项目；如涉及多个，已拆分 Project Scope。
- [ ] Shared resource 的 owner、version、data/brand classification 已确认。
- [ ] 未把另一个项目的规则或测试结果当作本项目证据。

### 修改前

- [ ] Proposal 已按项目分别批准。
- [ ] Checkpoint 已按项目分别建立。
- [ ] Files affected 均解析在正确 repository 内。
- [ ] API/asset/design/knowledge contract 已冻结版本。
- [ ] Secrets、真实数据和 production 权限未跨项目复用。

### 提交前

- [ ] `git diff --name-only` 与 allowlist 一致。
- [ ] 没有其他 Project Key、内部 schema、route 或品牌资产误入。
- [ ] Provider 和 consumer 测试分别执行并记录覆盖范围。
- [ ] Changelog、dependency version、Technical Debt 和 rollback 已按项目更新。
- [ ] 每个项目有独立 commit 和 Sprint Engineering Report。

### 发布前

- [ ] 每个项目独立完成 Testing、Acceptance 和 Release Gate。
- [ ] compatibility matrix 与 deprecation window 已确认。
- [ ] 品牌、数据、安全和产品批准没有跨项目借用。
- [ ] 发布/回退顺序、监控和停止条件已记录。

## 14. 违规处理与回退

发现跨项目混用时：

1. 停止受影响项目的写入、合入和发布。
2. 记录每个 repository 的 branch、SHA、worktree 和受影响文件。
3. 不删除、不覆盖疑似他人文件；先确认所有权和数据影响。
4. 对 secret/数据/权限问题按 P0 事件处理并轮换凭据（如适用）。
5. 使用各 repository 的独立 checkpoint/`git revert` 回退，不使用跨目录 `git reset --hard`。
6. 分别运行各项目的 tests、schema/data reconciliation 和 acceptance。
7. 更新 Incident、Changelog、Technical Debt 和 Preventive Action。

一个项目回退不得覆盖另一个项目的工作树或删除共享 provider 的已发布历史版本。

## 15. Definition of Compliance

一项多项目任务只有在以下条件全部满足时才符合本规范：

1. 每个参与项目的 Project Identity Card 完整且有真实证据。
2. Repository、AGENTS、CHANGELOG 和 Release Process 独立。
3. 跨项目共享对象属于批准类别并具有 owner/version/contract。
4. 文件、产品逻辑、数据结构、品牌和凭据没有未经批准混用。
5. 每个项目有独立 Proposal、checkpoint、commits、tests、report 和 rollback。
6. 所有未运行/阻断项真实标记，没有跨项目借用 PASS。
7. 每个项目独立作出 Release Go/No-Go。
8. 没有未经授权 push、deploy、upload 或生产修改。

## 16. Governance 维护

- 本规范升级必须由 Phoenix Nova™ 项目负责人明确批准并创建新版本。
- 各项目必须在自身 `AGENTS.md` 或工程记忆中引用适用版本，但仍保留项目本地规则。
- 新增项目时先登记正式 Project Name、repository owner 和数据/发布边界，再允许工程实施。
- 新增共享能力时先指定 provider 和版本化契约，不直接把代码移动到“shared”目录。
- 如本规范与法律、安全、品牌或项目 Active Contract 冲突，以更严格要求为准，并停止受影响实施。
