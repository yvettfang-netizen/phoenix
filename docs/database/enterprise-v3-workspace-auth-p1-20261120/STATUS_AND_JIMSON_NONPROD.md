# 状态、HOLD 与 Jimson 非生产步骤

## 当前状态（2026-11-20）

| 能力 | 状态 |
|---|---|
| 网站 P0 PR #76 | 自动化检查 PASS；仍为 Draft |
| 0042 Canonical context consolidation | PG16/17 20/20 PASS |
| 两张重复临时上下文表 | 已从候选移除，复用 Canonical 既有表 |
| Family OS 旧上下文兼容与同连接重绑清理 | PG16/17 PASS |
| 跨机构隔离、撤权、登出、审计、RLS | PG16/17 PASS |
| 真实身份与员工/伙伴/家庭映射 | HOLD |
| 独立安全/数据库复审 | HOLD |
| 非生产启用 | HOLD，等待 Founder 指定环境与身份事实 |
| 生产、真实数据、腾讯云 | 未授权 |

## 0043 复审决定

当前不引入 0043。正式 0035 的 `service.transfer_task()` 足以承接普通任务转派；0043 的双边提议/接受/收件箱属于额外审批流程，并且当前实现重复了任务更新和 TRANSFERRED 事件写入。PR #78 已关闭未合并，PR #82 不再依赖 0043。若未来确需接收方审批，应重新立项，并将 0035 的转移函数作为唯一任务状态变更入口。

## Jimson 可执行的非生产准备步骤

以下步骤只适用于 Founder 另行指定的隔离非生产环境；当前 PR 不执行这些操作。

1. 对固定候选 SHA `bd319e3074e1b51862dfd14eeeb72531d400aff0f8277cde8e886f501cff58ea` 做独立安全/数据库复审；确认 manifest SHA、PG16/17 workflow 和 0001–0037 不变。
2. 登记真实登录提供方的 `issuer/audience/JWKS`、会话撤销接口和脱敏配置摘要；私钥、token、密码及 `.env` 不得提交 Git。
3. 登记“外部身份 → auth.principals”的权威映射，以及总部员工、伙伴机构、家庭的受控非生产账号；记录停用与撤权责任人。
4. 分别配置 binder LOGIN 与 workspace reader/app LOGIN，使用受保护 secret reference；不得共用凭据。运行时账号不得获得新表直接权限。
5. 只有在备份和回滚收据准备完成、Founder 明确指定环境后，才可申请非生产安装；不得把候选伪装成正式 Migration。
6. 显式组合 API 模块并保持默认关闭；启用前验证可信反向代理、Origin、CSRF、真实会话撤销和登录解析器。
7. 使用受控账号重跑 Founder/Staff/Partner/Family 工作区切换、两伙伴隔离、旧 Family OS 兼容、成员停用、角色撤回、登出和连接池清理。
8. 保存脱敏运行、审计、备份和回滚收据。回滚应用开关/API 版本，不删除 Canonical 主数据或审计历史。

## 下一道 Gate

真实身份映射证据 + 固定 SHA 独立复审 + Founder 指定的隔离非生产环境。三项完成前，保持默认关闭，不合并、不部署。
