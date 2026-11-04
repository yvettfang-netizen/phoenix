# Canonical 0037 — scoped public IDs and protected read audit

2026-11-04｜Jimson本人授权，Codex执行。**本地合成候选；默认关闭；真实身份及发布HOLD。** 依据[PR47窄方案](https://github.com/yvettfang-netizen/phoenix/pull/47)，本轮用户明确授权本地实现与PG16/17合成验收，不代表新增业务语义批准、独立审查签署或合并许可。

## 来源与编号

- main核验 `9355d28667ee9cf4761b4abcdaf959f0ad154820`，已合并唯一Schema/Migration权威为 `database/canonical/`。
- 方案基线 `6ff02a17926024ddd10c6906391e03aae96984aa`，依赖未合并PR46/45；候选独立分支 `codex/canonical-0037-id-read-audit-20261104`。
- PR41的0036仍是未合并独立候选 `3de5c99fcc1974ca542db587fcb01494ffe3dc58`，不占用、不改写、不捆绑。此分支包含0001–0035 + 0037共**36个文件/36行账本**，不是声称完整0001–0037已合并。未来与0036整合必须重核编号、Manifest、恢复断言及准确HEAD的CI。
- [0037 SQL](../../../database/canonical/migrations/0037_scoped_public_id_projection_read_audit.sql) SHA-256：`29c153177b4177cc279fe2494e2be563bd6250f6564c57fc62e381df1c7decb2`。35个历史SQL及原smoke.ps1/migrate.sh不改字节。

## 数据库变更及权限矩阵

零新增表/业务字段/人员主档/Consent用途；零存量数据修补。新增一个NOLOGIN权限角色、三个公开受控入口、两个私有helper。相比方案的单个翻译helper，额外的private read_projection_summary只是复用完整授权及审计逻辑，不开放新操作参数给运行账号。

| 角色/主体 | 允许 | 明确拒绝 |
|---|---|---|
| phoenix_canonical_projection_reader | core.read_family_summary()、core.list_student_summaries()、core.read_student_summary(text)；redeem/clear/nonce及空上下文检查 | 所有业务/mapping/audit表直读、DML、审计序列写入、DDL、helper执行、管理API、签票、继承或SET到旧reader/app/binder/migrator |
| 独立read LOGIN（只在一次性测试集群创建） | CONNECT，NOINHERIT，仅SET到上述角色；无运行时DDL | 不加入旧reader，不与binder复用账号或密码；权限闭包/目标角色flags/任意父角色异常则拒绝启动请求 |
| 独立binder LOGIN | 既有0023来源限定解析/签票，独立pool | 新投影、业务表及audit表；不拥有read角色 |
| 迁移所有者 | 创建函数/角色，函数内部受控读表和audit写入 | 不作为应用运行账号；不得据此启用真实身份 |

SECURITY DEFINER固定search_path，表/函数限定schema，pg_temp最后；owner可能绕过RLS，因此入口显式校验PID/backend_start/实时有效期、非空nonce、ACTIVE FAMILY principal及actor一致、当前家庭有效成员关系。学生只限本人或有效VERIFIED EDUCATION/GENERAL监护且其学生成员关系有效，不开放顾问/渠道/SERVICE或完整家庭名册。临时表即使可创建，也不能遮蔽限定schema的权威对象。

公开ID严格来自已登记public_ids，按kind、UUIDv7、目标存在及既有前缀编码一致性翻译。只返回fam_/stu_ v2最小DTO。不存在/无权单学生均404；已授权集合映射损坏或>100项整单503，无自动补建、UUID回落、旧ID反解或全局ID oracle。public ID编码不等于匿名化或权限。应用fam_仍由PHOENIX_FAMILY_OS来源映射解析，与Canonical fam_权威分离。

## 开关、读取事务及审计

新模式需同时设置原开发投影开关及 `CANONICAL_FAMILY_PROJECTION_AUDITED_ENABLED=true`；两端BFF/可信Node均必须一致。开关默认关闭；生产/非loopback仍拒绝；只接受既有明确的合成.invalid身份配置。旧v1合成预览及其35基线测试保留，不能把旧v1作为真实或审计读取回退。

新模式顺序：校验受保护配置和运行角色 → SET专用角色 → clear → 独立binder解析签票 → 同一read后端兑换/nonce核验 → 短普通BEGIN → 受控投影及严格envelope/DTO核验 → COMMIT → clear/空上下文检查/RESET/DISCARD → 才能发HTTP正文。正常拒绝也先COMMIT审计；审计、COMMIT、DTO或清理失败均无业务正文并销毁不安全连接。事务不是READ ONLY，但运行角色无任何业务写权限。

每次审计读取事务显式SET LOCAL statement_timeout=2s，避免DISCARD ALL清除startup GUC后失去约束；客户端query_timeout=3000ms不依赖数据库会话GUC。永久测试在新库/恢复库用断言trigger核验连续请求在池清理后仍为2s，验证后清除测试注入。

内部复用0017 audit.record_write_decision，固定action=READ及resource/reason白名单；不向运行角色授予通用audit执行/INSERT权限。family/single一次决定，列表一次LIST决定及每个实际返回学生一条ALLOW；超限或映射异常不写成功学生项。nonce、principal、actor、family从受保护上下文读取，attempt由旧helper生成；未知/无权学生不把外家庭UUID写进当前家庭事件。

DB行仍可回滚；PHOENIX_AUDIT服务端LOG保留尝试，通过attempt/nonce对账识别LOG_ONLY。ALLOW是决策尝试而非客户交付证明；不能保证日志配置/采集故障或崩溃时绝不丢失。不宣称中途撤权可取消已读取响应，当前仅验证下一请求重新解析时拒绝。

## 验收入口与边界

源文件核验：`node database/canonical/verification/v0037/verify-source.mjs`。

已有后端：`npm run typecheck`、`npm run build`、`npm test`。网站：`npm run typecheck`、现有eslint及 `node --test tests/canonical-family-projection.test.mjs`。

合成PG16/17：安装既有后端/网站依赖及Playwright 1.62.1后，分别运行 `node database/canonical/verification/v0037/projection-e2e.mjs 16` / `17`。只接受版本、不接受既有DB URL；创建带唯一标签、loopback端口、SCRAM认证的新容器，随机凭据通过受保护文件/容器pgpass或stdin使用，不在命令行传值。临时故障注入仅限已核验标签的自有集群，备份前删除注入trigger/helper并恢复原函数定义。

备份及globals由专用备份LOGIN导出；SHA-256篡改拒绝后在全新集群恢复并重复数据库/浏览器验证。manifest未签名，只校验一致性，不能证明来源真实性。测试结束只清理本轮自有容器/卷/受保护fixture文件，不清理历史保留目录或旧匿名卷。

真实HTTPS issuer/JWKS、签名/app/binder实际配置与轮换、身份/成员核定证据、实际应用生命周期及日志留存采集、真实启用批准仍见[既有缺口表](../id-read-audit-proposal-20261104/REAL_IDENTITY_GAP_AUDIT.md)。既有ID、FM、Option A/broker及责任人决定不重开。I-7工程机制可由本轮证据关闭；其他真实事实缺口HOLD。不合并、不连腾讯、不部署、不导入真实资料。
