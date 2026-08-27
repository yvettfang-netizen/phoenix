# Phoenix Family OS™ Clean Baseline Reconciliation & UX Review V1.1

> Historical gate snapshot: this report records the state before documentation canonicalization. Its “stop page changes” decision was subsequently resolved by the approved Documentation Canonicalization & UX Unblock V1.0 task. Current status is maintained in `docs/MVP_ACCEPTANCE.md`, `docs/engineering-memory/CHANGELOG.md`, and `docs/MIGRATION_REGISTER.md`.

- 审查日期：2026-08-27（Asia/Shanghai）
- 审查范围：仅 `Phoenix Family OS/phoenix-family-os-mvp`
- 正式远端：`https://github.com/yvettfang-netizen/phoenix.git`
- 结论：**差异 Gate 未通过；停止页面修改；代码修改 0**

## 1. 远端、分支和 HEAD

| 项目 | 实际证据 |
|---|---|
| Remote HEAD / `main` | `c118d176acd8e80881c51ed2a85ce6037d6ae07e` |
| Commit | `feat: complete identity compass rules engine baseline` |
| Family OS 最近提交 | `95c963dac9a9fbe5450db4eba64fc0707b17d42d` — `feat: add phoenix family os mvp codebase` |
| Clean clone 分支 | `main`，跟踪 `origin/main` |
| Ahead / behind | `0 / 0` |
| Clean clone 初始状态 | clean |

`git ls-remote origin HEAD refs/heads/main` 实际返回预期 SHA。首次执行正式远端 `git clone --branch main --single-branch` 时，GitHub 对象传输长期仅约 20 KiB/s；在远端 SHA 已核验的前提下，随后从只读原仓 `D:\CODEX\PhoenixNova` 复制同一 `main` 的 Git 对象完成新 clone，并再次核对 SHA。新 clone 的 `origin` 始终保持为正式 GitHub URL，原仓没有发生写入。

最近历史：

```text
c118d17 feat: complete identity compass rules engine baseline
95c963d feat: add phoenix family os mvp codebase
9041338 feat: add identity compass codebase
edcdf67 chore: clean local caches from phoenix workspace
2813013 chore: keep phoenix website as independent repository
6815343 chore: initialize phoenix code workspace
```

## 2. Clean clone 状态与原工作区保护

- Clean clone：`D:\CODEX\PhoenixNova_Clean_20260827`
- Family OS clean baseline：`D:\CODEX\PhoenixNova_Clean_20260827\Phoenix Family OS\phoenix-family-os-mvp`
- 原仓只读来源：`D:\CODEX\PhoenixNova`
- 原仓实际状态：18 个已修改项、450 个未跟踪项，共 468 项。
- 原 Family OS 子目录：0 个 tracked 修改、37 个未跟踪文件。
- 原目录中的 `.git.backup`、`node_modules`、37 个未跟踪文件及总仓其他项目均未删除、移动、覆盖、暂存或提交。

说明：原目录与 clean clone 的 106 个文本文件原始 SHA-256 不同，但差异全部来自 LF/CRLF 检出格式；统一换行后，clean clone 的 110 个远端文件与原目录 **110/110 内容一致**，语义差异为 0。四个品牌 PNG 原始哈希也一致。

## 3. 37 个 Family OS 本地独有文件分类

分类汇总：

| 类别 | 数量 | 结论 |
|---|---:|---|
| 1. 远端已存在且内容相同 | 110 | 规范化换行后全部相同 |
| 2. 远端已存在但本地修改 | 0 | 无语义修改；只有换行格式差异 |
| 3. 本地独有源码、配置或产品/工程文件 | 21 | **存在重要资料，触发停止修改 Gate** |
| 4. 报告、截图、日志或生成文件 | 16 | 14 份报告 + 2 份 preview 证据 |
| 5. 缓存、构建或临时项 | 2 个忽略目录 | `.git.backup/`、`node_modules/`；不属于 37 项 |
| 6. 可能包含凭据或敏感信息 | 0 | 37 项文件名与常见凭据模式扫描无命中；未输出内容 |

### 3.1 本地独有的重要文件（Category 3）

| 相对路径 | 状态 | 简要差异 | 建议 |
|---|---|---|---|
| `AGENTS.md` | LOCAL_ONLY | Active 工程治理规则 | 保留；作为首批治理资料审阅并合并 |
| `README.md` | LOCAL_ONLY | Family OS 项目说明与运行边界 | 保留；与远端代码现状校准后合并 |
| `backend/README.md` | LOCAL_ONLY | 本地问卷代理说明 | 保留；与当前 loopback backend 一起审阅 |
| `docs/ARCHITECTURE.md` | LOCAL_ONLY | 当前架构说明 | 保留并合并 |
| `docs/DATA_SCHEMA.md` | LOCAL_ONLY | 数据实体与字段说明 | 保留；先与代码 schema 对账 |
| `docs/MVP_ACCEPTANCE.md` | LOCAL_ONLY | MVP 验收边界 | 保留并合并 |
| `docs/architecture/ADR-001-CONTROLLED-QUESTIONNAIRE-BACKEND-PROXY.md` | LOCAL_ONLY | 问卷后端代理 ADR | 保留并合并 |
| `docs/engineering-memory/ARCHITECTURE_MEMORY.md` | LOCAL_ONLY | 架构记忆 | 保留；去重后合并 |
| `docs/engineering-memory/CHANGELOG.md` | LOCAL_ONLY | 工程变更记录 | 保留；与 Git 历史对账 |
| `docs/engineering-memory/CHANGE_MANAGEMENT_RULES.md` | LOCAL_ONLY | 变更治理规则 | 保留并审阅 |
| `docs/engineering-memory/ENGINEERING_DECISION_LOG.md` | LOCAL_ONLY | 工程决策记录 | 保留并审阅 |
| `docs/engineering-memory/ENGINEERING_MEMORY_SETUP_REPORT_V1.0.md` | LOCAL_ONLY | 工程记忆建立记录 | 保留；可归档到治理证据区 |
| `docs/engineering-memory/PHOENIX_ENGINEERING_COMMUNICATION_PROTOCOL_V1.0.md` | LOCAL_ONLY | 沟通协议 | 保留并审阅 |
| `docs/engineering-memory/PHOENIX_ENGINEERING_MAINTENANCE_SYSTEM_REPORT_V1.0.md` | LOCAL_ONLY | 维护体系说明 | 保留并审阅 |
| `docs/engineering-memory/PHOENIX_MULTI_PROJECT_ENGINEERING_GOVERNANCE_V1.0.md` | LOCAL_ONLY | 旧治理版本 | 保留历史；归档，不作为最新 Active 版本 |
| `docs/engineering-memory/PHOENIX_MULTI_PROJECT_ENGINEERING_GOVERNANCE_V1.1.md` | LOCAL_ONLY | 新治理版本 | 保留；与 V1.0 明确版本关系后合并 |
| `docs/engineering-memory/PHOENIX_SPRINT_EXECUTION_PROTOCOL_V1.0.md` | LOCAL_ONLY | Sprint 协议 | 保留并审阅 |
| `docs/engineering-memory/PROJECT_CONTEXT.md` | LOCAL_ONLY | 项目上下文 | 优先保留并校准当前产品基线 |
| `docs/engineering-memory/PROJECT_MAINTENANCE_PLAN.md` | LOCAL_ONLY | 维护计划 | 保留并审阅 |
| `docs/engineering-memory/RELEASE_PROCESS.md` | LOCAL_ONLY | 发布流程 | 保留；标明当前 NO-GO 边界 |
| `docs/engineering-memory/TECHNICAL_DEBT_REGISTER.md` | LOCAL_ONLY | 技术债清单 | 保留并审阅 |

### 3.2 报告与证据文件（Category 4）

| 相对路径 | 状态 | 简要差异 | 建议 |
|---|---|---|---|
| `docs/codex-audit/ACCEPTANCE_TEST_PLAN_V1.0.md` | LOCAL_ONLY | 验收计划 | 归档保留；提交前复核时效 |
| `docs/codex-audit/CURRENT_BASELINE.md` | LOCAL_ONLY | 当前基线 | 保留；先确认是否仍为 Active |
| `docs/codex-audit/DEVELOPMENT_READINESS_REPORT_V1.0.md` | LOCAL_ONLY | 开发准备报告 | 归档保留 |
| `docs/codex-audit/ENGINEERING_AUDIT_REPORT_V1.0.md` | LOCAL_ONLY | 工程审计 | 归档保留 |
| `docs/codex-audit/ENGINEERING_HANDOVER_REPORT_V0.1.md` | LOCAL_ONLY | 工程交接 | 归档保留 |
| `docs/codex-audit/FAMILY_GROWTH_CORE_ENGINEERING_INSPECTION_V1.0.md` | LOCAL_ONLY | Growth Core 检查 | 归档保留 |
| `docs/codex-audit/Family_Growth_Core_Repo_Evidence_Audit_2026-08-17.md` | LOCAL_ONLY | 仓库证据审计 | 归档保留 |
| `docs/codex-audit/QUESTIONNAIRE_BACKEND_ENGINEERING_REPORT_V1.0.md` | LOCAL_ONLY | Backend 工程报告 | 归档保留 |
| `docs/codex-audit/SPRINT_1_ENGINEERING_REPORT_V1.0.md` | LOCAL_ONLY | Sprint 1 报告 | 归档保留 |
| `docs/codex-audit/SPRINT_1_PLAN.md` | LOCAL_ONLY | Sprint 1 计划 | 归档保留 |
| `docs/codex-audit/SPRINT_2_READINESS_CONFIRMATION_V1.0.md` | LOCAL_ONLY | Sprint 2 准备确认 | 归档保留 |
| `docs/codex-audit/SPRINT_2_TASK_1_ENGINEERING_REPORT_V1.0.md` | LOCAL_ONLY | Sprint 2 Task 1 报告 | 归档保留 |
| `docs/codex-audit/SPRINT_2_TASK_2_ENGINEERING_REPORT_V1.0.md` | LOCAL_ONLY | Sprint 2 Task 2 报告 | 归档保留 |
| `docs/codex-audit/SPRINT_2_TASK_3_WECHAT_ACCEPTANCE_REPORT_V1.0.md` | LOCAL_ONLY | 微信验收报告 | 归档保留；不能替代本机平台实测 |
| `docs/preview/partner-experience.html` | LOCAL_ONLY | Partner preview 生成页面 | 从运行时代码分离；归档或忽略，不直接合入 MVP |
| `docs/preview/partner-experience.png` | LOCAL_ONLY | Partner preview 截图 | 作为证据归档，不进入小程序包 |

### 3.3 建议合并顺序

1. 先审阅 `AGENTS.md`、`PROJECT_CONTEXT.md`、`CURRENT_BASELINE.md`，锁定唯一 Active Contract。
2. 再对账 `ARCHITECTURE.md`、`DATA_SCHEMA.md`、ADR、验收标准与 backend README。
3. 再整理 decision log、changelog、technical debt、release/maintenance/sprint rules；旧版本只归档。
4. 最后归档 audit reports 与 preview 证据，不把 preview 重新放入家庭端运行范围。

因此，本轮没有创建 `codex/family-os-ui-content-convergence-v0.2`，也没有进行页面代码修改。

## 4. 当前页面与功能清单

项目为原生微信小程序（`compileType: miniprogram`），基础库 `3.7.12`，AppID 为 `touristappid`，属于 Demo 环境。不存在 Web Portal。

| 路由 | 当前实际能力 | 判定 |
|---|---|---|
| `pages/welcome/index` | 调用 `wx.login`，但使用固定本地家庭身份；同时公开内部 Advisor 演示入口 | Demo |
| `pages/home/index` | 家庭概览、孩子状态、规则洞察、下一步、Compass、顾问及 Partner Preview 入口 | Partial |
| `pages/family-edit/index` | 创建/更新家庭档案，保存到 `wx` 本地存储 | Usable（Local Demo） |
| `pages/student-edit/index` | 创建/更新孩子档案并进入 Compass | Usable（Local Demo） |
| `pages/compass/index` | Compass 说明、历史报告、问卷入口 | Usable（Local Demo） |
| `pages/compass-questionnaire/index` | 四阶段 Education Compass；本地保存并向 loopback backend 排队同步 | Partial |
| `pages/report/index` | 展示确定性本地规则生成的成长洞察 | Demo；文案有 AI 误导 |
| `pages/timeline/index` | 本地家庭事件时间线 | Usable（Local Demo） |
| `pages/advisor-request/index` | 本地保存顾问联系请求并写时间线 | Demo |
| `pages/mine/index` | 家庭资料入口、孩子、顾问、退出 Demo 身份 | Partial |
| `pages/admin-families/index` | 本地家庭列表与搜索 | Demo；无可信服务端 RBAC |
| `pages/admin-family/index` | 本地家庭详情、请求、备注、状态与时间线 | Demo；无可信服务端 RBAC |
| `pages/partner/yuanchao/index` | Partner 体验预览 | Demo / 非当前 P0 |
| `pages/partner/music-exploration/index` | 本地规则探索并保存到家庭档案 | Demo / 非当前 P0 |
| `pages/partner/apply/index` | 本地申请表及 consent checkbox | Demo / 非当前 P0 |

P0 现实状态：

| 模块 | 当前状态 | 证据与边界 |
|---|---|---|
| Family Account | Demo | `services/auth.js` 调用 `wx.login` 后仍固定为 `local_family_user`；没有可信服务端 code exchange |
| Family Profile | Usable（Local Demo） | `family-edit` + `services/repository.js` + `wx.setStorageSync` |
| Family Assessment / Compass | Partial | 页面、规则报告和问卷同步存在；后端只在 `127.0.0.1:8787`，认证为 `local_demo` |
| Growth Blueprint | Not Implemented | 无 route、模型或持久化实体；当前也没有制造假入口 |
| Family Timeline | Usable（Local Demo） | 本地 `timelineEvents` 持久化；无生产同步 |
| Reminder | Not Implemented | 无 route、实体、调度或通知能力 |
| Family Support / NOVA | Not Implemented | `services/ai-provider.js` 明确为 `local_rules`；没有 NOVA 对话、检索或模型调用 |
| Advisor Dashboard | Demo | 两个 admin route + 本地 seeded admin；没有服务端分配、授权和审计权限体系 |
| ASKWISE 接入 | Not Implemented | 无 route、API 或数据契约；当前没有假连接 |

## 5. 版面、文案与导航问题

### P0 / 发布阻断

- `pages/welcome/index.wxml` 向家庭用户直接显示“Phoenix Advisor 内部入口”；`pages/admin-*` 依赖客户端角色 guard 和本地 seeded admin，家庭端与内部端没有可信服务端隔离。
- `project.config.json` 仍为 `touristappid`；没有受控非生产 AppID 的实际导入和编译证据。
- 登录、Family Profile、Child Profile、报告、Timeline、Advisor 请求主要保存在本机 `wx` storage；loopback SQLite 只接收 Education Compass 问卷，不构成生产数据层。
- 没有完整 consent、access/export/deletion/audit 生命周期，也没有真实家庭/未成年人数据接入条件。

### P1 / UX 与真实性

- 首页先显示 `LATEST AI INSIGHT`，之后才显示“下一步”，不符合“家庭概览 → 当前唯一下一步 → Growth Snapshot”的层级。
- `pages/home/index.wxml` 的 `LATEST AI INSIGHT`、`pages/report/index.wxml` 的 `AI / INSIGHT`、`pages/timeline/index.js` 的“AI 成长洞察”与 `PROVIDER_MODE = local_rules` 冲突；应统一为“成长洞察/规则辅助洞察”，并说明不替代顾问判断。
- 首页公开 `PARTNER EXPERIENCE / 联合成长计划`，而本轮 P0 闭环不包含 Partner Marketplace；应从家庭首页主信息层移除或隔离为内部预览。
- Growth Blueprint 和 Reminder 尚未实现。当前没有假页面，这是正确边界，但核心闭环仍不完整。
- Education Compass 当前在 Family OS 内自带完整问卷与规则报告；没有发现与独立 Compass 的正式 API、状态或报告契约。后续必须先锁定单一数据契约，避免形成第二套冲突体系。
- `ASKWISE` 没有接口、路由或数据契约；保持 Integration Gap，不应创建假入口。

### P2 / 品牌与移动端

- `app.wxss` 已定义 Phoenix Navy `#0D1B2A`、Phoenix Gold `#C8A24A` 和 Ivory `#F8F3EA`，四个现有品牌 PNG 在原目录与 clean clone 哈希一致。
- `app.json` tab 选中色仍为 `#B78A37`，部分页面也使用该旧金色；需要品牌批准后统一。
- 没有找到任务指定的单一原始文件 `Phoenix Nova Official Logo System V1.0.png`，因此不能证明四个导出 PNG 的官方来源，也不能进入 Logo 调整。
- 多处英文 eyebrow 可作为辅助，但 `LATEST AI INSIGHT`、`PARTNER EXPERIENCE` 等承担了过重的信息表达。
- 代码具备 `safe-area-inset-bottom`、状态栏、微信胶囊安全宽度及固定问卷按钮的适配逻辑；但没有 375/390/393/430px 模拟器截图，不能据此认定移动端验收通过。

## 6. Compass / ASKWISE / Growth Blueprint / NOVA 关系

- **Education Compass**：当前是 Family OS 内的本地诊断入口、问卷和规则报告生成器；可完成 Demo 闭环，但没有跨产品数据契约证据。
- **Growth Blueprint**：不存在 route、schema 或生成器，不得宣传为已完成。
- **ASKWISE**：无实现；正确动作是记录接口 Gap，不创建重复家庭档案。
- **NOVA｜凤启家庭助手**：无真实 AI 模型、对话、知识检索、prompt/model/version 记录、写入预览或 Advisor Handoff。当前规则引擎不得作为 NOVA 或真实 AI 宣传。

## 7. 数据与服务端现实边界

- 小程序主数据库：`wx` 本地存储键 `PFS_DB_V01`。
- 本地实体：users、families、students、assessments、reports、timelineEvents、advisorNotes、advisorRequests、partnerExplorations、partnerApplications、analyticsEvents、partners、permissions。
- Backend proxy：Node `http` + `node:sqlite`，固定 `http://127.0.0.1:8787`；只实现 demo session、健康检查与 Education questionnaire submission。
- Backend SQLite 包含 users、demo_sessions、families、students、questionnaire_submissions、audit_log，并对问卷写入进行 ownership、幂等、校验、事务回滚与脱敏 audit 测试。
- 该 backend 不是生产认证、不是远程环境，也没有把 Family Profile、reports、timeline、advisor data 统一持久化。
- 测试只使用 synthetic fixtures；本轮没有读取或连接真实家庭数据。

## 8. 实际修改文件

- 业务代码：**0**。
- 配置：**0**。
- 测试：**0**。
- 资产：**0**。
- 新增文档：`docs/codex-audit/FAMILY_OS_CLEAN_BASELINE_RECONCILIATION_AND_UX_REVIEW_V1.1.md`（本报告）。
- 分支：未创建 convergence 分支；因为差异 Gate 未通过。
- Commit / Push / Merge / 发布 / 微信审核：均未执行。

## 9. 测试命令与真实结果

| 命令/检查 | Exit | 结果 | 证据边界 |
|---|---:|---|---|
| `pnpm test` | 0 | 通过 | 运行全部现有 Node 测试：domain flow、Partner demo、Sprint 1 regression、用户入口、写入安全、backend API/SQLite、同步队列、E2E、静态项目校验 |
| `pnpm typecheck` | 0 | 通过 | `tsc --noEmit` |
| `pnpm build` | 0 | 通过 | 仅 `node tests/validate-project.js`；验证 15 routes、JSON/JS 语法、资源/模型与打包排除项，不是微信编译 |
| `pnpm lint` | 1 | NOT CONFIGURED | `lint` command not found，不得写通过 |
| 微信开发者工具 CLI/安装检查 | — | BLOCKED | 常见 CLI 路径 0，卸载注册表项 0 |
| 微信真实导入/编译 | — | BLOCKED | 未发现微信开发者工具 |
| 375/390/393/430px 模拟器 | — | BLOCKED | 无平台模拟器可用 |
| iPhone/Android 真机 | — | NOT RUN | 本轮没有设备会话 |
| 截图证据 | — | NOT AVAILABLE | 无真实平台运行，未生成截图 |

环境说明：`pnpm test` 启动时，pnpm 自动从本机内容寻址缓存将锁文件中既有的 TypeScript 5.9.3 硬链接到 clean clone（下载 0、未新增依赖版本）。测试后已验证并删除 clean clone 内该临时 `node_modules`；tracked 工作树恢复 clean。

## 10. 发布与使用判断

| 目标 | 判断 | 理由 |
|---|---|---|
| Internal Demo | **CONDITIONAL GO** | Node 测试、typecheck、静态 validator 均成功；核心本地演示流存在。但需明确 touristappid、本地规则洞察、内部权限和无微信实测边界 |
| 微信审核 | **NO-GO** | touristappid；无微信开发者工具真实编译、模拟器/真机证据；内部 Advisor 入口与 AI 误导文案仍存在 |
| 真实家庭接入 | **NO-GO** | 固定本地身份、主数据仅本机、loopback demo backend、服务端 RBAC/consent/export/deletion/audit 生命周期不完整 |
| Public RC | **NO-GO** | P0 闭环缺 Growth Blueprint、Reminder、NOVA，且权限和真实性问题未收口 |
| Production | **NO-GO** | 不具备生产认证、统一数据层、隐私权限控制、平台验收或生产环境配置 |

## 11. Gate 与回退状态

- 是否发现未上传 GitHub 的重要 Family OS 文件：**是，21 份**。
- 是否安全进入页面修改：**否**。
- 本轮是否实际修改代码：**否，代码修改 0**。
- 是否创建回滚副本并覆盖原 Family OS：**否**；未发生原目录修改，因此无需恢复，也没有可安全删除的“旧 Family OS”。
- Clean clone 作为本次审查副本保留；在 21 份重要文件完成 canonical 决策前，不删除、不覆盖原目录。

## 12. 唯一下一步动作

**由项目负责人先对 21 份本地独有工程/架构/治理文件完成一次 canonical 文档审阅，按第 3.3 节顺序决定“合并或归档”，形成可提交到正式远端的唯一文档基线；完成前不要启动 UX 代码收口。**
