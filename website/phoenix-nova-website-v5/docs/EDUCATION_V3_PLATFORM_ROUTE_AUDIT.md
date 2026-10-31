# Education V3 平台路由与能力审计

审计日期：2026-11-01  
范围：Phoenix Academy／凤启学堂、ASKWISE、约课、学员／导师入口、Family OS 的源码路由、能力开关及可证明的公开状态。  
审计方式：只读检查源码、文档、工作树状态和既有测试证据；未启动服务、未访问网络、未写数据库、未修改源码或 Git。

## 结论

1. **目前没有可证明已经核准并公开的 Academy、ASKWISE、约课、学员或导师网页 URL。** Identity V3 的公开站点只接受 `compass`、`lighthouse`、`services`、`insights`、`oriental`、`about`、`family-center`、`admissions`、`application` 这些 page id（`components/v5-site.tsx:12-22`）。公共目录把 Phoenix Academy、ASKWISE、启明堂、约课系统、学员入口、导师入口都作为无 `path` 的 `待开放 / Not open` 文本渲染，不创建链接（`lib/site-directory.ts:14-19`、`components/site-directory.tsx:22-24`）。既有 Identity V3 复核明确记录这些项目没有核准公开 URL，也不公开运营、教师管理或 Founder Dashboard（`docs/IDENTITY_V3_REVIEW.md:41`）。

2. **Family Center 是受控预览，不是已接通的家庭账户产品。** `/zh|en/family-center` 在客户账户开关打开时要求跳转账户；在关闭时显示账户入口，并明确界面使用虚构家庭（`app/[locale]/family-center/page.tsx:17-24`）。V5 仍是 `ACTIVE CANDIDATE / PRIVATE REVIEW`，候选路由保持 `noindex, nofollow`，并且没有引入 `/academy`、`/blueprint` 或 `/family-portal` 生产别名（`docs/WEBSITE_V5_CANDIDATE_BASELINE.md:3,11-12`）。

3. **Academy 的实际源码是 Family OS 小程序中的本地 Phase 1 壳。** Academy 路由为 `/pages/academy/index`、`/pages/academy/student/index`、`/pages/academy/teacher/index`（`Phoenix Family OS/phoenix-family-os-mvp/app.json:2-20`），服务状态为 `PREVIEW`；课程与排课是 `COMING_CAPABILITY`，教师和学生工作台是 `PREVIEW`，ASKWISE 接驳是 `INVITATION_BASED_ENTRY`，Family OS 摘要是 `PREVIEW`（`services/academy.js:3,6-10`）。学生数据返回的 `tasks` 为空（`services/academy.js:34`）；学生界面把 ASKWISE 任务、凤启学堂课程与复测都标为后续开放（`pages/academy/student/index.wxml:15-18`）；教师界面把真实排课、任务写入、课后卡写入明确留到下一阶段（`pages/academy/teacher/index.wxml:5-6`）。这不能证明存在 live Academy、排课或导师服务。

4. **ASKWISE 是独立的本地学习引擎，当前可证明的是本地 13 日学习循环。** Phase 1 工作树有 Today、Student Task、Task、Evidence、Dashboard、Reflection、Math/Political Map 等 Next App Router 页面，没有 `/advisor`、公开门户或 Family OS 入口；页面元数据明确是 `ASKWISE 13-Day Learning Engine`／`Web MVP`（`src/app/layout.tsx:8-9`）。数据层使用 `better-sqlite3`，初始化单个 pilot 学生 David 和 13 日实验，`STUDENT_ID` 为本地常量（`src/lib/db.ts:1,171-223`）。未发现 `app/api` 或 `pages/api` HTTP 路由，学习交互通过本地 server actions 完成。不能把源码页面或本地数据库当作已上线学生入口。

5. **Compass→ASKWISE 仍是冻结合同和 mock 能力，不是运行中的跨系统接驳。** Education Compass 的合同状态是 `RESERVED`，保留对象的 `network_enabled` 固定为 `false`（`server/src/integrations/askwise/handoff-contract.ts:10-11,69-72,292-294`）；下一步支持模型的 `askwise.enabled` 为 `false`、原因是 `ASKWISE_CAPABILITY_UNAVAILABLE`（`server/src/domain/education-compass/next-support.ts:9-12,70-73`）。ASKWISE 工作树的 `mock-adapter.ts` 使用内存 Map 注册学生／测评映射，没有网络客户端或 HTTP 路由。Education Compass Level 3 也只是 entry reservation，`payment_enabled:false`，不创建订单、问卷、报告、路由、网络请求或自动预约（`server/src/domain/education-compass/level3-reservation.ts:39,100`）。

6. **Family OS 的身份与后端证据仍是本地 demo。** Academy 分支项目配置使用 `touristappid`（`Phoenix Family OS/phoenix-family-os-mvp/project.config.json:18`）；登录服务和当前用户来自本地存储／本地 repository，源码注释要求生产身份由 Core 提供，当前不创建真实教师／学生账户。主根目录较早的 Family OS copy 甚至没有 Academy 页面（其 `app.json` 只有 welcome、home、compass、report、blueprint、timeline、advisor-request 等页面）。Node backend 只允许 loopback，默认 `127.0.0.1`，并明确抛出 `External authentication is not implemented; this backend is Local Demo only`（`Phoenix Family OS/phoenix-family-os-mvp/backend/server.js:9-15,69-80`）。

## 路由与能力矩阵

| 表面／产品 | 源码中的实际入口 | 当前控制与能力 | 公开／核准状态 | 审计判断 |
|---|---|---|---|---|
| Identity V3 公共站点 | `/{locale}`、`/{locale}/compass`、`/{locale}/family-center`、`/{locale}/admissions`、`/{locale}/application` 等候选路由 | 候选站点；noindex/nofollow；Education 页面写明 live assessment entry not connected | Private review；无 Academy、ASKWISE、约课、学员、导师 URL | 可作为叙事入口，不能承诺教学运行能力 |
| Family Center | `/{zh,en}/family-center` | 账户开关／本地预览；关闭时使用虚构家庭 | Controlled preview；不是生产账户或真实家庭数据 | 只能展示受控预览 |
| Phoenix Academy／凤启学堂 | 小程序 `/pages/academy/index` | `ACADEMY_STATUS=PREVIEW`；角色 gate 为本地 `family_user/admin/teacher/student` | 没有网站公开 URL；小程序项目为本地开发源码 | Academy 壳存在，教学服务未开放 |
| Academy 学生 | `/pages/academy/student/index` | `student_workspace=PREVIEW`；`tasks=[]`；ASKWISE 为授权后接入；本地角色 gate | 没有独立学生 URL、生产账户或 Core entitlement 证据 | 学生界面壳，不是 live student portal |
| Academy 教师／导师 | `/pages/academy/teacher/index` | `teacher_workspace=PREVIEW`；本地 roster；显示“需由 Phoenix Core 授权”；课程、任务、课后卡写入未接入 | 没有独立导师 URL、导师账户或排课 API 证据 | 不能对外开放或宣称已可授课 |
| 约课／课程排课 | 没有 `booking`、`schedule` 或独立约课 page；仅 `course_access=COMING_CAPABILITY` | Education Compass Level 3 只有保留式 advisor information/appointment CTA；无自动预约、订单或支付 | 没有公开 URL 或可验证运行实例 | 当前无 live booking capability |
| ASKWISE | 工作树本地页面：`/`、`/student-task`、`/task/[taskId]`、`/evidence`、`/dashboard`、`/reflection`、`/maps/*` | SQLite、本地单 pilot 学生 David；核心循环可由源码验证；无 auth、外部 API、family/student 多租户边界 | 没有公开 URL 或部署证据 | 独立内部／候选产品；不能作为 Academy 已上线模块 |
| Compass→ASKWISE | 无公开跨站路由；Education Compass 合同与 ASKWISE mock adapter | `RESERVED`、`network_enabled:false`、`enabled:false` | 无 runtime data exchange 证据 | 仅契约与 mock，不是接通能力 |
| 启明堂／Qiming Learning | 未发现实际 route、页面或服务入口；网站目录只有无链接的标签 | `待开放 / Not open` | 没有核准 URL | 符合“暂不创建伪链接”；需按 Founder 的“退休独立入口”方向处理命名清理，不应新建链接 |

## 关键证据

### 公开站点与品牌目录

- `website/phoenix-nova-website-v5/components/v5-site.tsx:12-22` 是当前候选站点允许的 page id 白名单；不含 Academy、ASKWISE、Qiming、booking、student 或 tutor。
- `website/phoenix-nova-website-v5/lib/site-directory.ts:14-19` 仍列出六个教育相关名称，但这些对象没有 `path`；`components/site-directory.tsx:22-24` 将其渲染为 pending 文本。
- `website/phoenix-nova-website-v5/docs/IDENTITY_V3_REVIEW.md:41` 已把“无核准 URL、显示待开放、不创建伪链接”写成复核结论；这也是当前没有 fake live link 的直接证据。
- `website/phoenix-nova-website-v5/docs/WEBSITE_V5_CANDIDATE_BASELINE.md:3,11-12,64-80` 把 V5 定为 private review candidate，候选路由保持 noindex/nofollow，且没有生产别名。

### Academy／Education Compass

- Academy Phase 1 源码目录为 `D:/CODEX/PhoenixNova_Worktrees/academy-phase1-shell/Phoenix Family OS/phoenix-family-os-mvp`。该工作树外层没有可用于部署判断的独立 Git 状态；对应主根提交 `bc2ce57 feat(academy): add Family OS teacher and student shells` 只证明 shell 代码曾被提交。
- `services/academy.js:3-10,34,67-70` 是能力目录、空任务和角色能力映射的直接证据；角色 gate 是本地代码，不能当作 Core 授权或生产 RBAC。
- `Phoenix Compass/education compass/README.md:5,90` 明确该目录是可运行、可测试的开发源码，不是已上线产品；没有真实 OpenAI、微信支付、飞书凭据及外部部署证明。
- `Phoenix Family OS/phoenix-family-os-mvp/project.config.json:18` 的 `touristappid` 进一步证明当前小程序不是已核准生产 AppID。
- `server/src/integrations/askwise/handoff-contract.ts:10-11,69-72,292-294`、`server/src/domain/education-compass/next-support.ts:9-12,70-73` 和 `level3-reservation.ts:39,100` 共同证明 ASKWISE 与预约／支付均处于保留或关闭状态。

### ASKWISE

- Phase 1 工作树为 `D:/CODEX/PhoenixNova/_Worktrees/askwise-phase1-core-loop/askwise/askwise-learning-engine`，提交 `91e310f feat(askwise): harden phase1 core learning loop`；工作树仍有未跟踪的本地 `data/` 和 session log，不能视为发布产物。
- `src/app` 路由盘点只有本地学习循环页面；没有 `app/api` 或 `pages/api` 入口。`src/app/student-task/page.tsx` 和 `src/app/task/[taskId]/page.tsx` 使用 server actions 直接写本地数据库。
- `src/lib/db.ts:1,171-223` 说明 SQLite、David 和 13 日实验；表结构按本地 `student_id` 工作，没有 Family OS `family_id`、Core `user_id` 或生产 entitlement 证据。
- `src/lib/compass/mock-adapter.ts:122-246` 是内存映射／mock adapter；不等于 Education Compass 到 ASKWISE 的网络集成。
- 主根 `D:/CODEX/PhoenixNova/askwise` 还有未跟踪的 `src/app/advisor/page.tsx` 和 `src/lib/advisor/*`。该页面是本地 internal advisor case intake，明确只产生内部、需人工确认的评估；它不在 Phase 1 工作树，也没有公开或部署证据，不能纳入公共能力。

## Founder 品牌方向的对照

- **已证实事实：** Academy shell 使用 `PHOENIX ACADEMIC STUDIO`／“凤启学堂”命名；网站目录仍有 `凤启学苑 Phoenix Academy` 和独立的 `启明堂 / Qiming Learning` pending 标签；仓库中未发现 Qiming 的独立 route 或可运行入口。
- **根据 Founder 指令的工作含义：** Academy 应作为唯一教学品牌；ASKWISE 保持独立产品边界；约课、学生、导师入口在有真实能力和核准 URL 前继续关闭。Qiming 当前只剩公共目录中的待开放名称，是否删除、改为历史别名或在内部保留属于主代理需确认的 IA 决策；本审计没有修改它。
- **保护边界：** 不应把本地 Academy 小程序 route、ASKWISE 本地页面、Education Compass reservation 或内部 advisor route 替换成对外 live link；当前网站不创建这些伪链接的做法是正确的。

## 已证实、推断、缺失与未完成项

### 已证实

- 公共网站没有 Academy／ASKWISE／Qiming／约课／学员／导师的核准 URL。
- Family Center 是受控的虚构家庭预览。
- Academy 有本地 student／teacher shell，但能力状态分别为 PREVIEW、COMING_CAPABILITY 或 INVITATION_BASED_ENTRY。
- ASKWISE 有本地 13 日学习循环和 SQLite pilot，但无公开 API、生产 auth 或多学生边界。
- Compass→ASKWISE 为 RESERVED/mock；预约和支付能力关闭。
- 主根、ASKWISE 工作树均存在用户既有脏状态；本次未清理、未回滚、未改写。

### 推断（不作为部署事实）

- 当前证据支持把 Academy／凤启学堂作为未来唯一教学品牌，把 ASKWISE 保持为独立学习产品；这一点是对 Founder 指令和源码边界的映射，不是已完成的产品发布。
- Qiming 没有实现入口，因此“退休独立入口”主要需要清理公共目录命名和未来 IA；本报告不替主代理做删除或别名决策。

### 缺失证据

- 没有经过核准的生产域名、发布记录、可复现线上浏览器证据或生产 AppID。
- 没有 Phoenix Core 的真实 user/member/student mapping、service entitlement、teacher/tutor 账号、RLS/RBAC 或跨系统 consent 运行证据。
- 没有排课、预约、订单、支付、课后卡写入或学生任务写入的生产 API。
- 没有 ASKWISE 与 Education Compass 的真实网络数据交换、Family OS 回写或多家庭隔离证据。

### 重复项／分叉项

- “Phoenix Academy／凤启学堂”在网站目录和 Academy 小程序中都有命名，但当前是同一候选教学品牌的两个表面，不是两个已发布产品。
- Qiming 只在网站目录中作为 pending 名称出现，未发现实际代码入口。
- `Phoenix Family OS/phoenix-family-os-mvp` 主根 copy 与 Academy Phase 1 worktree 内容不同：后者加了 Academy shell，前者仍是较早的 Family OS 页面集；不能把两者合并推断为线上统一版本。
- ASKWISE 主根有未提交的 internal advisor route，Phase 1 worktree 没有；两者均不能证明公共或部署状态。

### 未完成项

- 没有修改任何源文件、数据库、配置或 Git 状态。
- 没有重新运行测试或启动本地服务，以避免在脏工作树中产生构建、数据库或 session 副作用；本报告只引用现有源码与文档证据。
- 没有做网络／生产部署核验；因此所有“公开／已上线”结论仅能按仓库中可见的批准文档和源码状态判定。

