# Phoenix Meta × Canonical Integration V2.0

任务 PHOENIX-META-CANONICAL-INTEGRATION-20261105；审查日期 2026-11-05（Asia/Shanghai）。状态：LOCAL CANDIDATE / HOLD，非生产验收。

## Verdict: HOLD for real data; local read candidate prepared

Meta Frontend → 现有可信Dispatch Authentication → Meta Worker BFF → Phoenix Core Gateway（可信service binding）→ Authorised Canonical API → 唯一Canonical PostgreSQL。

Frontend只知道同源/api/meta/canonical/*。数据库TCP、App/Binder登录、一次性票据均留在服务端Gateway。Worker运行在Cloudflare，采用服务绑定；无浏览器PG驱动，无第二数据库，无任意外部URL回退。服务绑定的部署方式尚待确认。

## 责任与验证边界

1. Dispatch必须移除访客伪造身份头并注入已验证subject；本地伪头测试仅是fixture。Gateway仅接收可信Worker调用，不能公开接受相同头。生产入口防伪尚未验收。
2. Canonical external identity映射确认用户principal；服务principal与人类actor分别记录。服务principal存在不等于获准扮演Spirit。
3. Gateway根据已批准组织、capability、assignment、family/client、consent、purpose映射授权。禁止接受浏览器role/scope/founder标记；Phoenix编排身份也没有全库权。
4. Binder用独立LOGIN发一次性短期context ticket；App独立LOGIN消费，绑定request/actor/service。不共用连接身份，不给App/Binder超级用户或BYPASSRLS。
5. 每个读取事务限定获准projection，RLS二次保护；连接归还前清理context。rollback/异常后确认无上下文残留，否则丢弃连接。票据过期、重复、撤权、连接复用负例必须联调。
6. Gateway审计allow/deny/error及tool invocation，关联request、actor、agent、scope、对象引用、source version、decision和结果；审计失败拒绝返回数据。audit_reference存在只是DTO检查，不能证明审计真实持久化。
7. 禁止Health原始病历/问卷敏感答案/患者文件/理赔材料进入普通Spirit上下文。只读投影不产生脱敏豁免。

## 本轮候选与缺口

本地实现仅Worker→模拟Gateway及UI；Gateway、SQL投影、Agent注册、Founder审批机、持久化READ审计尚未实现。现有0001–0035可复用基础，详细缺口见字段映射。0036 PR41、0037 PR48独立候选，不合并、不改写、不重复占号。

默认META_CANONICAL_READ_ENABLED未配置；即使设true，META_CORE_GATEWAY未绑定也拒绝。只有只读接口，没有任务/审批/决策写路由。启用需Jimson确认物理映射及数据库安全，玄武验收权限与审计，Founder批准权限范围；本地候选不授权上线。

回滚：禁用只读flag/移除绑定并撤销candidate patch；不改变Canonical表或业务数据。旧个人工作流不作为Canonical回退数据源。真正读权限/审计不可用时显示未连接，不展示旧缓存。
