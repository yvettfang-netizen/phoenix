# Phoenix Meta × Canonical Integration V2.0

任务 PHOENIX-META-CANONICAL-INTEGRATION-20261105；审查日期 2026-11-05（Asia/Shanghai）。状态：LOCAL CANDIDATE / HOLD，非生产验收。

## Read-only candidate v0.1

浏览器GET /api/meta/canonical/nova；GET /api/meta/canonical/spirits/{phoenix,qinglong,zhuque,xuanwu,qingluan,baihu,qilin,aoyu,pixiu}。禁止query（首期无对象选择器），禁止POST/PUT/PATCH/DELETE；写入返回405，客户端传APPROVED也无效。

默认关闭flag：META_CANONICAL_READ_ENABLED；可信service binding：META_CORE_GATEWAY。浏览器不提交role、scope或票据。Dispatch注入的subject/email仅作外部身份输入，Gateway须自行映射、鉴权并使用App/Binder；静态memberSpiritAccess不构成Canonical权限。

成功响应：{status: VERIFIED|EMPTY, source_version, verified_at, audit_reference, items: []}。item字段与状态见NOVA_HALL_DATA_PROJECTION。拒绝额外字段、无效枚举/时间、缺失来源/审计、超量和异常响应；敏感字段不得穿透。opaque引用仍需Gateway确保不泄露对象存在性或敏感语义。

错误：401未认证、403无权限、404未知路由、405非只读、503未启用/无绑定/暂不可用、502上游契约不合格。返回泛化message/code，不传回上游异常、SQL、配置或业务体。private,no-store和Vary；不缓存客户端身份。

## Gateway未实现的必要契约

强认证服务调用；验证人类及Agent principal；请求ID与审计关联；一次性Context Ticket；服务端scope/consent；RLS；源对象与版本证据；连接清理；审计allow/deny/error/tool invocation。client侧forged identity测试不能证明真实边缘头清洗安全。

决策/任务分配/审批写入不在首期。后续须单独批准 actor/capability/state-machine/expected_version/idempotency-key/replay/审计/撤销/rollback；F3必须持久化Founder批准并绑定exact action、对象、版本、期限，建议不得自我升级为approval。

实现细节补充：query被拒绝为400；上游401/403均泛化为403；整个请求（含响应读取）有3秒deadline；128KiB流式上限；Spirit接口拒绝其他Spirit行。网关目标host固定phoenix-core.internal，此为服务绑定内部逻辑名称，非已存在公网服务。未创建该服务或变更网络。
