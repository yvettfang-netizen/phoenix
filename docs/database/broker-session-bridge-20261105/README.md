# Broker 验证与可信会话家庭桥接｜最小本地候选

2026-11-05（Asia/Shanghai）。Jimson本人授权及回写，Codex执行。任务：补齐已发现的broker/可信会话机制缺口，仅本地合成验收；**真实身份、真实配置、启用、生产 HOLD**。

工程源为 `yvettfang-netizen/phoenix`；分支 `codex/broker-session-bridge-20261105` 从 PR49 的 `b93a0ae3247d391f892e7350bb8d435d37731a77` 继续，PR48代码基线 `38be3197c39490f149a1adbfc328e223354fca43`。2026-11-05核验 main 已更新为 `19feef190dcba13ccc9181c998d4c82527377803`，Canonical仍0001–0035；PR48/49仍Draft、未合并。本轮不整合其他main业务变更。

## 已有决定保持不变

- 复用Option A、first-party ES256 broker、最多300秒assertion与JWKS缓存、`usr_*` subject、不在token内加入家庭ID或个人资料。零秒时钟容差满足既有不超过60秒上限。
- 复用现有 `AuthService.authenticate` 的opaque session及Store家庭归属；只读，不调用建用户/家庭/学生逻辑。
- 复用0023的固定source与原子解析、0024/25已批准映射管理、0037的public ID与受保护READ审计、分离LOGIN/pool和一次性票据。
- 不更改任何Migration，不申请新编号；候选仍0001–0035 + 独立0037，36文件/账本、92表、83策略。0036独立候选不捆绑。
- [原受控事实包](../identity-evidence-packet-20261104/README.md)的F1–F5仍HOLD。历史参数和责任人不重选；实际origin、配置引用和运行拓扑不复制进本公开候选。

## 本地调用链

1. 独立loopback测试HTTP收到既有opaque session；浏览器不能提供broker token、family/principal/channel或SQL。
2. `createSessionFamilyResolver` 通过现有AuthService取得有效family_user，拒绝deleted/admin；在Store读取其唯一家庭并验证归属与应用fam_格式。零个或多个家庭均拒绝。
3. 可信内部 `tokenForSubject` 适配器只接收已认证usr_，产生不含家庭ID的assertion；合成验收使用进程内临时ES256签名器，没有浏览器签发入口。
4. `createBrokerVerifier` 校验配置指定的精确iss/aud、ES256签名、kid、iat/nbf/exp、300秒上限、UUID jti及最小claim白名单。严格compact JSON也拒绝重复键；不是通用OIDC登录客户端。
5. JWKS只从可信配置指定URI的注入reader读取，固定单源；不使用header中的jku/x5u/discovery。缓存不超过300秒，未知kid最多30秒一次刷新，并发合并、1.5秒等待上限；失败拒绝，不使用过期缓存。最多8个P-256公钥，拒绝私钥/重复kid/错误用途。
6. JWT sub必须等于已认证用户；重新认证会话和归属，得到应用fam_，再交给既有投影引擎。引擎仅在app连接上作权限和空上下文检查；binder0023解析成功前没有业务查询或响应数据。分离binder签票，app同后端兑换，再走0037受控读取和审计。
7. 受保护事务/DTO/审计/COMMIT与clear/discard逻辑沿用；HTTP正文前再次认证session和Store归属，错误一律无业务正文。该额外检查不保证能取消已经读取或在最后检查后发生的并发撤权；下一请求必须重新解析。

## 范围及默认拒绝

| 能力 | 本轮范围 | 真实环境 |
|---|---|---|
| 正式选定profile的JWT验证机制 | 用合成issuer和临时公钥测试，精确匹配可信配置；无真实端点探测 | 当前issuer/JWKS归属、TLS与实际reader仍HOLD |
| 可信会话到应用家庭归属 | 复用现有服务端session/Store，只读；HTTP合成贯通family与students | 实际岗位、关系与用途证据HOLD |
| 单学生投影 | 新桥接一律403，即使客户端给出合法stu_ | 应用学生ID到Canonical学生的正式受控映射仍HOLD；不猜配、不按UUID形状转换 |
| 正常应用启动/BFF接入 | 未接线；没有改变 `/v1/me/*`、网站cookie或正常bootstrap | 真实登录/BFF与broker signer/密钥生命周期接线HOLD |
| 新工厂开关 | `CANONICAL_BROKER_SESSION_BRIDGE_ENABLED`默认关；仅NODE_ENV=test且两个既有投影开关均开、loopback、显式注入可信依赖才允许 | 仅设环境变量不能令正常应用启用此桥接；production/development均拒绝 |
| ID/数据库/权限 | 原有唯一主数据、映射权威与0037权限不变 | 不部署、不执行运行库Migration、不授予真实账号权限 |

DB审计ALLOW是数据库决定，不是交付证明；若最后的会话检查失败，HTTP仍拒绝，同nonce的gateway结果为DENY。代码、测试和模型没有生成独立审核人或Founder签名。

复验入口与状态见[执行报告](EXECUTION_REPORT.md)，权限与验收覆盖见[安全核对](SECURITY_AND_ACCEPTANCE.md)。
