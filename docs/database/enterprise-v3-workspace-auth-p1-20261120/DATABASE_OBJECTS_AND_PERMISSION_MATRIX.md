# 数据库对象及权限矩阵

## 新增对象

| 对象 | 权威用途 | 运行时直接表权限 |
| --- | --- | --- |
| `core.organization_workspace_profiles` | 在既有机构上标识总部、区域伙伴、加盟商、渠道代理、下级伙伴及非密码机构代码 | 无 |
| `core.organization_memberships` | 邀请、接受、停用、撤权及授权版本 | 无 |
| `auth.workspace_role_bindings` | 同一 Principal 对 Founder、Staff、Partner、Family 的独立角色绑定 | 无 |
| `auth.workspace_sessions` | 只保存登录会话摘要、上下文 token 摘要、授权版本及过期状态 | 无 |
| `auth.workspace_context_tickets` | 最长 60 秒、单次使用、指定 Principal 的 binder→app 票据 | 无 |
| `auth.workspace_session_contexts` | 绑定 `backend_pid + backend_start` 的数据库连接上下文 | 无 |
| `service.project_assignment_organization_scopes` | 为既有项目分配补充精确机构范围，阻止同一 Principal 跨机构读取 | 无 |

七张表均启用并强制 RLS；只给迁移角色一条管理策略。0042 后隔离库为 100 张业务表、90 条包含 auth 的 RLS 策略（现有统计口径不含 auth 时为 86）。

## 角色和函数权限

| 角色 | 允许 | 明确禁止 |
| --- | --- | --- |
| `phoenix_canonical_migrator` | 迁移所有者/受 RLS 管理策略约束 | 运行时登录 |
| `phoenix_canonical_app` | 受控机构登记、邀请、接受、停用/撤权、角色分配/撤回、项目分配机构范围函数 | 新表直接读写；签发/兑换工作区票据 |
| `phoenix_canonical_context_binder` | `list_available_workspaces`、`rotate_workspace_session`、`issue_workspace_context_ticket`、`revoke_workspace_sessions` | 新表直接读写；旧 `bind_context`；兑换票据；业务投影 |
| `phoenix_canonical_workspace_reader` | `redeem_workspace_context_ticket`、`clear_workspace_context`、`read_staff_workspace_projects` | LOGIN；表权限；列举/切换；审计伪造；其他 Canonical 角色继承 |
| 浏览器/BFF | 经已验证登录会话调用三个 HTTP 契约 | 数据库连接、角色/机构自报、数据库票据、SQL |

## 管理状态规则

- 机构代码只能标识机构，不参与登录或授权。
- 邀请必须在 30 天内到期；接受后才可分配工作区角色。
- `DISABLED` 立即让成员工作区和现有会话失效；不能重新启用旧记录。
- ACTIVE 工作区角色不接受自然到期时间；必须显式撤回，避免已过期状态阻挡重新授权。
- `REVOKED` 同时终止成员、角色及工作区会话；历史记录保留。
- 撤回一个工作区角色不会撤回同一人的其他独立工作区。
- 所有允许/拒绝决定写入既有 `audit.access_events`；运行时账号不能直接写审计表或调用内部审计函数。
