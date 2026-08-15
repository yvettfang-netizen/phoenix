# Phoenix Family OS™ Sprint 1 Engineering Report V1.0

- 项目：Phoenix Family OS™ Mini Program MVP V0.1
- 阶段：Phase 5｜Implementation Sprint 1
- 报告日期：2026-08-15（Asia/Shanghai）
- 工作分支：`codex/phoenix-family-os-v0.1-closeout`
- 结论：Sprint 1 的代码、静态构建和自动化回归通过；微信开发者工具编译与多设备真机验收仍待人工完成，因此当前不能作为公开发布候选或提交微信审核。

## 1. 安全基线与 checkpoint

修改前已建立并复核：

`D:\CODEX\PhoenixNova\Phoenix Family OS\backups\Phoenix Family OS MVP V0.1 Pre-Development Checkpoint`

- checkpoint 文件：99
- checkpoint 大小：627,044 bytes
- SHA-256 复核：99/99 一致，PASS
- `node_modules/` 按 manifest 明确排除，可由 lockfile 重建
- 原项目未使用 Git；随后只在本地初始化 Git，并直接建立非 main/master 分支
- 基线提交：`e742368 chore: establish Phoenix Family OS V0.1 baseline`
- 未配置 Git remote，未推送、未部署、未提交微信审核

Sprint 1 本地提交：

1. `cc1960a fix: harden Sprint 1 data and report loading`
2. `ecce067 fix: harden WeChat safe area adaptation`
3. `086d7d3 test: lock reviewed Phoenix Nova asset references`
4. `4df5ac8 fix: stabilize family user entry flow`
5. `870897b fix: guard critical local submissions`

## 2. Task 1｜项目基础检查与修复

### 修改文件

- `services/store.js`
- `services/repository.js`
- `pages/report/index.js`
- `pages/report/index.wxml`
- `pages/report/index.wxss`
- `pages/compass-questionnaire/index.js`
- `pages/compass-questionnaire/index.wxml`
- `pages/advisor-request/index.js`
- `pages/advisor-request/index.wxml`
- `pages/admin-family/index.js`
- `pages/admin-family/index.wxml`
- `tests/sprint1-regression.test.js`
- `tests/submission-safety.test.js`
- `tests/validate-project.js`
- `package.json`

### 修改原因

- 防止旧版本或包含未知字段的本地数据库在初始化时被空数据覆盖。
- 对 AI Growth Insight 的 Report → Assessment → Student → Family 关系链进行完整性和家庭归属校验，缺失数据展示可恢复错误状态。
- 避免日期字段为空时排序抛错。
- Compass 提交、咨询预约和顾问备注在写入前重新校验会话与数据归属。
- 本地存储失败时恢复 loading/saving 状态、显示基础重试提示，避免未捕获页面异常或伪成功状态。
- 自动验证页面声明、路由目标、组件路径和运行时资源路径。

### 测试结果

- 旧 schema 数据与未知字段保留：PASS
- Growth Insight 缺失关系、损坏关系、跨家庭访问：PASS
- 关键提交的会话/归属复核：PASS
- 存储失败注入与 loading 状态恢复：PASS
- 15 个页面的 JS/JSON、路由、组件、资源静态校验：PASS
- 生产代码未发现 `console.error`、`console.warn`、`TODO` 或 `FIXME`：PASS

## 3. Task 2｜微信环境适配

### 修改文件

- `app.wxss`
- `utils/navigation.js`
- `pages/home/index.wxml`
- `pages/welcome/index.wxss`
- `pages/compass-questionnaire/index.wxss`
- `pages/partner/apply/index.wxss`
- `tests/run-tests.js`
- `tests/validate-project.js`

### 修改原因

- 状态栏高度在缺少 `statusBarHeight` 时使用 `safeArea.top` 回退。
- 对微信胶囊坐标做有效性校验，并为胶囊挤压标题的窄屏场景提供 compact header 标记。
- 全局页面增加横向溢出保护和底部安全区 fallback。
- 固定底部操作区同时支持 `constant(safe-area-inset-bottom)` 与 `env(safe-area-inset-bottom)`。
- Welcome 页面恢复纵向滚动，避免小屏或字体放大时内容被裁切。

### 测试结果

- iOS 430px 状态栏/胶囊计算：PASS
- Android 320px 且仅提供 `safeArea.top`：PASS
- 胶囊坐标不完整时的安全回退：PASS
- 自定义导航状态栏/胶囊静态规则：PASS
- 固定底部区域安全区静态规则：PASS
- 真机刘海屏、灵动岛、Android 厂商差异和键盘抬起：待微信开发者工具与设备人工验收

## 4. Task 3｜品牌资产统一

### 修改文件

- `tests/validate-project.js`

### 审核结果

运行时品牌引用集中在 `components/brand-mark/index.wxml`，仅引用现有四个 Phoenix Nova 资产：

| 文件 | 字节 | SHA-256 |
| --- | ---: | --- |
| `phoenix-nova-icon-light.png` | 27,093 | `7AF26E93599057A1B1D8D23A25FC76A3D73CC386EF61EB68280A1433905622B7` |
| `phoenix-nova-icon-primary.png` | 35,166 | `76FBD87F8CCFCA75DD26EF657B30E9C100C48738FADB5B11DD6A4FB4B0925289` |
| `phoenix-nova-logo-light.png` | 95,539 | `AEB1E6DD729143B91F0F5108F3EE88A39D44A1D967D177F6A7F8E167C312F24B` |
| `phoenix-nova-logo-primary.png` | 114,538 | `4B3B4D43155916E55590E16764907C04ABBF436A0704CD909E30E245C8CD51CF` |

### 修改原因与限制

- 新增品牌资产允许清单，防止页面绕过 Brand Mark 组件引用未经审核的品牌图。
- 四个资产 hash 不重复，引用路径存在且大小写一致。
- 未修改、替换、重绘或生成任何 Logo/品牌图片。
- 代码只能确认引用一致性，不能证明资产法务来源或最终品牌批准状态；四个 PNG 均标记为 **NEEDS HUMAN REVIEW**。

### 测试结果

- 允许清单完整：PASS
- Brand Mark 对四个资产的引用：PASS
- 页面/其他组件未引用未审核品牌图片：PASS
- `assets/brand/` 相对基线二进制差异：0

## 5. Task 4｜基础用户流程检查

### 修改文件

- `services/auth.js`
- `utils/navigation.js`
- `pages/welcome/index.js`
- `pages/welcome/index.wxml`
- `pages/family-edit/index.js`
- `pages/family-edit/index.wxml`
- `pages/student-edit/index.js`
- `pages/student-edit/index.wxml`
- `pages/compass/index.js`
- `tests/user-entry-flow.test.js`
- `package.json`

### 修改原因

- 登录握手、本地身份建立或存储失败时恢复按钮状态并显示错误提示。
- 家庭与孩子档案提交前重新确认 family user 会话，防止重复提交。
- 编辑页面没有可返回页面栈时安全回到 Home。
- 无效孩子 ID 不再被误当作新增档案；跨家庭孩子档案被阻止。
- Compass 启动前验证有效孩子档案。

### 测试结果

- 微信登录握手（本地 demo identity）→ Home：PASS
- Family Profile 保存 → Child Profile：PASS
- Child Profile 保存 → Education Compass：PASS
- Compass → Questionnaire：PASS
- 应用重启后会话与家庭档案保持：PASS
- 无效孩子 ID 安全返回且不创建意外记录：PASS

注意：当前 `services/auth.js` 仍是 V0.1 本地 demo identity。真正的 `wx.login` code → 服务端 openid/session 交换不在本轮授权范围内，不能视为生产登录完成。

## 6. 全量命令与结果

| 命令/检查 | 结果 |
| --- | --- |
| `pnpm test` | PASS，exit 0；域闭环、Partner 既有测试、数据安全、入口流程、关键提交安全、项目验证全部通过 |
| `pnpm typecheck` | PASS，exit 0；`tsc --noEmit` 无错误 |
| `pnpm build` | PASS，exit 0；执行项目静态构建验证，15 页结构、JS/JSON、路由和模型校验通过 |
| 对非依赖目录全部 `.js` 执行 `node --check` | PASS，exit 0 |
| `pnpm audit --prod` | 首次因沙箱网络 EACCES 失败；经批准联网复跑 PASS，`No known vulnerabilities found` |
| `git diff --check` | PASS，未发现空白错误 |
| 生产代码 `console.error/console.warn/TODO/FIXME` 扫描 | PASS，无匹配 |
| 品牌路径、hash 与允许清单扫描 | PASS；四项资产存在且 hash 不重复 |
| checkpoint SHA-256 复核 | PASS，99/99 |
| Git 分支/remote 检查 | PASS；位于指定非主分支，remote 为空 |
| 微信开发者工具 CLI 编译 | NOT RUN；标准安装路径未找到 CLI |

`pnpm build` 是仓库现有的静态验证脚本，不等同于微信开发者工具 WXML/WXSS 编译，不能替代模拟器或真机测试。

## 7. 问题分级

### P0

已修复：

- 旧 schema 本地家庭数据可能在初始化时被空数据库覆盖。

未修复（公开发布阻断项，超出本轮授权范围）：

- 仍使用 `touristappid` 和本地 demo identity，没有服务端 openid/session 交换。
- 家庭与孩子数据仍为客户端本地明文存储；没有生产级服务端权限隔离、传输保护和数据生命周期机制。禁止使用真实家庭数据公开运行。

### P1

已修复：

- Growth Insight 缺失关系可能导致页面加载异常。
- 无效/跨家庭孩子 ID 可能进入错误编辑流程。
- 状态栏、胶囊与窄屏标题的静态适配缺口。
- 关键写入失败可能留下永久 loading 或伪成功状态。

未修复/待验收：

- 微信开发者工具未配置，实际 WXML/WXSS 编译、模拟器和真机适配未验证。
- Phoenix Nova 四个品牌文件的正式版本与授权来源需鹤潼人工确认。

### P2

已修复：

- 安全区 fallback、固定底部区域、横向溢出和 Welcome 小屏滚动。
- 空日期排序、Compass 空孩子入口、表单重复提交和基础错误提示。

未修复：

- Compass 问卷中途草稿不持久化；属于已确认延期项。
- 本地多步写入不是事务；极端的中途存储故障可能留下部分记录，后续服务端数据层需提供事务或幂等机制。

### P3

- Portal、Advisor、Admin 三角色的服务端权限模型和独立入口在后续架构阶段实现，本轮只保留现有结构。
- 进一步抽取重复表单 handler 和空状态组件；本轮不做大范围重构。

## 8. 修改文件汇总

相对基线 `e742368`，共 31 个产品/测试文件发生变更：

- 全局/配置：`app.wxss`、`package.json`
- Services/Utils：`services/auth.js`、`services/repository.js`、`services/store.js`、`utils/navigation.js`
- 页面：`pages/admin-family/index.js`、`pages/admin-family/index.wxml`、`pages/advisor-request/index.js`、`pages/advisor-request/index.wxml`、`pages/compass-questionnaire/index.js`、`pages/compass-questionnaire/index.wxml`、`pages/compass-questionnaire/index.wxss`、`pages/compass/index.js`、`pages/family-edit/index.js`、`pages/family-edit/index.wxml`、`pages/home/index.wxml`、`pages/partner/apply/index.wxss`、`pages/report/index.js`、`pages/report/index.wxml`、`pages/report/index.wxss`、`pages/student-edit/index.js`、`pages/student-edit/index.wxml`、`pages/welcome/index.js`、`pages/welcome/index.wxml`、`pages/welcome/index.wxss`
- Tests：`tests/run-tests.js`、`tests/sprint1-regression.test.js`、`tests/submission-safety.test.js`、`tests/user-entry-flow.test.js`、`tests/validate-project.js`
- 报告：`docs/codex-audit/SPRINT_1_ENGINEERING_REPORT_V1.0.md`

未修改但需要人工确认：

- `assets/brand/phoenix-nova-icon-light.png`
- `assets/brand/phoenix-nova-icon-primary.png`
- `assets/brand/phoenix-nova-logo-light.png`
- `assets/brand/phoenix-nova-logo-primary.png`
- `project.config.json` 中的 `touristappid`（需由项目所有者决定测试 AppID；不得自动替换）

## 9. 微信开发者工具人工验收清单

1. 以 `project.config.json` 导入项目，使用基础库 3.7.12，执行“清缓存并重新编译”。
2. 确认 15 个页面无 WXML/WXSS/运行时 console error 或 warning。
3. 冷启动、后台恢复、返回、重复进入，验证会话与家庭/孩子档案不丢失。
4. 完整执行：登录 → 家庭档案 → 孩子档案 → Compass → 问卷 → AI Growth Insight → Family Timeline → 咨询预约。
5. 直接进入不存在或跨家庭的 Student/Report URL，确认安全返回且无新记录。
6. iPhone 小屏、刘海屏、灵动岛机型和至少两种 Android 状态栏高度检查标题与胶囊不重叠。
7. 检查家庭、孩子、问卷和预约表单在键盘弹起时可滚动，底部按钮不遮挡输入项。
8. 检查 Home、Questionnaire、Partner Apply 的底部安全区、固定按钮与页面末尾内容。
9. 开启大字体并检查卡片、标题换行、横向溢出和按钮文字。
10. 检查四个品牌资产在深色、浅色、窄屏场景清晰、未拉伸，并由鹤潼确认正式版本。
11. 模拟无存储空间/写入失败，确认登录、档案、Compass、预约和顾问记录显示可重试错误且按钮恢复。
12. 未完成真实服务端认证和数据保护前，不录入真实家庭数据、不上传、不发布、不提交审核。

## 10. 验收结论与下一步

- Sprint 1 工程范围：完成。
- 自动化回归：通过。
- 当前项目可运行性：静态与 Node 测试环境通过；微信运行环境待人工编译确认。
- 核心产品闭环：已有自动化域测试覆盖 Family → Student → Compass → Growth Insight → Timeline → Advisor；本轮入口链路回归通过，实际微信交互仍待验收。
- V0.1 Release Candidate 建议：**暂不进入公开 RC**。先完成唯一下一步——微信开发者工具全流程与多设备人工验收；通过后再评估内部演示 RC。生产 RC 还必须另行完成服务端认证、权限隔离与数据安全方案。

## 11. 回退方法

优先使用 Git 可审计回退，在当前分支按倒序执行：

```text
git revert 870897b
git revert 4df5ac8
git revert 086d7d3
git revert ecce067
git revert cc1960a
```

如 Git 回退不可用：保留当前项目目录，不删除任何内容；从 checkpoint 的 `source/` 恢复到一个新建目录，按 `SHA256SUMS.txt` 验证 99 个文件，使用 lockfile 恢复依赖，再运行测试并导入微信开发者工具。完整步骤见 checkpoint 的 `CHECKPOINT_MANIFEST.md`。
