# Phoenix Nova Enterprise V3｜机构工作区授权 P1

状态：`LOCAL CANDIDATE = PASS` / `REAL IDENTITY INTEGRATION = HOLD` / `DEPLOYMENT = NOT APPROVED`

本包在既有 Canonical PostgreSQL 上增量实现机构成员、同一自然人的多工作区授权、服务端工作区切换及首个 Staff 只读投影。它不建立第二套 Person、Family、Organization、Principal、Client 或 Service Project 主数据。

## 固定基线

- 主仓库基线：`main@9db147ac3a5d135d50b90bfea5a7316ce747d90b`
- 正式历史 Migration：`0001–0037`，逐字节保持不变
- 已占用候选：`0038/0039`（Service Workbench）、`0040`（PR #61 历史候选）、`0041`（PR #74）
- 本包候选：`0042_organization_workspace_authorization.sql`
- SHA-256：`0d4a3de80b56ccb167049a846e17b9b6fc4ef3e152b57aa4600d87367a33cb65`

## 关键边界

1. `auth.principals` 仍是一人一个统一账户的 Canonical 主体；旧 `principal_kind` 和旧 Family/Advisor/Partner 会话保持兼容。
2. 新工作区角色独立存于 `auth.workspace_role_bindings`，不修改旧身份语义。
3. 浏览器只提交不透明 `workspaceBindingId`；`role`、`organization_id`、`family_id`、`principal_id` 和机构代码均不可信。
4. 切换会撤销同一登录会话的旧工作区上下文；数据库绑定使用单次、最长 60 秒票据和分离的 binder/app LOGIN。
5. Staff 投影要求“当前 Staff 工作区 + 当前有效项目分配 + 完全一致的机构范围”。同一个人在不同机构的项目不会互相泄露。
6. API 模块未在正常启动入口组合，默认关闭；真实登录提供方与会话映射未核验前不能启用。

## 交付索引

- [数据库对象及权限矩阵](DATABASE_OBJECTS_AND_PERMISSION_MATRIX.md)
- [API 契约与兼容性](API_AND_COMPATIBILITY.md)
- [执行与验收报告](EXECUTION_REPORT.md)
- [状态、HOLD 与 Jimson 非生产步骤](STATUS_AND_JIMSON_NONPROD.md)
- [本地 PG16/17 结果](evidence/LOCAL_PG16_PG17_RESULT.json)
