# Phoenix Meta × Canonical Integration V2.0

任务 PHOENIX-META-CANONICAL-INTEGRATION-20261105；审查日期 2026-11-05（Asia/Shanghai）。状态：LOCAL CANDIDATE / HOLD，非生产验收。

## 核验结论

P0 SOURCE_FOUND。实际页面在独立 Sites 源码仓库，不能用主仓库旧副本冒充。真实接通仍 HOLD。

| 项目 | 已证实证据 | 限制 |
|---|---|---|
| 主仓库 | yvettfang-netizen/phoenix；git ls-remote origin refs/heads/main = b9bf574f4f2649f58f8935953bc826a038715cce | 本地原工作区 main=c118d17 且 dirty，未改动其业务文件 |
| 隔离文档分支 | codex/meta-canonical-integration-20261105，基于 b9bf574 | 本包的Git状态另见最终交付 |
| 真正Meta站 | https://phoenixmeta.yvettfang.chatgpt.site；Sites get_site，public，当前最新67版 | 未改变访问策略，未读取生产业务记录或环境变量 |
| 真正源码 | Sites项目 appgprj_6a8ed46a2cdc8191aa6b40b88a9e551d；67版 source commit a96de29bbfdf32558b202123f15a3ca3c5b2a9a3；官方source helper恢复同一HEAD | 非GitHub main，两个Git历史独立 |
| 实际本地路径 | D:/CODEX/PhoenixNova_Worktrees/meta-sites-source-20261105 | 本地候选分支 codex/meta-canonical-readonly-20261105；未向Sites推送/保存/部署 |
| 技术栈 | package.json：React19.2.6、Vinext0.0.50、Vite8、TypeScript、Cloudflare Worker | 部署依赖与源版本不等于运行DB状态 |
| 路由 | app/page.tsx=/；app/wilds/page.tsx=/wilds；app/realms/[slug]/page.tsx=/realms/:spirit；app/nova/page.tsx=/nova | phoenix space重定向/nova；legacy路线保留 |
| 数据 | lib/meta-work-api.ts：可选D1工作流；app/notion-readonly-snapshot.ts：历史Notion快照；lib/meta-members.ts：静态人员映射 | hosting.json d1/r2均null，db/schema.ts为空；不能据此证明所有运行环境无DB |
| Canonical连接 | 对恢复源码的静态检查未发现Canonical PostgreSQL适配，worker调用handleMetaWork(request,env.DB) | 原DB连接 NOT VERIFIED；当前改动也未启用真实Gateway |
| 漂移 | app/guardian-system.ts中白虎03、朱雀04、玄武05、青鸾06、鳌鱼07、麒麟08；spirit-freeze日期09-12 | 候选按09-20冻结表纠正；旧资产URL保留，不据URL旧slug推断角色 |
| 主仓库旧副本 | website/phoenix-digital-world，hosting project id相同，但缺少/nova、/wilds与新版world-ui | 不覆盖旧副本，不复制为第二套Meta应用 |

## 冻结依据

已通过Notion连接器fetch读取 [Current Baseline](https://app.notion.com/p/3e1c31ee15bb8122baa4d690facb0897)，page_last_edited_at=2026-09-20T07:17:33.668Z；Phoenix唯一Orchestrator。另读取Phoenix AI Lab索引，无新增源码地址。Notion内容为治理依据，不是运行权限票据。

## 检索范围与证据缺口

已查询用户可见GitHub仓库列表、phoenix远端分支与开放PR，并复用PR42历史接入审计（只作候选历史）。Sites list_sites返回12项且cursor=null，精准定位Phoenix Meta67版。没有用户提供的Figma文件key，不声称已审过设计文件。未读业务库、备份、患者文件、生产配置或密钥。

P0实际源码已找到，所以不输出META_FRONTEND_SOURCE_NOT_FOUND。缺失的是生产级Canonical授权Gateway、Agent授权数据模型与端到端验收。

## 本轮动作边界

允许的本地源码适配、合成测试及文档准备；没有生产部署、数据库迁移、合并、真实任务/审批写入或Founder Freeze变更。用户末尾禁令在“自动”处截断，完整禁止清单待补齐，不能据截断内容推导额外授权。

## 收尾远端刷新

任务中远端main前移至19feef190dcba13ccc9181c998d4c82527377803（合并Wealth PR43）。已fetch并比较b9bf574→19feef1：database/canonical无差异，真实Meta Sites历史独立。文档分支将基于刷新后的main，保留本次原始审计基线以便复现。

## 额外核查

实际源码旧/founder/beasts/:slug仅requireChatGPTUser，缺少Spirit范围检查；候选补上与/realms/:slug相同的canAccessSpirit检查。此为页面访问修复，不替代Canonical对象鉴权。
共修页有硬编码示例成长/任务/旅程；本轮未将其映射到Canonical真实事实。未对整个Meta所有历史展示内容做重写，回归/内容漂移仍需单独整改。

## 可审查源码交付

实际Sites源码候选提交：640451c1ddfc799cf2bf2a304e6c2d1e93b0549a，仅本地独立分支。GitHub Draft PR收录META_SOURCE_CANDIDATE.patch，基于Sites67版a96de29，**不可应用到主仓库旧website/phoenix-digital-world**。SOURCE_PROVENANCE.json保存基线及patch SHA256。

在对应Sites源码的干净独立分支上先运行git apply --check <patch路径>检查，再按既定流程审查应用；本轮没有在Sites发布源分支push，不触发任何站点版本保存或部署。保留既有任务/共修本地工作流，不建新客户/家庭/学生/服务数据库。

## 执行验收与回滚补充

本轮新增M0–M8门禁，详见[META_ACCEPTANCE_RELEASE_GATE_REGISTER.md](META_ACCEPTANCE_RELEASE_GATE_REGISTER.md)、[四层回滚方案](META_FOUR_LAYER_ROLLBACK_RUNBOOK.md)及[演练记录](META_ROLLBACK_DRILL_REPORT.md)。精确版本和artifact hash见ACCEPTANCE_EVIDENCE_MANIFEST.json。原67版隔离build/typecheck通过、原回归8/17；本轮候选定向12/12与5个组件探针通过，均不能替代完整PG16/17、Staging、独立安全审核或回滚演练。本轮未改应用代码、SQL或生产配置，发布HOLD。
