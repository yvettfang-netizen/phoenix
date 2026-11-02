# Identity V3.1 GEO URL 与发布状态

当前无批准的生产域名，以下为相对 URL。全部候选页 noindex/nofollow；不得宣称已上线、已收录或具政府背书。

| 功能 | 中文 | 英文 |
|---|---|---|
| 原身份主页 | /zh/identity | /en/identity |
| 检索中心 | /zh/identity/explorer | /en/identity/explorer |
| 比较 | /zh/identity/explorer/compare | /en/identity/explorer/compare |
| 圣基茨和尼维斯 | /zh/identity/countries/saint-kitts-and-nevis | /en/identity/countries/saint-kitts-and-nevis |
| 阿根廷 | /zh/identity/countries/argentina | /en/identity/countries/argentina |
| 瓦努阿图 | /zh/identity/countries/vanuatu | /en/identity/countries/vanuatu |
| 圣多美和普林西比 | /zh/identity/countries/sao-tome-and-principe | /en/identity/countries/sao-tome-and-principe |
| 内部导入预览 | /zh/identity/import-review | /en/identity/import-review |

审核详情只在本地显式审核模式可用；默认公开模式未发布详情和导入页返回 404。`/identity/countries` 是便捷跳转入口，正式内容路径使用 explorer 与 country slug。

本地 `tests/cbi-geo-browser.mjs` 验证 2 个 explorer + 8 个详情页的唯一标题、正文 H1、Description、Canonical、同一国家中英文 alternates、可解析 JSON-LD，以及实际 robots.txt/sitemap.xml。使用 WebPage，publisher 为 Phoenix Nova Organization，嵌套 BreadcrumbList；未假扮政府机关，无虚构 Article 作者/发布时间或无证据 FAQPage。校验是本地结构检查，不是 Google Rich Results 或其他搜索平台认证。

Founder 发布批准和法律审核前，robots 保持 `Disallow: /`，sitemap 不列出候选页。后续公开版本须配置正式 origin、发布数据读取契约及逐答案来源/日期，再生成仅含获批公开页面的 sitemap；当前不能标记正式 GEO 发布通过。
