# Phoenix Meta × Canonical Integration V2.0

任务 PHOENIX-META-CANONICAL-INTEGRATION-20261105；审查日期 2026-11-05（Asia/Shanghai）。状态：LOCAL CANDIDATE / HOLD，非生产验收。

## 五个只读投影（设计，物理视图未部署）

| 模块 | 允许事实 | 优先复用数据 | 不能推断 |
|---|---|---|---|
| NOW | 指定范围当前待处理任务及明确阻塞 | service.tasks / project / task assignment | 所有open任务都自动属于Founder |
| DECISIONS | 有来源、owner、版本的待决策事项 | 专门Founder Decision/Gate对象待补 | 个人记录或Spirit建议已经批准 |
| RISK | 经验证且未解除的风险与阻塞 | service阻塞 + 受控风险证据投影待补 | AI生成判断是已验证风险 |
| DELIVERY | 服务项目/任务/里程碑与交付状态 | service.projects/tasks/milestones/deliverables | pipeline=收入；任务done=交付已验收 |
| OPPORTUNITY | 已核实且作用域获准的业务机会 | crm.leads/deals及证据 | deal金额=已收款；预测=承诺 |

Gateway必须在查询前裁剪组织/客户/家庭/Spirit范围，不能取全库后仅在浏览器过滤。详情只返回许可摘要，所有计数也受授权；小样本披露阈值未经批准不开放聚合。

每项字段：id/title/module/spirit/owner_reference/status/source_reference/source_version/verified_at/permission_scope。scope是不透明policy引用，不能由浏览器提交。source_reference是已授权对象引用，不是PG内部ID/密钥/原始文件URL。source_version是源版本，不是查询时间；verified_at来自核验事件，不自动填now()充当业务核验。

状态VERIFIED/PENDING/BLOCKED/DRAFT/HISTORICAL显式保留；DRAFT与HISTORICAL不算已执行或实时事实。业务状态词汇需逐源状态机映射，未映射值拒绝。外层VERIFIED表示本次投影通过验证，不代表所有待决策item已批准。

响应必须携带audit_reference。不得用mock作为真实页面默认数据，不授权source_reference任意跳转，不跨用户缓存。当前只准备DTO校验与空状态，无真实五模块数据来源通过证据。
