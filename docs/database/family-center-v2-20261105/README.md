# 家庭中心 V2.0｜实施与接入候选

日期2026-11-05；Founder提供两份实施指令及仪表盘参考图，Codex执行。此次为候选，不作Founder验收或他人独立审核签署。

基线：`phoenix/main@9de1e8ddeecbd338d53230ef0ff3b3a82ac3e2fc`；实现基于PR55 `5414c18ca521d8b8eae1f650102485749e6ebd3a` 的独立分支 `codex/family-center-v2-20261105`。PR55仍Draft/Open；main含0001–0035，0036/0037仅在候选分支。没有新增Migration、复制主数据或修改历史SQL。

- [页面审计、API与字段差异](SCHEMA_API_GAP_AUDIT.md)
- [开关、验收及回滚](ACCEPTANCE_AND_ROLLBACK.md)
- [实际执行结果](EXECUTION_REPORT.md)

正式页面仍为 `website/phoenix-nova-website-v5/app/[locale]/family-center/page.tsx`。V2默认关闭；旧版本源码仍在上述基线，flag关闭立即恢复。未修改旧FamilyDemoProvider或认证数据表。

参考图仅用于布局/色彩指导，页面由React组件实现；插画直接复用原站 `fengqi-digital-immortals.png` 和四领域图片，未把整张仪表盘图片铺作UI。麒麟图景为既有九灵插画的CSS取景，未生成新Logo。官方Logo直接使用已获浅色底使用批准的 `public/brand/official/v3/phoenix-nova-header@2x.png`，其字节不变；页头浅色底、侧栏海军蓝。

原续篇附件在P7 Layer3标题处结束。这里只按已收到内容实施，未编造缺失的数据库/发布回滚条款。
