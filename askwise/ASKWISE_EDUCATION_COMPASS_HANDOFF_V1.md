# ASKWISE × Phoenix Education Compass Handoff V1

Date: 2026-08-22

Scope: Askwise V1.0（Web MVP）与后续 Compass 对接的预备交接材料

## 1) Existing Askwise Architecture

Askwise 当前采用 **Next.js App Router + TS Engine + SQLite**（本地 13 天试点骨架）：

- UI Route:
  - [askwise-learning-engine/src/app/page.tsx](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/app/page.tsx)
  - [askwise-learning-engine/src/app/student-task/page.tsx](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/app/student-task/page.tsx)
  - [askwise-learning-engine/src/app/task/[taskId]/page.tsx](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/app/task/%5BtaskId%5D/page.tsx)
  - [askwise-learning-engine/src/app/evidence/page.tsx](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/app/evidence/page.tsx)
  - [askwise-learning-engine/src/app/dashboard/page.tsx](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/app/dashboard/page.tsx)
- Engine（集中规则层）:
  - [askwise-learning-engine/src/lib/engine/diagnosis.ts](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/lib/engine/diagnosis.ts)
  - [askwise-learning-engine/src/lib/engine/learning-mode.ts](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/lib/engine/learning-mode.ts)
  - [askwise-learning-engine/src/lib/engine/hint-policy.ts](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/lib/engine/hint-policy.ts)
  - [askwise-learning-engine/src/lib/engine/learning.ts](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/lib/engine/learning.ts)
  - [askwise-learning-engine/src/lib/engine/session.ts](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/lib/engine/session.ts)
- DB Layer:
  - [askwise-learning-engine/src/lib/db.ts](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/lib/db.ts)

核心数据库对象：`students / experiments / daily_tasks / learning_sessions / attempts / diagnoses / hints / learning_evidences / political_knowledge_map / math_strategy_map / daily_reflections`。

## 2) Reusable Components

建议先复用以下模块，不重建逻辑：

- `diagnose(subject, topic, studentInput)` -> 生成错误类型（Politics P1-P5 / Math K1-K7）
- `chooseLearningMode(profile, subject, topic, diagnosis)` -> Teaching/Recall/Transfer/Thinking/Debug
- `buildHint(subject, topic, hintLevel, learningMode)` -> 0-5 提示层
- `nextHintLevel(prev, lastCorrect)` -> 提示递进
- `buildProfileFromAttempts` + `StudentProfile` -> 重建历史画像用于 mode 决策
- `SessionLogger` -> 学习日志序列化
- `db` 已有的会话 + 尝试 + 诊断 + 提示持久化能力

## 3) Education Compass Handoff Point

- 建议新增一个单一接入层（暂不改现有教学流主逻辑）：
  - `CompassIngestionAdapter`：负责接收 Assessment contract 并将任务转为 `daily_tasks` + `learning_sessions` 初始化。
  - 作为唯一入口，后续可接入真实 API、消息队列或手工批量导入。
- 建议保留 `/task/[taskId]` 任务执行面，不改内部诊断/提示链路。

## 4) Input Data Contract (Compass -> Askwise)

字段清单（来自目标需求）：

1. `family_id`
2. `student_id`
3. `assessment_id`
4. `education_system`
5. `grade_stage`
6. `subject`
7. `subject_focus`
8. `learning_bottleneck`
9. `learning_signals`
10. `recommended_focus`
11. `assessment_version`
12. `consent_status`

当前 Askwise 映射建议：
- `student_id` -> 新增 `students` 的外部ID列（或映射表）
- `assessment_id` -> 任务批次/任务分组主键扩展
- `education_system`, `grade_stage`, `assessment_version` -> 任务/会话扩展元数据
- `subject` -> `daily_tasks.subject`（当前值：Politics/Mathematics）
- `subject_focus`/`recommended_focus`/`learning_signals` -> 进入任务题干与初始标签字段（需要扩展）
- `learning_bottleneck` -> 预置初始 hint 模式和诊断优先级建议字段
- `consent_status` -> 会话入口白名单校验（缺席即阻断）

## 5) Return Data Contract (Askwise -> Compass)

字段清单：

1. `topic`
2. `knowledge_gap`
3. `error_pattern`
4. `method_selection_issue`
5. `reasoning_signal`
6. `learning_strategy`
7. `reverification_result`
8. `recurring_issue`
9. `learning_log_reference`

当前可回填来源：
- `topic` = `daily_tasks.topic`
- `knowledge_gap` = `diagnoses.diagnosis_type` + `session snapshot`
- `error_pattern` = 最近若干次 `diagnosis_error_type`
- `method_selection_issue` = 思维模式/策略错误判定（`K4/P4` 等）
- `reasoning_signal` = `diagnosis_reason`
- `learning_strategy` = 历次提示内容轨迹（`hints.content`）
- `reverification_result` = `learning_sessions.solved`、`independent`
- `recurring_issue` = 多次同类型错误的统计（需新增聚合接口）
- `learning_log_reference` = `learning_evidences.id` 或 `taskId/sessionId`

## 6) Route / UI Integration Recommendation

- 先不新增新 UI 页面，新增 API 适配层后直接驱动现有流程：
  - 数据导入：`Compass` 推送 -> adapter 创建任务 -> `taskId` 回流
  - 学习执行：复用现有 `/task/[taskId]`
  - 结果回传：在闭环后从现有 `learning_evidences` + session 聚合生成 JSON
- 若需最小 UI 入口，可在 `Today` 增加“Compass 任务入口”按钮（不改变底层交互）。

## 7) Mock Adapter Requirement

- 在未接入生产接口前，先实现 Mock Adapter：
  - 输入为目标字段 JSON 文件 / 本地 API mock
  - 行为：幂等写入任务（同 `assessment_id` 不重复创建）
  - 返回标准 `taskId`, `status`, `handoffRef`
- 推荐位置（按现有结构）：
  - `askwise-learning-engine/src/lib/compass/`（新目录）
  - `askwise-learning-engine/src/lib/compass/ingest.test.ts`（契约验证）

## 8) Feishu / Student ID / Family ID Mapping

当前状态：
- Askwise 只有本地单学生 `David`，无 `family_id`、`student_id` 外部主键映射。
- 为保证 Compass 对接，必须新增两层映射：
  1. `student_id`（Compass）→ `students.id`（Askwise）
  2. `family_id`（Compass）→ 用户组织维度 metadata（可先挂到 task/session 的额外字段）

若使用 Feishu：
- 先在 `assessments` 或 `students` metadata 中保存 `feishu_user_id`、`family_id`。
- 所有回传/查询均以 `assessment_id + student_id + family_id` 组合键做幂等。

## 9) Risks

1. 缺少 API route，当前无法直接被外部系统发起/回收数据。
2. 学生维度硬编码（单学生），与 Compass 的 family/多学生场景不一致。
3. 学科范围与 taxonomy 目前偏窄，难直接覆盖全部考试体系题型。
4. `learning_system` 相关字段未持久化，无法直接做跨系统看板。
5. 目前未建“任务来源”字段，`assessment_id` 回溯链不完整。

## 10) Open Issues

1. 与 Compass 的实际接口（Payload example / auth / retry 约定）尚未对齐。
2. 需确认 `consent_status` 在入口鉴权中的强制策略（block/queue/warn）。
3. 需确认 13-Day 学习会话结构是否临时保留或改为按 `assessment_id` 聚合。
4. 需确认回传字段中 `recurring_issue` 的统计口径（按 task、按 day、按 subject）。
5. 当前 hint/diagnosis 规则是否足以支撑 GAOKAO / IGCSE / A_LEVEL / AP_US 的多学科拓展。

## Recommended next step (for Monday handoff)

- 先交付本版本：  
  1) 接口契约 mock adapter（输入/输出），  
  2) 最小 ID 映射表（family_id/student_id/assessment_id），  
  3) 回传 evidence payload 示例。  

不改 Askwise 核心诊断链路，先保证可接驳、可验证、可回溯。
