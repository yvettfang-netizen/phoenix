# Phoenix Meta｜执行验收、发布门禁与回滚补充

任务：PHOENIX-META-CANONICAL-ACCEPTANCE-ROLLBACK-20261105。关联主任务：PHOENIX-META-CANONICAL-INTEGRATION-20261105。日期：2026-11-05（Asia/Shanghai）。**发布结论 HOLD；无生产授权。**

## 本次重新读取的基线

| 项目 | 已观察结果 | 资格判定 |
|---|---|---|
| GitHub main | REST commits/main=19feef190dcba13ccc9181c998d4c82527377803；PR51 base同值 | PASS源码身份；首次git ls-remote连接reset后使用官方gh REST复核，未继承失败结果 |
| SQL | database/canonical/migrations仍0001–0035 | PASS工程清单；不能推断生产ledger |
| 候选 | PR41/48仍OPEN、mergedAt=null；45/46/47等仍为候选 | 未安装、不可当已生效契约 |
| 冻结 | Notion current page 3e1c31ee15bb8122baa4d690facb0897，last edited 2026-09-20T07:17:33.668Z | PASS依据；九灵正式表不变 |
| Site | Phoenix Meta，active/public，latest version67 | 只读查询，未改audience/生产配置 |
| 源码 | a96de29bbfdf32558b202123f15a3ca3c5b2a9a3，独立Sites仓库；实际当前工作分支候选640451c | PASS定位，不能用主仓库旧副本替代 |
| 保存包 | sha256:e4ca1e82b3c9cbf1d1fdc6a33c6a9398adb87756a7b1dd19295201387f149b78，56504320 bytes，93 files | 已读取Sites版本元数据，未下载并验证完整归档恢复 |
| 既有部署记录 | appgdep_6ab3a4030e9c8191a676957fa3ee2b38，succeeded，version67，历史更新时间2026-09-23T10:04:35.885173Z | 证明历史成功，不等于本轮恢复演练 |
| 构建/路由 | React19/Vinext/Vite/Cloudflare；/、/wilds、/realms/:id、/nova | 源码定位PASS，旧源码构建/原测试另记 |

## 旧版恢复来源

Sites saved version ID：appgprj_6a8ed46a2cdc8191aa6b40b88a9e551d~appgver_7b2a5f5940448191828dbe0a5ebc6ceb。

此67版是本次候选的前序版本，归档和本地Git原提交均存在；但原版编号漂移、legacy Spirit入口宽松权限及回归失败不能因“曾部署成功”而豁免。恢复资格为SOURCE AVAILABLE / NOT QUALIFIED，而非ROLLBACK PASS。若安全修复必须保留，不得把回滚回旧漏洞作为允许方案；应准备经验证的修复版本或关闭受影响入口。

已通过Sites官方source helper只读重新认证抓取源分支main；隔离baseline工作树FETCH_HEAD与HEAD均为a96de29bbfdf32558b202123f15a3ca3c5b2a9a3，与保存67版一致。未push源码、未接受自动发布窗口；本轮没有进一步应用改动。

独立数据库/API与Runtime前序兼容版本目前EVIDENCE_MISSING。不得拿旧页面任务D1 fixture当可恢复Canonical API，不得把旧GPT链接/安装技能版本当已验证Runtime部署配置。

## 基线测试记录

隔离worktree固定a96de29，不修改原应用；原build/typecheck/tests实测结果在本文件末尾追加。环境或断言失败均保留，不能依赖历史成功文件。

## 当前原版隔离实测结果

固定a96de29 detached worktree：npx vite build PASS(exit0)，TypeScript PASS(exit0)，原始三组测试共17项，8 PASS、9 FAIL、0 skipped(exit1)。D1 Miniflare初始化崩溃0xc0000005/ERR_RUNTIME_FAILURE，权限与审计断言未执行；其余四个页面断言为首页/wilds旧结构、匿名Spirit旧200预期、共修旧文案不匹配。测试runner另计suite初始化失败。

源码git diff为空，未改共享依赖；日志摘要及原始文件hash见BASELINE_TEST_EVIDENCE.json，原日志保存在隔离baseline/evidence-local，不公开整段页面/身份内容。相比候选前轮7 PASS/10 FAIL，多出的候选legacy入口测试失败来自新增scope拒绝，不能把原测试放宽权限预期当需要恢复的安全行为。

结论：原页面能构建，不能称原版完整回归可用或合格回滚版本；M0/HOLD保留。
