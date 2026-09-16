# Phoenix Family OS™ Changelog

本文件记录 Phoenix Family OS™ 可审计的版本变化。版本记录只描述真实落地内容和真实测试证据，不把计划写成已完成，也不把未执行检查写成 Passed。

## 1. 版本记录规范

每个版本使用以下固定字段：

```text
## Version

- Version: Vx.y.z 或 Vx.y.z-rc.n
- Date: YYYY-MM-DD（Asia/Shanghai）
- Commit: 完整 commit SHA；未冻结时写 PENDING
- Status: Development / Testing / Acceptance / Release Candidate / Production / Withdrawn

### Changes
- 实际变更；按 Added / Changed / Fixed / Removed / Documentation 分类。

### Impact
- 用户、页面、数据、API、权限、品牌、兼容性和迁移影响。

### Testing
- 命令/操作、退出码、覆盖范围、PASS/FAIL/BLOCKED/NOT RUN/NOT CONFIGURED 和证据位置。

### Rollback
- 回退 commit/checkpoint、数据影响和恢复后验证。
```

### 1.1 规则

- 最新未发布内容置于 `Unreleased`；冻结版本后移入对应 Version。
- 使用 `VMAJOR.MINOR.PATCH`；RC 使用 `Vx.y.z-rc.n`，但版本号不等于发布授权。
- 破坏性变化必须单独标记；当前项目未经批准不得实施破坏性 schema/data 变更。
- `Removed` 必须说明批准依据和数据/路由影响；不得静默删除页面或用户数据。
- 只链接仓库内真实报告或 commit；测试状态必须可复现。
- 修正文案错误时保留原记录，通过后续条目更正，不重写已经发布的历史。

## Unreleased

- Version: Unreleased
- Date: 2026-08-15（Asia/Shanghai）
- Commit: Not frozen（Unreleased）
- Status: Development documentation

### Changes

- Documentation: 建立 Project Maintenance Plan、Changelog 规范、Technical Debt Register 和 Release Process。
- Documentation: 不修改业务代码、配置、数据结构、品牌资产或产品闭环。

### Impact

- 工程治理与交接：新增长期维护节奏、依赖/安全规则、技术债解决条件和 Release Gate。
- Runtime / user data / API / schema：无影响。

### Testing

- Documentation validation：在本变更报告中记录实际命令和退出码。
- Business tests：NOT RUN；本条仅为 C0 文档变更。
- WeChat compile/device acceptance：NOT RUN；状态不因本条改变。

### Rollback

- 回退本次独立文档 commit；不涉及数据恢复或业务代码回退。

## V0.1.0

- Version: V0.1.0
- Date: 2026-08-15（Asia/Shanghai）
- Commit: `870897b`（Sprint 1 implementation baseline）
- Status: Acceptance preparation; not Public RC

### Changes

- Added: 原生微信小程序 MVP 的 Family Profile、Child Profile、Education Compass、AI Growth Insight、Family Timeline 和 Advisor Request 闭环。
- Fixed: Sprint 1 完成本地数据 normalization/report ownership、关键提交 guard、动态安全区、品牌引用锁定和家庭入口导航加固。
- Documentation: 建立基线、Readiness、Sprint 1、Acceptance、Family Growth inspection 和 Handover 报告。

### Impact

- 用户路径：本地演示闭环可由现有页面和本地 Storage 支持。
- 数据：保持 `PFS_DB_V01`，没有数据库 migration 或生产数据变更。
- 安全：仍为 `touristappid`、共享本地 identity 和客户端 guard；不得用于真实数据或公开发布。
- 品牌：运行时资产路径/hash 已锁定，但正式来源仍需人工签字。

### Testing

- Sprint 1 的真实命令、退出码和覆盖范围记录于 `docs/codex-audit/SPRINT_1_ENGINEERING_REPORT_V1.0.md`。
- `pnpm build` 仅为静态 validator，不代表微信平台编译。
- `pnpm lint`：NOT CONFIGURED。
- 微信开发者工具编译：NOT RUN。
- iPhone/Android 真机验收：NOT RUN。

### Rollback

- 按 Sprint 1 报告倒序 `git revert` 对应独立提交，或在 Git 不可用时从 Pre-Development Checkpoint 恢复到新目录并校验 SHA-256 manifest。
