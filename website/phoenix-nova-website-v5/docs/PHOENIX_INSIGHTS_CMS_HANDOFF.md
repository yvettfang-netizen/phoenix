# Phoenix Insights CMS 交接说明

状态：P1 设计与接入准备，Candidate / Private Review

本文件记录凤启洞察的内容系统边界、未来数据契约与发布治理。它不是数据库迁移，也不是已上线 CMS 的能力声明。

## 1. 现状核验

审计基线为仓库 `origin/main` 的 `2065da703fef5c56904db24bafc733632f248750`。当前站点已经具备：

- `/zh/insights` 和 `/en/insights` 两个旧版资讯入口。
- `components/v5-site.tsx` 中的少量静态候选内容。其页面标注为 Candidate placeholder，不是正式文章库。
- 全站 Private Review / noindex / nofollow 门禁。`app/layout.tsx` 与 `app/robots.txt/route.ts` 不允许把候选内容当作公开发布。
- Education 内容模块已有类型化的验证和发布状态模式，可作为 fail-closed 的参考；该模块不是 Insights CMS。

当前没有证据表明已经存在 Insights 文章、栏目、版本、来源、媒体、编辑器、审稿人、发布者、撤回、定时发布或 CMS API。现有站点 D1/SQLite 表只覆盖认证、会话、限流和认证审计；`.openai/hosting.json` 没有 R2 媒体绑定。

Canonical PostgreSQL 当前 active migrations 为 0001–0037。它已提供身份、家庭、成员、学生、监护授权、Consent、Docs、CRM Lead/Consultation/Deal、审计及内容归因字段，但没有 Article、Category、Topic、FAQ 或 Policy Update 内容对象。0038/0039 位于 `forward-candidates/service-workbench`，明确是未批准候选，不可作为 CMS 依赖。

因此本阶段页面可以使用明确标记的本地候选内容；正式运营前必须由 Founder / GPT Pro 确定内容数据归属、存储与审批责任。

## 2. 逻辑内容模型（待批准）

以下是逻辑模型，不代表已创建表。每个实体都应有 `id`、`created_at`、`updated_at`、`version`、`status` 和变更审计引用；公开 slug 在同一语言和发布面内必须唯一。

| 实体 | 核心字段 | 约束与关系 |
|---|---|---|
| Article | `id`, `slug`, `language`, `title`, `subtitle`, `summary`, `content_blocks`, `cover_asset_ref`, `author_principal_id`, `reviewer_principal_id`, `status`, `published_at`, `last_verified_at` | 版本化；必须关联至少一个 Category；政策、医疗、财富、身份内容必须有来源和专业审核记录 |
| Category | `id`, `slug`, `name`, `parent_id`, `compass_kind`, `status` | 层级自引用；`compass_kind` 只能映射既有 Education / Identity / Wealth / Health / Cross-domain，不创建第二套 Compass |
| Article Source | `id`, `article_id`, `source_name`, `source_url`, `source_type`, `source_published_at`, `verified_at`, `verification_note` | URL 必须可访问且由编辑核验；一篇政策文章可以有多个来源；来源版本不可静默覆盖 |
| Policy Update | `id`, `category_id`, `title`, `issuing_authority`, `published_at`, `effective_at`, `status`, `official_url`, `impact_summary`, `expert_analysis`, `last_verified_at` | `status` 使用 `UNVERIFIED`, `PUBLISHED`, `UPCOMING`, `EFFECTIVE`, `EXPIRED`；状态由核验记录决定，不由文章日期自动推断 |
| Topic | `id`, `slug`, `title`, `description`, `cover_asset_ref`, `status` | 通过 ArticleTopic 关联多篇文章；不得用专题页承诺服务结果 |
| ArticleTopic | `article_id`, `topic_id` | 复合唯一键；删除采用受控撤销，不破坏历史版本 |
| FAQ | `id`, `category_id`, `related_article_id`, `question`, `answer`, `status`, `last_verified_at` | 只展示已审核内容；医疗、法律、财富问题需明确边界和官方来源 |

`content_blocks` 应使用受限结构（标题、段落、列表、表格、引用、图片和外链），禁止执行任意 HTML/脚本。媒体引用使用受控 `asset_ref`，不把 `docs.storage_key` 直接暴露为公开 URL。

## 3. 审核和发布状态机

`DRAFT → EDITOR_REVIEW → PROFESSIONAL_REVIEW → READY_TO_PUBLISH → PUBLISHED → PERIODIC_REVIEW`。

任何已发布文章的事实、来源、正文、封面或关键元数据改变，都必须产生新版本并回到相应审核状态。撤回使用 `WITHDRAWN`，不删除历史版本。政策、医疗、财富、身份和法律相关内容必须记录：作者、编辑、专业审阅人、审核时间、来源快照/哈希、审核意见和发布授权。

发布门禁至少包括：

1. `slug`、语言、标题、摘要、Alt 文本和内容块完整。
2. 正式文章有真实发布日期、更新时间、最近核验时间；未知日期保持空值，不补造日期。
3. 政策或专业文章至少有一个已核验官方来源，且状态不是 `UNVERIFIED`。
4. 作者和审阅人不能由同一人同时承担强制的专业复核角色；医疗、财富、身份和法律内容必须有适配的专业责任人。
5. 只有 Founder 批准的公开域名、发布面、索引开关和内容修订才可生成可索引输出。
6. Candidate / Private Review 默认渲染为 noindex；候选内容不得进入正式 sitemap、RSS 或搜索提交。

AI 可生成摘要、翻译初稿、关键词和 FAQ 草稿，但不得绕过编辑及专业审核发布。

## 4. 角色、权限和审计建议

建议角色为 `AUTHOR`, `EDITOR`, `PROFESSIONAL_REVIEWER`, `PUBLISHER`, `SEO_REVIEWER`, `READ_ONLY_AUDITOR`。角色应映射到现有 `auth.principals`，不另建员工或客户身份系统。

- Author：创建草稿、引用来源、提交审核；不能发布。
- Editor：编辑结构、事实和语言；不能替代专业审核。
- Professional Reviewer：核验专业事实、政策状态和边界；不能修改已核验来源而不留版本。
- Publisher：仅在全部门禁通过后发布、撤回或安排复核。
- SEO Reviewer：检查 canonical、hreflang、结构化数据、Alt 和索引门禁；不改变事实内容。
- Read-only Auditor：读取版本、来源、审核和发布记录；无写权限。

每次状态改变、来源变更、版本建立、发布、撤回和权限拒绝都应写入审计事件。审计记录应包含 actor principal、时间、文章/版本 ID、动作、前后状态、原因和证据引用。

## 5. Canonical、RLS 与数据边界

Canonical 继续是唯一业务数据权威。文章内容不能伪装成 `casework.cases` 或 `service.projects`，也不能在站点内另建 Person、Family、Client、Lead 或 Service Project 主数据。

正式实现时应由数据库负责人批准专用 content schema / migration，并至少具备：

- 发布文章只读投影与草稿/版本隔离。
- `AUTHOR` 只能读取本人有权限的草稿；编辑和审阅者按内容域/发布面授权。
- `PUBLISHER` 的写入需通过受控函数，不能直接暴露表写权限。
- 已发布版本不可变；撤回和新版本均保留审计。
- 内容来源、作者和审核身份与 `auth.principals` 关联，读写审计走 `audit`。
- 如阅读行为未来产生线索，只能在用户明确授权后，通过既有 `crm.leads` 与 `0036` 的 acquisition/content provenance 字段归因；不把正文、医疗信息或敏感答案写入普通 CRM。

当前 `consent.grants` 只声明 `DOCUMENT_READ`, `EDUCATION_CASE`, `IDENTITY_CASE` 等既有目的，不能推断存在 Insights 内容发布同意。新增公开内容、订阅、阅读归因或媒体上传目的前，需要 Founder / 数据治理批准新的 purpose、保留政策、RLS 和审计函数。

## 6. 媒体、存储与删除

现有 Docs 表的 `storage_key` 是受控私有文件引用，不是公开图片 CDN。正式 CMS 应使用独立对象存储：上传扫描/类型校验、生成缩略图、内容哈希、版权/来源记录、签名或公开发布 URL、保留期和撤回删除流程。Canonical 只保存受控 asset metadata/ref，不保存二进制，也不把私人医疗或家庭文件当作文章封面。

本阶段继续使用仓库中已存在并可审计的图片资源，标注为候选预览；没有批准来源的图片不能进入正式发布面。

## 7. SEO / GEO 发布闸门

每篇正式文章应生成独立 URL、唯一 title/description、canonical、`Article` 与 `BreadcrumbList`（必要时 `FAQPage`）结构化数据、真实作者/组织、真实日期、来源链接、图片 Alt、相关文章和中英文 hreflang。结构化数据只描述已发布事实，不创建虚假的 Organization、Event、合作医院或官方关系。

整个内容中心需要经发布批准后才生成 sitemap/RSS 可索引条目。当前 review origin 和全站 robots/noindex 继续有效；不要把 `edu.phoenixnova.com.cn`、`health.phoenixnova.com.cn` 或其他业务域名自动当作 Insights canonical。

## 8. 当前未完成与待决策

已证实缺失：正式 CMS/API、内容表、媒体库、发布权限、审核记录、文章详情 SEO、Insights→CRM 交接和内容专用 consent/RLS。

需要 Founder / GPT Pro 决定：

1. 内容数据最终归属（独立 CMS、代码仓库候选层，或未来 Canonical content schema）。
2. 各频道的专业审核责任人、发布时间和复核频率。
3. 公开域名、index/noindex 解除条件、sitemap/RSS 发布策略。
4. 第三方图片版权、作者展示和引用规范。
5. 媒体存储、扫描、保留和删除策略。
6. 阅读是否形成线索、需要何种同意、归因多久保留。
7. 是否新增内容订阅或 Insights 专用 consent purpose。

在这些决策和正式 migration 获批前，Insights 只能作为私有候选页面交付；不得宣称 CMS 已上线、内容已公开发布或已进入搜索索引。
