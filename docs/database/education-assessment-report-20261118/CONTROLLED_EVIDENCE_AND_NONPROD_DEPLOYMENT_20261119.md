# Canonical 0037 受控证据与腾讯隔离环境同步报告

2026-11-19 · Jimson 授权 · 公开仓库脱敏版

## 结论

| 项目 | 状态 | 实际结果 |
| --- | --- | --- |
| Canonical 正式 Migration | PASS | `0001`–`0037`，迁移树 SHA-256 `f24d91c6121a48542420953376399f663783225cacbb2476d3a3ef702aecbc0b`。 |
| PG16／PG17 broker、票据、RLS 与读取审计 | PASS | 使用分离 LOGIN、一次性票据和两组纯合成主体，完成家庭隔离、撤权及审计回归。 |
| PG16／PG17 Education 问卷／报告候选 | PASS | 完成 Consent／Assent、草稿、提交封存、指定监护人读取、单份报告付款解锁与退款撤权的合成验收。 |
| 腾讯隔离非生产数据库 | PASS | 已从精确账本 35 升级到 37；最终为 37 条 Migration、93 张表、83 条 RLS 策略。 |
| 灾备恢复 | PASS | 升级前演练、升级后演练及定时维护首次执行均成功；恢复目标使用无网络的一次性实例。 |
| 最小权限维护 | PASS | 健康检查、备份和恢复使用 reader／backup 运行角色；0037 新定时任务已启用，0035 旧定时任务已停用但保留。 |
| Education 候选部署 | NOT RUN | 未编号的 Education forward candidate 未进入腾讯环境。 |
| 真实身份、真实账号和真实支付 | HOLD | 本轮没有使用或导入真实客户、学生、监护人、员工、设备交接、付款或退款资料。 |
| 生产切换与旧库退役 | HOLD | 未进行生产切换、旧库删除、PR #68 状态变更或真实数据迁移。 |

## 固定来源

- 公开开发分支：`codex/education-canonical-boot-20261118`
- 本轮部署来源提交：`fe2dbc80d071c76e4ebe933bc86abf671376f91f`
- 公开 Draft PR：[phoenix #74](https://github.com/yvettfang-netizen/phoenix/pull/74)
- 私有原始证据提交：`3838159bc775e0e0578d1fb8f1e5f57de86da507`
- 私有 Draft 证据 PR：[phoenix-canonical-db #9](https://github.com/yvettfang-netizen/phoenix-canonical-db/pull/9)

腾讯同步包只包含正式主线 `0001`–`0037`。`0036` 和 `0037` 与公开来源逐字节一致，Education SQL 继续保留在 `forward-candidates`。

## 证据边界

I-1、I-2、H-1、P-1 的数据库机制和受控合成路径已补齐：正常合成 broker 流程、两组隔离主体、Consent／Assent 撤回、精确商品付款与退款撤权均有 PG16／PG17 原始输出。它们不能替代外部事实。

以下仍需相应权威系统提供脱敏回执，不能由数据库测试生成：

- 真实上游登录提供方的正常登录与注销会话；
- 真实受控客户／学生／监护人／员工账号的授权登记；
- 实际设备交接、本人确认及撤回；
- 真实支付或沙箱支付提供方的验签、退款和 Operations 对账。

本轮没有把这些缺项写成 PASS，也没有在公开仓库保存服务器拓扑、凭据、数据库转储或敏感日志。

## 可复验摘要

- PG16 broker 日志 SHA-256：`c17fd0b3027aef1f5fb6a8215d596aa90b70cd3b40aa6b30d63f1cbbbb77b90c`
- PG17 broker 日志 SHA-256：`246d278290c38284fddb227175092e6c17b23b863c7225cd33ccfff840056188`
- PG16 Education 日志 SHA-256：`c2aef2b859130735b294a60392299f38bc168aaead536279cf9bd6a71fa3df8c`
- PG17 Education 日志 SHA-256：`738f2a0c6188eb8f4bf7a9e85552469e483534038df542570b2c2b999cc2336d`
- Education 候选 LF SHA-256：`c02cd90ea37d800571772d54ac50bfb7597c919fc675c0ed3fe93b1d8e7692f6`

原始输出、部署工具、37 项 Migration 摘要和逐文件证据摘要仅保存在私有证据 PR #9。
