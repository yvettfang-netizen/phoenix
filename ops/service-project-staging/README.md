# Service Project Staging | BUILD FIRST

这是 Service Project P0/P1 私有 Staging 的准备手册。它描述配置、隔离、监控和回滚要求，供 Jimson 和实际环境负责人完成部署前准备。阅读或执行本手册不会批准合并、迁移、部署、DNS 变更、开放索引或真实客户访问。

## 锁定候选

当前 P1 候选必须由部署负责人重新读取远端后填写。上一次隔离验收使用的 P1 HEAD 是：

~~~text
P1 HEAD = 5caa8ff524eb925866db13582160779640c1b381
~~~

P1 依赖关系为 PR55 → PR57 → PR58 → PR59 → PR61，记录的候选 SHA 分别为：

~~~text
PR55  5414c18ca521d8b8eae1f650102485749e6ebd3a
PR57  fb2f49cdc55ba57ec43e5c08ab561ee7bbe0f683
PR58  a0123c7f39292274962b72b73c06828b85770599
PR59  3ceac97abe5503583e5cc179b98293814d1e1b4d
PR61  5caa8ff524eb925866db13582160779640c1b381
~~~

部署负责人必须把当前远端 HEAD、测试合并树 SHA、Actions run ID 和 artifact digest 写入私有发布收据。任何一个 HEAD、审查、依赖或保护规则变化，都要重新生成收据。

## 组件与目录

候选代码、数据库 forward candidate 和验证入口位于：

- website/phoenix-nova-website-v5
- Phoenix Compass/education compass/server
- database/canonical/forward-candidates/service-workbench/0038_service_project_workbench.sql
- database/canonical/forward-candidates/service-workbench/0039_service_project_summary.sql
- docs/database/p1-integration-20261106

0038 和 0039 都是候选 SQL。应用它们前要经过独立数据库审查和 Founder Gate。不要把候选 SQL 复制进生产 migration ledger，也不要重写 0001–0037。

### 操作入口

```sh
bash ops/service-project-staging/stage.sh build FULL_SHA
bash ops/service-project-staging/db-preflight.sh --user STAGING_MIGRATION_OPERATOR
# 仅由获授权的数据库负责人在全新的专用 Staging 数据库上执行
bash ops/service-project-staging/db-apply.sh --confirm-staging --user STAGING_MIGRATION_OPERATOR
bash ops/service-project-staging/db-role-preflight.sh --user STAGING_MIGRATION_OPERATOR
bash ops/service-project-staging/stage.sh start FULL_SHA /absolute/private/state
bash ops/service-project-staging/verify.sh smoke
bash ops/service-project-staging/verify.sh accounts /absolute/private/synthetic-accounts.json
```

需要 Linux、Node 22.13+（22.x）、GNU 工具、`flock`、`curl`、PG16/17 和干净的提交。数据库脚本独立运行。服务启动脚本使用本地 Wrangler 与专用 D1 状态目录，绑定 `127.0.0.1:4775`，API 绑定 `127.0.0.1:4776`，身份 authority 在 `127.0.0.1:4777`。SSH 转发仅开放 Worker，例如在获批准的工作站执行 `ssh -N -L 127.0.0.1:4775:127.0.0.1:4775 STAGING_SSH_ALIAS`。限制服务器 OS 访问，禁止转发 API、PostgreSQL、调试端口或身份 authority。

CI 的运行包包含 Worker 和 Node API 的构建输出、完整源码 SHA 和逐文件校验清单。使用运行包时，在对应 SHA 的干净 Linux checkout 中先安装两处锁定依赖，再校验压缩包 SHA-256 并解包到 checkout 根目录。`stage.sh start` 会复核构建 SHA 和文件校验值。也可以在相同 SHA 上直接运行 `stage.sh build` 重建。

运行目录由当前专用服务用户拥有，权限为 0700，位于源码目录之外。`worker.env`、`server.env` 权限为 0600。Worker 文件只含 `WORKBENCH_STAGING_IDENTITY_KEY`。API 文件另含 `PHOENIX_STAGING_DB_NAME`、`PHOENIX_STAGING_APP_DSN`、`PHOENIX_STAGING_BINDER_DSN`。机器密钥由获批的密钥管理系统生成并同步到 authority。所有值由实际责任人配置。禁止在命令行或日志中放置密钥。

日常启停交给授权操作员或私有 Linux 服务管理器。发送 TERM 后，由启动脚本回收自己启动的 Worker 和 API。回退时先关闭 SSH 转发与服务，再按旧 SHA 构建并恢复已审查的制品和该版本配置。保留 D1/Canonical 与审计记录供 DBA 检查。Linux 启动冒烟仅验证包和回环防护。

本地 D1 自助注册关闭。获准的测试负责人准备两名合成客户，使用正式 Customer Auth 的密码哈希和会话逻辑，并在身份 authority 写入不同范围的合成映射。两人各需至少一个对方无法读取的项目。验收文件结构为 `{synthetic:true,accounts:[{session,projects}, {session,projects}]}`，其中 `session` 是既有 D1 会话的 cookie 值，`projects` 是预期可见的 UUIDv7 列表。只用 0600 私有文件传递，验收后撤销会话并按测试留存策略处理。

### 身份与外部服务接口

本地 authority 接受机器认证的 `POST /v1/workbench/session`。Worker 将经 D1 核验的 `resolve-customer` 请求映射到 FAMILY。独立 staff 会话以 `resolve-staff` 映射到 ADVISOR；员工会话由未来获批的提供方签发。两者返回最小 `{channel,token}`。API 用 `resolve-bearer` 再取经核验的 Canonical 主体，`assert-current` 需返回 204，表达当前授权仍有效。身份 authority 必须记录分配及拒绝审计。合同、付款、开通和退款由 Operations 来源控制。通知现有通道为站内项目消息和事件，外部投递等待获批适配。文件传输等待私有存储、扫描、Consent、留存及保全流程签审，当前 Staging 入口按关闭处理。

## 数据和角色隔离

BUILD FIRST 使用标记为 synthetic 的一次性 PostgreSQL 16/17 数据库、独立 D1 测试数据库和独立浏览器上下文。测试数据必须带有 synthetic 标识，不能包含客户、患者、员工、护照、保险理赔、合同原件、付款记录或真实文件。

至少使用下列互相隔离的角色：

| 角色 | 用途 | 禁止事项 |
|---|---|---|
| Customer Auth session | 验证测试登录会话 | 不接受浏览器提交的 customer、family、principal、role 或 project 选择 |
| Canonical provider | 将已验证 session 映射为当前 principal、family、subject scope | 不使用静态别名代替真实映射，不向浏览器返回 bearer |
| Binder LOGIN | 发行短时一次性 context ticket | 不读业务表，不持有 app role，不得设置角色 |
| App LOGIN | 执行受控 SECURITY DEFINER 函数 | 不得拥有业务表直接读写、DDL、BYPASSRLS 或 SUPERUSER |
| Operations SERVICE | 写入经过签名和版本校验的合同、付款和 opening 来源引用 | 不开放客户网页路由，不接受 CRM 预计金额或 entitlement 代替付款 |
| Backup operator | 仅在批准的恢复演练中导出和恢复 | 不作为应用读者，不与 app/binder 共用凭据 |

实际运行使用两个独立的 `LOGIN NOINHERIT`。App 只需数据库 CONNECT、auth schema USAGE 和对 `phoenix_canonical_service_workbench` 的 `INHERIT FALSE, SET TRUE` 成员关系。Binder 只需 CONNECT、auth schema USAGE 和对 `auth.issue_context_ticket(uuid,uuid,uuid,text,timestamptz,uuid,uuid)` 的 EXECUTE。两个登录都不应直接读取业务表。由 DBA 在专用 staging cluster 中用批准的密钥流程配置和核对。

角色、连接池、数据库、对象存储和日志目的地都必须独立。密钥和口令只放在获批的私有 secret manager 或运行时绑定中。仓库、CI artifact、截图、日志和本 README 不得包含密钥值、cookie、JWT、pgpass、对象内容或真实标识。

## 私有环境配置

所有变量只登记名称、来源和负责人，不在仓库写入值：

| 配置类别 | 现有接口或占位变量 | 负责人 |
|---|---|---|
| 运行开关 | SERVICE_WORKBENCH_PRIVATE_STAGING=1, SERVICE_WORKBENCH_STAGING_ORIGIN=http://127.0.0.1:4775, SERVICE_WORKBENCH_ENABLED=true, SERVICE_WORKBENCH_SYNTHETIC_PREVIEW=false, CUSTOMER_CANONICAL_BRIDGE_ENABLED=true | Founder、身份负责人 |
| Customer Auth | D1 binding、session hash 校验、issuer/audience/JWKS 或等价 provider binding | 身份负责人 |
| Canonical mapping | customer → principal/actor/family/subject/grant 映射源、撤权和过期检查 | 身份与安全负责人 |
| BFF/API | SERVICE_WORKBENCH_API_ORIGIN=http://127.0.0.1:4776、WORKBENCH_STAGING_IDENTITY_ORIGIN=http://127.0.0.1:4777、loopback/trusted gateway 约束、部署 artifact SHA | 工程负责人 |
| Node staging API | PHOENIX_SERVICE_WORKBENCH_MODE=private-staging、PHOENIX_SERVICE_WORKBENCH_HOST=127.0.0.1、PHOENIX_SERVICE_WORKBENCH_PORT=4776、PHOENIX_STAGING_DB_NAME、PHOENIX_STAGING_APP_DSN、PHOENIX_STAGING_BINDER_DSN | 工程负责人、DBA |
| Identity authority | PHOENIX_STAGING_IDENTITY_URL 或 PHOENIX_STAGING_IDENTITY_SOCKET、PHOENIX_STAGING_IDENTITY_PATH、PHOENIX_STAGING_IDENTITY_TIMEOUT_MS、WORKBENCH_STAGING_IDENTITY_KEY | 身份与安全负责人 |
| Object storage | 当前私有 staging 未配置对象 provider，必须保持 disabled-fail-closed。获批 provider binding、加密和 key version 由数据/运维负责人另行登记 | 数据/运维负责人 |
| File scanning | scanner endpoint/binding、策略版本、quarantine bucket、清理任务 | 隐私/安全负责人 |
| Observability | audit sink、metrics、error monitor、health-check destination | 运维负责人 |

缺少 provider、映射、私有对象存储、恶意文件扫描、quarantine 清理、私有访问控制或审计目的地时，相关能力必须返回明确错误并保持关闭。当前 staged Worker 只接受 127.0.0.1:4775，Node staging API 只接受 127.0.0.1:4776，身份 authority 通过 127.0.0.1:4777 或 Unix socket 连接。不得用合成登录、默认 secret、空扫描结果或 mock/workbench 路径假装完成配置。

## BUILD FIRST 验收顺序

1. 记录准确候选 SHA、依赖 SHA、Actions run ID、artifact digest、当前主分支 SHA 和保护规则。
2. 在独立数据库中应用候选 SQL。先验证 migration ledger、FK、RLS、SECURITY DEFINER 的 search_path、函数授权和审计，再插入合成数据。
3. 启动隔离的 BFF、Canonical API、私有对象适配器和扫描器。服务启动前检查所有必需 binding、TLS、角色权限、存储 ACL 和 noindex/访问控制。
4. 使用至少两个合成身份执行跨家庭、同家庭不同成员、撤权、会话过期、Health 混合域、未授权下载、数据库故障、网关故障和审计故障负例。
5. 记录首页和项目工作台的中英文、移动端、任务刷新、历史、暂停、终止和空状态证据。合成截图必须标记 synthetic。
6. 仅当所有私有 Staging 前置条件均由对应负责人签审后，才可以创建私有 Staging 变更计划。真实账号验收要单独使用两个权限不同的受控账号，不能沿用合成证据。

## 监控与健康检查

必须建立以下指标和告警，并把阈值、目的地、值班人写入私有运维配置：

- 身份映射缺失、多重匹配、撤权、会话过期和 assertCurrent 失败
- 跨家庭、未授权项目、未授权下载、Health 混合域和敏感字段拒绝
- 审计写入失败、审计延迟、context ticket 重放和 app/binder 连接清理失败
- PostgreSQL 连接、RLS/函数错误、事务回滚、锁等待和 replication/WAL 状态
- 对象上传、哈希校验、扫描通过/拒绝/超时、quarantine 堆积和 purge 失败
- BFF 5xx、API 503、客户端错误页、错误监控和健康检查状态

日志只记录请求关联 ID、决策代码、候选 SHA、项目不透明引用和时间。不得记录 cookie、bearer、原始文件、对象 key、护照号码、病历、完整 Consent 文本或付款凭据。健康检查必须使用合成探针或无敏感字段的授权探针。

## 回滚

回滚由授权运维人员执行，并保存执行前后的 SHA、配置和审计收据：

1. 停止真实入口流量，先关闭 CUSTOMER_CANONICAL_BRIDGE_ENABLED，再关闭 Family Center/Workbench flags。
2. 撤销测试 session、provider mapping、context ticket 和对象下载签发。确认失败映射不会回退到合成身份。
3. 恢复上一个独立审查过的不可变 artifact。验证登录拒绝、页面清空旧数据、审计仍可写、健康检查和 noindex/访问控制。
4. 数据库只在独立批准的 forward candidate 上做可逆操作。禁止 CASCADE、破坏性 down migration、删除业务事件或重写 0001–0037。
5. 0039 回滚顺序是先停消费者，再按依赖 REVOKE/DROP summary、snapshot、list、scope 函数，发现未预期依赖即停止。对象和审计记录按批准的留存/legal-hold 规则处理。
6. 记录数据库恢复、对象恢复、扫描器恢复和告警恢复时间。合成恢复时间不能直接写成正式 RPO/RTO。

## 当前 HOLD

真实登录提供方和客户/员工映射、私有 Sites 访问控制、两个真实受控账号、独立安全审查、文件分类和 Consent、护照等敏感文件规则、恶意检测/CDR、私有对象存储、retention/legal hold/purge、合同付款来源、退款/终止处理、WAL/PITR、RPO/RTO、备份真实性和恢复责任人均须由实际责任人批准。完成 BUILD FIRST 不会自动解除这些 HOLD。
