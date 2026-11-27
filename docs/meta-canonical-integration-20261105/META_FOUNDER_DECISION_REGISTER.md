# Phoenix Meta × Canonical Integration V2.0

任务 PHOENIX-META-CANONICAL-INTEGRATION-20261105；审查日期 2026-11-05（Asia/Shanghai）。状态：LOCAL CANDIDATE / HOLD，非生产验收。

## 本轮授权与未决事项

| ID | 事项 | 已知授权/建议 | 状态 |
|---|---|---|---|
| M01 | 保留现有Meta并做本地只读适配 | 用户已授权，实际源码已定位；不重建 | LOCAL CANDIDATE |
| M02 | Canonical主数据唯一性 | 不建第二套客户/家庭/学生/服务库 | ENFORCED IN CHANGE SCOPE |
| M03 | Agent最小权限、组织/家庭scope及敏感数据边界 | 本包矩阵为proposal，需Founder批准和Jimson物理确认 | PENDING / F3 |
| M04 | Forward数据模型及READ审计 | 复用基础，差额独立设计；0036/37已有PR | HOLD / Jimson + 玄武 |
| M05 | Gateway身份与服务绑定 | 确认可信入口头清洗/映射、App/Binder、票据和RLS | HOLD / 玄武 |
| M06 | 生产部署/迁移/真实数据启用 | 本轮没有此项授权或验收证据 | NOT AUTHORIZED |
| M07 | 任务分配/决策/审批写入 | 首期关闭；状态机、权限、幂等与审计需独立确认 | HOLD / F3 |
| M08 | 截断的禁止清单 | 用户消息在“自动”处终止，不能补造后续文本 | EVIDENCE_MISSING |

Founder → Phoenix → Relevant Spirits → Phoenix Synthesis → Founder Gate。此包为玄武工程候选；没有声称独立白虎或凤凰审阅已发生。HANDOFF_REQUIRED: Phoenix（综合及权限范围）、Jimson（Schema/Gateway）、Baihu（敏感数据/披露边界）。

当前可审核具体结果：九份文档、实际源码候选及patch、合成验证记录。真实接通不能通过本包文档批准自动发生，F3未批准不提供任何Canonical执行写接口。

## 执行验收与回滚补充

本轮新增M0–M8门禁，详见[META_ACCEPTANCE_RELEASE_GATE_REGISTER.md](META_ACCEPTANCE_RELEASE_GATE_REGISTER.md)、[四层回滚方案](META_FOUR_LAYER_ROLLBACK_RUNBOOK.md)及[演练记录](META_ROLLBACK_DRILL_REPORT.md)。精确版本和artifact hash见ACCEPTANCE_EVIDENCE_MANIFEST.json。原67版隔离build/typecheck通过、原回归8/17；本轮候选定向12/12与5个组件探针通过，均不能替代完整PG16/17、Staging、独立安全审核或回滚演练。本轮未改应用代码、SQL或生产配置，发布HOLD。
