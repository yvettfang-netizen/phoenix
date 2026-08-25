# ASKWISE EDUCATION COMPASS INTEGRATION DATA CONTRACT V1.1

Date: 2026-08-22

Scope: Minimum formal contract for Compass ↔ ASKWISE handoff.
Boundary constraint: 本文件仅定义接口与集成流程，不新增 ASKWISE 核心功能、不扩展考试体系、不重构 Engine。

## V1.1 Stabilization Patch (T06)

- `integration_version` is optional.
- Missing `integration_version` defaults to `v1.0`.
- Explicit non-empty `integration_version` not equal to `v1.0` returns `EC_VERSION_MISMATCH`.
- Version validation is performed before ID 映射、session lookup/creation.
- `EC_SESSION_NOT_FOUND` is introduced when查询 `askwise_session_id` 时不存在或不可恢复。
- `EC_IDMAP_MISSING` response must include `missing_mapping_field`:
  - `student_id`
  - `assessment_id`
- Mock Adapter 不再在运行时自动创建 assessment 映射；`student_id` 与 `assessment_id` 映射必须由测试/对接方预置。

## 1. Architecture Boundary

- **ASKWISE responsibility:** 仅执行学习诊断与引导闭环（Diagnose First. Answer Later.）。
- **Education Compass responsibility:** 提供已识别的学习焦点与输入信号，不做重复的学生综合评估。
- **Integration adapter responsibility:** 负责验证输入、做 ID 映射、幂等处理、路由到现有 ASKWISE 任务会话、归一化返回结果。
- **Hard boundary:** 不修改现有 ASKWISE 主键与 Engine 判断规则；不接入真实生产数据库；Mock Adapter 阶段不改动 Compass 引擎/ASKWISE 业务内核。

## 2. Input Payload Mapping Table

### 2.1 Required Input Fields

| Field | Type | Example | Validation | Mapping target in ASKWISE | Notes |
|---|---|---|---|---|---|
| `student_id` | string | `"stu_2026_001"` | Required, non-empty | `external_student_id` (mapping table) → `askwise_student_id` | 用于会话归属，不直接映射 ASKWISE 内部 PK |
| `assessment_id` | string | `"assess_pol_20260822_01"` | Required, non-empty | `external_assessment_id` (mapping table) → `askwise_experiment_id` | 用于会话批次与幂等键组成 |
| `subject_focus` | string | `"政治-政治生活与思想政治理论"` | Required, non-empty | `topic` / `task metadata` 初始化参数 | 不要求 Compass 扩展到完整题库，仅用于当前任务指向 |
| `learning_bottleneck` | string | `"因果关系判断薄弱"` | Required | 初始化学习信号字段 | 作为本次学习的起始诊断提示线索 |
| `priority_issue` | string | `"逻辑关系遗漏"` | Required | 初始化学习信号字段 | 与 learning_bottleneck 形成优先级线索 |
| `recommended_learning_goal` | string | `"补齐原则定位与条件识别"` | Required | 会话初始目标元数据 | 用于实验级元数据，不进入 Engine 判题公式 |

### 2.2 Optional Context Fields

| Field | Type | Optional | Mapping target / handling |
|---|---|---|---|
| `family_id` | string | Yes | 记录为 source context metadata；可选，不影响会话创建 |
| `education_system` | enum | Yes | 兼容字段：`GAOKAO|DSE|IGCSE|A_LEVEL|AP_US|other`，记录在 session metadata |
| `grade_level` | string | Yes | 记录在 session metadata，用于后续统计 |
| `source_version` | string | Yes | 记录在 session metadata（Source Tracking） |
| `created_at` | ISO8601 string | Yes | 作为 session 创建事件参考时间 |

## 3. Return Payload Mapping Table

### 3.1 Return Fields

| Field | Type | Source (ASKWISE) | Description |
|---|---|---|---|
| `student_id` | string | 输入映射后的 `external_student_id` | 返回给 Compass 的外部学生标识（非内部主键） |
| `assessment_id` | string | 输入映射后的 `external_assessment_id` | 对应的外部评估批次标识 |
| `askwise_session_id` | string | ASKWISE `learning_sessions.id` 或任务会话 UUID | 单次学习会话唯一标识 |
| `subject` | string | `daily_tasks.subject`（`Politics/Mathematics`） | 执行学科 |
| `diagnosis_type` | string | 引擎 diagnosis result（如 `P1`~`P5`、`K1`~`K7`） | 按当前任务最终或聚合诊断类型 |
| `learning_mode` | string | `chooseLearningMode` output | Teaching / Recall / Transfer / Thinking / Debug |
| `hint_level_max` | number | session 中已发出的最大 hint level | 0~5 |
| `hint_count` | number | 已插入的 hints 数量 |
| `retry_count` | number | attempt 次数 - 1（首次尝试不计为 retry） |
| `outcome` | enum | session 终态 | `solved` / `unsolved` / `in_progress` |
| `independent_solve_status` | enum | solved + 是否在没有 hint 时最终解决 | `not_attempted|failed|partial|independent|with_hints` |
| `knowledge_map_progress` | object | knowledge map + session 证据 | 可为百分比或状态对象；V1.0 建议 0~100 |
| `strategy_map_progress` | object | strategy map + session 证据 | 可为百分比或状态对象；V1.0 建议 0~100 |
| `reflection_completed` | boolean | 日志中反思记录 | `true/false` |
| `learning_evidence_id` | string | `learning_evidences.id` | 关联的学习证据记录 ID |
| `started_at` | ISO8601 | session start time | 任务开始时间 |
| `completed_at` | ISO8601/null | session close time | 未完成时可为 `null` |

### 3.2 Source Tracking (Returned with every payload)

| Field | Type | Description |
|---|---|---|
| `source_system` | string | 固定为 `askwise` |
| `source_version` | string | ASKWISE 版本标识（如 `v1.0.0`） |
| `integration_version` | string | 接口版本（本文件为 `v1.0`） |
| `created_at` | ISO8601 | 返回对象创建时间 |
| `updated_at` | ISO8601 | 返回对象更新时间 |

## 4. Enum Definitions

- **education_system:** `GAOKAO | DSE | IGCSE | A_LEVEL | AP_US | other`
- **learning_mode:** `Teaching | Recall | Transfer | Thinking | Debug`
- **diagnosis_type:** `P1|P2|P3|P4|P5|K1|K2|K3|K4|K5|K6|K7`
- **outcome:** `solved | unsolved | in_progress`
- **independent_solve_status:** `not_attempted | failed | partial | independent | with_hints`
- **knowledge_map_progress / strategy_map_progress:** `0..100` integers（建议）
- **status_code (error contracts):** 下文定义

## 5. Example Input JSON

```json
{
  "student_id": "stu_david_001",
  "assessment_id": "assess_politics_day03_2026_0822",
  "subject_focus": "政治-矛盾特殊性与多样性关系",
  "learning_bottleneck": "政治生活范畴知识关系识别薄弱",
  "priority_issue": "问题分解与知识点定位不足",
  "recommended_learning_goal": "完成关系识别->条件校验->方法选择链路",
  "family_id": "fam_qa_2026",
  "education_system": "GAOKAO",
  "grade_level": "高中一年级",
  "source_version": "compass_payload_v0.9.2",
  "created_at": "2026-08-22T02:00:00+08:00"
}
```

## 6. Example Return JSON

```json
{
  "student_id": "stu_david_001",
  "assessment_id": "assess_politics_day03_2026_0822",
  "askwise_session_id": "sess_4f2d9c8a7b3",
  "subject": "Politics",
  "diagnosis_type": "P1",
  "learning_mode": "Recall",
  "hint_level_max": 3,
  "hint_count": 2,
  "retry_count": 2,
  "outcome": "solved",
  "independent_solve_status": "with_hints",
  "knowledge_map_progress": {
    "status": "partial",
    "score": 58,
    "updated_nodes": ["P1", "P2"]
  },
  "strategy_map_progress": {
    "status": "in_progress",
    "score": 20
  },
  "reflection_completed": true,
  "learning_evidence_id": "evi_91bd4e",
  "started_at": "2026-08-22T09:10:00+08:00",
  "completed_at": "2026-08-22T09:18:43+08:00",
  "source_system": "askwise",
  "source_version": "1.0.0",
  "integration_version": "v1.0",
  "created_at": "2026-08-22T09:18:44+08:00",
  "updated_at": "2026-08-22T09:18:44+08:00"
}
```

## 7. ID Mapping Rules

1. **不修改 ASKWISE 主键**
   - 保持 `students.id`, `experiments.id`, `learning_sessions.id` 等本地主键不变。

2. **建立外部映射层（adapter 层）**
   - `external_student_id`（来自 Compass）
   - `external_assessment_id`（来自 Compass）
   - `askwise_student_id`（本地 `students.id`）
   - `askwise_experiment_id`（本地 `experiments.id`）

3. **映射策略**
   - `student_id`: 必须存在映射，否则返回可重试错误（需先完成 student bootstrap）
   - `assessment_id`: 映射到 `askwise_experiment_id`，未映射直接返回 `EC_IDMAP_MISSING`，不创建本地会话
   - `subject_focus`: 与任务创建参数映射，不替代本地题型主键

4. **反向返回规则**
   - 返回始终使用 `student_id` 与 `assessment_id` 的外部值，以便 Compass 无需识别 ASKWISE 内部主键。

## 8. Idempotency Rules

1. **Idempotency Key**
   - `idempotency_key = SHA256(assessment_id + "::" + student_id + "::" + subject_focus + "::" + integration_version)`
   - 可使用简化拼接值，在开发阶段可先不做 hash 只做 deterministic key，需保持一致性。

2. **幂等行为**
   - 重复提交同一 idempotency_key 时：
     - 不创建新学习任务/session
     - 不创建重复 attempt
     - 返回已有 `askwise_session_id` 与现有任务快照（含已达状态）

3. **首次提交**
   - 两个映射均命中后创建 session，并绑定 `idempotency_key`
   - 后续重复命中返回该 session（latest state）

## 9. Error Contract

| Code | HTTP | Meaning | Retry | Next action |
|---|---|---|---|---|
| `EC_INCOMPLETE_INPUT` | 400 | 缺少必需输入字段 | No | 补齐必填字段 |
| `EC_INVALID_FORMAT` | 400 | 字段类型或枚举不合法 | No | 修正 payload 格式 |
| `EC_IDMAP_MISSING` | 409 | `student_id` 或 `assessment_id` 映射缺失 | No | 在对应映射表补齐后重试 |
| `EC_SESSION_NOT_FOUND` | 404 | 未找到或无法恢复的 `askwise_session_id` | No | 使用幂等键确认会话状态，或触发新 session |
| `EC_SESSION_CLOSED` | 409 | 会话已关闭且不可重开 | No | 触发新 assessment_id 或重新评估 |
| `EC_SESSION_CREATE_FAIL` | 502 | ASKWISE 创建 session 失败 | Yes | 重试 |
| `EC_INTERNAL` | 500 | 未知内部错误 | Yes | 记录 trace id 后重试 |

错误响应应返回标准字段：`status`, `error_code`, `error_message`, `trace_id`, `idempotency_key`, `attempted_at`, `missing_mapping_field`（可选，`EC_IDMAP_MISSING` 必填）。

## 10. Versioning Rules

1. **接口版本（冻结）**: `integration_version = v1.0`，可省略时默认使用 `v1.0`，显式传入不一致则返回 `EC_VERSION_MISMATCH`。
2. **兼容策略**
   - V1 使用新增可选字段向后兼容，不破坏必填字段。
   - 变更分为：
     - `PATCH`（只新增可选字段）
     - `MINOR`（新增枚举值，需默认处理）
     - `MAJOR`（更改必填字段、错误码、字段语义）
3. **追踪字段**
   - 每次交互必须带入 `source_version` 与 `integration_version`。
   - 返回值携带 `source_version`（来源版本）与 `integration_version`（本次协定版本）。

## 11. Mock Adapter Interface

### 11.1 Adapter Flow

`validate -> map -> forward -> receive -> normalize`

1. **validate**
   - 校验必填字段与枚举
   - 规范化空白与时间字段格式

2. **map**
   - `student_id` / `assessment_id` 做 ID 映射表查询
   - 生成为 `idempotency_key`

3. **forward**
   - 按幂等规则检查是否已有会话
   - 如不存在，调用现有 ASKWISE 会话创建/启动路径

4. **receive**
   - 轮询/读取现有 ASKWISE session 状态（或直接回传 session 快照）

5. **normalize**
   - 按 V1 返回字段映射输出

### 11.2 Pseudo-contract

- `POST /mock/compass/assessments/{assessment_id}/students/{student_id}/start`
  - Request: Input payload (Section 2)
  - Response: `{ askwise_session_id, status, idempotency_key, source_system, integration_version }` (in progress) or full return payload when completed

- `GET /mock/compass/sessions/{askwise_session_id}`
  - Response: Return payload (Section 3 / Table)

### 11.3 Non-functional constraints

- 不对接生产数据库，仅写入本地测试/演示存储。
- 不改 ASKWISE Engine 与 Decision Policy。
- 不改 Compass 的核心评估算法。
- 支持本地可重复运行与可核验的 trace。

## 12. Open Issues

1. `subject_focus` 当前仍偏文本标签，后续如需更严格语义需统一字段字典（V1 先保留自由文本）。
2. `education_system` 保留 enum 接口兼容，不在 V1 实现体系逻辑分支。
3. `family_id` 在 V1 仅作 context 透传，不做家庭组织维度模型化。
4. `independent_solve_status` 的“独立解题”判定标准需与 Compass 对齐（当前按 hints_used 与 session solve trace 推导）。
5. 幂等时返回的“现有记录”格式需明确是 latest snapshot 还是历史快照。
6. `knowledge_map_progress` 与 `strategy_map_progress` 的打分口径建议先定为数值 0~100，以便后续统一看板。

