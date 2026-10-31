# Education Compass 审计（Education V3 + Founder addendum）

**审计日期：** 2026-11-01  
**范围：** 只读核验本次开发前的官网 V5/V3 页面、D:\ec Education Compass 工作副本、主工作区及 recovery/identity-page-v3 worktree。未修改被审计源码、Git 或数据库。本报告描述原有问卷；新增的 Education 服务介绍页见 `EDUCATION_V3_REVIEW.md`。

## 结论先行

当前官网不能安全链接到 Education Compass 正式问卷。V5 的真实教育入口是 `/{locale}/compass#education` 说明锚点；教育卡片明确显示“正式测评入口待接通 / Live assessment entry not connected”，行动按钮只到 `/{locale}/admissions`。没有发现 Education 专用网站 feature flag、获准公开问卷 URL 或 Web→小程序授权/结果回传契约。

D:\ec 的实现是私有微信小程序 + 受保护服务端的 V0.5.0 开发源码。原生问卷实际页面是 `pages/compass-questionnaire/index`，服务端路由在 `/v1/...` 下，依赖 Bearer 会话、家庭/学生归属和监护人/学生专项同意。它是**已实现代码**，不是**已批准公开入口**。

Web 目录中的 `/assessment` → `/api/growth-snapshot` 是无登录、无数据库的 Free Growth Snapshot（sessionStorage 保存草稿/结果），不等于原生 6 步 23 题 Education Compass，不能作为官网正式问卷链接。

## 1. 入口、网站状态与 gate

| 对象 | 实际路径/状态 | 审计判定 |
|---|---|---|
| V5 官网 | `/{locale}/compass#education`；教育卡片显示“正式测评入口待接通”，教育行动按钮去 `/{locale}/admissions` | 已实现说明页；公开问卷不可用 |
| V5 文件 | `components/v5-site.tsx` SHA256 `F952D1752FFD9E1AADC7B42CB113268950E5E3213A03EB637163696EF15A0D56`；`lib/family-demo.ts` SHA256 `095BE9DF7EF624A766F7B975A3F9BC3AAA4F20314E025CA3CEE4A96DFF3CAE31` | 无教育问卷 flag；健康另有 `HEALTH_COMPASS_PREVIEW`，不能外推到 Education |
| V5 候选 | `WEBSITE_V5_CANDIDATE_BASELINE.md` 标注 ACTIVE CANDIDATE / PRIVATE REVIEW、noindex/nofollow、生产影响 NONE；框架文档只说明“已确认业务入口才可启用” | Founder 框架批准不等于 Education 问卷上线批准 |
| V3 Founder 静态页 | `education.html` 为 `noindex,nofollow`、`V3.0 视觉提案 · 待 Founder 验收`；Education Compass 的 `data-route="/compass#education"` 仅由 `interactions.js` 打开源码路径说明模态框 | 审查稿，不是业务入口 |
| V3 咨询按钮 | `interactions.js` 只显示本地 demo；明确“不收集/不发送/不保存”，没有 POST、cookie、localStorage 或 sessionStorage | 不可作为咨询 handoff |
| D:\ec 原生小程序 | `app.json` 注册 16 页（release 排除 2 个 demo 管理页后为 14 页）；相关页：`pages/compass/index`、`pages/compass-questionnaire/index`、`pages/compass-preview/index`、`pages/report/index` 等 | 代码实现；未证明公开部署 |
| D:\ec Web 小应用 | `/`、`/assessment`、`/result`、`POST /api/growth-snapshot` | 独立 Free Growth Snapshot；不能冒充原生 Compass |

因此 V3 页面保留评估“待接通”状态是有证据支持的决定。当前获批的 `/{locale}/education` 是服务介绍页面，不是新问卷。不得新增问卷别名、`/assessment` 跳转或未经核准的小程序深链，除非有正式公开 URL、认证、同意、回传和发布批准证据。

## 2. 权威边界与版本

- 原生问卷审计源为 `D:\ec\Phoenix Compass\education compass`。主代理复核其所属 worktree 根为 `D:/ec`，HEAD `6db8db05be630dbd56048c56b3b3741c97b6f101`，tracked 状态干净；GitHub `codex/education-founder-final-alignment` 当前 HEAD 与此完全一致。这证明源码分支位置，不构成公开发布或版本审批证明。
- 根目录 `Phoenix Compass/education compass` 有未提交变更和新增文件，不能覆盖 D:\ec 权威题库结论；`_Worktrees/education-502-recovery` 是较早 recovery 快照，缺少当前 `pathway-fit.ts`；`_Worktrees/identity-page-v3` 只用于核验网站。
- D:\ec `package.json` 版本 `0.5.0`，SHA256 `F1E249064F0E5F6C5064C9ACD3DFE5B1F5E8041964ECE537E6EB8CE68F0D6CC1`；README SHA256 `F19263A58967DCA334A5BCFAA8F7B096EA7C444AAEB54A5FA29DF9FE6B915388D`。README 明确写明是可运行/可测试开发源码，不是可直接上传的正式包或已上线产品。

## 3. 题库、选项顺序、规则与不可变 hash

### 3.1 注册表与冻结文件

`server/src/domain/education-compass/registry.ts` SHA256 `F6142F9565986B994078EB6732100E0F4B89C72CF040B0C2193C21885EC8DB68`，采用 CRLF→LF 后 canonical SHA 校验，失败即拒绝加载：

| 文件 | 版本/用途 | raw 文件 SHA256 | registry canonical SHA256 |
|---|---|---|---|
| `docs/product/freeze/education-compass-v1-rc1/QUESTION_BANKS_V1_RC1.json` | base `education_compass_question_banks_v1.0.0-rc1` | `B737119A948680242079D3EE16FA023943C50600A2A4767DC082E79BAEA0EEF6` | `EFAE34EE595FC5E4A2FE8B6C5B89B1F182625BF15518620AC475320E4FD978F9` |
| `docs/product/freeze/education-compass-v1-rc1/TAXONOMY_REGISTRY_V1_RC1.json` | taxonomy `education_compass_taxonomy_v1.0.0-rc1` | `D6DED639DADE57AFFDBDF111B60D1B17CA117D75EA56ED02AB01385BA4B1461` | `53691402AA191489317E013CFC5BBE121339301EECFD43F7C6430415B11E2231` |
| `docs/product/freeze/education-compass-v1.1/QUESTION_BANK_UPDATE_V1_1.json` | current freeze candidate `education_compass_question_banks_v1.1.0` | `024E424D05F46B79C9CFBB907F6947A8D8F67EA9E951EF7416200B9F92B3B52B` | `1E92841D2BACDD3ADC4086A68AD2749997ADBD07CC78FC810A02321765D17271` |

V1.1 是 copy-only overlay：Level 1 `free_parent_compass_v1.1.0`、Level 2 common `education_growth_discovery_v1.1.0`，题号、顺序和校验规则沿用 base；presentation metadata 不进入 schemaDigest。

### 3.2 冻结题号/顺序

- Level 1 base：`FP01, FP02, FP03, FP04, FP05, FP06, FP07, FP08`，均为家长必答。涵盖阶段、教育体系、家庭关注点（最多 3）、优势（最多 2，`NOT_CLEAR` 互斥）、困难（最多 2，`UNSURE` 互斥）、孩子意愿、未来 1–3 年重点（最多 2，`UNSURE` 互斥）、希望的下一步支持。
- Level 2 common：`EGD01`–`EGD19`（`EGD19` 可选），包含学生本人确认、阶段、教育体系、当前/目标年份、地区、学习改善、表现、学科强弱、任务启动、记忆、规划、错误、学习方式、兴趣、持续活动、约束、下一步和 pathway target。
- 正式系统分支：GAOKAO `GK01`–`GK05`；DSE `DSE01`–`DSE04`；IGCSE `IG01`–`IG03`；A-LEVEL `AL01`–`AL04`；AP_US `AP01`–`AP05`。IB/OTHER 没有系统题，标记 `SYSTEM_BANK_PENDING`。所有系统题 digest/marker 已由 `server/tests/education-contracts.test.ts` 固定；该测试 SHA256 `122E00D91DBECA6D95A644EE99F30B3EC7A0A1BA4A4A93AF0B7C1F83565AC28C`。
- 全局规则：答案使用 code；无数字评分、无精确分数门槛、无文件上传、无自由文本；提示不得提交姓名、电话、证件、地址或医疗信息；切换教育体系保留 common answers、移除旧分支并记录 `SYSTEM_ROUTE_CHANGED`。

### 3.3 当前默认 Level 1 实际不是 freeze JSON

`server/src/domain/education-compass/pathway-fit.ts` SHA256 `3DB7CC10DFC94CEDBF0FFFA95E941C8D1A2C4A8F87D9FCD2C19FA97D1B0F26F` 定义当前默认 `education_pathway_fit_free_v1.2.0`：

`PF01` 阶段 → `PF02` 教育体系 → `PF03` 学习状态 → `PF04` 独立/适应 → `PF05` 目标地区 → 条件题 `PF05A` 香港身份（仅 `PF05=HONG_KONG|MULTI_REGION`）→ `PF06` 当前最想先得到的答案。全部 `scored:false`；规则输出 `PRIORITY_EXPLORE`、`CONTINUE_EVALUATING`、`CONDITIONS_INSUFFICIENT` 或 `NOT_PRIORITY_NOW`，不是数值分数、诊断或录取预测。

`server/src/domain/education-compass/contracts.ts` SHA256 `7BB2EDB768934AE3605FEF5C3FD948710CE55D4ACE4B98F48E0668E9EBAAADC6` 定义：

- contract `education_compass_contract_v1.2.0`；默认 Level 1 `education_pathway_fit_free_v1.2.0`；历史 Level 1 `free_parent_compass_v1.1.0`/`v1.0.0-rc1`。
- Level 2 当前 `education_growth_discovery_v1.1.0`，历史 `v1.0.0-rc1`。
- result/rules：`education_pathway_signal_v1.2.0`、`education_pathway_fit_rules_v1.2.0`、`family_education_snapshot_v1.0.0`、`student_growth_discovery_report_v1.0.0`/`v1.2.0`。

## 4. 结果引擎与数据保存

- 原生服务：`server/src/services/education-compass-service.ts` SHA256 `5E9A90E9B42D841A94E9444BDA4F198CDC52BC5F80FF380684AEAB16F5DAD2A8`。Level 1 提交构建家庭教育摘要；Level 2 提交构建学生成长发现报告。Level 2 报告在付费 entitlement `ACTIVE` 且报告 `READY/DELIVERED` 前返回 locked 状态；免费摘要可直接返回。提交记录题库版本、schema digest、规则/结果版本、同意 grant、source assessment 和 report lineage。
- 结果构建：`server/src/domain/education-compass/result-builder.ts` SHA256 `1D233D963F74A3551CA42D25F9284E59743E94690806488E6E90AD86171E09C6`；当前 PF 规则在 `pathway-fit.ts` 内。结果包含 disclaimer，禁止宣称诊断、录取、签证或资格等结论。
- Web Free Growth Snapshot：`src/app/assessment/page.tsx`、`src/app/result/page.tsx`、`src/app/api/growth-snapshot/route.ts`，版本 `free-mvp-v1.0`/`growth-snapshot-v1.0`。API 仅校验 JSON、尝试 OpenAI、失败则 deterministic fallback，返回 `generation_status=ai|fallback`；无登录、无服务端持久化、无正式 Compass lineage。
- Native demo/local 默认走本地隔离存储/模拟流程；release 强制 remote。`config/runtime.js` 的 `API_BASE_URL` 当前为空、开发默认 demo，remote 模式缺少 HTTPS API 会 fail closed。

## 5. API、认证、同意、持久化与 ID

服务端 `server/src/http/app.ts` SHA256 `2B6FCEC2C904D42F850DB2449E4710709FD46F216CF5466397F354CD9F41CDCE`：

- 认证：非 demo 先 `wx.login`，POST `/v1/auth/wechat/session` 获取 Bearer token；除 `/health`、登录、注销和支付 webhook 外，业务路由均要求 `Authorization: Bearer`。会话 token 哈希存储、7 天过期、可撤销。
- 教育 API：`GET /v1/me/education-compass/state`；`GET /v1/education-compass/questionnaires/:version?educationSystem=...`；`GET /v1/education-compass/products/growth-discovery`；`POST /v1/education-compass/free-parent-assessments`（要求 `Idempotency-Key`）；`POST /v1/students/:studentId/education-assessments`；`GET/PUT /v1/assessments/:id/draft`；`POST /v1/assessments/:id/submit`；`GET /v1/assessments/:id/preview|result`；订单、报告与撤回同一鉴权边界。教育服务未注入时返回 `503 EDUCATION_COMPASS_V05_DISABLED`。
- 同意：Guardian core consent 与 Level 2 student assent 分开；同意 API 为 `PUT /v1/me/integration-consents/...` 与 `DELETE /v1/me/education-compass/consents/:studentId/{CORE_ASSESSMENT|STUDENT_ASSESSMENT_ASSENT}`。撤回会 revoke grant、fence agent access、写 audit/timeline，并取消相关 pending advisor requests。
- DB model：`server/src/domain/model.ts` SHA256 `01724D1E153FC8B03666A79C12D66E5048FFE5C817E88619E069FF77A78AEF6D`；迁移 `001_initial_schema.sql` SHA256 `FF8DDFB...`（完整值见原文件 hash 记录：`FF8DDFB2C1D9674EC1E8BC0C88F084472A01A11E89D67FC3A1176B02AD95D1EF`），`005_education_compass_levels.sql` SHA256 `814FA9382403CD1E30941FB74A9DA2F1C5C6646D347EA0A4E00AEFB6A0BFC324`。实际实体是 `users → families → students → assessments → reports`，并有 `consent_grants`、`orders`、`entitlements`、`advisor_requests`、`idempotency_records`；没有 `member_id` 表/字段。结果合同里的 `family_id/student_id/assessment_id/report_id` 是输出字段名，不能据此假定另一个系统的 canonical ID。
- 原生页面/服务使用 camelCase `userId/familyId/studentId/assessmentId/reportId`；只有 SQL/结果 DTO 出现 snake_case。V5 规划文档中提到的 Member/`identity_subject_member_id` 属于另一个候选身份域，不能映射成 Education `student_id`。

## 6. 咨询与 Askwise handoff

- 正式顾问申请 API 为 `POST /v1/advisor-requests`，需要家庭/学生/报告归属、`advisor_contact_opt_in_v1.0.0-rc1` 同意和 `guardianAuthorityConfirmed`；服务端保存 `userId/familyId/studentId/reportId/assessmentId/intent/status`，并写 timeline。相关 `profile-service.ts` SHA256 `700946497B38A2E6794B1987A479F53839C5FF5D72E19A75ECC926C7D35EA379`。
- Askwise `server/src/integrations/askwise/handoff-contract.ts` SHA256 `FBD6AFB70E4E72B57D29F978120B3CC239D217A6E2B5BE5AB75164D9DBF9E834` 的 runtime status 是 `RESERVED`，`network_enabled=false`；`next-support.ts` 返回 `ASKWISE_CAPABILITY_UNAVAILABLE`，只保留满足条件且经显式同意后的 reserved CTA，没有实际网络/API handoff。
- V3 网站咨询是本地演示，不提交、不保存；不可将其视作 `/v1/advisor-requests` 的前端接入。

## 7. Flags、审批与缺失证据

服务端 `config.ts` 默认/当前安全边界：`PAID_COMPASS_ENABLED=false`、`GROWTH_DISCOVERY_PAYMENT_ENABLED=false`、`FEISHU_BITABLE_ENABLED=false`、`FEISHU_CUSTOMER_PROFILE_FIELDS_ENABLED=false`、`OPENAI_AGENT_ENABLED=false`、`AI_WORKER_ENABLED=false`、`AGENT_PROVIDER=mock`。生产还强制真实 PostgreSQL、`sslmode=verify-full`、verified Source Catalog、非 mock payment、真实微信/支付/回调配置。README 明确未配置认证小程序 AppID、支付密钥、公网 HTTPS、生产 PostgreSQL、真实 OpenAI/飞书及完整人工验收。

**已实现：** 题库 registry/校验、PF V1.2 + 历史题库、原生页面、服务端 API、鉴权、专项同意、草稿/提交/报告/订单/撤回、顾问申请和 Askwise reserved contract。  
**已写入 Founder/网站候选但未公开：** V5 Compass 说明锚点、V3 Education 视觉稿、V5 框架中的 Education 关联。  
**不可用或未获准：** 官网公开问卷 URL、教育专用 Web flag、V5→Education API/结果 handoff、Askwise 网络 handoff、生产支付/数据库/真实外部服务和正式咨询渠道。

本次没有运行 `test:server`/构建，避免在 D:\ec 权威快照生成或改变构建产物；既有相关测试文件仅作为代码证据，不能写成此次运行通过。未发现公开部署、域名、Founder 对问卷 URL 的单独批准记录，亦未验证真实环境认证或回传。该缺口不影响“官网保持待接通、不得直链”的结论。

