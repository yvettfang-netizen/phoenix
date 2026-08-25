# ASKWISE V1.0 / Phoenix Education Compass Integration Preflight Audit

Date: 2026-08-22

## Repository / Project Location

- Main repository: `D:\CODEX\PhoenixNova\askwise`
- Active Askwise V1.0 implementation (Web MVP): `D:\CODEX\PhoenixNova\askwise\askwise-learning-engine`
- Historical rule baseline kept in root (未并入 Web 路由，仅作为历史规则和可回归参考):
  - `student_model.py`
  - `diagnosis_engine.py`
  - `learning_engine.py`
  - `agent_policy.py`
  - `session_log.py`
  - `demo.py`
  - `tests/`（Python 验收测试）

## T01 Repository Surface Audit

### 1) routes / pages / components

- No `pages/` directory.
- 使用 Next.js App Router，路由来源：
  - [askwise-learning-engine/src/app/page.tsx](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/app/page.tsx)（Today）
  - [askwise-learning-engine/src/app/student-task/page.tsx](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/app/student-task/page.tsx)
  - [askwise-learning-engine/src/app/task/[taskId]/page.tsx](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/app/task/%5BtaskId%5D/page.tsx)
  - [askwise-learning-engine/src/app/evidence/page.tsx](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/app/evidence/page.tsx)
  - [askwise-learning-engine/src/app/maps/political/page.tsx](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/app/maps/political/page.tsx)
  - [askwise-learning-engine/src/app/maps/math/page.tsx](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/app/maps/math/page.tsx)
  - [askwise-learning-engine/src/app/reflection/page.tsx](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/app/reflection/page.tsx)
  - [askwise-learning-engine/src/app/dashboard/page.tsx](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/app/dashboard/page.tsx)
- 组件目录：当前不存在 `components` 文件夹（页面内联 UI；`layout` 负责导航）。

### 2) current learning flow

当前学习流是“最小闭环”：

1. `Today` 拉取当日任务（含占位任务）  
   `getPilotContext` / `listTodayTasks`.
2. `Student Task` 新建任务并写入 `daily_tasks` + `learning_sessions`。
3. 打开 `/task/[taskId]`：提交 attempt。
4. 后端服务动作执行：`diagnose` -> `chooseLearningMode` -> `nextHintLevel` -> `buildHint` -> 回写 attempt/diagnosis/hint。
5. 正确后 `closeSession` -> `buildEvidenceForSession`。
6. 可见 `Learning Evidence`、`知识图谱`、`Reflection`、`Dashboard` 记录。

### 3) student data structure

- SQLite 的核心模型：[askwise-learning-engine/src/lib/db.ts](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/lib/db.ts)。
- `students` 表 + 固定默认学生：`David`（`ensureStudentAndExperiment`）。
- `experiments` + `daily_tasks` + `learning_sessions` 形成 13-Day 试验骨架。
- `topic/question/answer` 归档在：
  - `daily_tasks.question`
  - `attempts.student_response`
  - `learning_evidences.initial_attempt`
  - `learning_evidences.final_result`

### 4) question / answer structure

- 题目来源：`daily_tasks.question`。
- 学生回答：`attempts.student_response`（按 attempt 顺序持久化）。
- 诊断输出：`diagnoses.diagnosis_type` + `diagnosis_reason`。
- 回答阶段结果：`attempts.is_correct`（`0/1`）和最终 session solved 状态。

### 5) Knowledge Map

- 政治知识图谱：`political_knowledge_map` 表，表单入口：
  - [askwise-learning-engine/src/app/maps/political/page.tsx](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/app/maps/political/page.tsx)
- 数学策略图谱：`math_strategy_map` 表，表单入口：
  - [askwise-learning-engine/src/app/maps/math/page.tsx](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/app/maps/math/page.tsx)

### 6) error analysis / reflection

- 错误分析链：
  - 引擎诊断规则：`diagnosis.ts` -> `MATH_TAXONOMY/K1-K7`, `POLITICS_TAXONOMY/P1-P5`。
  - 错误模式映射到 DB 的 `diagnoses.diagnosis_type`（`Knowledge/Recognition/Strategy/Execution Gap`）。
  - 学习日志中 `session snapshots` 同时包含 latestHint / latestDiagnosis / attempts history。
- 反思：`daily_reflections` 表 + [askwise-learning-engine/src/app/reflection/page.tsx](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/app/reflection/page.tsx)。

### 7) methodology / strategy logic

- 诊断与策略逻辑集中在 `src/lib/engine/`（非 API 或组件散落）:
  - `diagnosis.ts`
  - `learning-mode.ts`
  - `hint-policy.ts`
  - `learning.ts`
  - `session.ts`
- 规则符合“先诊断后提示”：
  - 输入 -> diagnose -> mode selection -> hint escalation。
- 历史实现映射在 [askwise-learning-engine/PYTHON_ENGINE_MAPPING.md](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/PYTHON_ENGINE_MAPPING.md)。

### 8) learning logs / feedback records

- 运行时 JSON 日志（文件）：`SessionLogger` 写入 `askwise_session_log.json`（路径基于 `cwd`）。
- DB 持久化日志：
  - `attempts`
  - `diagnoses`
  - `hints`
  - `learning_sessions`
  - `learning_evidences`
  - `daily_reflections`

### 9) test fixtures

- Python 测试套件（历史 V1.0 规则规范）：
  - [askwise/tests/test_diagnosis_rules.py](/D:/CODEX/PhoenixNova/askwise/tests/test_diagnosis_rules.py)
  - [askwise/tests/test_hint_progression.py](/D:/CODEX/PhoenixNova/askwise/tests/test_hint_progression.py)
  - [askwise/tests/test_acceptance_coverage.py](/D:/CODEX/PhoenixNova/askwise/tests/test_acceptance_coverage.py)
  - [askwise/tests/test_scripted_scenarios.py](/D:/CODEX/PhoenixNova/askwise/tests/test_scripted_scenarios.py)
- Web 引擎测试（TypeScript）：
  - [askwise-learning-engine/src/lib/engine/engine.test.ts](/D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/src/lib/engine/engine.test.ts)

### 10) API / database

- API：当前无 `pages/api` 或 `app/api` 显式 Route Handler，交互集中在 App Router 页面里的 server actions。
- Database：SQLite via `better-sqlite3`，数据库路径为 `askwise-learning-engine/data/askwise.db`（首次启动时自动建库）。

## T02: Core Principles Status

- **Diagnose First. Answer Later.**：在 `/task/[taskId]` 中每次提交都先诊断再给 Hint。  
- **Problem Discovery -> AI Collaboration -> Knowledge Map -> Error Analysis / Reflection -> Method Optimization -> Re-verification**：当前版本已覆盖：
  - 问题发现（题目与初始尝试）
  - 协作提示（`buildHint`）
  - Knowledge Map（政治/数学两个入口）
  - 错误分析（诊断分类与记录）
  - 反思页（`Reflection`）
  - 重试与验证（`Retry` 循环 + 成功需再提交才闭环）

## T03 / T04: Handoff Contract Snapshot (Current Baseline Gaps)

当前 Askwise V1.0 尚未实现与 Education Compass 的 runtime 数据交换；  
下面字段在内部可以映射为“待接收/待返回”字段，且不要求重写核心引擎。

- 输入（Compass -> Askwise）可直接接收但目前未消费：
  - `family_id`, `student_id`, `assessment_id`, `education_system`, `grade_stage`, `subject`, `subject_focus`, `learning_bottleneck`, `learning_signals`, `recommended_focus`, `assessment_version`, `consent_status`
- 返回（Askwise -> Compass）可从现有输出中汇总：
  - `topic`, `knowledge_gap`, `error_pattern`, `method_selection_issue`, `reasoning_signal`, `learning_strategy`, `reverification_result`, `recurring_issue`, `learning_log_reference`

## T05: Education System Compatibility (Current reuse / adapter / future)

- 可直接复用：
  - 题目/尝试/错误分类流程（subject-agnostic）
  - 学习记录模型（attempt/diagnosis/hint/session）
  - 任务生命周期（开始-重试-解题闭环）
- 需要 Adapter：
  - 学制元数据映射（GAOKAO/DSE/IGCSE/A_LEVEL/AP_US）
  - 题库/作业标准名映射（`subject_focus` 与 internal `subject/topic` 对齐）
  - `family_id/student_id/assessment_id` 到本地 `students.id` 的身份映射层
  - 输出信号字段标准化（`error_pattern` 等）
- 未来扩展需要：
  - 题目模型（题型标签、难度、教材章节、知识点树）
  - 多学科通用 taxonomy（当前主要为 Politics/Mathematics 两类）
  - 长期学习历史（非 13-day 占位场景）

## Risks / Constraints identified

- 当前默认单学生（David）+ 单实验（13 天）架构，未做多学生/家庭组织维度。
- 数据库 schema 缺少 `family_id`, `education_system`, `assessment_id` 等外部主键。
- 目前无真实 Education Compass 接入接口（无 API 层）。
- `app` 页面中嵌入了少量业务逻辑，适合 MVP，但后续可迁移到 service layer 更利于外部系统集成。

## Summary

Askwise V1.0 的 Web MVP 已完整覆盖“诊断引导学习”主链路并可作为 **Compass 接驳的结构基座**。  
本阶段不应重写核心 Engine，优先在 `db` 与 `ingest/return adapters` 增加协议适配层。
