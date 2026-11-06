# RPO/RTO及恢复点门禁

**R08完整验收 = HOLD。** 当前没有本次演练预先批准的RPO/RTO数值、WAL归档/PITR恢复点或Staging恢复目标。不得在看到结果后选择阈值，不把逻辑dump恢复或既有FD7空库/合成政策自动扩展为正式容灾目标。

可以自主执行：专用backup账号logical dump及roles导出、完整性校验、停自有源集群、在全新自有集群restore、逐表及账本一致性、API/权限复验。阶段记录recovery_started_at/recovered_at，计算本地观测毫秒。这个间隔只覆盖明确的本地操作，不是已批准RTO，RPO填HOLD而不是0。

以上逻辑恢复子项已实际执行：PG16观测recovery_started_at→recovered_at为7415ms；PG17为7129ms（旧本地执行SHA分别f600b9c…、25d92c9…；仅作该次测量）。这不包含完整事故发现/备份导出/后续业务回归，不是端到端故障RTO。R08记录保留dump/roles SHA-256、源/恢复审计行数、逐表摘要及实际时间；最终CI新测量另归档。最终实现还将backup_started_at与停止源集群的injected_at分开记录，禁止以备份开始时间冒充故障发生。

R01维护页恢复9381ms、R03源修复468ms、R13重开14492ms是旧本地浏览器的观测区间；不将这些事后数值反向设为批准阈值。每个场景分别保存检测、隔离、恢复起止时间，完整数据库RPO仍HOLD；正式RTO达标判定HOLD。

需要Founder/实际运维责任人补：拟核验环境及恢复目标、允许的数据与故障范围、批准RPO/RTO、WAL/PITR归档/保留/加密/密钥引用和目标恢复时间、事故角色、回切及独立签收。只收文档引用和版本摘要，不收密钥或真实数据。

Frontend/API失败的恢复区间单独报告，不机械套用DB RPO。已下载文件不能收回；已发短链接的TTL/撤销政策未提供，因此R05相关验收继续HOLD。
