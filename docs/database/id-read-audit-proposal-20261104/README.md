# 正式 ID 翻译与数据库读取审计：最小 Forward 方案

2026-11-04｜Jimson 本人授权，Codex 执行。**方案准备 PASS；SQL 实现及 PG16/17 新能力验收 NOT RUN；真实身份启用 HOLD。** 本文不构成新的 Founder 签署或独立安全审核。

| 项目 | 本轮事实 |
|---|---|
| 已合并权威 | phoenix/main `9355d28667ee9cf4761b4abcdaf959f0ad154820`，`database/canonical/`，0001–0035 |
| 读取代码基线 | [PR46](https://github.com/yvettfang-netizen/phoenix/pull/46) `97e47f2287483aeda63948c849ea5eed07f0153b`，Draft、未合并；依赖未合并 PR45 |
| 并行 Migration | [PR41](https://github.com/yvettfang-netizen/phoenix/pull/41) `3de5c99fcc1974ca542db587fcb01494ffe3dc58`，独立 0036 候选，未合并 |
| 本轮候选 | 仅文档与只读证据核验工具；不新增 migrations 下 SQL，不应用或预留编号。当前下一可协调编号为 0037，落地前必须重新核对并行开发 |
| 既有 PG16/17 验收 | [PR46 合成验收](https://github.com/yvettfang-netizen/phoenix/blob/97e47f2287483aeda63948c849ea5eed07f0153b/docs/database/family-student-projection-20261104/TEST_REPORT.md)，不是本方案的执行证据 |

已完成：[既有 ID 决策溯源](ID_DECISION_TRACEABILITY.md)、[最小 Forward 设计](FORWARD_MIGRATION_PROPOSAL.md)、[真实身份缺口核查与填写表](REAL_IDENTITY_GAP_AUDIT.md)、[PG16/17 验收矩阵](ACCEPTANCE_PLAN.md)。实际只读命令及输出见 [证据](evidence/baseline-verification.json)，可复跑 `node docs/database/id-read-audit-proposal-20261104/verify-baseline.mjs`。

本轮明确解决方案层面的两个缺口：从权威 public_ids 表按已授权对象翻译 ID；通过专用、无业务表直读/直写权限的角色执行返回最小投影并内部记录审计的函数。不能对旧 reader 简单增授 mapping SELECT 或审计 INSERT。审计写入要求新调用使用普通事务，不能保留 `BEGIN READ ONLY`；业务数据仍不可由该角色写入。

**唯一下一工程动作：审查本窄方案后，在再次协调 Migration 编号的独立本地实现批次，落地受控函数与专用角色，并完成全部 PG16/17 合成验收。** 真实身份事实未补齐不阻碍合成实现准备，但阻止真实登记和启用。本轮不合并、不部署、不连接腾讯、不导入真实资料、不改历史 Migration、不改既有审批状态。
