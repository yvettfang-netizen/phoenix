# 数据库对象及权限矩阵

## 0042 新增对象

| 对象 | 权威用途 | 运行时直接表权限 |
|---|---|---|
| `core.organization_workspace_profiles` | 既有机构的工作区类型、公开机构代码 | 无 |
| `core.organization_memberships` | 邀请、接受、停用、撤权及授权版本 | 无 |
| `auth.workspace_role_bindings` | 同一 Principal 的 Founder、Staff、Partner、Family 工作区角色 | 无 |
| `auth.workspace_sessions` | 绑定可信浏览器登录会话、上下文摘要和授权版本 | 无 |
| `service.project_assignment_organization_scopes` | 将既有项目分派限制到精确机构范围 | 无 |

五张新增表均启用并强制 RLS；每张表只给迁移角色一条管理策略。PG16/17 隔离验收统计：98 张表、88 条 RLS policies（包含 auth schema）。

## 复用的 Canonical 上下文对象

| 既有对象 | 0042 最小扩展 | 安全边界 |
|---|---|---|
| `auth.context_exchange_tickets` | 增加可空 `workspace_session_id`、`workspace_binding_id` | 沿用既有一次性票据；旧 Family/Advisor/Partner/Teacher 票据不带工作区引用 |
| `auth.session_contexts` | 增加同样两个可空引用 | 继续使用唯一 backend PID + backend_start 连接上下文；每条连接只允许一个活动上下文 |
| `auth.principals` / `auth.validate_context_request` | 不另建 Principal，不改变旧身份校验语义 | 旧 FAMILY/ADVISOR/PARTNER/INTERNAL/STAFF 路径继续可用 |

不再创建 `auth.workspace_context_tickets` 或 `auth.workspace_session_contexts`。持久浏览器工作区会话仍由 `auth.workspace_sessions` 管理；数据库一次性票据和连接上下文复用 Canonical 既有对象。

工作区重绑会先清除该 backend 的旧 Canonical context。旧 `redeem_context_ticket` 只允许兑换没有 workspace 引用的票据，并在 upsert 时显式清空两项 workspace 引用。工作区 live predicate 会再次核对当前 binding/membership 版本、actor、family、channel、会话状态和 backend identity。

## 角色和函数权限

| 角色 | 允许 | 明确禁止 |
|---|---|---|
| `phoenix_canonical_migrator` | 迁移所有者；受迁移策略管理 | 运行时登录 |
| `phoenix_canonical_app` | 机构登记、邀请/接受、成员停用/撤权、角色分配/撤回、项目分配机构范围函数 | 新表直接读写；工作区票据签发/兑换 |
| `phoenix_canonical_context_binder` | 列举工作区、切换工作区、签发工作区票据、撤销工作区会话 | 新表直接读写；兑换工作区票据；业务投影 |
| `phoenix_canonical_workspace_reader` | 兑换工作区票据、清除连接上下文、读取 Staff 项目投影 | LOGIN；表权限；签发/切换；审计伪造；继承其他 Canonical 角色 |
| 浏览器/BFF | 经可信服务端登录会话调用 HTTP 契约 | 数据库连接、角色/机构自报、数据库票据、SQL |

## 管理状态规则

- 机构代码只是标识，不参与登录或授权。
- 邀请最长 30 天；接受后才可分配工作区角色。
- `DISABLED` 立即使成员的工作区会话失效；旧记录不可重新启用。
- ACTIVE 工作区角色不设自然过期时间，必须显式撤回。
- `REVOKED` 终止成员、角色及工作区会话；历史记录保留。
- 撤回一个工作区角色不撤回同一人的其他独立工作区。
- 允许/拒绝决定写入既有 `audit.access_events`；运行时账号不能直接写审计表或调用内部审计函数。
