# API 契约与兼容性

## `GET /v1/me/workspaces`

- 身份来源：可信服务端登录解析器，不接受浏览器 Principal/Role/Organization/Family。
- 输出：`workspace-list.v1`，每项仅含 `workspaceBindingId`、`workspaceKind`、`role`、`displayName`、公开 `workspaceRef`、可选 `organizationCode`。
- 不输出 Canonical UUID、数据库票据、会话摘要或权限表。

## `POST /v1/workspace-contexts`

- 请求体只能是 `{ "workspaceBindingId": "<opaque UUID>" }`。
- 要求已验证登录、精确 Origin 和 constant-time CSRF 校验。
- 服务端重新读取当前有效成员关系和角色绑定；不会相信浏览器传入的角色或机构。
- 切换时撤销同一登录会话旧上下文，返回 `workspace-context.v1` 安全摘要。
- 上下文 token 只写入 `HttpOnly; Secure; SameSite=Strict` Cookie；数据库只保存 SHA-256 摘要。

## `GET /v1/staff/projects`

- 首个真实授权投影，只允许当前 `STAFF` 工作区。
- binder 使用自己的 LOGIN 签发一次性票据；app 使用另一 LOGIN、`SET ROLE phoenix_canonical_workspace_reader` 后兑换。
- 仅返回当前 Principal 的有效项目分配，且该分配的机构范围必须等于当前工作区机构。
- 返回项目代码、名称、状态、领域、分配角色、更新时间；不返回 Family、Person、健康敏感字段或原始主表。
- 请求结束无论成功或失败均清除上下文、重置角色并 `DISCARD ALL`。

## `DELETE /v1/workspace-contexts`

- 要求可信会话、Origin 和 CSRF。
- 撤销当前登录会话的全部工作区会话，并让旧 Cookie 失效。

## 兼容性

| 既有能力 | 结果 |
| --- | --- |
| Family OS 旧 `issue_context_ticket → redeem_context_ticket` | PG16/17 分离 LOGIN 回归 `PASS` |
| Service Project 既有主表及分配 | 复用；不复制项目或客户主数据 |
| 旧 `auth.session_contexts` | 保留；新工作区上下文单独版本化 |
| `0001–0037` | SHA 守卫 `PASS`，未修改 |
| 0038–0041 候选 | 未导入、未改写、未占号 |
| 默认启动 | 新工作区组件未组合，路由 `404`，`PASS` |
| 真实 OIDC/微信/员工目录 | `HOLD`；本包没有伪造生产解析器或回退 |
