# Codex 指令｜PR #35 下一阶段生产门槛整改

生成并开始执行：2026-11-04。仓库 `yvettfang-netizen/phoenix`，PR #35，推送目标 `codex/identity-v31-cbi-review`。本轮起点 `5cbb3369c3d04d08338fe46c48203a3470780aed`，已核对 main `9355d28667ee9cf4761b4abcdaf959f0ad154820`。远端前进时先重新核对，不覆盖其他提交。

## 目标及授权边界

完成可验证的生产前工程整改，形成独立 Reviewer 可以验收的候选。产出代码、负向测试、完整审计、精确 SHA 的远端 CI、真实证据缺口清单。

本指令授权隔离 worktree 中的代码/测试/文档整改和向原 PR 非强制推送，不授权合并、部署、DNS、开放索引、生产迁移、真实数据导入或审批代签。保持 Draft/HOLD；禁止 reset --hard、force push、跳过测试、删除失败测试、降低断言和 audit fix --force。

## 立即执行的工程批次

1. 读取 AGENTS.md、工程 README、现有 readiness/permissions/Canonical 合同；核对远端 HEAD、main、Review、CI 和本地修改。
2. 在实际 Worker 请求边界拒绝导入、发布和回滚入口的全部方法；环境开关、客户端角色、伪造 Bearer 或幂等键不得开启入口。拒绝发生在 body 解析和数据库访问之前。
3. Identity 响应在 HTTP 层维持 noindex、no-store、nosniff 和 no-referrer。保持页面 metadata、robots、sitemap 门槛；不把 noindex 当作访问控制。
4. 新增实际 Workers 负向测试：双语、尾斜杠/编码路径、非法 JSON、伪造身份/角色、旧开关、重复请求均不能导入/发布/回滚，不得初始化导入数据库表；验证公开默认不暴露审核记录。
5. 建立可执行的 readiness 证据检查命令：读取实时 GitHub SHA/CI/Review、当前国家字段证据和完整 npm audit。缺少有效来源、精确 SHA 的独立 Review、安全审批、有效 Canonical 合同或 Staging 运行证据时返回 HOLD 和非零退出码。不得接受本地 `approved:true` 替代 GitHub 审批；命令自身不授予部署权限。
6. 定向修复剩余 low 依赖；完整审计覆盖 dev/optional，不盲目跨 major 或强制修复。运行 build、typecheck、lint、全部模型和实际 Workers 测试，以及现有全部浏览器回归。
7. 推送原 PR 并等待最终 HEAD 的全部远端 CI。区分本地、实际 Workers CI、Staging、Production，不把模拟或 disposable DB 写成生产通过。

## Canonical 集成批次：先满足合同输入，再实施

已核验：0001–0035 中 `identity.cases` / `identity.external_facts` 和 create/advance/record_external_fact API 属于客户案件及家庭 Consent；不是国家政策目录。当前网站 D1 只承载客户认证，没有 staff/import RBAC。不得借用客户登录、客户端角色字符串、D1 auth audit 或通用 SERVICE principal 冒充政策导入权限。

以下合同必须由数据/数据库负责人和 Founder 明确批准，绑定来源 commit、文档和审批记录；本轮不得自行指定表名、授予权限或执行新迁移：

- Country/Jurisdiction/Programme 的唯一键及 Canonical authority；Policy Revision、逐字段来源、审核/发布/失效生命周期；IMPORT_REVIEW 与业务 operational ACTIVE 的语义分离。
- 不可变原文件保存位置、hash 校验、保留期限、大小上限；import batch、版本、来源验证与人工审批 DTO。
- 服务端 staff 身份解析、importer/reviewer/publisher 分权与 scope；最小权限 principal、函数 grants、RLS；拒绝越权和未批准字段。
- 幂等键范围、同 key 不同 payload 的拒绝、dry-run 无写入、跨批冲突与并发重试协议。
- 原子 append/publication pointer、审计与版本不可改写；事务失败和审计系统故障行为；恢复/回滚权限及理由。

合同批准后，另开隔离工程批次实现 adapter，使用 PG16/17 disposable 数据库验证权限、重复/并发、失败注入、版本不覆写、审计不可改写、恢复/回滚，再提交独立安全 Review。旧 0001–0035 不得改写；新增迁移须走其独立审批。本批完成前，入口继续关闭，不能声称导入可用。

## 真实事实、审批及 Staging 门槛

- 四国每个公开政策/费用/时间/资格/国籍/护照条件保留官方来源、原文范围、核验日期、有效状态、负责人和人工审核记录；未知维持待核实，禁止排名或推断。源码日期不得因本轮运行而刷新。
- 圣多美目标法令官方全文和实施入口、阿根廷真实受理/细则/司法状态、瓦努阿图逐计划最新法规/代理/费用、圣基茨逐字段条件仍待补齐；不将公告或历史启动推成当前开放。
- 独立 Review 必须覆盖最终 commit，Reviewer 与作者不同且具有效审查权限。`yvettfang-netizen` 是作者和用户指定联系人，不代替独立审批；代理审查不代替 GitHub approval。
- 提供获准使用的 Staging 域名、访问边界、部署 artifact/commit 绑定与配置证据。仅在明确授权后部署 Staging；执行真实 HTTPS noindex、导入拒绝、报告下载/打印隐私、无外部追踪、无客户端密钥、日志脱敏检查。
- 生产 GO 另需数据授权、独立安全/事实 Review、可回滚部署与运行告警/恢复证据、变更窗口及 Founder 明确发布批准。本指令不代替这些批准。

## 验收及停止条件

验收必须列出：实际 commit、main 同步状态、审计计数、完整测试/CI 链接、未解决门槛、下一位责任人的最小输入。若合同/Reviewer/Staging 配置仍缺失，完成上述独立工程任务后输出 `HOLD / EVIDENCE_MISSING`，不得生成伪造批准、虚拟运行证据或开放导入来“完成任务”。

本轮执行记录由 PR 描述和最终回复绑定实际最终 SHA；本文件是执行指令，不是审批或执行成功证明。

## 可执行证据检查

在网站目录运行 `node scripts/identity-production-readiness.mjs`。需要 GitHub CLI 的只读仓库访问和 npm registry 连接；命令会重新收集真实 SHA、干净工作树、main 祖先关系、CI、完整 Review/权限/未解决线程、国家字段和完整依赖审计。报告写入忽略目录 `outputs/identity-v31/production-readiness.json`，不保留原始 Review 正文、密钥或账户凭据。

`HOLD` 返回退出码 2，不能作为部署步骤的成功结果吞掉。即使证据未来全部齐全，状态也只会是 `READY_FOR_MANUAL_RELEASE_REVIEW`，`deployment_authorized` 和 `production_import_enabled` 仍为 false。当前 Canonical/Staging collector 明确输出 EVIDENCE_MISSING；需先取得实际合同/环境再实现其验证，不能通过 JSON、环境变量或命令参数声称它们已验证。

指定审查人的名单存于 `release-review-policy.json`，当前为空，不擅自任命。由用户指定后，Reviewer 仍须具备实际仓库写入/维护/管理权限且与作者不同，并在最终 SHA 的 GitHub APPROVED Review 中分别用独立行记录 `IDENTITY_SECURITY_APPROVED <40位SHA>` / `IDENTITY_FACTS_APPROVED <40位SHA>`。这些标记只用于识别明确审查范围，不代替专业资格、来源核验、合同批准或部署授权。
