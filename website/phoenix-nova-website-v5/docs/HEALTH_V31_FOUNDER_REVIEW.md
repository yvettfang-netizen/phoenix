# Health V3.1｜恢复记录与 Founder 验收包

任务：`PHOENIX-HEALTH-V31-FOUNDER-20261101` / `PHOENIX-HEALTH-V31-RECOVERY-ADDENDUM-20261101`。日期：2026-11-01。状态：前端候选，等待视觉、业务及架构审查；不是生产发布。

## 恢复核查

- GitHub main 经重新读取仍为 `259753248ff54b07fd9c52f270e45ae1c877bc09`。本分支 `codex/health-v31-founder-20261101` 从该提交增量开发。
- 本机原工作区 `D:\CODEX\PhoenixNova` 存在其他 Education / ASKWISE 未提交工作。本任务在独立工作树 `D:\CODEX\PhoenixNova\_Worktrees\health-v31-founder` 继续，不切换、清理、暂存或提交原工作区内容。
- 旧 Health PR #29 已合并，旧 `feature/phoenix-health-landing-v1` 仍保留在其原工作树。Logo PR #30 仍为 Draft / 未合并。本次不修改、关闭或合并这两个 PR；直接复用 main 已包含的已批准资产，避免重复移植。
- 恢复后继续已完成的组件、图片和文案；没有重写原问卷或重新生成已完成的 Hero。

| 模块 | 本次状态 | 证据 | 后续 |
|---|---|---|---|
| Header / Logo | V3 共享组件；官方横版原始字节不变 | `components/v5-site.tsx`；下方 Logo 哈希 | 中文组合待 Founder 单独验收 |
| Hero | 最新双语独立文案、现代大湾区家庭场景 | `lib/health-landing-content.ts`；前后截图 | Founder 视觉验收 |
| 服务及优势 | 五项服务、六项医疗优势、六步可展开流程 | `components/health-landing.tsx`；浏览器测试 | 医院具体资源与报价继续核验 |
| 家庭规划 | 原家庭页及三个阶段入口继续复用 | `/zh/health/family`、`/en/health/family`；双状态回归 | Health 数据接入保持关闭 |
| Compass | 原 14 题、规则、跳题和受控开关不变 | `protected-source-integrity.json`；原模型测试 | 不开启生产预览 |
| Footer / 响应式 | 五区共享 Footer；暖象牙白透明原色 Logo | 中英 PC / 手机 / 平板截图 | Founder 验收 |
| 咨询 / Partner / 两个 OS | 本地咨询演示、伙伴工作台禁用、API 候选契约 | API 文档及合成契约测试 | 真实鉴权、RLS、上传、财务与 outbox 均 HOLD |

## 已完成的页面行为

- 两个 Hero CTA 平级；家庭入口访问既有页面，跨境客户可直接阅读服务，不必完成问卷。
- 三类服务入口、四项核心价值、五项医疗协调服务、六项条件化医疗优势、六步原生 `details` 流程、三个家庭阶段、独立健康罗盘、合作介绍、家庭中心、地区说明、十项 FAQ 和咨询准备。
- 目的地支持香港、深圳及具备实际条件的其他大湾区内地城市。来源、介绍伙伴、当前地区、目的地和保险渠道在契约上分开；网页可选背景分别留空，不从 URL 推导归属。
- 中英文业务文案分别渲染；Header / Footer 通过显式 `localized` 参数复用，其他页面默认行为保留。Health、Family 及原问卷路由的文档语言从请求路径派生，并在客户端跨页导航后同步；Worker 清除客户端伪造语言提示，该提示不参与身份或授权。
- 切换语言保留允许的同页段落锚点，不携带查询参数或答案。手机合作介绍点击后关闭菜单；正式工作台按钮保持禁用。
- 咨询只在内存中显示清单，刷新或清空即消失。无文件、联系方式、证件输入，无真实预约提交、网络请求、持久化、财务写入或自动答案交接。关闭 JavaScript 后按钮禁用，无原生表单传输。

## 预览与图片

本地前端候选（默认关闭评估）：`http://127.0.0.1:4410/zh/health` / `http://127.0.0.1:4410/en/health`。只绑定本机。开启状态仅在独立测试端口验证，未改变任何生产开关。

| 资料 | 中文 | 英文 |
|---|---|---|
| 修改前 PC | [截图](previews/health-v31/before-zh-1440.png) | [截图](previews/health-v31/before-en-1440.png) |
| 修改后 PC 1440px | [完整页面](previews/health-v31/after-zh-1440.png) | [完整页面](previews/health-v31/after-en-1440.png) |
| 修改后手机 390px | [完整页面](previews/health-v31/after-zh-390.png) | [完整页面](previews/health-v31/after-en-390.png) |
| 修改后平板 768px | [完整页面](previews/health-v31/after-zh-768.png) | [完整页面](previews/health-v31/after-en-768.png) |
| 六项医疗优势 | [截图](previews/health-v31/six-values-zh.png) | [截图](previews/health-v31/six-values-en.png) |
| Footer | [截图](previews/health-v31/footer-zh.png) | [截图](previews/health-v31/footer-en.png) |

截图取自实际组件页面，不是整张效果图铺底。Hero 为艺术性场景，不代表实际医院、患者或合作；新旧图片的来源分别见 [V3.1 图片说明](HEALTH_V31_IMAGE_CREDITS.md) 和 [既有图片说明](HEALTH_IMAGE_CREDITS.md)。

## Logo 与问卷完整性

- 正式 Header / Footer：`/brand/official/v3/phoenix-nova-header@2x.png`，1040 × 320，透明原色，SHA-256 `C566AA2813A1D08D02C71230C7E2360BA2C681A056F1A7FDB900C2A40396B4DA`。
- 官方原始母版：`/brand/official/v3/phoenix-nova-primary-original.png`，SHA-256 `A48513AA31039B0467C6322B64FF2ED69DC74CDA976C274B22328F70C8C7E45E`。两者未修改、未裁切或改色。小尺寸 favicon 未启用。
- 未找到已批准的中文横版。已使用原色完整图腾和网页中文排版制作[候选预览](previews/health-v31/chinese-brand-candidate.html)，供 Founder [PC](previews/health-v31/logo-candidate-1440.png) / [手机](previews/health-v31/logo-candidate-390.png) 对照验收。当前正式候选页面仍使用已批准英文横版，未擅自替换为中文候选。
- 原问卷、UI、gate、双语及别名路由与 main 的 Git blob 完全一致，逐文件 SHA-256 见 [完整性记录](previews/health-v31/protected-source-integrity.json)。`lib/health-compass.ts` 文件 SHA-256 为 `E29589F470317CD0144F14D80CAB4CA9D67D404853715156C284B2787A73224B`。
- 原 14 题中文内容冻结摘要仍为 `df3c795277e63e972926da0bf6ec9aa0418cb7a65c164b180e8bdbf1882ada3d`。文件摘要与内容摘要用途不同，不可混淆。开关继续精确匹配 `HEALTH_COMPASS_PREVIEW === "1"`。

## 验证结果与实际限制

| 检查 | 本地结果 | 证据范围 |
|---|---|---|
| Build | PASS | Windows 直接调用既有 vinext 构建入口 |
| TypeScript | PASS | 无增量缓存检查 |
| Lint | 0 错误、1 条原有警告 | `customer-center.tsx` 原有未使用 Bell；未扩大修订范围 |
| 原 Health 模型、合成契约、账户及家庭纯逻辑测试 | 30 / 30 PASS | 临时合成数据；不是生产数据库测试 |
| Health 主页 OFF / ON | 42 / 43 PASS | zh/en，320、375、390、768、1024、1440px；流程、菜单、语言、元信息、无溢出与网络/存储边界 |
| Family 页 OFF / ON | 各 13 PASS | 原六维、入口、开关、本地咨询及语言切换 |
| Education / Identity 回归 | 16 / 22 PASS | 双语五种目标宽度、共享导航 Footer、咨询及无脚本状态 |
| 手机合作入口定向复核 | 2 / 2 PASS | 中英菜单关闭，工作台仍禁用 |
| 跨页语言与地区切换定向复核 | 5 / 5 PASS | 中英 Education → Health → 原问卷；地区锚点保留 |

逐项浏览器记录见 [本地测试证据](previews/health-v31/test-results.json)。自动浏览器尺寸测试不是实体手机、平板或屏幕阅读器的最终人工验收。

Windows workerd 启动发生既有 `0xc0000005` 原生崩溃，因此本机截图使用仓库已有的 `health-node-preview.mjs`：加载实际构建，Cloudflare env 为空，拒绝 API 和非 GET 请求。这不能证明真实 Workers / 认证 / 数据库 / RLS 可运行。Ubuntu GitHub Actions 的原有完整 Worker、Health 问卷浏览器及双状态流程仍必须在 PR 当前提交上通过；没有删除或弱化这些检查。一次 Header 路由误匹配测试及并发浏览器无脚本等待超时已定位；修正路径断言后顺序重跑通过。

## 数据与安全 Gate

[API / Family OS / Founder OS / Partner 契约](HEALTH_V31_API_CONTRACT.md) 只定义逻辑操作、独立联系/交接/患者授权、Canonical 引用、摘要白名单、可信服务事件与幂等要求。`lib/health-integration-contract.ts` 是无副作用的审查候选模型，未接入页面服务；即使合成信号完整，`authorized/canPersist/canUpload/canPay` 仍为 false。

未授权伙伴、跨伙伴访问、家庭成员越权、普通 CRM 原始文件访问及 Founder 绕过患者授权均属于必须由未来可信服务、患者 scope、RLS 和审计强制执行的边界。当前合成测试只验证 fail-closed 契约，不能代替真实后端攻击面与隔离测试。Family Center 真实路由继续存在，Health ingestion 仍为 RESERVED/HOLD。

## 尚待资料与验收

1. Founder 验收双语视觉、六项业务表达及中文 Logo 候选，随后才能版本化接入中文字标。
2. 医院提供现行合作范围、医生资格/出诊、语言能力、房型与图片授权、逐项目报价及可比条件、保险要求；当前未公开医生名单、价格比例、医院合作或接诊保证。[核查记录](HEALTH_V31_RESOURCE_EVIDENCE.md)
3. Jimson / 玄武 / 白虎及架构负责人确认 Canonical 物理映射、患者授权、服务端权限、受控文件存储、RLS、审计、保留期限、outbox 和财务权威后，才可分别批准真实 API、OS 交接、上传或支付。内部商业预算保留在本机受控交付范围，未提交公开仓库。
4. Founder 单独批准后才可合并与部署；本次仅独立 Draft PR。未执行数据库迁移、生产改动、真实医疗资料接入、合作结算或 main 合并。

完整文件列表见 [变更清单](previews/health-v31/changed-files.txt)。文案对照见 [Copy / Claims](HEALTH_V31_COPY_AND_CLAIMS.md)。
