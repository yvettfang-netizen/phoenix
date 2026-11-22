# Phoenix 工程与发布窗口归档报告（2026-11-23）

> 只读盘点与安全归档记录；不是 Founder 生产批准、部署批准或数据库迁移批准。Draft PR 不得视为生产验收。

## 1. 盘点边界与计数

- 盘点时间：2026-11-23（Asia/Shanghai）。
- 早期筛选截止：2026-10-01 00:00（Asia/Shanghai）。早于截止但仍活动、未完成、被项目引用、唯一审批/回滚证据的窗口保留。
- 当前主线程保留：`01a1a5bb-3088-7543-8fd8-060b71c621cf`。
- 最近侧栏 Phoenix 四个分类共 90 个窗口：工程与发布 23、网站与设计 7、教育与身份 39、运营与治理 21。标题不足以证明重复；工程/发布候选读取了摘要/关键结论，无法读取正文的 ChatGPT 会话标为待复核。
- 历史页发现的早期 Phoenix 记录含唯一基线或未完成 HOLD，均未归档。
- 本轮安全归档：0 个。没有窗口同时满足“内容已读、证据已迁移、明确重复、无未完成/审批/回滚唯一性”。

## 2. GitHub 当前基线

| 项目/PR | 状态 | 分支与完整 SHA | CI/Review/发布边界 |
|---|---|---|---|
| #38 Education | 已合并 | `codex/education-v20-geo-20261102`; HEAD `d64f55683c226eb24a249dc76a1c880dbfb1bea1`; merge `51f4cc7c5d7a0aba53904482d967e90ff36260d9` | CI 全通过；Sites v8 owner-only/noindex；非公开生产 |
| #40 Brand B | 已合并 | `codex/brand-bilingual-logo-v32-20261103`; HEAD `001f9d8038c3bc2fd8e6bfcd729a3ae25ffed81b`; merge `b9bf574f4f2649f58f8935953bc826a038715cce` | Jimson APPROVED；唯一 B PNG；未改 DNS/数据库 |
| #43 Wealth V3 | 已合并 | `codex/wealth-v30-full-page-20261104`; HEAD `789d9aad2b4c1b35bb1b4642c9b2d0872d99dbda`; merge `19feef190dcba13ccc9181c998d4c82527377803` | Jimson APPROVED（此前一条 DISMISSED）；CI 记录全通过；合并不等于生产发布 |
| #44 Homepage | 已合并 | `codex/phoenix-homepage-v6-20261104`; HEAD `0cc93905f3efd3b31d46790ca9117e5bd8489bd3`; merge `a215aac4f70018170317272ae2fd2b37db8ac896` | 视觉评审记录在 PR；域名/TLS/索引仍独立门禁 |
| #34 Health | Open Draft | `codex/health-v30-geo-platform-20261102`; HEAD `5a0fbc4fcee09bcb58668b0f112d1b4f8e13558c` | CI 通过但无独立人工 approval；noindex/Sites/患者授权/生产 HOLD |
| #35 Identity | Open Draft | `codex/identity-v31-cbi-review`; HEAD `1e1d2e0eee4fff9446022abaef3469e6a5d905b8` | CI 通过但无独立人工 approval；导入/目录/真实 Staging HOLD |
| #33 Health V3.1 | Closed 未合并 | `codex/health-v31-founder-20261101`; HEAD `dfe5dd748ddeb761762e2b6b10b534d57bd97d81` | 历史候选，不作生产验收 |
| #61/#65 Service Project | 已合并 | #61 HEAD `59d744d5da03eddc2cc3ca75a346bce4abea938d`; #65 merge `cafccf715825e1f701119df80f548a1600bbfacd` | 合成 PG16/17 通过；真实身份/账号/云部署/恢复证据缺 |
| #62/#64 Service Project | #62 后由 #64 回滚 | #62 merge `3257f9e340f0828b6dbef45641708739b98cab89`; #64 merge `a26612f9335d50c2081f667c9244deb644db1737` | 唯一恢复记录，保留 |
| #53 Health source | 已合并 | HEAD `ce5a889ed1695b62de5a2cfae9f4d47f5a7cac2b`; merge `2065da703fef5c56904db24bafc733632f248750` | 内容回归通过；不等于生产 |
| #73 Insights | 已合并 | HEAD `68e67ae2a7c44f20659ed2c8d9324126a09f423b`; merge `9db147ac3a5d135d50b90bfea5a7316ce747d90b` | noindex、空 sitemap/RSS |
| 当前 main | GitHub `main` 解析 | `f1d8af3f9338b4cb8a1afca48c6d85f1396d9da3` | Academic Studio 设计记录；未授权生产 SQL/部署 |

## 3. 窗口主索引

### 工程与发布（23）

- Wealth #43：`01a1a5bb-3088-7543-8fd8-060b71c621cf`（当前活动，保留）；PR #43 已合并，旧 HOLD 仅转为“生产证据仍需复核”。
- P0/P1 集成门禁：`01a1a5bc-ff84-7d80-acce-287c95412333`（关联 #34/#35/#38/#40/#43/#44，保留）。
- PHX Coin/Oriental/Catalogue：`01a09674-64ed-7371-a51d-ea0e4a8c42b7`（活动，保留）。
- Business routing/Spirit Agents/release gate：`01a09673-c396-72c1-8df7-0a70b896fe73`（门禁记录，保留）。
- P0 remediation：`01a09551-2854-7431-8be0-575fab912a3a`（设计/HOLD，保留）。
- Canonical/PostgreSQL：`01a1a996-0228-7f02-89bd-0547e4cfecbd`（迁移/权限唯一证据，保留）。
- Health/Education/Identity readiness：`01a1883a-5352-7442-a170-db57aff465c5`、`01a1a5bc-3da9-7ce2-b0c9-89bcce528ea4`、`01a1a5ba-3f46-7d73-adde-069a6a637765`、`01a1a5bb-cbe9-7563-83ad-cdef4cf1f6c0`（各自 Gate，保留）。
- 架构/核心业务/网站工作单：`01a09174-ece7-76d1-bdb5-877c17137ad9`、`01a09536-fe03-7593-81df-59a4eec084e4`、`01a077af-b176-7e73-afd5-75cc4b907928`（被引用，保留）。
- ChatGPT GitHub/Sites/状态窗口：`6affe746-7cb8-83e8-937d-f645433c8285`、`6aff28aa-b8ec-83e8-949e-a5b371bd349a`、`6aba35b0-8cfc-83e9-8ffb-15057ffe66ba`（正文待继续核对，保留）。

### 网站与设计（7）

首页 V6、Footer candidate、旧 V5 窗口均保留；#44 为主实现，Footer candidate `01a1ee1d-be7d-7362-9bea-a34731c844c5` 明确是 Candidate/Preview Only，不归档。

### 教育与身份（39）

工程候选、Compass、Founder Gate、迁移审计均保留或待复核；学生个案不写入工程主记录，除非正文含 PR/CI/发布证据。早期但仍被引用的 `01a0344c-9c8e-7010-88db-3ce339e5e36c`、`01a05d96-ef9b-77d2-96c1-75ab31c53b20`、`01a09613-7d5c-72e2-9fd0-f2164e8776a8` 不归档。

### 运营与治理（21）

PostgreSQL、D1、BFF、Canonical、Sites、Staging、权限、安全和回滚窗口保留；#62→#64 回滚、P0 权限/恢复、真实身份映射为唯一恢复/审批证据。

## 4. 已迁移记录

- GitHub：本文件将提交到独立分支 `codex/phoenix-archive-20261123` 并以 Draft PR 发布；不改 `main`，不合并业务 PR。PR URL/commit SHA 在创建后回填 Notion。
- Notion：私有页保存项目总览、Founder Gate、责任人、状态定义、PR/SHA/CI/Review、Sites/Canonical/PostgreSQL/D1/BFF/Staging/DNS/TLS/迁移/回滚和窗口索引；不复制源码、客户/患者资料或密钥。

## 5. 缺失证据与 HOLD

- Founder 生产范围与最终批准需独立记录；Draft/CI 不构成批准。
- 开放 Draft 仍缺独立 Code Owner Review、当前 HEAD 对应的 Staging 访问、noindex、错误页、回滚目标和演练收据。
- `wealth.phoenixnova.com.cn` 的 DNS 权威记录、Sites 保存版本/部署 ID、SAN/TLS、HTTP→HTTPS、错误页/回滚目标需在同一 SHA 证据包中重验；历史窗口值不视为当前证据。
- Canonical/PostgreSQL/D1/BFF/Family OS 的认证、授权、同意、审计、RLS、删除/保留、恢复责任需逐项签字；不得把本地测评写入生产。
- 正文未完整读取的 ChatGPT 早期窗口统一“待复核/权限疑问”，不归档。

## 6. 后续清单

1. Founder：确认生产范围及“不保存、不上传、不构成投资建议”文案。
2. Jimson：为开放 Draft 提供独立 review、Staging 访问、部署版本/ID、TLS/DNS/回滚收据；不得用合成数据替代真实授权证据。
3. Codex：证据收齐后重新读取远端 PR/CI/Review；只有明确重复且证据已迁移才归档。
4. 运营/安全：确认身份映射、最小权限、审计、删除/保留、RPO/RTO 和故障演练负责人。
5. 归档复核：打开待复核窗口，确认附件/截图/链接迁移后再归档；归档后验证 Archived 与主记录链接。

## 7. 安全声明

不合并未经批准 PR，不部署生产，不执行生产迁移，不改 DNS，不绑定正式域名，不开放索引，不导入真实客户或医疗资料，不把本报告或 Draft PR 写成 Founder 生产批准。


## 8. 线程核验补充（Luna 只读盘点）

- `01a1a282-4bad-7461-b944-1c999762643f` Wealth V3.0 工程基线与 `01a0344c-9c8e-7010-88db-3ce339e5e36c` Wealth Compass V1 handoff 仍可能含 #43 未迁移的独有文件/结论，保留并待逐项文件核对。
- `01a00604-73c5-75f1-b612-d510f54385e0` Website V4.1 明确是 Candidate；`01a0062c-f4e8-7622-b5dc-ae4a7943915f` Website V3 可能含独有架构文件；两者均不归档。
- `01a04e9b-dea6-7283-bd14-cbeee2351192` Phoenix 仓库盘点、`01a09551-b9c9-7410-a924-be5b742a0d5c` Meta Final Freeze Drift Audit、`01a121db-3432-7be0-b529-2eb2405c23ec` Jimson Desktop/controlled staging 记录，分别是总索引、治理和审批/回滚证据，保留。
- 疑似重复组：PR #14 监控窗口 `6aa5630d-d690-83e8-b17b-8606175922d5` 与 `6aa256db-01a4-83ea-83f6-2f17f65b61ff`；Founder Gate/release queue `6aa9f959-6d2c-83ea-971b-3ca15dc427c1` 及旧审核窗口。它们含唯一 SHA/HOLD/Review，尚未满足归档条件。
- ChatGPT “核对 GitHub 进度”记录 PR #89 Draft、六组 CI 通过但 Jimson 独立审查和非生产只读回执待补；“核对 Sites 接入条件”缺隧道 ID、客户端回执、HTTPS 证书链；“整理 Phoenix Nova 状态”要求锁定部署包/构建 SHA/部署时间/回滚版本。三者保留。
- ChatGPT “Phoenix 数据库18点验收”记录 PR #61 HEAD `59d744d5da03eddc2cc3ca75a346bce4abea938d`，CI 通过但实际数据库部署范围和 Jimson 独立验收未证实；保留。
- 因部分 ChatGPT 正文、附件或截图未完整读取，相关窗口统一标记“待复核/权限疑问”，不得仅凭标题归档。



## 9. 归档状态一致性复核

- 本轮未调用归档/恢复写操作。
- Codex 最近列表显示 `01a09674-64ed-7371-a51d-ea0e4a8c42b7` 为活动窗口，但 `list_archived_threads` 返回同一 ID；这是平台列表状态不一致，不能据此宣称已归档或已恢复。
- 在平台状态一致性得到确认前，该窗口按活动/审计记录处理，继续保留。
