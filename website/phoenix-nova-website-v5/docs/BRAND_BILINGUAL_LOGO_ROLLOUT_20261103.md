# Phoenix Nova™ B版官方双语 Logo 全站替换

## 范围

- 分支：`codex/brand-bilingual-logo-v32-20261103`
- 基线：Education V2.0 GEO 候选 `8c07672a6d3e3b77f373ec32fd282b20bbc8e0b8`
- 保留：PR #30、#33、#34；未修改 main、数据库、Compass 题库或生产环境。
- 真实页面覆盖：`/zh`、`/en`、`/zh/education`、`/en/education`、`/zh/identity`、`/en/identity`、`/zh/health`、`/en/health`。
- `/zh/wealth` 在当前基线保持 404，未制造虚假路由。

## B版实现

共享 `components/brand-mark.tsx` 统一输出：

1. 官方原色凤凰图腾 PNG；
2. 香槟金竖线；
3. 网页字体排版的 `鳳啟環球`；
4. 网页字体排版的 `Phoenix Nova™`。

不嵌入 Slogan，不重绘、不滤镜、不裁切官方图腾。首页深色 Hero 使用象牙白承载区域，浅色页面与 Footer 使用透明原色组合。

## 官方资产证据

| 资产 | 路径 | SHA-256 | 尺寸 |
| --- | --- | --- | --- |
| 官方图腾 | `/brand/official/v3/phoenix-nova-symbol-transparent.png` | `EB2C03880227E5C840048D1F13DD030FE6182ED7DE6C201A3DF2704D5BCFF573` | 632×784 RGBA |
| 不可变母版 | `/brand/official/v3/phoenix-nova-primary-original.png` | `A48513AA31039B0467C6322B64FF2ED69DC74CDA976C274B22328F70C8C7E45E` | 1254×1254 |
| 已批准英文横版（保留） | `/brand/official/v3/phoenix-nova-header@2x.png` | `C566AA2813A1D08D02C71230C7E2360BA2C681A056F1A7FDB900C2A40396B4DA` | 1040×320 |

## 测试结果

- Build：`node node_modules/vinext/dist/cli.js build` PASS
- TypeScript：`node node_modules/typescript/bin/tsc --noEmit --incremental false` PASS
- ESLint：0 errors，1 个既有 `customer-center.tsx` 未使用 `Bell` warning
- B版全站浏览器：26 PASS（中英文首页、Education、Identity、Health；1440/390/320；Wealth 404）
- Education 原有浏览器：16 PASS
- Education V2 知识平台：156 PASS
- Identity 原有浏览器：22 PASS
- Health 主页：42 PASS
- Health 家庭入口：13 PASS
- Health 14题模型：8 PASS
- `brand-integrity.mjs`：PASS
- 依赖 Miniflare 的 Node Worker 单元测试在当前 Windows 工作区出现既有 `ERR_RUNTIME_FAILURE / access violation`，不属于 B版 Logo 逻辑；纯数据与品牌完整性测试均通过。

## 预览截图

新增 B版浏览器证据目录：

`outputs/brand-bilingual-logo/`

- `zh-home-1440.png` / `zh-home-390.png`
- `en-education-1440.png` / `en-education-390.png`
- `zh-identity-1440.png` / `zh-identity-390.png`
- `zh-health-1440.png` / `zh-health-390.png`
- `brand-bilingual-logo-browser-results.json`

本地前端预览：`http://127.0.0.1:4443/zh`

该预览仅用于 Founder Review，不代表公开部署或生产发布。

