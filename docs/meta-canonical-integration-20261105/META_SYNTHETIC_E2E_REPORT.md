# Phoenix Meta × Canonical Integration V2.0

任务 PHOENIX-META-CANONICAL-INTEGRATION-20261105；审查日期 2026-11-05（Asia/Shanghai）。状态：LOCAL CANDIDATE / HOLD，非生产验收。

## 当前结论

真实Meta→Canonical贯通：HOLD。本轮只准备和验证本地只读适配，不能称为完成安全数据库连接。测试结果将在执行后追加；历史0035/0037测试不能替代此次接入测试。

| 验收项 | 状态 | 证据/缺口 |
|---|---|---|
| 实际源码/路由 | SOURCE VERIFIED | Sites67版 a96de29...，app routes已读；运行路由验证待下方记录 |
| 九灵编号名称职责 | LOCAL CANDIDATE | 依据09-20冻结修复，测试结果另记 |
| NOVA五模块真实来源 | NOT RUN | 只有projection DTO/空状态，真实Gateway未实现 |
| 无权限用户拒绝 | 合成测试待记录 | 真实Dispatch+Canonical NOT RUN |
| 跨Spirit | 合成网关拒绝待记录 | 实际Agent能力/RLS NOT RUN |
| 跨家庭/客户 | NOT RUN | 无真实Gateway与授权投影 |
| F3未批准阻断 | 合成写请求拒绝待记录 | 完整Founder状态机 NOT RUN |
| 审计与证据关联 | DTO层测试待记录 | 实际持久化READ/tool审计 NOT RUN |
| PG16/PG17 | NOT RUN | 当前PATH无docker/psql，未连接或更改既有库 |
| 桌面/移动浏览器E2E | NOT RUN | 本轮待可用本地预览后记录，不继承历史截图 |
| 页面/Runtime回归 | 待记录 | 现有build-based tests与新零依赖adapter tests分开报告 |
| 凭据与敏感信息 | 待检查 | 本轮不复制env/凭据/真实数据；不声称全面历史安全扫描 |

没有真实证据的项保持NOT RUN/HOLD。Mock成功只是契约校验成功，不等于RLS、Consent或生产身份通过。

## 本轮实际执行结果

Node v24.19.0，Windows。安装官方helper因旧项目脚本依赖bash失败；随后npm ci --ignore-scripts --no-audit --no-fund安装锁定依赖成功，未改package/lock。npx vite build两次成功（第二次在最终适配变更后），npx tsc --noEmit --incremental false通过。

| 执行 | 实际结果 | 覆盖与限制 |
|---|---|---|
| node --test tests/meta-canonical-read.test.mjs tests/meta-canonical-ui.test.mjs | 12 tests / 12 PASS | 7个handler安全组+5个正式九灵/SSR/入口权限/worker routing组；全部合成数据 |
| 九灵 | PASS local | 正式九项、唯一编号、空间、领域；八灵已授权Founder route=200；匿名=404 |
| 跨Spirit | PASS local page + DTO | 限定员工xuanwu=200、pixiu=404，新旧入口一致；网关跨Spirit数据被502拒绝；不是PG RLS证明 |
| 写/F3 | PASS local refusal | POST及客户端APPROVED不能打开Canonical执行接口，405；没有完整审批执行状态机 |
| 来源/审计/敏感字段 | PASS DTO only | 五模块、合法状态、来源版本时间scope必填；缺审计、未知字段、其他Spirit、超量、超时均拒绝；持久化audit NOT RUN |
| 旧测试 node --test tests/meta-work.test.mjs tests/ui-components.test.mjs tests/rendered-html.test.mjs | FAIL：17 tests，7 PASS / 10 FAIL | Miniflare workerd 0xc0000005 ERR_RUNTIME_FAILURE，D1工作流suite无法初始化；另外旧渲染断言包括首页旧结构、匿名访问Spirit=200、共修旧文案及原入口宽松权限，当前未全绿 |
| Browser desktop | PASS limited synthetic preview | Chrome本地/nova确认五模块和未登录提示，无真实业务数据；SSR Node preview，未使用生产身份 |
| Browser mobile | PASS limited at390×844 | Chrome viewport override；innerWidth390、document scrollWidth375，无横向溢出，五模块齐全；已reset视口 |
| 原生Worker dev preview | BLOCKED | npx vite启动因同一Miniflare原生运行时崩溃，未改系统运行库 |
| PG16/PG17、跨家庭/客户RLS、真实Gateway、完整Runtime/D1回归 | NOT RUN / HOLD | 无docker/psql；真实Gateway和必要SQL投影尚未实现，不能以Mock或SSR替代 |

浏览器预览使用本地Node HTTP到已构建worker.fetch（无DB/生产身份），不代表Cloudflare原生Worker全栈通过。UI本次没有正向真实企业数据E2E，五模块真实来源测试仍NOT RUN。屏幕观察与DOM核验只覆盖匿名/nova及响应式，不声称完整移动业务流程验收。

截图证据：[desktop](evidence/nova-desktop.png)、[mobile390](evidence/nova-mobile.png)。截图来自本轮本地合成预览，不是生产截图。

交付范围检查：Canonical目录对刷新main零差异；源码patch reverse apply --check通过；交付Markdown/JSON/patch定向凭据模式扫描0项，未执行完整历史secret/PII扫描。没有生产env文件或密钥写入交付。

## 执行验收与回滚补充

本轮新增M0–M8门禁，详见[META_ACCEPTANCE_RELEASE_GATE_REGISTER.md](META_ACCEPTANCE_RELEASE_GATE_REGISTER.md)、[四层回滚方案](META_FOUR_LAYER_ROLLBACK_RUNBOOK.md)及[演练记录](META_ROLLBACK_DRILL_REPORT.md)。精确版本和artifact hash见ACCEPTANCE_EVIDENCE_MANIFEST.json。原67版隔离build/typecheck通过、原回归8/17；本轮候选定向12/12与5个组件探针通过，均不能替代完整PG16/17、Staging、独立安全审核或回滚演练。本轮未改应用代码、SQL或生产配置，发布HOLD。
