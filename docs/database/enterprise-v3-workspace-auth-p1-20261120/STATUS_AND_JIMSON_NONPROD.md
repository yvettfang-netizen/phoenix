# 状态、HOLD 与 Jimson 非生产步骤

## 当前状态

| 能力 | 状态 |
| --- | --- |
| P0 PR #76 导航与 Corporate OS 路由修复 | PASS |
| 0042 数据库候选、权限和审计机制 | PASS（本地隔离） |
| 三个最小 API 契约 | PASS（合成身份、本地隔离） |
| PG16/17 跨机构与撤权回归 | PASS |
| Family OS / Service Project 兼容 | PASS（代码与数据库契约） |
| 真实身份与员工/伙伴/家庭映射 | HOLD |
| 非生产启用 | HOLD，待固定 SHA 复审和环境事实 |
| 生产、真实数据、腾讯升级 | HOLD / 未授权 |

## Jimson 可执行的非生产集成步骤

以下步骤只适用于 Founder 另行指定的隔离非生产环境；本 PR 不执行这些操作。

1. 对 P1 Draft PR 的固定 HEAD 审核：确认 0042 SHA 与 manifest 一致，确认 0001–0037 无变化，并记录 Reviewer、时间、SHA。
2. 让 GitHub Actions 的 source/server、PG16、PG17 三个新检查在同一 HEAD 全部通过；保存 Run ID 和 artifact digest。
3. 登记真实登录提供方的 `issuer/audience/JWKS`、会话撤销接口和脱敏配置摘要；不得把私钥、token、密码或 `.env` 提交 Git。
4. 登记“外部身份 → auth.principals”的权威映射及总部员工、两个伙伴机构、两个家庭的受控非生产账号；分别记录停用与撤权责任人。
5. 用受保护的 secret reference 分别配置 binder LOGIN 与 app LOGIN。两者不得共用凭据；app 只能 `SET ROLE phoenix_canonical_workspace_reader`，binder 只能执行四个签发/切换函数。
6. 在备份和回滚收据已准备后，由迁移账号应用经过审核的 0042；核对账本为 38，候选 SHA 为 `0d4a3d…a33cb65`。不得复制 0042 到正式 migrations 目录前伪装为已批准正式 Migration。
7. 显式组合新 API 模块并启用仅非生产的功能开关；验证默认关闭仍返回 404，启用后仅回环/可信反向代理可达。
8. 使用受控账号重跑：多工作区列举、总部/伙伴切换、两个伙伴隔离、家庭/伙伴禁止继承 Staff 权限、停用、撤权、退出及旧会话失效。
9. 保存脱敏运行、审计、备份和回滚收据；回滚应用开关/API 版本，不删除业务事件或 Canonical 主数据。
10. 独立复审通过后再由 Founder 决定是否将 0042 转为正式 forward migration；本包不授权合并、部署或生产切换。

唯一下一步：完成真实身份/账号映射证据与固定 P1 HEAD 的独立复审；在此之前保持默认关闭。
