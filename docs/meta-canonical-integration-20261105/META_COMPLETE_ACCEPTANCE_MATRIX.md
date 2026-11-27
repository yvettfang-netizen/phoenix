# Phoenix Meta｜执行验收、发布门禁与回滚补充

任务：PHOENIX-META-CANONICAL-ACCEPTANCE-ROLLBACK-20261105。关联主任务：PHOENIX-META-CANONICAL-INTEGRATION-20261105。日期：2026-11-05（Asia/Shanghai）。**发布结论 HOLD；无生产授权。**

## 局部通过与完整验收分开

绑定应用候选640451c、Canonical19feef1、Windows Node24本地环境。此前源码定向12项在本补充收到后重新运行，12/12 PASS。下表LOCAL PASS不是全栈PASS。

| ID | 必须覆盖 | 当前结果/待执行证据 |
|---|---|---|
| M2-01 | L1山海九域加载/导航/回到入口 | 源码与前轮浏览器部分核验；当前全路由E2E NOT RUN |
| M2-02 | L2四海八荒及九灵入口 | 路由定位；完整已登录入口E2E NOT RUN |
| M2-03 | L3九灵正式编号/名称/职责 | LOCAL PASS，候选定向测试；部署旧版仍漂移 |
| M2-04 | NOVA五模块顺序/空状态 | LOCAL PASS；真实Source/Owner/Status/VerifiedAt/Scope/EvidenceReference全链 NOT RUN |
| M2-05 | Phoenix路由与综合 | NOT RUN，页面导出委托与外部对话不证明编排 |
| M2-06 | Founder决策与审批记录 | NOT RUN，无专门状态机/写契约 |
| M2-07 | Family OS授权摘要 | NOT RUN，不将Family demo授权等同Canonical |
| M2-08 | Founder OS经营口径 | NOT RUN，不将Deal pipeline当现金收入 |
| M2-09 | Education/Identity/Wealth/Health域与Child/Family入口 | 字段审计已记录；实际路由→业务对象映射NOT RUN |
| M2-10 | ASKWISE学习/商业任务隔离 | 既有Learning限制已读；实际跨系统E2E NOT RUN |
| M3-01 | 未登录内部数据拒绝 | LOCAL PASS（401）；真实Dispatch/API/RLS NOT RUN |
| M3-02 | 员工读取Founder专属拒绝 | NOT RUN，NOVA当前只把身份交给未实现Gateway |
| M3-03 | 跨Spirit拒绝 | LOCAL page/DTO PASS；真实Agent能力/RLS NOT RUN |
| M3-04 | 跨家庭/客户/学生拒绝 | NOT RUN |
| M3-05 | 无患者授权Health拒绝 | NOT RUN，当前不接入Health，字段形状校验不能替代Consent |
| M3-06 | 撤销后阻断且旧audit保留 | NOT RUN |
| M3-07 | F3未批准禁止执行 | LOCAL所有Canonical写405；真正受控动作状态机NOT RUN |
| M3-08 | 伪造Agent/角色/assignment拒绝 | LOCAL丢弃客户端role/scope；真实网关伪造身份负例NOT RUN |
| M3-09 | 无效/过期/重放ticket拒绝 | NOT RUN |
| M3-10 | pool上下文隔离/清理 | NOT RUN |
| M3-11 | 返回字段最小化 | LOCAL strict DTO/额外字段拒绝PASS；已允许自由文本内容仍依赖Gateway治理 |
| M3-12 | 失败日志无敏感泄露 | LOCAL泛化错误体PASS；服务端日志/监控全链NOT RUN |

## M1输出契约补充缺口

现有DTO有source_reference/source_version/verified_at/permission_scope/status/owner_reference，缺独立evidence_reference与明确schema_version，无法据source reference推断已有证据详情授权。需先批准read.v1固定schema（含evidence_reference、data-as-of和字段许可）再推进；本轮M0未过，不修改应用契约。VERIFIED不等于“实时”，必须把as-of与核验时间分开并用预先批准的新鲜度规则；旧快照/草案/未核实数据显式标记。

## M4 PG16和PG17双版本测试计划

每一版本独立：fresh、已批准版本upgrade、checksum对比、repeat/idempotency、drift refusal、transaction atomicity、RLS/ACL负例、API契约、Agent context隔离、connection cleanup、backup/restore、浏览器E2E。每项必须记录命令、exitcode、精确SHA、镜像digest、合成seed hash、允许/拒绝断言与审计关联。使用新建隔离库，禁止指向未认证现有实例；无生产秘密。

当前以上全部NOT RUN。现有0035 smoke或历史CI仅供复用runner设计，不能代替本次Agent/Gateway验证。缺Docker/psql且Gateway/投影缺失，不能只跑数据库安装后称接入PASS。

| Flow | 合成操作与验收链 | 当前 |
|---|---|---|
| A | 合成Founder登录→NOVA获取授权数据→证据详情鉴权→决策详情；审计逐次关联 | NOT RUN |
| B | Founder提出任务→Phoenix分类→授权Spirit接收→建议标F1→Phoenix综合；不得自动执行 | NOT RUN；写状态机需要独立确认 |
| C | 合成创建任务→最小Spirit集合→协作记录→证据→F3 PENDING，未批准工具调用拒绝 | NOT RUN；同上 |
| D | 无权Agent请求敏感对象→Gateway403→RLS拒绝→持久审计及trace完整，响应不泄露对象存在性 | NOT RUN |
| E | 合成grant有效→撤销commit→下一请求拒绝，含缓存/长连接；旧audit仍存在 | NOT RUN |

准入标准：零已知越权成功、零未解决关键安全缺陷，且所有必需负例实际通过。当前测试未完成，因此不满足准入；不能以“尚未发现”替代安全证明。

## 数据库恢复增量复核

0007:232–293已有issue_context_ticket/redeem_context_ticket一次删除、60秒上限及intended principal校验；0012:98–133兑换时重新验证上下文。0007:54–72和0008:151–183仅为stale/ephemeral清理，未证明每次池归还清理。INTERNAL通道actor_person_id=NULL，仍缺Meta initiator/agent双主体关联。Learning与CRM/Service权限限制见原字段映射，不能赋reader任意表读取。

现有verification/smoke.ps1实质覆盖fresh/upgrade、repeat、checksum/drift、atomicity、两个synthetic master行保留，不包含ticket replay、Meta跨家庭/Spirit负例、连接池清理或backup restore。PR48提到的restore能力属未合并候选，不能作为当前main恢复证明。数据库/RLS/撤权/备份测试均保持NOT RUN。
