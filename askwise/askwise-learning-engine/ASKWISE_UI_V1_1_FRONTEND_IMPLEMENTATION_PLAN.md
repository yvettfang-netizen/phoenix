# ASKWISE UI V1.1 Frontend Implementation Plan

## A. UI Implementation Plan

### 1) 页面 / 状态映射
基于现有工程（`askwise-learning-engine`）的当前路由，我们将按「用户路径」与「Frame」分层：

- **Today / Dashboard（现有）**
  - 当前：`/` Today + `/dashboard`
  - 覆盖 V1.1 Frame：`Initial Attempt`（任务入口）、`Solved and Learning Evidence`（仅跳转）

- **Student Task / Initial Attempt（现有 + 待增强）**
  - 当前：`/student-task`
  - 覆盖 V1.1 Frame：`Initial Attempt`

- **Diagnosis（待组件化）**
  - 当前：`/task/[taskId]` 在提交后即时展示 `Diagnosis` 卡片
  - 覆盖 V1.1 Frame：`Diagnosis`

- **Hint and Retry（待组件化）**
  - 当前：`/task/[taskId]` 复用同页显示最新 hint + 提交框
  - 覆盖 V1.1 Frame：`Hint and Retry`

- **Solved + Learning Evidence（待组件化）**
  - 当前：`/task/[taskId]` solved 状态 + `/evidence`
  - 覆盖 V1.1 Frame：`Solved and Learning Evidence`

- **Knowledge Map（部分存在）**
  - 当前：`/maps/political`（政治）、`/maps/math`（数学）
  - 覆盖 V1.1 Frame：`Knowledge Map` 的“可填写证据”区域

- **Reflection（现有）**
  - 当前：`/reflection`
  - 覆盖 V1.1 Frame：`Reflection`

- **Growth Dashboard（现有）**
  - 当前：`/dashboard`
  - 覆盖 V1.1 Frame：`Component Library` 之外的真实学习概览

### 2) 组件拆分建议（不改变学习引擎）

#### 先复用的现有页面骨架
- Root Layout + NavBar：`src/app/layout.tsx`
- 全局样式容器：`src/app/globals.css`
- 数据获取与数据库接口：`src/lib/db.ts`
- 引擎调用路径：`src/lib/engine/*`

#### 建议新建 / 重构组件（保守 MVP）
- `src/components/task-flow/task-state-shell.tsx`：统一封装当前任务五状态（Initial / Diagnosis / Hint / Retry / Evidence）切换
- `src/components/navigation/top-nav.tsx`：从 layout 中提取
- `src/components/shared/card-shell.tsx`：统一卡片风格（替代重复 inline card 结构）
- `src/components/aoyu/aoyu-companion.tsx`：Aoyu 状态机组件（仅显示状态标签）
- `src/components/task-flow/confidence-selector.tsx`：初始/重试输入前的信心级别
- `src/components/task-flow/diagnosis-card.tsx`
- `src/components/task-flow/hint-card.tsx`
- `src/components/task-flow/retry-input.tsx`
- `src/components/task-flow/evidence-timeline.tsx`
- `src/components/maps/knowledge-map-card.tsx`
- `src/components/reflection/reflection-card.tsx`

### 3) 是否可按现有工程直接实现 V1.1
- 可直接实现为“最小增量”：现有架构是 Server Component 页面 + DB/Engine 调用，已可支撑完整闭环。
- 未发现必须重构引擎或持久化层的硬性阻碍。

---

## B. Component Map（目标组件与来源）

- **Navigation**
  - 现有：`src/app/layout.tsx` 内联 `nav`
  - 建议：提炼为 `components/navigation/top-nav.tsx`

- **Day Progress**
  - 现有：`/` 首页中 `todayTasks`、`completedToday` 与 `totalTasksToday`
  - 建议：单独 `components/dashboard/day-progress.tsx`

- **Learning Task Card**
  - 现有：`/` 与 `dashboard` 列表卡片
  - 建议：`components/task/task-card.tsx`

- **Confidence Selector**
  - 现有：`/student-task` 的 `select#confidence`
  - 建议：提取为 `components/task-flow/confidence-selector.tsx`，复用于手动任务与重试场景

- **Diagnosis Card**
  - 现有：`/task/[taskId]` 的 `Diagnosis` 区域
  - 建议：`components/task-flow/diagnosis-card.tsx`

- **Hint Card**
  - 现有：`/task/[taskId]` 的 `Retry & Hints`
  - 建议：`components/task-flow/hint-card.tsx`

- **Retry Input**
  - 现有：`/task/[taskId]` 的 textarea + submit
  - 建议：`components/task-flow/retry-input.tsx`（统一 Initial Attempt + Retry）

- **Learning Evidence Timeline**
  - 现有：`/evidence` 列表展示
  - 建议：`components/evidence/evidence-timeline.tsx`

- **Knowledge Map Card**
  - 现有：`/maps/political` 与 `/maps/math` 的 list + 表单
  - 建议：`components/maps/knowledge-map-card.tsx`（复用结构）

- **Aoyu Companion**
  - 现有：无
  - 建议：`components/aoyu/aoyu-companion.tsx`
    - 输入：`state` in `['idle','listening','thinking','guiding','encouraging','celebrating','reflecting']`
    - 输出：统一图像占位（同一张母版图 + 状态标签）

- **Reflection Card**
  - 现有：`/reflection` 的表单卡
  - 建议：`components/reflection/reflection-card.tsx`

- **Primary / Secondary Buttons**
  - 现有：`globals.css` 的 `.button`
  - 建议：`components/ui/button.tsx`（`primary` / `ghost` / `subtle`）

---

## C. Route / State Plan

### 独立 route（建议保留）
- `/`：Today / Dashboard（Day 任务总览）
- `/student-task`：任务创建（手动补充）
- `/task/[taskId]`：任务交互主流程（Initial / Diagnosis / Hint / Retry / Solved）
- `/evidence`：学习证据列表
- `/maps/political`：知识图谱（政治）
- `/maps/math`：策略地图（数学）
- `/reflection`：每日反思
- `/dashboard`：学习成长看板

### 同页状态切换（建议）
- `/task/[taskId]` 继续作为“一页式学习闭环”：
  1. 显示任务卡
  2. 提交初始尝试/重试
  3. 展示 Diagnosis
  4. 展示 Hint（0-5）
  5. 重试输入
  6. 成功后显示 solved + 引导到 evidence

### 说明
- 遵循“不像聊天机器人”：明确分区块展示状态，不是滚动式对话流。

---

## D. Data Binding Plan（与现有引擎接口对齐）

### 1) diagnosis
- 调用链：`src/app/task/[taskId]/page.tsx -> addAttempt/saveDiagnosis -> diagnose()`
- 引擎来源：`src/lib/engine/diagnosis.ts`
- 显示字段：`diagnosis.type / diagnosis.reason`

### 2) hint
- 调用链：`nextHintLevel -> buildHint`
- 存储：`src/lib/db.ts` 的 `saveHint`
- 回显：`getSessionSnapshot(...).latestHint`
- 目标：始终展示 `hint_level + content`，禁止早期泄露完整答案

### 3) retry
- 输入提交：`/task/[taskId]` 表单 action `submitAttempt`
- 计数更新：`addAttempt`、`saveHint`
- 重试计数来源：`learning_sessions.retry_count`
- 重试策略：`nextHintLevel` 按错题递增

### 4) evidence
- 生成：`buildEvidenceForSession`
- 存储：`learning_evidences`
- 页面：`/evidence`
- 展示字段：final_result, independence, hint/retry count

### 5) reflection
- 存储：`daily_reflections`
- 页面：`/reflection`（提交与读取）
- 绑定字段：`q1/q2/q3`

### 6) dashboard stats
- 现有来源：`getDashboardStats`
- 现有字段：任务完成率、独立完成率、平均 hint、主流诊断、反思完成度
- 建议补齐：与 `hint_count/retry_count` 的近7天趋势

---

## E. Gaps / Risks（真实缺口）

1. **组件体系不足**
   - 目前几乎无共享组件，样式与交互重复、难以统一“Premium / Warm / Calm / Intelligent”语气。

2. **Aoyu 角色未落地**
   - 现有工程无该组件；需新增统一状态组件。

3. **`/task/[taskId]` 状态层不够显式**
   - 已有数据流但缺少显式状态枚举（Initial/Diagnose/Hinted/Solved）与过渡动画。

4. **视觉语言不一致**
   - 全局字体和风格偏系统默认（Inter），未满足 V1.1 的“精致稳重”风格诉求。

5. **题目内容来源分离性弱**
   - 今日任务仍有 placeholder 机制；历史数据未完全固化时显示“Awaiting historical data”。

6. **证据/地图的闭环可视化不足**
   - 已有数据落库，但尚未在 dashboard 中形成“今日任务结果 -> 地图更新 -> 反思 -> 成长指标”一页式可视化。

7. **可访问与状态体验优化未完成**
   - 未实现状态标签、Aoyu companion 与关键动作反馈（每步成功/失败）提示。

---

## 结论

- 本轮不新增功能，不变更核心教学引擎。
- 采用“现有 API/DB 不改 + 页面/组件增量重构”路径。
- 当前可在一个开发周期内完成：
  - 路由保留
  - `/task/[taskId]` 状态化改造
  - Aoyu 组件接入
  - 统一卡片与按钮样式
  - 关键页面（Today / Task / Evidence / Maps / Reflection / Dashboard）重构为 V1.1 Frame 视图。
