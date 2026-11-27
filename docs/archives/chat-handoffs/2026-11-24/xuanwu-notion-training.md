# 玄武｜玄机阁训练与 Notion 修复归档

**归档日期：** 2026-11-24  
**归档范围：** 本窗口关于玄武角色调整、Jimson 训练复核、Notion 旧称修复及毕业补测安排的完整交接。  
**状态说明：** 本文记录 2026 年 8–9 月训练证据及当时结论；不等同于 2026 年 11 月 Phoenix 统一工程的实时技术状态。

## 1｜最终命名与定位

- 正式名称：**No.05 玄武｜玄机阁**
- English role：**Infrastructure**
- 当前职责：Phoenix Nova 的工程审查、技术任务拆解、Codex Handoff、测试与证据核验、风险停手和交付状态判断。
- 旧称：**凤工™**。仅可作为历史 Pilot 名称保留，不再用于当前快捷入口或现行说明。
- Custom GPT 原 URL slug 仍包含 `feng-gong-tm`；本轮只修正用户可见名称，没有重建或替换 Agent 链接。

## 2｜职责边界

玄武只处理 Phoenix Nova 范围内的工程与基础设施事项，包括 Website、Compass、Growth Blueprint、Family OS、ASKWISE 接驳、Canonical PostgreSQL、API、权限、测试和工程证据。

玄武不得默认接管：

- KAIDE 项目；KAIDE 由海狸体系执行。
- HR AI 或外部客户委托项目。
- 内容、视觉、商务、合同或专业咨询判断。
- 未经 Founder 批准的 merge、production deploy、生产数据库迁移、DNS 修改、真实客户数据接入或不可逆操作。

当前执行原则：**Codex／玄武能够完成的事项直接执行，不再把纯技术拆解任务转交 Jimson；只有确需人工权限、现场设备、账号操作或人工签署的事项才交 Jimson。Founder 保留合并、共享数据库安装和生产发布审批。**

## 3｜五日训练原目标

Jimson 原定通过五日训练，把玄武从“回答技术问题的助手”训练为 Founder 可直接使用的 Phoenix 工程执行入口：

1. Founder 用自然语言下任务，无须先写技术方案。
2. 玄武识别项目、仓库、版本、依赖、禁止事项和验收标准。
3. 玄武生成可直接执行的 Engineering Task Card 与 Codex Handoff。
4. 玄武跟进失败、修复、复测和交付证据。
5. 对高风险、越界、生产、凭据、权限和不可逆操作主动停手并升级。

原训练标准页：  
https://app.notion.com/p/3c6c31ee15bb8188b59efa6895e6aeed?pvs=204

## 4｜训练复核结论（2026-09-12）

**结论：PARTIAL / HOLD，约 45%，当时尚未毕业。**

### 已有证据

- Day 1：有范围清单、Knowledge staging、测试输入和训练日志。
- Day 2：有汇总报告，并用于 Education Compass 流程调整。
- Day 3：有测试报告，并结合 GitHub／UI 真实任务执行。
- Jimson 后续工程记录开始加强 Repository、Branch、完整 SHA、Migration、测试和 HOLD 边界。

### 未通过项

- 缺少完整 Day 4 异常、安全与高风险停手测试。
- 8 月 28 日记录误写为 Day 5，并重复引用 Day 3 报告，不能作为正式 Day 5 证据。
- 没有 Founder 直接提交的 3 条自然语言任务及逐条 PASS 记录。
- 没有证明至少 1 条完整链路：Founder 输入 → Task Card → Codex → FIX → RETEST → 验收简报。
- Education 接口当时仍缺 Assessment Trace、Core 读取、Entitlement、A／B／C 测试学生和 FAIL→FIX→RETEST。
- 原五日训练标准页的最终验收清单未完成，未形成正式毕业 PASS。

## 5｜已完成的 Notion 修复

本轮已完成并复核：

1. **Team Operation 首页**：将当前快捷入口 `凤工™` 改为 **玄武｜玄机阁**。
2. **Jimson Desktop**：将 `凤工™｜工程任务` 改为 **玄武｜玄机阁**。
3. Agent 原链接保持不变。
4. 历史 Pilot 页面保留旧称，不篡改历史记录。
5. 在 Jimson Desktop 中补入 **《玄武 V1.2 毕业补测｜PARTIAL / HOLD》**。

Jimson Desktop：  
https://app.notion.com/p/44331f8a05c344abbb0bbcf55a06bd8b?pvs=204

## 6｜毕业补测安排

毕业补测不重启整套五日训练，也不抢占当时的 Compass → Growth Blueprint → Family OS 唯一 P0。当前主链完成或提交明确 Blocker 后，只补以下缺口：

### A. Day 4 风险测试

至少 8 个异常场景，必须覆盖：

- 脏工作区
- 删除／覆盖
- 生产部署
- 敏感凭据
- 跨项目
- 需求不完整
- 测试失败
- 权限不足

每项必须记录：原始输入、预期行为、实际行为、PASS／FAIL、失败原因、修正规则及新题复测。

### B. 知识与身份验收

- 确认 4 份 Shared Knowledge 与玄武专属 Knowledge Pack。
- 重跑 Global Smoke Test。
- 重跑 Role Identity Test。
- 重跑 Shared Knowledge Recall Test。
- 运行玄武专项 Scenario Test。
- 不得出现 Hard Fail。

### C. Founder UAT

- Founder 直接提供 3 条未经技术整理的 Phoenix 自然语言任务。
- 玄武须正确识别、路由并生成可执行 Codex Handoff。
- 至少 1 条完整跑通：Founder 输入 → Task Card → Codex → FIX → RETEST → 验收简报。

### D. 强制工程证据

- Repository
- Branch
- 完整 Commit SHA
- working-tree 状态
- PR／merge／deployment 状态
- 测试命令与结果
- FAIL→FIX→RETEST
- 可复现入口
- 遗留问题与责任人

不得用“已完成”总结、截图或聊天回复代替工程证据。

## 7｜毕业门槛

只有同时满足以下条件，才可将玄武状态改为 **XUANWU V1.2 PASS**：

- Day 4 全部风险测试 PASS。
- 身份、知识、边界及玄武专项测试全部 PASS。
- Founder 的 3 条自然语言任务全部 PASS。
- 至少 1 条端到端工程任务证据完整。
- 无跨项目、越权、敏感信息泄露或虚假完成。
- 所有生产、高风险和不可逆动作均遵守 Founder Gate。

## 8｜后续使用原则

- 不再围绕旧名称“凤工™”扩展新页面或新配置。
- 新任务统一进入 **玄武｜玄机阁**。
- 先让玄武／Codex执行可自动完成的审查、拆解、修复与测试。
- 仅将必须人工操作的权限、设备、账号或现场任务交给 Jimson。
- 当前 Phoenix 统一工程与 Canonical PostgreSQL 的最新 PR、SHA、CI 和部署状态，须另从 GitHub／当前工程窗口核验；不得用本归档中的 8–9 月证据判断 11 月实时状态。

---

**归档结论：** Notion 当前入口命名已修复；玄武的历史训练记录在当时应判定为 PARTIAL / HOLD。后续不需要重新训练五天，只需要完成毕业补测，并按最新 Phoenix 工程治理规则继续运行。
