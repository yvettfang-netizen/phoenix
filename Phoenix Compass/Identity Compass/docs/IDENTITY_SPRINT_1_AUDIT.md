# Phoenix Identity Compass™｜Repository Audit + Sprint 1

执行日期：2026-08-18

基线提交：`fcd3d93bfd6669ce06fd44de74f38ce38bc36bf2`

功能分支：`codex/identity-compass-sprint-1`

## 1. Baseline 与范围裁决

本轮唯一可读取的 Identity 产品输入是用户提供的 `PHOENIX IDENTITY COMPASS™ CODEX ENGINEERING SKELETON V1.0`。工程实现严格限制为：Free 6题、标准化、稳定 Family/User/Assessment ID、Adapter Contract、Family Intent Classification、Free Identity Snapshot、Policy/Study 占位边界与 Persona Regression Framework。

未实现 CIES、TTPS、QMAS、Study 或 Report Engine；未实现支付、付费墙、获批概率、自动申请、CRM 完整版或法律意见。

## 2. Repository Audit

### 已发现并复用

- Git 根仓库：`D:\CODEX\PhoenixNova\Phoenix Compass`。
- 当前交付工作树：`D:\CODEX\PhoenixNova\Phoenix Compass\Identity Compass`，与父仓库共享同一 Git 历史，不是第二套仓库。
- 技术基座：Next.js 16.3.1 App Router、React 19.2.8、TypeScript strict、Tailwind CSS 4、Vitest 4、Testing Library。
- 复用的正式能力：Phoenix Nova™ Logo、品牌 token、`BrandLogo`、App Router 页面约定、移动端问卷卡片、返回/进度交互、`sessionStorage` 恢复模式、Vitest 配置、lint/typecheck/build 命令。
- 现有 Growth Compass 的 `/`、`/assessment`、`/result`、AI 调用层与稳定契约保持不变。

### 未发现

- 飞书 Connector、CRM Adapter、User/Family 长期数据模型或现成 Identity Compass 模块。
- ACTIVE Product Pack 中列出的六份正式源文件。
- 可调用的真实飞书 API 配置、表 ID、字段映射或凭据。
- 完整动态测评和完整身份分析的后续路由规格。

### Next.js 16 核对

编码前已读取仓库内 `node_modules/next/dist/docs/` 的 App Router project structure、layouts/pages、server/client components、route handlers 与 Vitest 指南。Identity 页面保持 Server Component，只有需要浏览器状态和交互的 Assessment/Result 组件使用 `"use client"`。

## 3. Architecture

```text
src/app/identity/
  page.tsx                 # Free 入口
  assessment/page.tsx      # 6 屏问卷路由
  result/page.tsx          # Free Identity Snapshot
  full-analysis/page.tsx   # 下一 Sprint 接续边界

src/components/
  identity-assessment-experience.tsx
  identity-result-experience.tsx

src/lib/identity/
  types.ts                 # 冻结字段、版本、ID 与结果类型
  questions.ts             # Free 6题 UI 投影
  normalize.ts             # 校验与标准化
  classification.ts        # 仅 Family Intent Classification
  ids.ts                   # Family/User 持久、Assessment 会话级
  policy.ts                # Policy Repository 输入类型，无规则
  study.ts                 # 5 个 Profile + 3 个独立状态
  adapters/                # Repository contracts + Mock Feishu
  personas.ts              # P01–P12 fixture registry
```

业务组件只依赖 `IdentityRepositoryBundle` 和标准化对象，不依赖某张飞书表的 UI 或字段位置。当前 Mock Adapter 使用浏览器本地存储模拟 upsert；未来真实 Adapter 可替换仓储实现，不改变分类器或 UI 契约。

## 4. Free 6题证据

`questions.ts` 固定输出 6 个屏幕：

1. `identity_primary_goals`：包含冻结的 8 个 Q1 选项，可多选。
2. `current_hk_status`：单选。
3. `age_band`：单选。
4. `highest_education`：单选。
5. `employment_status`：单选。
6. `route_openness`：包含冻结的 7 个 Q6 选项，可多选。

前端为 mobile-first、大按钮、每屏一题、轻量进度、支持返回修改与会话恢复；首步不索取手机号，也不采集证件、流水、税单或资产证明。

## 5. Normalized Data Contract Mapping

| 冻结字段 | 来源 / 生成方式 |
| --- | --- |
| `family_id` | 浏览器持久 Identity Context；重复访问复用 |
| `user_id` | 与 Family Context 同时建立；重复访问复用 |
| `assessment_id` | 当前测评会话建立；重新测评时更新 |
| `identity_primary_goals` | Q1 |
| `current_hk_status` | Q2 |
| `age_band` | Q3 |
| `highest_education` | Q4 |
| `employment_status` | Q5 |
| `route_openness` | Q6 |
| `question_bank_version` | `IDENTITY_QB_V1.4` |
| `policy_library_version` | `IDENTITY_POLICY_LIBRARY_V1.0` |
| `family_identity_type` | Intent-only deterministic classifier |
| `planning_stage` | Intent/status stage derivation；非资格判断 |
| `free_direction_1` | Family type 对应的用户友好方向 |
| `free_direction_2` | Family type 对应的第二方向 |
| `free_key_insight` | 只引用 Free 输入的关键洞察 |

额外记录 `assessment_version = IDENTITY_FREE_V1.0`。没有 `hkStatus2`、`routeA`、`eduType` 或 `tempUser` 等临时业务字段。

## 6. ID Model

```text
Family ID (localStorage, stable)
  └─ User ID (localStorage, stable)
      └─ Assessment ID (sessionStorage, per assessment)
          └─ Report ID (future repository contract only)
```

测试证明同一浏览器上下文重复进入不会创建第二个 Family/User；重新开始只创建新的 Assessment。Lead 不作为家庭主键。

## 7. Feishu Adapter Contract

Sprint 1 已定义并使用：

- `IdentityLeadRepository`
- `IdentityProfileRepository`
- `FamilyIdentityContextRepository`
- `IdentityAssessmentRepository`

已预留：

- `IdentityPolicyRepository`
- `StudyAdmissionRepository`
- `IdentityReportRepository`
- `AdvisorFollowupRepository`

`createMockFeishuRepositories()` 按 Family/User/Assessment key 执行 upsert；完成问卷后通过 `persistCompletedIdentityAssessment()` 写入四类 Sprint 1 记录。

## 8. Family Identity Type 与 Snapshot

分类器只对冻结的 8 类 Family Identity Type 做意图评分：Education-led、Investment-led、Talent-led、Career-led、Study-led、Family-linked、Long-term HK、Exploration。

结果页包含 Family Identity Type、Planning Stage、Potential Direction 1、Potential Direction 2、One Key Insight 与“继续完整身份分析”CTA。所有页面明确声明 Free 结果不是政策资格、成功率、法律意见或获批承诺。

## 9. Policy / Study Boundary

- `IdentityPolicyRepository` 只接收 Policy Library records；React 页面和分类器没有政策规则。
- `policy.ts` 只声明冻结的 8 个未来路径 ID，不实现 eligibility evaluator。
- `study.ts` 保留 S1–S5 profiles，并将 `admission_status`、`student_visa_status`、`iang_status` 分开；没有 `study_eligible` 聚合字段。

## 10. Persona Regression Framework

`personas.ts` 建立 P01–P12 全部 fixture slots，并为每个 fixture 保留：

- `expected_branches`
- `expected_hidden_branches`
- `expected_path_result`
- `expected_manual_review`
- `expected_report_behaviour`

Sprint 1 激活 P06 Study S2、P11 Family-linked、P12 Exploration 的 Free Intent Classification 断言。其余 persona 明确 deferred，不伪造 Policy Engine 结果。

## 11. Verification

### 自动化

- `pnpm lint`：通过。
- `pnpm typecheck`：通过。
- `pnpm test`：10 个测试文件、25 个测试全部通过。
- `pnpm build`：Next.js 16.3.1 默认 Turbopack 生产构建通过；新增 4 个 Identity 路由全部生成。

### 本地浏览器

- 390 × 844 视口走通 `/identity` → 6 题 → `/identity/result` → `/identity/full-analysis`。
- P06 风格输入得到 `Study-led Family` 与“规划准备”，没有资格判断文案。
- 浏览器返回到问卷后恢复第 6 题；再点返回可见第 5 题原选项保持选中。
- Landing 与 Result 无横向溢出；结果页控制台无 warning/error。

## 12. Implementation Gaps

1. ACTIVE Product Pack 的 Master Specification、Question Bank、Field Dictionary、Policy Library、Persona Test Pack、3-Sprint Checklist 未在仓库或附件中提供，无法逐项核验正式枚举 code 与标准 persona payload。
2. Q2–Q5 的正式选项未包含在本轮文字骨架中。Q2 复用现有 Compass 身份值；Q3–Q5 使用清晰标注的 Sprint 1 provisional enum，待正式 Field Dictionary 到位后只做映射校正，不改变字段名。
3. Persona Test Pack 原始 fixture 内容缺失；本轮建立完整 P01–P12 结构并只激活被要求的 P06/P11/P12 intent 断言。
4. 真实飞书表结构、API 与凭据缺失；本轮使用可替换的 Mock Adapter，不阻塞 Sprint 1。
5. “继续完整身份分析”的正式入口与完整动态题库未提供；本轮 CTA 指向本地接续边界页，没有实现超范围引擎。

## 13. Current Blockers

Sprint 1 工程闭环无阻塞。进入真实数据集成或 Sprint 2 前，必须取得上述 ACTIVE Product Pack 与飞书映射资料。

## 14. Next Sprint Recommendation

1. 先导入并版本化六份 ACTIVE Product Pack，对 provisional enum 与 persona fixtures 做差异核对。
2. 实现真实 Feishu Adapter，并用 contract tests 对齐 Mock 行为；业务层保持不变。
3. 按正式 Question Bank 实现完整动态题目与 branching，继续保持 Policy rules 在 repository/library 边界内。
4. 在 Policy Engine 开发前扩展 P01–P12 的正式 expected assertions；Policy 未实现前继续 fail-closed，不输出资格结论。
