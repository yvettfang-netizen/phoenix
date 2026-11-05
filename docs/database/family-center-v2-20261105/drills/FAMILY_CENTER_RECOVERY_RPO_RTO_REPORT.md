# RPO/RTO及恢复点门禁

**R08完整验收 = HOLD。** 当前没有本次演练预先批准的RPO/RTO数值、WAL归档/PITR恢复点或Staging恢复目标。不得在看到结果后选择阈值，不把逻辑dump恢复或既有FD7空库/合成政策自动扩展为正式容灾目标。

可以自主执行：专用backup账号logical dump及roles导出、完整性校验、停自有源集群、在全新自有集群restore、逐表及账本一致性、API/权限复验。阶段记录recovery_started_at/recovered_at，计算本地观测毫秒。这个间隔只覆盖明确的本地操作，不是已批准RTO，RPO填HOLD而不是0。

需要Founder/实际运维责任人补：拟核验环境及恢复目标、允许的数据与故障范围、批准RPO/RTO、WAL/PITR归档/保留/加密/密钥引用和目标恢复时间、事故角色、回切及独立签收。只收文档引用和版本摘要，不收密钥或真实数据。

Frontend/API失败的恢复区间单独报告，不机械套用DB RPO。已下载文件不能收回；已发短链接的TTL/撤销政策未提供，因此R05相关验收继续HOLD。
