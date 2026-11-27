# API 契约与兼容性

## `GET /v1/me/workspaces`

- 身份来源：可信服务端登录解析器，不接受浏览器传入的 Principal、Role、Organization 或 Family。
- 输出 `workspace-list.v1`：不透明 `workspaceBindingId`、`workspaceKind`、`role`、`displayName`、公开 `workspaceRef`、可选 `organizationCode`。
- 不输出 Canonical UUID、数据库票据、会话摘要或权限表。

## `POST /v1/workspace-contexts`

- 请求体只有不透明 `workspaceBindingId`。
- 要求已验证登录、精确 Origin 和 constant-time CSRF 校验。
- 服务端重新读取有效成员关系和角色绑定，不相信浏览器提交的角色或机构。
- 切换时撤销同一登录会话旧工作区会话。
- 上下文 token 只写入 `HttpOnly; Secure; SameSite=Strict` Cookie；数据库只保存 SHA-256 摘要。
- 持久浏览器会话保留在 `auth.workspace_sessions`；数据库一次性票据和连接上下文复用 `auth.context_exchange_tickets` 与 `auth.session_contexts`。

## `GET /v1/staff/projects`

- 只允许当前 Staff 工作区。
- binder 使用独立 LOGIN 签发一次性票据；workspace reader 使用另一 LOGIN、`SET ROLE phoenix_canonical_workspace_reader` 后兑换。
- 仅返回当前 Principal 的有效项目分派，且机构范围必须与当前工作区机构完全一致。
- 不返回 Family、Person、健康敏感字段或原始主表。
- 请求结束无论成功或失败均清除 Canonical backend context、重置角色并 `DISCARD ALL`。

## `DELETE /v1/workspace-contexts`

- 要求可信会话、Origin 和 CSRF。
- 撤销当前登录会话的全部工作区会话，并让旧 Cookie 失效。

## 兼容性

| 既有能力 | 当前结论 |
|---|---|
| Family OS 旧 `issue_context_ticket → redeem_context_ticket` | PG16/17 同一连接回归 PASS |
| 旧 `auth.session_contexts` / `auth.context_exchange_tickets` | 继续作为唯一数据库上下文和一次性票据；0042 仅增加可空工作区引用 |
| 旧上下文重新绑定 | 旧兑换函数拒绝工作区票据；重绑时显式清空工作区引用 |
| Service Project 主表与分派 | 复用，不复制项目或客户主数据 |
| `0001–0037` | SHA 守卫 PASS，逐字节未修改 |
| 0038–0041 候选 | 未导入、未改写、未占号 |
| 默认启动 | 新工作区组件未组合，路由 404 |
| 真实 OIDC/微信/员工目录 | HOLD；没有伪造生产身份解析器或回退 |
