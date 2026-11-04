# Codex 指令 Wealth 生产部署前置证据与验收

任务：继续处理 `yvettfang-netizen/phoenix` 的 Wealth PR #43，使后续每项发布动作都有对应的源码、测试、审批、部署和回滚证据。本指令可直接交给 Codex 继续执行。

本轮起点是 `39962c52a65ed69131bec250628e8f665b01d791`，原 PR 分支为 `codex/wealth-v30-full-page-20261104`。每次执行重新读取远端，不能将此 SHA 当作永久最新状态。独立 worktree 中完成取证、工程修复、测试及推送；保留其他工作树的全部修改。

## 执行边界

允许立即执行：只读 GitHub / Sites / DNS / TLS 核验、工程修复、证据与操作文档、隔离测试、普通提交与向原 PR 分支推送、等待远端 CI。已有指令允许在 #40 合并后同步 main 并将 #43 base 改为 main。

禁止自动执行：合并 #40 / #43、任何 Sites 部署、修改 DNS、绑定正式域名、切换流量、开放索引、生产数据库变更、账号权限变更。Sites 生成域名也属于生产部署，不能因为它是 private 或 candidate 就绕过本条。

不得伪造 Founder 品牌验收、生产范围确认、账号负责人、Jimson approval、已部署状态或回滚成功。不得 `reset --hard`、强推、复制第二套品牌组件、删除失败测试或削弱断言。14 题、六维权重、SKIP、完整度、Top Gaps、硬风险和 Persona 冻结规则保持不变。

## 第一步 读取与核验

1. 读取仓库适用的 AGENTS.md、官网 README、现有 Wealth 实现与域名计划文档。
2. 读取最新 main、#40 / #43 的 head/base、reviews、未解决的阻断意见、各自最新远端 CI 和本地工作树。核对审批与测试是否对应实际 HEAD，不能用旧绿灯替代新 HEAD。
3. 执行只读预检：

   ```powershell
   # 在 website/phoenix-nova-website-v5 下，使用 Node 22.13.0 与已认证的 gh。
   node --test tests/wealth-release-preflight.test.mjs
   node scripts/wealth-release-preflight.mjs --output outputs/wealth-release/preflight.json
   ```

   预检只通过 GitHub REST GET 读取证据，并只写本地输出；开始和结束两次核对 #40/#43 的 CI、reviews、PR 门控状态与 refs。退出码 `1` 表示真实 HOLD，`2` 表示取证失败；不能把任一种状态当作成功。退出码 `0` 仅代表脚本覆盖的代码前置条件通过，`productionReady` 仍为 `NOT_ASSESSED`，不构成部署授权。未解决 Review 线程、分支保护和人工业务验收仍需单独核验，实际动作前重新读取远端状态。
4. #40 未合并时，保留 `DEPENDENCY_HOLD` 和现有 base。继续独立完成域名/托管/回滚取证及可修复工程项；不以等待审批为由停止这些工作。

## 第二步 准备两人的具体验收包

| 责任人 | 要完成的动作 | 要留下的记录 | 当前状态 |
|---|---|---|---|
| Founder | 验收 #40 B 版 Logo 与共享 Header/Footer | 验收链接或明确回复，绑定 #40 实际 head SHA；必要时指出需修正页面 | 待明确验收 |
| Founder | 确认 Wealth 首发范围 | 明确“浏览器本地规则评估；无服务器保存/上传；非投资建议；仅显式会话草稿；不接 CRM/Canonical/Family OS 生产写入” | 页面实现符合该范围；业务放行仍待明确确认 |
| Founder | 确认域名、旧服务器和托管负责人，决定发布窗口 | 账号/区域/项目归属及负责人记录；授权与流量变更范围 | DNS / 旧服务器负责人未证实 |
| Jimson | Review #40，并核验品牌唯一性与该 PR 必需检查 | 独立 GitHub approval；具体批准的 head SHA；无阻断意见 | 尚无 approval |
| Jimson | #40 合并后 Review #43 最终候选 | 新 HEAD 的 GitHub approval、完整 CI、差异和回归结果 | 已请求 #43 Review，尚无 approval |
| Jimson | 整理部署、域名与回滚实施证据 | 下方证据表各项的链接、日志、版本 ID、负责人及时间 | 尚不完整 |

建议 Founder 按以下字段提供事实，不要由 Codex 代填为“已批准”：

```text
#40 品牌验收：通过 / 需修改；对应 SHA 和验收链接：
Wealth 首发范围：确认 / 需调整；具体范围：
DNS 区域与旧服务器负责人：姓名/账号或资源标识/权限证明位置：
Sites 项目负责人：姓名/项目 ID/权限证明位置：
Staging 部署是否另行授权：尚未授权 / 明确授权的项目、源码 SHA 和范围：
正式域名及流量变更：尚未授权 / 明确的授权记录与窗口：
```

## 第三步 #40 合并后的工程顺序

1. 确认 GitHub `merged=true`，记录 #40 对应 main 提交与最新 main SHA；同时核验真实 approval 与必需 CI。Founder 验收与维护者合并由其本人完成，Codex 不代为合并。
2. 在独立 worktree 拉取最新原 PR 分支和 main，将 main 普通 merge 到 Wealth。不得 rebase 后强推。若 #40 为 squash merge，逐项检查重复品牌差异及冲突，不能复制或再造 Logo。
3. 确认 main 已包含在候选历史内，再将 #43 base 改为 main。检查最终 PR diff 只含 Wealth 与相关整改；品牌差异应由 main 提供。
4. 普通推送到原 PR 分支，记录新的完整 HEAD SHA。重新等待 Website、Health、Canonical、Education、Identity 全部通过；检查对应 PR、实际源码 SHA 与最新运行，失败则修复后再次推送。
5. 验证 40 条双语路由、四种视口、14 题流程、SKIP、完整度、Top Gaps、硬风险、三个 Persona、人工复核提示、刷新/草稿/语言切换及跨产品品牌回归。保留 noindex。
6. Jimson 对最终 HEAD 提交独立 approval，Founder 完成内容/范围验收。后续代码变化必须重核 CI 和审批有效性。满足条件后由获授权维护者处理 Ready 与合并；Codex 不自行执行这两项发布决策。

main 在取证期间变化时，重新同步并重跑；不能用“已同步过一次”替代最新基线。

## 第四步 托管 域名和回滚证据

| 证据 | Jimson 的完成标准 | 未满足时 |
|---|---|---|
| Sites 项目与权限 | `.openai/hosting.json` 项目 ID 与连接器返回一致，记录 owner/editor、访问策略及负责人 | `HOSTING_HOLD` |
| 源码与部署映射 | 准备精确源码 SHA、保存版本 ID/版本号、部署 ID、成功状态与实际 URL；授权部署后取真实结果 | `DEPLOYMENT_EVIDENCE_MISSING` |
| 环境边界 | 私有 Staging 访问控制及 noindex；不启用客户认证或生产写入，不导入真实答案，不改生产数据库 | `SCOPE_HOLD` |
| DNS 归属与目标 | 权威 A/AAAA/CNAME/TXT、旧 IP 资源归属；目标由平台实际返回，不能猜测 CNAME 或以 IP 推断账号 owner | `DOMAIN_HOLD` |
| TLS | SAN 覆盖 `wealth.phoenixnova.com.cn`，可信链、有效期与主机名校验均通过；`-k` 不作为通过依据 | `DOMAIN_HOLD` |
| HTTP 与页面 | HTTP 到 HTTPS 的明确跳转，根路径/中英文路径正确，40 条路由可达；未知路径真实 404，错误页无调试/敏感数据泄漏 | `DOMAIN_HOLD` |
| 回滚 | 明确被接受且已验证的版本 ID/SHA、恢复步骤、触发条件、负责人和无正式流量影响的演练记录 | `ROLLBACK_HOLD` |

最新保存版本不等于当前部署，旧部署 ID 不等于已批准的回滚目标。未取得授权前，只准备制品、映射表和方案，不保存/部署到可能触发发布的远端源仓库。

若平台必须绑定正式域名后才能提供 TLS 结果，先记录限制与待执行验证步骤。最终 Founder Gate 前不绑定；获明确授权后的实施仍需真实复验，不能提前宣布 `DOMAIN_HOLD` 已解除。

## 第五步 Staging 与最终 Founder Gate

代码合并后，重新核验合并提交或明确保存的部署源码 SHA。只有 Founder 对具体项目、版本和范围另行授权后才部署 Staging。部署后复验实际环境中的访问策略、noindex、40 路由、浏览器流程、错误页面、无上传/生产写入以及运行日志，记录对应部署 ID。

最终域名 Gate 需要品牌/内容验收、独立 approval、最终 CI、准确部署映射、访问边界、域名方案与回滚证据。Founder 明确授权正式绑定和变更窗口后，由指定负责人实施并复验 DNS/TLS/HTTPS/页面；任何失败立即按事先接受的回滚方案处置。开放索引需要单独授权，本指令不包含该授权。

## 本轮交付与停止条件

立即交付：本指令、只读预检脚本与测试、真实 GitHub 预检结果、最新 Sites 和域名核验、可执行的缺失证据表。工程变更推送到原 PR 分支，等待远端 CI 后报告准确 SHA。

按 `VERIFIED / EVIDENCE_MISSING / HOLD` 报告。当前审批或账号证据阻断的步骤可以停止，但独立可完成的工程与取证必须完成。不要把生成指令、测试通过、保存版本、部署成功或审批请求相互替代。

相关记录：[整改证据](WEALTH_PR43_READINESS_20261104.md)、[域名计划](WEALTH_V30_DOMAIN_PLAN_20261104.md)、[本轮执行记录](WEALTH_PRODUCTION_GATE_EXECUTION_20261104.md)。
