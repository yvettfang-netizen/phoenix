# Phoenix Insights V1.0 私密预览交付

基线：`origin/main@2065da703fef5c56904db24bafc733632f248750`。工作分支：`codex/phoenix-insights-v1`。本次仅修改网站前端与说明文档，无数据库、认证、Compass 题库、部署或索引更改。

## 页面与数据

| 模块 | 状态 | 证据 |
|---|---|---|
| 双语首页 | 前端完成 | `/zh/insights`, `/en/insights` |
| 五个独立频道 | 前端完成 | `/{locale}/insights/{education,identity,wealth,health,perspectives}` |
| 文章详情 | 前端完成 | `/{locale}/insights/articles/[slug]`；官方事实、编辑解读、家庭行动与来源分离 |
| 四个专题 | 前端完成 | `/{locale}/insights/topics/[slug]` |
| 搜索 / 标签 / 分页 | 已接候选内容集 | GET 参数查询，返回真实候选集合；空分类明确提示 |
| 政策追踪 | 候选预览 | 四条均有官方入口、机构、发布/生效信息及核验日期；状态由内容记录给定 |
| 正式内容 CMS | 未实施 | 当前 Canonical 0001–0037 无 Insights 内容模型；见交接说明 |
| 公开 SEO/GEO | 受控 | Canonical/hreflang、OG、BreadcrumbList 已准备；robots noindex；预览文章不进入 sitemap/RSS，不输出 Article Schema |
| 自动线索交接 | 未实施 | 阅读、搜索不上传问卷答案或个人资料 |

文章及政策记录为**编辑预览**，不是已发布新闻或专业审核结论。文章的 `publishedAt` 与 `reviewer` 均保持空值。任何上线需来源复核、专业审阅、Founder 发布批准和正式域名/索引门禁。

## 截图

全部为本地构建版实际浏览器截图，视觉参考图未作为网页背景：

- 桌面首页：[中文](previews/insights-home-zh-1440.jpg) · [English](previews/insights-home-en-1440.jpg)
- 桌面频道：[中文](previews/insights-education-zh-1440.jpg) · [English](previews/insights-education-en-1440.jpg)
- 桌面文章：[中文](previews/insights-article-zh-1440.jpg) · [English](previews/insights-article-en-1440.jpg)
- 手机 390px：首页 [中文](previews/insights-home-zh-390.jpg) · [English](previews/insights-home-en-390.jpg)，[频道](previews/insights-education-zh-390.jpg)，[文章](previews/insights-article-zh-390.jpg)
- 小屏 320px：[首页](previews/insights-home-zh-320.jpg)

## 验证记录

- `npm ci --prefer-offline --fetch-retries=3 --fetch-timeout=120000 --no-audit --no-fund`：成功。
- `node node_modules/vinext/dist/cli.js build`：成功；新 Insights 路由全部列入构建清单。
- `npx tsc --noEmit`：通过。
- `npx eslint components/insights-pages.tsx lib/insights-content.ts lib/insights-seo.ts app/'[locale]'/insights worker/index.ts`：通过。
- `npx eslint . --ignore-pattern dist --ignore-pattern .next`：0 errors；仅两条既有文件警告（`components/customer-account.tsx`、`components/customer-center.tsx`）。
- `node --import ./tests/register-typescript.mjs --test tests/insights-content.test.mjs tests/locale-navigation.test.mjs tests/health-model.test.mjs tests/education-publication.test.mjs`：15/15 通过。Health 原 14 题与隐私边界回归在其中。
- `node --test tests/insights-node-render.test.mjs`：3/3 通过，覆盖中英文路由、搜索、分页、空 sitemap/RSS。
- Edge 本地预览：中文与英文首页、频道、文章已访问；搜索表单、A-Level 筛选、第二页分页已操作；390px 三页、768px 频道及 320px 首页无页面级水平溢出。390px 频道入口为可横向滚动导航。
- `node --test tests/insights-rendered.test.mjs`：**未通过**。本机 Windows 的 `workerd` 启动发生 access violation/stack overflow，测试未进入页面断言。Node 前端适配器及 Edge 浏览器路径替代验证通过，但不代表 Cloudflare Workers 运行时验收。

## 待办与风险

1. 正式 CMS 不存在。数据写入、权限、审核、撤回及媒体上传不可测；需按 `PHOENIX_INSIGHTS_CMS_HANDOFF.md` 先审定 Canonical 内容域及权限，再实施迁移和后台。
2. 所有内容仍是候选预览。政策状态、来源与翻译在正式发布前必须由专业审阅人再次核验。
3. 本次没有公开可索引文章，因此 sitemap/RSS 为空，Article Schema 被有意关闭；正式发布时应由批准的 CMS 状态和正式域名驱动。
4. 本地 Node 预览不具有生产 D1、对象存储、认证或 Workers 运行时能力。
5. 图片复用仓库既有素材；正式内容媒体的版权、授权、压缩与替代文本仍需运营审核。

**当前结论：P0 页面可供 Founder 视觉验收；P1 CMS 与 P2 正式索引处于设计/审批阶段。**
