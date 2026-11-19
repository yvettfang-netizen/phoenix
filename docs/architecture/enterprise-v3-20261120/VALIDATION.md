# Enterprise V3｜实际验证与交付范围

日期：2026-11-20，Asia/Shanghai。基线：`9db147ac3a5d135d50b90bfea5a7316ce747d90b`。所有本地验证针对本次候选文件；远程 PR 检查须另看 PR 的确切 head。没有生产操作。

## 1. 本次实际完成的改动

- 共享网站导航调整为 首页｜教育｜身份｜健康｜财富｜洞察，保留批准的财富外部入口；关于/服务留在现有页脚。
- 增加双语 Company OS 设计预览：Founder / Staff / Partner 三个工作区说明，复用 Logo/设计 tokens 和原有 `/my-services` 候选；无真实客户查询、角色切换授权或经营数字。
- 增加纯类型化生命周期规划器及 16 项测试。支持不同日期锚点、校历、延期改期、稳定自然键、撤权/退订、旧版本拒绝、已完成历史保留与 CRM→Service 路由变化审查。没有 runtime route/worker 导入。
- 增加正式迁移源文件核验脚本和非生产只读 catalog/ledger 预检 SQL。
- 交付七部分架构报告、逐表矩阵、API 契约、迁移设计、PR 工作包和 Jimson 操作步骤。

## 2. 已实际执行并有结果的检查

| 检查 | 命令/范围 | 结果 |
|---|---|---|
| 固定依赖安装 | Website、backend 各自 `npm ci`，原 lockfile | 通过；未修改依赖清单或 lockfile |
| Website 类型 | `npm run typecheck` | PASS，exit 0 |
| Website 构建 | `./node_modules/.bin/vinext build` | PASS，Build complete，包含 Company route |
| Website 全套已有 Node 测试 | 构建后 `node --import ./tests/register-typescript.mjs --test tests/*.test.mjs` | **156 项：152 PASS，0 FAIL，4 SKIP** |
| Website lint | `node node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next` | exit 0；两个既有 warning，零 error |
| Company/原 Workbench/客户桥接范围测试 | 三个对应 test 文件 | 11 PASS，0 FAIL，0 SKIP；已包含在全套中，不能重复累计 |
| Server 类型与构建 | `npm run typecheck`、`npm run build` | PASS，exit 0 |
| Server 全套测试 | `npm test` | **162 PASS，0 FAIL，0 SKIP** |
| 生命周期单独范围 | 现有 runner `--test=student-lifecycle-planner.test.js` | 16 PASS，已包含在 server 162 中 |
| 正式迁移源文件与固定基线 | `node ops/enterprise-v3/source-inventory.mjs <base-sha>` | 37/37 原字节一致；未连接数据库 |
| 原 0037 source guard | `node database/canonical/verification/v0037/verify-source.mjs` | PASS：35 历史 + 精确 0036/0037，37 文件 |
| 原 0038 source guard | `node database/canonical/verification/v0038/verify-source.mjs` | PASS：候选 manifest；未提升到正式迁移 |
| V5 当前高危门禁 | `npm audit --audit-level=high --json` | exit 0；**0 high / 0 critical / 11 moderate**，未自动大版本降级或更改依赖 |
| 实际 Vite HTTP 渲染与门禁 | 独立受控服务进程，8 个请求断言 | **8 PASS**；见 [HTTP 摘要](evidence/http-validation.json) |

本轮 Node 为 v24.22.3；符合本项目现有引擎范围。上述源文件检查不等于 PostgreSQL 执行测试；HTTP 渲染不等于浏览器端交互测试。

四个条件性跳过的是财富站整组双语公共路由内容/canonical、知识路由 JSON-LD、未知路由/数据 API 和跨业务页面保留检查；未以默认环境运行该站独立 origin 的集成套件，不能计为通过。

两个 lint warning 位于未修改的 `customer-account.tsx`（已有内部导航方式）和 `customer-center.tsx`（未使用 Bell 导入）；不属于本轮新文件。未扩大改动修饰它们。

## 3. 8 个实际 HTTP 检查

1. 默认配置 `/zh/company-os` → 404。
2. 默认配置 `/en/company-os` → 404。
3. 公共首页 HTML 确实渲染六项导航及批准的财富 URL。
4. 关于链接保留。
5. 本地 synthetic 开关后中文 Company 页面 → 200、三个工作区、已有 `/my-services` 链接。
6. 同配置英文 Company 页面 → 200、三个工作区。
7. 不支持 locale → 404。
8. foreign Host → 403，未返回 Company 预览内容。

测试临时配置仅含既有 synthetic 开关，测试后删除；受控 Vite 进程停止。无真实身份、材料或学生数据。

## 4. 明确未执行或未验证

| 项目 | 状态与原因 |
|---|---|
| 桌面/移动浏览器视觉与交互 | **UNVERIFIED**。已安装 Chromium 启动前被管理环境拒绝 Unix socket，未渲染浏览器页面；没有绕过限制或使用图片伪造验收 |
| 本轮本地 PG16/17 fresh/upgrade/RLS | **NOT RUN**。当前环境未提供 Docker/psql/PostgreSQL；没有新权限 DDL，只做 source guard |
| 新只读 `database-preflight.sql` 对实际非生产库执行 | **NOT RUN**。无本轮已建立的数据库连接；Jimson 用正确 nonprod service profile 执行 |
| 多角色组织登录、真实 Partner 数据隔离 | **尚未实现完整运行路径**；只有架构/API/迁移设计与无数据预览 |
| 生命周期定时扫描、持久化去重、派发/通知 | **PLAN_ONLY_NOT_CONNECTED**；纯函数测试不证明 DB 并发或消息 exactly-once |
| 真实 AI 提取、资料上传对象存储、人工复核写档闭环 | **尚未接通**；本轮未发送学生资料给模型 |
| 当前腾讯数据库/网站部署直接复验 | **UNVERIFIED**；读取了 #74 的确切非生产报告，未连接该环境 |
| GitHub main 全面运行状态 | exact-main Actions 查询无匹配 runs；不能据此断言全站坏了，也不能报全站绿灯 |
| 生产发布、合并 main、正式迁移安装 | **NOT PERFORMED** |

## 5. 历史证据不能替代当前候选

#65 已合并与 #74 的七个成功工作流是本次重新读取的 GitHub 事实。#74 11/19 报告明确是隔离非生产 0001–0037 与合成 PG16/17 验证，真实账户/支付/生产仍 HOLD。

#68 的 head `9ce484570ec5b9a494fba4da4e79e4f2f2582f81` 历史 Website run `44268833108` 在高危依赖步骤失败；本轮当前 main 安装所得 audit 为 0 high/critical，属于不同来源/时间的检查，不能据此改写该历史 PR 或宣称它已过门禁。

## 6. 审查与余下门槛

独立审查发现并修正了：CRM 任务签约后路由变化不能静默 KEEP；抑制旧任务必须保留 occurrence/revision；关闭的新项目不能接任务；同日期新依据需版本刷新；晚到旧版本不能回退计划；联系同意需绑定学生/家庭/用途。最终审查未发现这些纯候选文件的剩余阻塞问题。

后续必须按新权限契约实现组织上下文 v2，真实受限账户/两个伙伴的负例以及数据库/浏览器/恢复测试；图表、设计页和纯计算不能替代该验收。每个新迁移包需要独立 PG16/17 证据。生产发布仍按 Founder 对具体版本的批准执行。
