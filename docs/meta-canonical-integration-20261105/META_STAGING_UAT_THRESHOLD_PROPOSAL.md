# Phoenix Meta｜执行验收、发布门禁与回滚补充

任务：PHOENIX-META-CANONICAL-ACCEPTANCE-ROLLBACK-20261105。关联主任务：PHOENIX-META-CANONICAL-INTEGRATION-20261105。日期：2026-11-05（Asia/Shanghai）。**发布结论 HOLD；无生产授权。**

## 预先审批，不随测试结果放宽

以下是可供审核的具体提案，尚未获批准；不作为本轮已通过阈值。审批需绑定应用SHA、Canonical/迁移版本、环境、采样方法、样本规模、时间窗口及审批人；变更阈值需新版本审批并重新运行。

| 指标 | 待批准提案 | 测量条件 |
|---|---|---|
| 读取延迟 | p95≤1500ms，p99≤2500ms；3s超时必须fail-closed | 每条路由/角色独立，冷启动单列，30分钟及至少1000次合成读取 |
| 非预期错误率 | ≤0.1% | 分子5xx/超时/契约拒绝；故意注入失败独立统计，不从普通错误中删掉不利样本 |
| UAT有效读取可用性 | ≥99.9% | 获准且依赖健康的请求成功；预期401/403另统计；30分钟不足以承诺生产SLA |
| NOW/DELIVERY数据新鲜度 | 已验证源as-of≤5分钟，超出显示历史快照/不可用并禁止称实时 | Source核验时间与投影生成时间分别保存 |
| 安全/审计 | 越权成功0、关键缺陷0、所有allow/deny/error/tool审计覆盖100% | 每次request nonce关联；日志失败必须拒绝数据释放 |
| 关闭flag | 传播时延提案≤60s；生效后新请求后端调用0 | 实际平台传播及inflight处置必须实测；现有组件flag测试不证明此值 |

## Staging准入资料（目前均缺）

独立Staging项目及URL、负责人、受控部署通道、已批准测试Canonical实例、App/Binder独立身份、合成seed、审计接收器/监控、可恢复API版本、Runtime版本、已批准阈值。所有数据默认合成，禁用Health原件和真实客户/学生/患者/财务记录；不复用现有production Sites URL作Staging。

本任务不擅自创建新Meta应用替代原系统。若平台无法提供同应用隔离Staging，先提出经批准的测试部署方案再执行，不把新的公开Sites当“测试”绕过发布禁令。

## UAT执行单

在准入通过后依次执行：部署精确候选→绑定测试实例→所有route正/负例→九灵scope→桌面及mobile A-E→错误/超时/DB不可用→日志监控→flag→四层回滚→恢复后smoke。每一步保存版本、时间、环境、request/audit引用与结果。任何未解决故障HOLD；不得在失败后改口径得PASS。

## 恢复目标审批

RPO、RTO、保留周期、加密/访问及异地策略均PENDING_OWNER_PROPOSAL / NOT APPROVED，由Jimson和部署负责人提出并由Founder批准。先完成隔离恢复演练再测量；不在无证据时承诺数值。恢复可能丢已确认业务数据时另需Founder具体授权。
