# 凤启家序 Identity Journey V2.0｜接管与验收证据

状态 `IN_PROGRESS`。本文件持续记录各 Gate 的验证范围及缺口。

## GATE 0 / 2026-11-28

| 对象 | 重新核验的状态 |
| --- | --- |
| [Phoenix #120](https://github.com/yvettfang-netizen/phoenix/pull/120) | 接管前 `33ba0202d607ad8527b1e77fd325ab5938fda22d`，Draft，CI 28/28。身份页面仅在开发合成环境显示。 |
| [Phoenix #104](https://github.com/yvettfang-netizen/phoenix/pull/104) | `46441e3fa2e1200fb327f5b86df44df7bfa15591`，已合并，CI 26/26。家序继续沿用同一入口。 |
| [Phoenix #106](https://github.com/yvettfang-netizen/phoenix/pull/106) | `2a869990dad0053c730bb99ac8558c17f5d2bc05`，Draft，CI 26/26。需要独立核对目标环境的家庭会话和身份绑定。 |
| [Phoenix #111](https://github.com/yvettfang-netizen/phoenix/pull/111) | `8f1364a4121b074ebf1af5659f50ed9c81a2d187`，Draft，CI 26/26。教育学习保持独立。 |
| [Phoenix #74](https://github.com/yvettfang-netizen/phoenix/pull/74) | `aabf55a200c53d36b4928eef3f933c0f2273849d`，Draft，CI 30/30。复用经纬殿 CRM 契约。 |
| [Phoenix #119](https://github.com/yvettfang-netizen/phoenix/pull/119) | `fd0e1090253a1e2e36f156e7b0e6085cd165ad6d`，Draft，CI 20/20。同案合成验收和正式合同权威须分别核实。 |
| [Phoenix #65](https://github.com/yvettfang-netizen/phoenix/pull/65) | `606572cb62a55adafae634468494e6aab9500364`，已合并，CI 48/48。沿用 Service Project。 |
| [Meta #6](https://github.com/yvettfang-netizen/phoenix-meta/pull/6) | `038674cb7b8281c4063001d14071a3ec255db52d`，Draft。GitHub 未报告该提交的 checks，验收以所记载的隔离制品和测试为准。 |
| [V5 Sites](https://phoenix-nova-v5-candidate.yvettfang.chatgpt.site) | 第 30 版，源码 `a6c17b14cc58a08ad79a6521f34c0ae5bea07992`，Sites 报告部署成功。对照同 SHA 的本地 Sites 源码，家序路由与组件均和 #120 不同。Sites 源码没有 `components/family-identity-journey.tsx`。 |

Canonical `identity.cases`、`identity.external_facts`、Docs、Consent 及 37 项正式迁移为复用基础。当前 `IDENTITY_CASE` 是已有案件用途授权。需要另外核对 Identity Reminder、客户主动咨询和 Founder 汇总的用途，不能借用案件授权。

- [#107 最近回执](https://github.com/yvettfang-netizen/phoenix/issues/107#issuecomment-7105485268) 仍缺可信家庭登录路径、服务器身份绑定与同一获准测试库的实际运行证据。API 目前可验证既有会话，正式登录的 session initiation 需复用指定提供方。
- [#115 实机回执](https://github.com/yvettfang-netizen/phoenix/issues/115#issuecomment-7158892125) 已证明 #102 兼容制品的私有 HTTPS 合成收件、单组织分派和顾问跟进。[最新 A/B/C 交接](https://github.com/yvettfang-netizen/phoenix/issues/115#issuecomment-7226105486) 仍须核对 #74 实际运行版本、Meta 私网和可信 STAFF 会话；沿用相同环境联验。
- [Meta 最新同案报告](https://github.com/yvettfang-netizen/phoenix-meta/blob/038674cb7b8281c4063001d14071a3ec255db52d/docs/v33/CRM_01_09_ACCEPTANCE_20261128.md) 证明 #119 的同一笔合成教育咨询已贯穿客户、商机、合成合同/结算、唯一项目和家序读取。[PG16/17 中断恢复](https://github.com/yvettfang-netizen/phoenix/actions/runs/46104024076) 及 [逻辑备份恢复](https://github.com/yvettfang-netizen/phoenix/actions/runs/46061339085) 可复用。正式 `phoenix_operations` 签署来源及结算仍缺独立核验，合成教育链也尚未接入身份续签或观澜台授权。

## GATE 1 / 政策来源

政策库 v1.1.0 补核 [入境处学生指南](https://www.immd.gov.hk/pdforms/ID%28E%29996.pdf) 及 [旧资本投资计划过渡 FAQ](https://www.immd.gov.hk/eng/faq/suspension-of-the-capital-investment-entrant-scheme.html)。旧计划一般收件暂停日与历史个案适用范围分开记录。资料页日期与官方版本分列。专业审核状态仍是 `PENDING`，规则不计算个案到期日或身份资格。

## GATE 4 / 隔离站内通知

`b48553452cebd239ce262f60dfbc80fc9923488e` 新增存储和发布原语。一条队列记录只能关联一条通知。数据库锁定提醒及证据版本，对照预期接收人和证据版本，重新核对有效成员关系、当前证据、证件撤回与到期。通知插入和送达回执同事务完成。当前仅验证本人接收方式。监护人及成年委托路径依赖独立授权审查。

[隔离 PostgreSQL 16/17 均通过](https://github.com/yvettfang-netizen/phoenix/actions/runs/46110003273)。检查范围包括错误接收人、错误证据版本、成员关系缺失、同事务回滚、重复发件及回执一致性。候选 SQL 只能在合成数据库安装，应用和读者角色没有新增权限。目标环境仍需经过批准的授权解析器和 Worker 绑定、站内已读授权与回执、并发双 Worker 和撤权恢复验证。外部邮件和微信保持关闭。

[两条独立数据库会话回归](https://github.com/yvettfang-netizen/phoenix/actions/runs/46110455427)记录了锁竞争、回滚后的领取恢复、成员关系失效时拒绝和仅一份回执。该验证是数据库执行层证据，通知用途授权仍需私有环境复验。

领取接口单批最多 50 条，按香港日期及重试时间筛选，使用两分钟租约并返回仅供 Worker 使用的 opaque 令牌。Worker 必须先提交领取事务，再在发布事务中核对独立用途授权。过期、换绑以及其他 Worker 重新领取会使旧令牌失效。暂时性失败使用当前令牌写回重试及次数，退避从 5 分钟开始，上限 80 分钟。状态、角色及权限控制都在隔离 SQL 候选，未接入调度运行环境。
