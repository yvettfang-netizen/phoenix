# Phoenix Family OS™ Release Process

- Process version: 1.0
- Effective date: 2026-08-15（Asia/Shanghai）
- Applies to: Phoenix Family OS™ source, Mini Program package and release documentation
- Current state: Acceptance preparation; no release authorization
- Parent rules: repository root `AGENTS.md` and `CHANGE_MANAGEMENT_RULES.md`

## 1. 固定发布流程

```text
Development
↓
Testing
↓
Acceptance
↓
Release Candidate
↓
Production
```

每个箭头都是 Gate，不是自动状态迁移。上一阶段有真实、可追踪证据并获得所需批准后，才能进入下一阶段。测试完成不等于上传授权；RC 完成不等于生产授权。

## 2. 通用发布不变量

- 发布对象必须绑定唯一 repository、branch、完整 commit SHA、版本和构建/导入环境。
- 不允许从有未解释改动的工作树创建 RC。
- 不在 `main` / `master` 直接开发；不在未授权情况下配置 remote、push、deploy、upload 或提交微信审核。
- 不把未运行、未配置或被阻断的检查记录为 Passed。
- P0 必须阻断所有 RC/Production；P1 必须阻断对应验收 Gate。
- 使用真实数据前，身份、授权、Consent、Audit 和数据生命周期必须在可信边界验证。
- Logo 正式性由品牌负责人签字，工程人员不得重绘、生成或猜测替换。
- Schema/migration 必须 additive、可对账、可回退；不得以破坏性 down migration 删除家庭数据。

## 3. Stage 1｜Development

### Entry

- 有批准的目标、范围、非目标和验收标准。
- 已记录 repository / branch / SHA / worktree。
- 已读取适用的 Product Contract、ADR、工程记忆和 Technical Debt。
- 高风险变更已经 Architecture Review；大修改已建立 checkpoint。

### Activities

- 在非主分支按单一目的小批次实现。
- 不夹带未批准功能、依赖升级或大范围重构。
- 每个 Task 完成后运行 targeted checks。
- 更新测试、Changelog、Debt/Decision Log 和回退说明。

### Exit gate｜Development Complete

- 批准范围全部 Implemented 或明确 Deferred/Blocked。
- 每个差异可解释，没有冲突标记、secret 或真实用户数据。
- 代码 review 已完成；P0/P1 实现缺陷关闭或阻断后续阶段。
- 有可执行的回退路径。

## 4. Stage 2｜Testing

### Required checks

根据变更类型执行并分别记录：

- build / static validation；
- lint；
- typecheck；
- unit / integration / E2E；
- route / resource / JSON / schema；
- auth/RBAC/Consent/Audit negative tests（如适用）；
- 空数据、异常、重复提交、存储失败和恢复；
- migration forward/rollback/reconciliation（如适用）；
- 微信开发者工具 compile（平台代码变更）。

当前仓库命令：

```text
pnpm test
pnpm typecheck
pnpm build
```

范围限制：`pnpm build` 是静态 validator；`pnpm typecheck` 仅覆盖 `tsconfig.files`；`pnpm lint` 当前 NOT CONFIGURED；微信 CLI 当前未配置。

### Exit gate｜Testing Complete

- 每项检查有命令、环境、exit code、关键输出和覆盖范围。
- 所有失败有等级、复现步骤、Owner role 和处理决定。
- 不能执行的检查标为 BLOCKED/NOT RUN/NOT CONFIGURED。
- 受影响的 P0/P1 自动化缺陷关闭；回归结果与目标 SHA 绑定。

## 5. Stage 3｜Acceptance

### Required acceptance

- 微信开发者工具清缓存编译、Console、路由与资源检查。
- 登录 → Family → Child → Compass → Insight → Timeline → Advisor Request。
- 网络/登录失效、重复提交、空数据、非法输入、刷新/返回/重复进入。
- 至少 1 台真实 iPhone 和 2 台不同状态栏/导航模式 Android。
- 刘海/灵动岛、胶囊、safe area、滚动、固定按钮、键盘和横向溢出。
- 品牌负责人核对四个运行时品牌资产路径/hash/视觉并签字。
- 产品、QA、工程对范围和未解决 P2/P3 作出书面决定。

详细步骤以 `docs/codex-audit/ACCEPTANCE_TEST_PLAN_V1.0.md` 为准。

### Exit gate｜Acceptance Complete

- 所有适用 DEV/Flow/Error/iOS/Android/Brand 用例有证据。
- 没有 OPEN P0/P1。
- P2 有 Owner role、处理决定和是否接受延期；P3 只登记。
- QA 给出 PASS / FAIL / BLOCKED，产品与品牌完成适用签字。

## 6. Stage 4｜Release Candidate

### 6.1 Internal Demo RC

允许范围：受控内部演示、虚构测试数据、明确 demo identity；不上传公开、不收集真实家庭数据。

Gate：

- Development、Testing、Acceptance 全部满足；
- TD-004、TD-005、TD-006 已关闭；
- 版本、SHA、Changelog、已知限制和回退包冻结；
- 产品、Engineering Lead、QA、品牌签字；
- 对 `touristappid`、共享 identity、本地 Storage 和 Advisor demo 风险有书面接受。

### 6.2 Public RC

除 Internal Demo RC 外，还必须具备：

- 受控正式 AppID 和环境；
- 服务端 WeChat identity/session；
- 可信数据库、migration ledger、备份和恢复；
- server-side RBAC、Advisor assignment、Consent/Revoke、Audit；
- 数据最小化、传输/存储保护、保留和删除策略；
- 生产 API/AI 错误、监控、限流和回退机制；
- 安全、隐私、性能和恢复评审；
- 产品、工程、QA、品牌、安全/隐私负责人批准。

当前 V0.1：Public RC = HOLD。

### RC artifact record

每个 RC 必须记录：

- Version / RC number / commit SHA；
- AppID、基础库、微信开发者工具和依赖版本；
- 测试与验收证据链接；
- 已知限制、Technical Debt 决定；
- checkpoint、rollback owner 和恢复时间目标；
- 批准角色、日期和结论。

## 7. Stage 5｜Production

### Entry gate

- Public RC 已批准且目标 artifact 未发生变化。
- 没有 OPEN P0/P1，P2 风险被明确接受。
- 生产配置、secret、监控、告警、审计、备份和回退已验证。
- 已获得明确 upload/review/release 授权和微信审核计划。
- 发布窗口、操作者、观察人和停止条件已记录。

### Release activities

1. 再次核对 commit SHA、version、clean worktree 和审批。
2. 运行最终 smoke/validation，不重新构建未审计内容。
3. 由授权 Release Operator 执行上传/审核/发布。
4. 记录平台返回的版本、时间、状态和日志。
5. 发布后执行核心路径、错误率、数据写入和权限 smoke check。
6. 在观察窗口内按停止条件决定继续、暂停或回退。

### Exit

- Production verification PASS 且没有新增 P0/P1；
- Changelog 的 commit、状态、测试和发布时间完整；
- Handover/incident contacts、已知风险和下一检查时间已归档。

当前 V0.1：Production = NOT AUTHORIZED / NO-GO。

## 8. 批准责任矩阵

| 决策 | Product Owner | Engineering Lead | QA | Brand | Security/Privacy | Release Operator |
| --- | --- | --- | --- | --- | --- | --- |
| Development scope | Approve | Accountable | Consult | If affected | If C3/C4 | N/A |
| Testing complete | Informed | Accountable | Verify | If affected | If C3/C4 | N/A |
| Acceptance complete | Approve | Verify | Accountable | Sign brand | If sensitive | N/A |
| Internal Demo RC | Approve | Approve | Sign | Sign | Consult | N/A |
| Public RC | Approve | Approve | Sign | Sign | Sign | Consult |
| Production release | Authorize | Sign | Sign | Sign | Sign | Execute |

同一人承担多个角色时仍需分别记录角色结论；不得用“工程测试通过”代替产品、品牌或安全批准。

## 9. 回退与发布事故

### 9.1 回退准备

- 记录可恢复 checkpoint 和目标 commit。
- 应用回退优先使用独立 `git revert`，不使用 `git reset --hard` 覆盖工作树。
- 数据变更先停止新写入、回退应用兼容层、保留 additive 新表用于 reconciliation。
- 资产回退必须使用批准 hash，不自动生成替代 Logo。

### 9.2 停止/回退条件

- 启动失败、核心闭环中断；
- 数据丢失、跨家庭访问、Consent/Revoke 失效或敏感信息泄露；
- 严重状态栏/按钮遮挡导致核心功能不可用；
- 正式品牌资产错误；
- 监控或审计不足以判断影响范围。

### 9.3 回退后验证

- 核对目标 SHA/版本和 clean worktree；
- 运行与原发布相同的 test/typecheck/static/platform smoke checks；
- 对受影响数据做数量、关系和 hash/reconciliation 检查；
- 更新 Changelog、Technical Debt 和 incident record。

## 10. Hotfix

P0/P1 hotfix 可以压缩日历时间，但不能跳过：范围确认、非主分支、checkpoint、targeted/full regression、回退、审批和发布证据。若无法建立安全回退点，只允许停止发布、隔离影响并完成 inspection/report。

## 11. 当前阶段结论

- Development：Sprint 1 范围已完成，后续变更按新任务重新评估。
- Testing：现有 Node/static 证据已归档；lint、微信编译和设备范围仍有限或未完成。
- Acceptance：等待微信开发者工具、设备矩阵和品牌签字。
- Release Candidate：Internal Demo RC 尚未批准；Public RC HOLD。
- Production：NOT AUTHORIZED / NO-GO。
