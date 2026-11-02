# ASKWISE™ PRODUCT PRD V1.0

**Document Type:** Product Requirements Document\
**Product:** ASKWISE™\
**Version:** V1.0\
**Status:** Founder Baseline / Implementation Ready\
**Core Principle:** **Diagnose First. Answer Later.**

------------------------------------------------------------------------

## 1. Product Definition

ASKWISE™ 不是一个替学生回答问题的 AI 聊天机器人。

ASKWISE™
是一套观察学生如何思考、诊断其为什么卡住，并通过提示、重试、证据与反思，逐步训练学生形成独立问题解决能力的
**AI Learning System**。

核心学习闭环：

> **问题发现 → AI 协作 → Knowledge Map → 错因分析与反思 → 方法优化 →
> 再验证**

产品主流程：

> **Today → Task → Initial Attempt → Diagnosis → Hint → Retry → Solved +
> Evidence → Reflection → Knowledge Map → Growth → Next Best Task**

------------------------------------------------------------------------

## 2. Product Goals

### 2.1 核心目标

ASKWISE 必须帮助学生完成四个变化：

1.  从"得到答案"转向"发现自己为什么不会"；
2.  从"记住知识"转向"知道什么时候调用知识"；
3.  从"做过一道题"转向"形成可迁移的问题解决路径"；
4.  从"AI替我思考"转向"AI帮助我看见自己的思考过程"。

### 2.2 非目标

V1.0 不以以下事项为目标：

-   不做通用聊天机器人；
-   不追求无限学科扩张；
-   不新增独立 AI Agent；
-   不重构现有 ASKWISE Learning Engine 语义；
-   不让 Aoyu/鳌鱼承担学习决策；
-   不以刷题数量作为核心成长指标；
-   不因为 UI 开发而修改核心学习逻辑。

------------------------------------------------------------------------

## 3. Target Users

### Student

主要执行者。

学生需要清楚知道：

-   今天做什么；
-   为什么做；
-   自己卡在哪里；
-   下一步怎么尝试；
-   自己最近发生了什么变化。

### Parent / Guardian

主要查看：

-   学习进度；
-   真实薄弱点；
-   学习方式变化；
-   Growth Evidence。

不应直接干预单次 Diagnosis。

### Educator / Learning Designer

用于：

-   查看学生学习模型；
-   审核诊断质量；
-   调整训练策略；
-   设计 Next Best Task。

------------------------------------------------------------------------

## 4. Product Architecture

ASKWISE V1.0 固定为五层：

### Layer 1 --- Experience Layer

-   Web
-   微信小程序
-   Phoenix Family OS

这些只是不同入口，不拥有 ASKWISE 核心学习语义。

### Layer 2 --- ASKWISE Learning Workflow

包含：

-   Today
-   Task
-   Initial Attempt
-   Diagnosis
-   Hint
-   Retry
-   Evidence
-   Reflection

### Layer 3 --- Learning Engine

包含：

-   Diagnosis Rules
-   Hint Policy
-   Retry Logic
-   Next Best Task Logic

### Layer 4 --- Student Learning Model

包含：

-   Knowledge Map
-   Error Pattern
-   Learning Profile
-   Growth Profile

### Layer 5 --- Data Layer

核心对象：

-   Student
-   Task
-   Attempt
-   Diagnosis
-   Hint
-   Retry
-   Evidence
-   Reflection
-   KnowledgeNode
-   GrowthMetric

------------------------------------------------------------------------

## 5. Core User Journey

``` text
Student Login
     ↓
Today
     ↓
Task
     ↓
Initial Attempt
     ↓
Confidence
     ↓
Diagnosis
     ↓
Hint
     ↓
Retry
     ↓
Solved?
  ↙       ↘
No         Yes
↓           ↓
Next Hint   Evidence
↓           ↓
Retry     Reflection
             ↓
       Knowledge Map
             ↓
           Growth
             ↓
      Next Best Task
```

------------------------------------------------------------------------

## 6. Page / State Map

### P01 --- Today

回答三个问题：

1.  我今天做什么？
2.  我今天重点训练什么能力？
3.  做到什么程度算完成？

每张任务卡至少显示：

-   Subject
-   Training Goal
-   Estimated Time
-   Why Today
-   Completion Criteria
-   Status

------------------------------------------------------------------------

### P02 --- Task

展示：

-   任务内容；
-   必要材料；
-   当前训练目标；
-   学生作答区域。

不得默认展示完整答案。

------------------------------------------------------------------------

### P03 --- Initial Attempt

学生必须先提交自己的第一次尝试。

记录：

-   answer / reasoning；
-   timestamp；
-   confidence；
-   first-step time（适用时）。

Confidence 建议：

-   Very Confident
-   Somewhat Confident
-   Unsure
-   I Don't Know

------------------------------------------------------------------------

### P04 --- Diagnosis

ASKWISE 在给答案之前首先判断：

> **学生为什么卡住？**

Diagnosis 至少分为：

#### K1 --- Knowledge Gap

知识缺失。

#### K2 --- Understanding Error

知道知识，但理解存在偏差。

#### K3 --- Call Failure

知道知识，但题目出现时没有想到调用。

#### K4 --- Strategy Failure

存在多个可能方法，但路径选择不佳。

#### K5 --- Execution Error

方法基本正确，但计算、步骤或表达出错。

#### K6 --- Reflection Failure

完成以后无法解释错误原因或迁移方法。

Diagnosis 必须保存为结构化数据，而不是只生成一段聊天文本。

------------------------------------------------------------------------

## 7. Hint Policy

Hint 必须遵循渐进式原则。

### Hint 1 --- Signal

只指出应该重新注意什么。

例如：

> 再看一下题目中的角度关系。

### Hint 2 --- Direction

指出可能存在的关系或方向。

例如：

> 这里可能存在一个没有直接写出的三角形关系。

### Hint 3 --- Method

提示具体可尝试的方法。

例如：

> 尝试检查三角形内角和是否能建立新的角度关系。

### V1.0 Rule

除非进入明确允许的教学解释状态，否则 Hint 不应直接给出完整最终答案。

------------------------------------------------------------------------

## 8. Retry

每次有效 Hint 后必须提供：

> **Try Again**

Retry 是 ASKWISE 核心学习证据之一。

系统至少记录：

-   attempt number；
-   preceding diagnosis；
-   hint level；
-   retry answer；
-   success / failure；
-   elapsed time；
-   confidence change。

没有 Retry，就无法判断 Hint 是否真正促进了学习。

------------------------------------------------------------------------

## 9. Solved + Evidence

"答对"不是流程终点。

完成后生成 **Learning Evidence**。

Evidence 至少包括：

-   Initial Attempt；
-   Diagnosis；
-   Hint(s)；
-   Retry；
-   Final Outcome；
-   Student Explanation；
-   Time / Confidence Change。

目标是回答：

> 学生这次到底解决了什么认知问题？

而不只是：

> 学生把这道题做对了吗？

------------------------------------------------------------------------

## 10. Knowledge Map

Knowledge Map 不是章节目录。

每个 Knowledge Node 可以具有以下状态：

-   `UNKNOWN`
-   `KNOWN`
-   `UNSTABLE`
-   `CALL_FAILURE`
-   `STRATEGY_WEAK`
-   `MASTERED`

Knowledge Map 应能够吸收 Evidence，但 V1.0 前端不得直接任意修改 Learning
Engine 的判断。

目标：

> 让学生看见哪些知识已经形成稳定路径，哪些知识仍存在调用或策略障碍。

------------------------------------------------------------------------

## 11. Reflection

Reflection 必须短、具体、可用于下一轮学习。

推荐问题：

1.  今天哪里原本以为自己会，实际没有真正掌握？
2.  哪个 Hint 最有帮助？为什么？
3.  哪个知识点知道，但没有及时想到调用？
4.  如果明天再次遇到类似问题，第一步会做什么？

Reflection 数据进入 Student Learning Model。

------------------------------------------------------------------------

## 12. Growth Dashboard

Growth 不应只展示：

-   完成题量；
-   正确率；
-   学习时长。

V1.0 优先追踪：

-   First-Step Time
-   Hint Dependency
-   Retry Success Rate
-   Knowledge Call Rate
-   Path Selection Quality
-   Reflection Quality
-   Recurring Error Pattern

核心判断：

> **学生的思考系统是否正在改善？**

------------------------------------------------------------------------

## 13. Next Best Task

最终目标不是机械执行 Day 1 / Day 2 / Day 3。

Next Best Task 的基本输入：

``` text
Student State
+
Recent Learning Evidence
+
Knowledge Map
+
Recurring Error Pattern
+
Learning Goal
=
Next Best Task
```

V1.0 可以先采用规则驱动，不要求复杂模型。

系统必须优先训练当前最有价值的学习瓶颈，而不是机械增加知识输入。

------------------------------------------------------------------------

## 14. Subject Strategy Boundary

ASKWISE 的学习机制可以共享，但不同学科不得机械复制同一种训练方法。

例如：

### Politics / 文科材料型任务

可采用：

> **材料信号 → 原理 → 方法论 → 表达**

### Mathematics / 推理型任务

可采用：

> **条件 → 隐含关系 → 候选路径 → 路径选择 → 第一动作 → 验证**

因此：

> **统一的是学习闭环，不是所有学科的具体教学策略。**

------------------------------------------------------------------------

## 15. Aoyu / 鳌鱼 Boundary

Aoyu 的正式定位：

> **Companion & Guidance Layer**

允许：

-   陪伴；
-   鼓励；
-   状态提示；
-   引导学生继续尝试；
-   Reflection 引导；
-   Growth 反馈。

禁止：

-   自行改变 Diagnosis；
-   覆盖 Learning Engine；
-   代替学生完成答案；
-   决定学科教学规则；
-   成为独立决策 Agent。

原则：

> **Aoyu 可以陪学生走路，但不能替 Learning Engine 决定走哪条路。**

------------------------------------------------------------------------

## 16. Education Compass Integration

Education Compass 与 ASKWISE 职责必须分离。

### Education Compass

负责发现：

-   Subject Focus；
-   Learning Bottleneck；
-   Education Growth Direction。

### ASKWISE

负责进入具体学习以后进一步判断：

> **为什么卡住，以及如何通过学习闭环重新验证。**

推荐路径：

``` text
Education Compass
       ↓
Learning Bottleneck
       ↓
Consent / Handoff
       ↓
ASKWISE Session
       ↓
Diagnosis + Learning Workflow
```

接口实现以现有正式 Data Contract 为准，不在本 PRD 中重新定义接口语义。

------------------------------------------------------------------------

## 17. Family OS Integration

Family OS 是家庭长期记录与呈现层，不拥有 ASKWISE Learning Engine。

ASKWISE 可以向 Family OS 返回：

-   Learning Progress；
-   Growth Summary；
-   Significant Learning Evidence；
-   Knowledge Map Summary；
-   Recommended Next Focus。

Family OS 不应直接修改单题 Diagnosis / Hint / Retry。

------------------------------------------------------------------------

## 18. Core Data Objects

### Student

``` text
student_id
education_system
grade
subjects
learning_goals
current_profile
```

### Task

``` text
task_id
student_id
subject
training_goal
content
estimated_minutes
completion_criteria
status
```

### Attempt

``` text
attempt_id
task_id
student_id
answer
reasoning
confidence
created_at
```

### Diagnosis

``` text
diagnosis_id
attempt_id
diagnosis_type
evidence
confidence
engine_version
```

### Hint

``` text
hint_id
diagnosis_id
hint_level
hint_content
created_at
```

### Retry

``` text
retry_id
attempt_id
preceding_hint_id
answer
result
confidence
elapsed_time
```

### Evidence

``` text
evidence_id
task_id
initial_attempt_id
diagnosis_id
retry_ids
final_outcome
student_explanation
created_at
```

### Reflection

``` text
reflection_id
student_id
task_id/day
answers
created_at
```

### KnowledgeNode

``` text
node_id
student_id
subject
knowledge_key
status
evidence_refs
updated_at
```

### GrowthMetric

``` text
metric_id
student_id
metric_type
value
evidence_refs
measured_at
```

具体数据库 schema
在实现阶段另行冻结，本节定义的是产品语义，不授权直接迁移数据库。

------------------------------------------------------------------------

## 19. MVP Scope

### Phase 1 --- Core Learning Loop

优先完成：

> **Today → Task → Initial Attempt → Diagnosis → Hint → Retry →
> Evidence**

这是 V1.0 第一验收闭环。

### Phase 2 --- Learning Memory

增加：

-   Reflection
-   Knowledge Map

### Phase 3 --- Growth

增加：

-   Growth Dashboard
-   Next Best Task

### Phase 4 --- Integration

完成：

> **Education Compass → ASKWISE → Family OS**

------------------------------------------------------------------------

## 20. V1.0 Acceptance Criteria

Core Loop 至少必须通过以下场景：

### AC01 --- Initial Attempt Required

学生不能在没有首次尝试的情况下默认获得完整答案。

### AC02 --- Diagnosis Before Hint

Hint 必须关联 Diagnosis。

### AC03 --- Progressive Hint

支持至少 Signal / Direction / Method 三层提示逻辑。

### AC04 --- Retry Recorded

Hint 后的重新尝试必须留下结构化记录。

### AC05 --- Evidence Generated

完成任务后能够形成 Learning Evidence。

### AC06 --- Diagnosis Traceability

可以追溯：

> Attempt → Diagnosis → Hint → Retry → Outcome

### AC07 --- No Core Semantic Drift

UI 不得改变 Learning Engine 已冻结的核心语义。

### AC08 --- Aoyu Boundary

Aoyu 不得成为 Diagnosis 或学习决策引擎。

### AC09 --- Student Isolation

不同学生的任务、Evidence、Knowledge Map 不得混淆。

### AC10 --- Integration Boundary

Education Compass 与 Family OS 的接入不得绕过 ASKWISE Contract /
Learning Workflow。

------------------------------------------------------------------------

## 21. Prohibited Changes

未经 Founder 单独批准，V1.0 实现阶段禁止：

-   新增 Agent；
-   重建 ASKWISE；
-   把 ASKWISE 改成 Chat-first 产品；
-   UI 驱动 Learning Engine 语义变化；
-   删除 Initial Attempt；
-   Diagnosis 前直接给完整答案；
-   删除 Retry；
-   只保存最终正确答案而不保存 Evidence；
-   让 Aoyu 负责学习决策；
-   为了 Education Compass 接入而污染 ASKWISE 内核；
-   为了 Family OS 展示需求而改变 Diagnosis 数据；
-   未经授权扩展新的学科教学逻辑；
-   未经独立 Gate 批准执行数据库迁移。

------------------------------------------------------------------------

## 22. Implementation Order

工程实现顺序固定：

``` text
Gate 0
PRD / Contract / Existing Engine Alignment
        ↓
Phase 1
Today
→ Task
→ Initial Attempt
→ Diagnosis
→ Hint
→ Retry
→ Evidence
        ↓
Phase 2
Reflection
→ Knowledge Map
        ↓
Phase 3
Growth Dashboard
→ Next Best Task
        ↓
Phase 4
Education Compass
→ ASKWISE
→ Family OS
```

不得为了展示完整产品而跳过 Phase 1 Core Loop。

------------------------------------------------------------------------

## 23. Founder Product Test

Founder UAT 不应只问：

> 页面能不能打开？

必须验证：

1.  学生第一次答错后，系统有没有先诊断？
2.  Diagnosis 是否解释了"为什么卡住"？
3.  Hint 有没有避免直接泄露答案？
4.  Hint 后学生有没有真正 Retry？
5.  Retry 是否形成 Evidence？
6.  Knowledge Map 是否因真实 Evidence 更新？
7.  Growth 是否反映学习方式变化，而不是只显示题量？
8.  Aoyu 是否始终停留在 Companion Layer？
9.  Education Compass / Family OS 是否保持职责边界？

------------------------------------------------------------------------

## 24. Product North Star

ASKWISE V1.0 的 North Star 不是：

> AI 回答了多少学生问题。

也不是：

> 学生完成了多少题。

而是：

> **学生是否越来越能够在没有 AI
> 直接给答案的情况下，识别问题、调用知识、选择路径、验证结果，并解释自己的思考过程。**

------------------------------------------------------------------------

## 25. Frozen Product Statement

> **ASKWISE™ 不是一个回答学生问题的 AI。**
>
> **ASKWISE™
> 是一套观察学生如何思考、诊断为什么卡住，并训练其逐步形成独立问题解决能力的
> AI Learning System。**

**Core Principle**

> **Diagnose First. Answer Later.**

**Core Loop**

> **Attempt → Diagnose → Hint → Retry → Evidence → Reflect → Improve**

------------------------------------------------------------------------

**END --- ASKWISE_PRODUCT_PRD_V1.0**
