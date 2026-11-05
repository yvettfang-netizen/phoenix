# R01–R14 故障演练矩阵

任务PHOENIX-FAMILY-CENTER-V2-DRILL-ACCEPTANCE-20261105。日期2026-11-05。基于PR57固定fb2f49cdc55ba57ec43e5c08ab561ee7bbe0f683，独立候选，不改变PR57或其20/20历史结果。新提交必须重新验收。

本目录签入时测试准备完成，执行记录待生成；最终结果以私有原始记录和同SHA的CI为准。以下HOLD不申请自动豁免；不把缺失Runtime或患者接口标N/A PASS。

| 场景 | 可执行范围/检测与恢复 | 当前完整门禁 |
|---|---|---|
| R01 页面失败 | 本地document503→真实服务端维护开关→中英/1440+390 Smoke；新加安全维护页无资料读取，避免未经审查就恢复旧演示页 | NOT RUN（准备就绪）；Staging HOLD |
| R02 跨家庭 | Family A请求B注册学生ID→404+DB DENY/request ID→A正常读；业务/账本指纹不变 | NOT RUN |
| R03 API500 | loopback upstream double500→真实BFF503→页面无旧DTO且无无限重试→源恢复；无数据库写入 | NOT RUN；明确属于传输层合成演练 |
| R04 身份/票据 | 当前PG回归+新分离LOGIN探针：过期/错误aud/签名、家庭头、错误主体/过期/重放票据、clear | HOLD：直接SQL拒绝的正式持久审计/完整生命周期签收未齐 |
| R05 Consent撤销 | 现有监护/身份/映射撤销回归重跑；真实患者Capability、文件下载签发与已签链接撤销策略缺失 | HOLD；链接/Agent部分NOT RUN |
| R06 不兼容 | 自有集群函数返回v1 DTO→gateway503；恢复原函数→200；源Migration及账本不变 | NOT RUN；本地响应兼容，非Staging发布前验收 |
| R07 DB连接断 | 只暂停当前带nonce标签的一次性容器→503→unpause→新请求身份重验/上下文为0；比较业务与账本 | NOT RUN |
| R08 恢复 | dedicated backup导出/摘要校验/新集群restore；Person/Family/Student/CRM/Service/Consent/Guardian/mapping指纹+账本；记录实际恢复区间 | HOLD：无预先批准RPO/RTO、WAL/PITR及明确时间点；空表不视为非空关系测试 |
| R09 Agent越权 | 没有已验收HARMONY/Orchestrator能力接口；不新建假Gateway给自己验收 | HOLD / NOT RUN |
| R10 Agent结果丢失 | 没有Agent Task权威状态/幂等API，不通过本地Map冒充任务账本 | HOLD / NOT RUN |
| R11 医疗越权 | 普通DTO无医疗字段，现有严格字段拒绝测试保留；患者级文件/Consent接口未实现 | HOLD / NOT RUN；字段不存在不当作患者拒绝PASS |
| R12 审计失败 | 自有集群审计trigger拒绝INSERT→503无DTO、无伪造审计；移除故障→200且新增真实READ审计 | NOT RUN；原deferred COMMIT故障也重跑 |
| R13 flags | 真实服务端投影开关false→直接URL404；维护页安全；重新开启重读 | HOLD：应用flag子项可跑；Agent高风险任务暂停未实现 |
| R14 过期来源 | 浏览器clock推进60s验证DTO清空、刷新重读；60s仅既有前端保留窗 | HOLD：CRM/Service/Learning真实更新时间与批准新鲜度合同未齐 |

准备检查：仅本地loopback、合成fixture、独立容器/卷和专有nonce；配置文件存在则拒绝覆盖。V7身份沿用，未连接腾讯/生产。所需独立审核人、Staging归属、RPO/RTO、患者/Agent合同未齐，最终发布HOLD。

生命周期字段由实际阶段写入，未知时间为null且明示NOT CAPTURED，不从日志完成时间倒填注入时间。N/A仅用于不适用的DB RPO或未实现Agent版本；不得作为豁免批准。普通本地记录不是独立审核签名。
