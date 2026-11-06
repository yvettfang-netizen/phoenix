# Phoenix Meta｜执行验收、发布门禁与回滚补充

任务：PHOENIX-META-CANONICAL-ACCEPTANCE-ROLLBACK-20261105。关联主任务：PHOENIX-META-CANONICAL-INTEGRATION-20261105。日期：2026-11-05（Asia/Shanghai）。**发布结论 HOLD；无生产授权。**

## 审核绑定要求

审核包version：Acceptance Addendum V1。应用候选640451c1ddfc799cf2bf2a304e6c2d1e93b0549a；Canonical19feef190dcba13ccc9181c998d4c82527377803；本地Windows/Node24，非Staging。所有新审核必须记录 reviewer identity、角色、exact SHA、环境ID、证据artifact hash、时间、结论和条件。任何代码/Schema/权限变动使受影响批准失效，需重审。

| 审核方 | 必须确认 | 当前 |
|---|---|---|
| Codex / 工程 | build、测试、代码来源、四层恢复实测证据 | 局部证据已准备；全栈与回滚HOLD |
| Jimson | Canonical兼容性、角色/ledger、备份恢复、Forward方案 | PENDING，无代签 |
| 玄武 | Gateway、RLS、Agent、人类actor、票据、连接池、审计 | 技术审查结论HOLD；不是独立复核签字 |
| 白虎 | Consent、隐私、敏感数据边界、审计保留 | PENDING，无代签 |
| 麒麟 | A-E业务流程、专业边界、体验、Learning分离 | PENDING，无代签 |
| GPT Pro | 企业架构及长期兼容 | PENDING，无代签 |
| Founder | 最终上线范围及风险、阈值、窗口、责任人 | NOT APPROVED FOR PRODUCTION |

Luna执行的证据提取/测试不是白虎、麒麟或Jimson独立审核，不据Plugin skill加载冒充独立Agent签署。

## 未来生产变更单模板（本轮不提交执行）

必须填：变更ID、Founder明确批准引用、发布/结束窗口与时区、部署责任人、回滚责任人、精确应用/API/Schema/Runtime版本、已批准权限范围、合成UAT与M0-M8证据、监控阈值、停止条件、四层回滚目标、RPO/RTO/保留审批、外部幂等/补偿清单与通信计划。任一缺失→HOLD。

禁止自动合并PR、执行生产Migration、修改腾讯云生产配置、导入真实业务数据、开启Health敏感访问、付款退款签约、扩大Spirit权限、删除历史数据库或原系统。即使Staging全部通过也不自动获得这些授权。

用户补充在“如未来获批生产发布，必须另行”处结束。只采用已收到的明确限制；完整上线后验收条款待补齐，不自行补成生产授权。未来获得批准后另行记录PRODUCTION DEPLOYED与POST-DEPLOY VERIFIED，后者至少应按获批变更单的检查与停止条件执行；本轮没有这两项状态。
