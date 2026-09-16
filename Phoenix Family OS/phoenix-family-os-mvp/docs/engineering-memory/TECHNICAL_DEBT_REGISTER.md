# Phoenix Family OS™ Technical Debt Register

- Register version: 1.0
- Initialized: 2026-08-15（Asia/Shanghai）
- Project version: MVP V0.1 / package `0.1.0`
- Status vocabulary: OPEN / MITIGATED / BLOCKED / ACCEPTED-DEFERRED / CLOSED / SUPERSEDED
- Priority vocabulary: P0 / P1 / P2 / P3 as defined in `CHANGE_MANAGEMENT_RULES.md`

## 1. 使用规则

- 技术债记录不是自动开发授权；进入实现前仍需批准范围、Architecture Review 和 checkpoint。
- 不删除已关闭记录。关闭时填写证据、关闭日期和 commit；被替代时指向新条目。
- Priority 按当前交付目标评估：P0/P1 可阻断对应 Gate，P2 可在有责任人和决定时延期，P3 只登记。
- 每条至少包含现状、影响、临时缓解、解决条件和证据。
- 月度技术审查必须复核 OPEN/BLOCKED 项；状态或优先级变化必须写明原因。

## 2. 当前技术债

| ID | 技术债 | Priority | Status | 当前影响/临时缓解 | 解决条件 | 证据 |
| --- | --- | --- | --- | --- | --- | --- |
| TD-001 | `touristappid` 与共享 `local_family_user`，没有服务端 OpenID/session 交换 | P0 | OPEN | 无法隔离真实微信用户；仅允许虚构本地演示，阻断 Public RC/Production | 批准正式身份架构；受控 AppID；服务端 code exchange、session expiry/revoke；own/other-family 负向测试通过 | Handover R-01；Acceptance BLOCK-01；DEC-011 |
| TD-002 | Family/Child 数据保存在客户端本地 Storage，缺少生产级数据保护和生命周期 | P0 | OPEN | 本地明文、无可信服务端边界；禁止真实家庭数据和公开运行 | 批准可信 datastore；传输/存储保护；最小化、保留、删除、恢复策略；安全与隐私评审通过 | Handover R-02；Acceptance BLOCK-02 |
| TD-003 | Advisor demo 可取得本地 `admin` 并读取全部家庭，没有 assignment、Consent 或 Audit | P0 | OPEN | 存在生产越权/隐私风险；仅限无真实数据的内部 demo | 可信 Advisor identity；服务端 RBAC；assignment + consent scope/revoke；敏感读取 audit；负向测试通过 | Handover R-03；Architecture Memory §5 |
| TD-004 | 微信开发者工具实际 WXML/WXSS 编译尚无证据 | P1 | BLOCKED | 静态 validator 不能证明平台编译；阻断 Internal Demo RC | 在记录版本的微信开发者工具执行清缓存编译，DEV-01 至 DEV-06 全部 PASS，保存 Console/编译证据 | Acceptance BLOCK-03 |
| TD-005 | iPhone/Android 真机安全区、键盘、滚动和回退未验收 | P1 | BLOCKED | 自动化安全区测试不能覆盖设备差异；阻断 Internal Demo RC | 至少 1 台真实 iPhone、2 台不同导航/状态栏 Android 完成规定矩阵且无 P0/P1 | Acceptance BLOCK-04 |
| TD-006 | 四个 Phoenix Nova™ 运行时品牌资产正式来源未由品牌负责人签字 | P1 | BLOCKED | 路径/hash 已锁定但无法证明正式版；不得自动替换 | 品牌负责人完成 BRAND-01 至 BRAND-04，记录文件/hash/结论/签字 | Acceptance BLOCK-05；DEC-008 |
| TD-007 | 无可信后端 schema/migration、API、server RBAC、Consent/Audit、Growth Blueprint versioning、Timeline/Reminder contract | P1 | OPEN | 阻断 Family Growth Agent™ 和生产扩展；当前保持 NO-GO/HOLD | 先批准当前数据存储和 ADR；实施 additive migrations、API/RBAC、Consent/Audit、Blueprint/Timeline contracts；fixtures、rollback、negative/E2E tests 通过 | Family Growth Core Inspection §9–12；DEC-012 |
| TD-008 | Assessment、Report、Timeline 等本地多步写入没有事务/完整幂等 | P2 | ACCEPTED-DEFERRED | 极端 Storage 失败可产生部分记录；当前仅限 demo，保留错误提示与人工重试 | 在批准的可信数据层使用事务或幂等 operation key；注入失败测试、重复提交测试和 reconciliation 通过 | Handover R-08；Acceptance BLOCK-08 |
| TD-009 | Compass 多步骤草稿不持久化 | P2 | ACCEPTED-DEFERRED | 中途退出可能丢失未提交答案；不影响已提交报告 | 产品明确批准草稿契约、保存/清除/隐私规则；独立 Sprint 实现刷新/返回/过期测试 | Handover R-09；Acceptance BLOCK-07 |
| TD-010 | `pnpm lint` 未配置，`pnpm typecheck` 只覆盖有限 TypeScript 文件 | P2 | OPEN | JavaScript/WXML/WXSS 质量主要依赖 assertions 和静态 validator | 批准 lint/type strategy；覆盖 JS/TS 与适用模板/样式；存量告警基线清晰；CI 命令与文档更新 | Handover R-10；Change Rules §3.3 |
| TD-011 | 无自动化微信 E2E、视觉回归、性能或可访问性测试 | P2 | OPEN | 平台和设备质量依赖人工验收 | 先批准工具/环境；建立核心路径、异常、视觉基线、性能预算与设备结果归档；避免把浏览器测试当微信真机 | Handover §3.2 |
| TD-012 | `models/schema.js` 仅为字段清单，没有 required/FK/unique/index 和 migration ledger | P2 | OPEN | 当前本地 demo 可运行，但 schema 演进和数据一致性证据不足 | 与获批 datastore 一起定义约束、版本、fixture、migration ledger、forward/rollback/reconciliation tests | Architecture Memory §3.3；Family Growth Inspection |
| TD-013 | 小型表单 handler 与局部 WXSS 存在重复 | P3 | ACCEPTED-DEFERRED | 维护成本轻微；收口期重构收益不足 | 只有在重复导致缺陷或批准独立代码质量 Sprint 时，先量化重复范围再最小抽取并回归 | Handover R-11 |

## 3. Gate 映射

| Gate | 必须关闭/接受的债务 |
| --- | --- |
| 日常 Development | 不得新增未记录的 P0/P1；相关变更必须有最小测试与回退 |
| Internal Demo RC | TD-004、TD-005、TD-006 必须 CLOSED；TD-001/002/003 保持严格 demo 隔离并由负责人书面接受，不得使用真实数据 |
| Public RC | TD-001、TD-002、TD-003 必须 CLOSED；所有适用 P1 关闭；P2 有明确 Owner/处理决定 |
| Family Growth Agent™ Go | TD-001、TD-002、TD-003、TD-007、TD-012 及 Freeze 契约相关测试必须 CLOSED |
| Production | Public RC Gate、发布批准、监控/恢复/安全/隐私签字全部完成 |

## 4. 新增/更新模板

```text
### TD-XXX｜标题

- Priority：P0 / P1 / P2 / P3
- Status：OPEN / MITIGATED / BLOCKED / ACCEPTED-DEFERRED / CLOSED / SUPERSEDED
- First observed：YYYY-MM-DD
- Last reviewed：YYYY-MM-DD
- Owner role：
- 当前实现：
- 影响：
- 临时缓解：
- 解决条件：
- 验证要求：
- Evidence：文件 / commit / issue / test log
- Closure：日期、commit、批准人（未关闭则 N/A）
```

## 5. 当前维护结论

- 当前没有证据支持 Public RC、Production 或 Family Growth Agent™ Go。
- 当前最高价值动作仍是执行微信开发者工具与设备 Acceptance Test Plan，先处理 TD-004 至 TD-006。
- TD-001 至 TD-003 是生产发布 P0，不得用客户端 guard、演示账号或文档声明替代实现。
