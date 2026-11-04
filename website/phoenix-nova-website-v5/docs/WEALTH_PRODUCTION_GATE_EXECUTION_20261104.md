# Wealth 生产部署前置执行记录

本轮按 [Codex 后续指令](WEALTH_PRODUCTION_NEXT_CODEX_20261104.md) 执行。结论为 **HOLD**；这是实际取证结果，不是部署或审批完成记录。

## 已证实

- 起始远端 #43 HEAD 为 `39962c52a65ed69131bec250628e8f665b01d791`；main 为 `9355d28667ee9cf4761b4abcdaf959f0ad154820`。#40 HEAD 为 `ba478ce644c7a39a8162317a69bb4eaff5169709`，仍 open / unmerged，reviews 为空。#40 该 HEAD 的 Website / Health / Canonical / Education / Identity 五项 CI 均成功。
- #43 仍为 Draft，base 为 `codex/brand-bilingual-logo-v32-20261103`，reviews 为空，已请求 Jimson614。未将“继续执行”解释为 Founder 品牌验收、独立 approval 或生产变更授权。
- 起始 HEAD 的 Website / Health / Canonical / Education / Identity 均成功。其中 [Health / Wealth 验收](https://github.com/yvettfang-netizen/phoenix/actions/runs/41810019533) 含 40 路由及 24 项浏览器检查；本轮新提交的最终结果应以其新 HEAD 的远端 CI 为准。
- `.openai/hosting.json` 与 Sites 返回的项目一致：`appgprj_6a984094b9ec819199c957f0f7a34889`。当前连接账号的角色为 owner，访问模式为 custom；这不证明 DNS 或旧服务器的账号归属。
- Sites 自定义域名清单为空。最新保存版本 6，源 SHA `5a813aa46971557115f6e0f947f7d41f2b5b1fa9`，没有 deployment_id。版本 3 有旧 deployment ID `appgdep_6a992fdafef481919266934bf20acdef`；未据此认定其当前生效或可回滚。
- 2026-11-04 18:24 +08:00 只读域名复验：权威 dns21/dns22.hichina.com 与三个公共解析器均返回 A `1.12.77.180`、TTL 600；未得到 AAAA/CNAME/TXT 数据。HTTP 根路径 302 到 HTTP `/wealth-compass`，旧 Next.js 页面返回 200，`/zh` 为 404/noindex。
- TLS SAN 仍只有 `api.phoenixnova.com.cn`。证书链验证返回 0，但 Wealth hostname 验证返回 62 mismatch；Windows curl 返回 `SEC_E_WRONG_PRINCIPAL`。未用跳过证书验证的请求冒充成功。

## 本轮新增工程

`scripts/wealth-release-preflight.mjs` 仅执行 GitHub REST GET，读取 #40/#43、全部 reviews 和各自 HEAD 的 workflow runs，核对最新 main 的包含关系。结束前再次读取 reviews、CI、完整 PR 门控状态与 main；同一 HEAD 上撤销审批、重跑 CI、改回 Draft 或改 base 也会令快照失效。它拒绝使用旧 HEAD CI、非本 PR 的运行、较早绿灯、旧 approval 或已撤回审批。独立审核人固定为已约定的 Jimson614。未合并 PR 的 synthetic merge SHA 不作为合并提交报告。

脚本只评估代码前置条件；即使输出 `CODE_PREREQUISITES_PASS`，也明确保留 `productionReady=NOT_ASSESSED`，不能替代 Founder、未解决 Review 线程/分支保护的人工核验、Staging、域名和回滚证据。真实执行输出在忽略的本地目录 `outputs/wealth-release/`，应每次现场刷新，不能将历史快照当作当前放行依据。远端状态在取证完成后仍可能变化，实际动作前必须重新核对。

9 项策略测试在 Node 22.13.0 下通过。测试纳入官网既有 `tests/*.test.mjs` 发现路径，无需新依赖或锁文件修改。冻结评分源、Persona 夹具、品牌资产、运行时数据入口均未修改。

## 尚缺且不能代填的证据

| 阻断 | 责任人 | 具体缺口 |
|---|---|---|
| DEPENDENCY_HOLD | Founder / Jimson / 获授权维护者 | #40 品牌验收、独立 approval、必需 CI 和合并记录；其后才能同步 main 并改 #43 base |
| REVIEW_PENDING | Jimson | #43 最终 HEAD 的独立 GitHub approval；当前请求不等于批准 |
| SCOPE_CONFIRMATION_MISSING | Founder | 对已实现的浏览器本地范围作明确业务确认 |
| DOMAIN_HOLD | Jimson / 账号负责人 | DNS/旧服务器 owner、平台实际目标、正确 SAN、HTTP→HTTPS、正式域名错误页验收 |
| DEPLOYMENT_EVIDENCE_MISSING | Jimson / Founder | 精确源码与保存版本/部署 ID 的映射、授权范围、实际 Staging 验收 |
| ROLLBACK_HOLD | Jimson / Founder | 被接受的具体回滚版本、负责人、触发条件与演练记录 |

本轮没有合并、部署、创建远端保存版本、绑定域名、修改 DNS、切换流量、开放索引、变更账号权限或执行生产数据库操作。只读取证和代码准备不能解除这些人工/运行时门槛。
