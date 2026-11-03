# 页面 → Canonical 接入矩阵

任务 PHOENIX-V7-CANONICAL-PAGE-INTEGRATION-20261103，2026-11-03。**只读审计 PASS；完整页面接通 HOLD。** 本包是开发/合成接入准备，不批准生产、真实数据或合并。Canonical唯一工程权威为本仓库`database/canonical/`。

本轮重新核验main=`9355d28667ee9cf4761b4abcdaf959f0ad154820`，0001–0035全部35项摘要一致。PR36/37已合并；0036在[PR41](https://github.com/yvettfang-netizen/phoenix/pull/41)的`3de5c99fcc1974ca542db587fcb01494ffe3dc58`，仍Draft/未合并，不能当main已安装。main中的旧README措辞由既有PR39纠偏，本任务不重复建立权威工程。

代码依据：[SOURCE_INDEX.json](SOURCE_INDEX.json)；31个相关远端分支及PR状态：[BRANCH_AUDIT.json](BRANCH_AUDIT.json)。Git祖先关系不等于PR合并结论，尤其是squash：V3 PR32/31已合并，但相应分支继续分叉；不能把分支最新全部代码当main。未合并开发分支不能据名称推断数据库能力。

| 页面/模块 | main及最新候选事实 | 实际API/存储 | Canonical接通证据及缺口 | 状态 |
|---|---|---|---|---|
| Education V3官网 | `/{locale}/education`在main；[PR32](https://github.com/yvettfang-netizen/phoenix/pull/32)已合并。fdda155e…分支与main继续分叉 | `education-consultation.tsx`只用页面内存，按钮展开清单，不发咨询 | 页面存在不等于Lead/预约入库；没有该页面→Canonical写入证据 | 审计PASS；接通HOLD |
| Education V2 GEO | [PR38](https://github.com/yvettfang-netizen/phoenix/pull/38)，8c07672a…，Draft；新增schools/programmes/universities/[slug]/[section]及sitemap候选 | 静态TypeScript目录/搜索与发布契约；候选app/api仍只有customer-auth | 内容源、发布版本、查询与获客写入必须分开；未发现新教育业务数据库API | 审计PASS；接通HOLD |
| Education小程序/可信后端 | main合同v1.1；`codex/education-founder-final-alignment`6db8db05…合同v1.2，未完整进入main | Node HTTP真实实现；MemoryStore或独立PostgresStore；自有users/families/students等表 | main未包含历史Canonical桥接。48bb6c3…桥接已有合成权限验收，但响应仍来自旧Store，未实现主数据统一 | 代码PASS；统一主数据BLOCKED |
| Identity V3/V3.1 GEO | V3 [PR31](https://github.com/yvettfang-netizen/phoenix/pull/31)已合并；[PR35](https://github.com/yvettfang-netizen/phoenix/pull/35)3e0d1957…仍Draft，含国家/比较/导入预览页面 | GEO是静态记录和纯导入预览；独立Identity Compass有growth-snapshot API，但身份评估保存到浏览器Mock Feishu/localStorage | 浏览器产生的fam_/usr_不具身份权威；纯import preview不等于持久化/正式政策发布 | 审计PASS；接通HOLD |
| Wealth Compass | [PR3](https://github.com/yvettfang-netizen/phoenix/pull/3)已合并的独立基础；官网入口`/compass#wealth` | 仅`/api/health`；Map内存仓库和Mock CRM/referral；RULES_NOT_LOADED | 没有正式规则、Canonical持久化或Finance依据；fragment不发送给服务器 | 审计PASS；业务接通BLOCKED |
| Health V3.1/GEO/APEC | main有Health页面；[PR33](https://github.com/yvettfang-netizen/phoenix/pull/33)5771c910…、[PR34](https://github.com/yvettfang-netizen/phoenix/pull/34)5a0fbc4f…均Draft | 页面/目录及纯readiness函数；`authorized=false`、`canPersist=false` | readiness的CANDIDATE不是授权；没有非敏感咨询真实写入，更没有患者Consent或病历接入 | 审计PASS；接通HOLD |
| ASKWISE | main学习引擎页面可见；独立试点分支644fab93…未合并，另有受保护pilot API | main/pilot均有better-sqlite3代码；pilot catch-all API、独立认证、SQLite、Mock Compass回写 | 导出canonical_student_id保留NULL，source为askwise_independent_pilot；不能按姓名映射或把Mock当Canonical | 审计PASS；统一映射BLOCKED |
| 凤启学苑/启明堂 | 官网academy/academy-booking只是产品介绍/预览；私有phoenix-academic-studio main c32534fc…为契约骨架 | private main及hardening无运行后端；aoyu-companion分支f08dad49…有UI原型，不是入库证明 | 复用learning0022；不得重建Student/Teacher/Course。`feat/academy-phase1-shell`实际指向旧Wealth合并，不证明学苑已实现 | 审计PASS；接通HOLD |
| Family OS | 官网Family Dashboard是静态家庭预览/独立D1账号门禁；原生Family OS有本地demo后端 | `backend/database.js`用node:sqlite；HTTP会创建自己的demo用户/家庭/学生 | 客户登录≠家庭授权；三个历史只读桥接≠DTO从Canonical读取；正式身份/学生映射与最小投影待实现 | 审计PASS；接通BLOCKED |
| Founder/Operations OS | 找到资产保全文件所指既有工程e60a16477581e286c8c75b421e95dbc531c9af77，经营页面/状态机/读取代码存在 | Cloudflare D1/Drizzle；Operations actor与组织作用域；现有0004和一份测试有未提交修改 | 仅核验代码，未连接D1/服务器；保留原业务和dirty文件。Digital World的/founder不能代替经营系统 | 代码审计PASS；当前部署NOT RUN；接通HOLD |

并行风险：Jimson614 fork的PR25/26/27修改Education Store、登录/顾问工作台及路由；PR14是另一套Family Core sandbox，不能作为第二条Canonical迁移主线直接接入。均未在本轮合并/执行。学苑、Founder来源及原始日志留在私有证据；公开只列逻辑事实，不公开拓扑、密钥或真实记录。

**最小下一步：先做P0已发布课程目录的只读服务端贯通，再做经验证的Family/Student投影。** 第一条不需要新增主表/0036，也不需要迁移旧数据。见[Founder门禁](FOUNDER_INTEGRATION_GATE.md)。
