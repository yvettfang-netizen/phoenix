# Phoenix Nova 官网首发｜Jimson 一次性操作清单

状态：Codex 已完成代码候选，等待 Founder 发布批准与 Jimson 环境操作。

## Jimson 必须提供或核验

1. 正式 HTTPS 接收端点（仅允许 POST /v1/website-consultations）及 TLS 证书。
2. 接收端点与员工工作台使用不同 origin、不同数据库连接池和最小权限账号。
3. 正式员工会话验证与负责人分配契约；未验证会话不得读取联系方式。
4. Canonical CRM 的 acquisition contract、retention policy 和固定 source/channel 映射。
5. 邮箱或工单收件地址的具名确认，以及一条可追踪的员工收到回执。
6. 生产域名、DNS、HTTPS、统计配置和回滚版本确认。

## 验证顺序

1. 在隔离环境用合成资料提交中文和英文各一笔，确认幂等、限流、授权和审计。
2. 调度员账号只能看到最小线索摘要；负责人在授权有效期内才能读取联系方式。
3. 撤权、会话过期、接收端点异常和重复提交均 fail closed。
4. 线上只做一笔受控 smoke test，确认员工回执后立即删除或按保留策略处理合成资料。
5. Founder 批准后才切换正式域名的 noindex 开关和发布版本。

## 明确不在本候选中

- 不修改 Canonical PostgreSQL 0001–0037。
- 不创建第二套客户、家庭、成员或服务项目主数据。
- 不把 Compass 答案、病历或保险文件写入普通 CRM。
- 不在没有员工回执、正式会话和回滚点时发布。
