# 凤启洞察 P1 架构决策与数据库审查稿

依据 `PHOENIX-INSIGHTS-ARCHITECTURE-REVIEW-V1.0`。Founder 于 2026-11-14 确认以下六项。架构决策可以作为 P1 设计依据，具体模型约束及权限实现提交数据库与安全审查。正式 migration 和公开上线各有独立批准。

| Founder 确认 | ADR | 决策范围 |
|---|---|---|
| Canonical PostgreSQL 是 Insights 内容数据权威 | ADR-001 | CMS 读写同一 Canonical 内容域 |
| 独立 CMS，复用现有身份体系 | ADR-002 | 独立管理应用与权限范围，复用 `auth.principals` |
| ArticleVersion 和 TranslationGroup 纳入正式模型 | ADR-003 / ADR-004 | 版本记录不可变，各语言独立审核与发布 |
| 四大 Compass 分担专业审核 | ADR-006 | 教育、身份、财富、健康按领域授权，具体人员待确认 |
| 独立对象存储进入技术选型 | ADR-005 | 允许比较与验证候选方案，供应商、区域和生产配置待定 |
| 继续 Private Review | ADR-007 | 公开域名、可索引路由和索引策略在上线前单独审批 |

ADR-008（阅读行为）、ADR-009（CRM 转化）和 ADR-010（编辑与专业审核分离）保留原审查稿中的候选状态。P1 设计沿用审查稿的基础边界，暂不接入行为追踪、订阅或 CRM 归因。

## 核验基线

- 2026-11-14 通过远端引用核实 `main` 为 `2065da703fef5c56904db24bafc733632f248750`。该提交的 [Canonical migrations 目录](https://github.com/yvettfang-netizen/phoenix/tree/2065da703fef5c56904db24bafc733632f248750/database/canonical/migrations) 包含 0001–0037。0038、0039 和其 manifest 位于 [forward-candidates](https://github.com/yvettfang-netizen/phoenix/tree/2065da703fef5c56904db24bafc733632f248750/database/canonical/forward-candidates/service-workbench)。迁移编号由数据库负责人按正式排期分配。以上是 Git 仓库证据，运行环境迁移账本未核验。
- P0 预览位于 [Draft PR #72](https://github.com/yvettfang-netizen/phoenix/pull/72)。审查时 P0 代码和截图基线为 `a310bfe6be5fc484f50a974c55ef586f66936f39`。十条 GitHub 工作流在该提交上均成功。官网配置中的 `r2` 为 `null`。
- Canonical 的审计和身份可复用部分包括 [0003 的主体与会话](https://github.com/yvettfang-netizen/phoenix/blob/2065da703fef5c56904db24bafc733632f248750/database/canonical/migrations/0003_core_consent_access.sql#L65)、[0012 的上下文约束](https://github.com/yvettfang-netizen/phoenix/blob/2065da703fef5c56904db24bafc733632f248750/database/canonical/migrations/0012_service_principal_and_context.sql#L27)、[0017 的外部身份映射与审计关联](https://github.com/yvettfang-netizen/phoenix/blob/2065da703fef5c56904db24bafc733632f248750/database/canonical/migrations/0017_external_identity_request_trace.sql#L101)、[0026 的专用服务主体校验](https://github.com/yvettfang-netizen/phoenix/blob/2065da703fef5c56904db24bafc733632f248750/database/canonical/migrations/0026_enterprise_core_organization_client.sql#L130)以及 [0037 的专用投影读取角色](https://github.com/yvettfang-netizen/phoenix/blob/2065da703fef5c56904db24bafc733632f248750/database/canonical/migrations/0037_scoped_public_id_projection_read_audit.sql#L4)。

## P1 逻辑模型

建议命名空间 `content`，待数据库负责人评审。采用 Canonical 的 ID 和外键约定。表名及字段名为设计名称。

| 对象 | 主键、关系与约束 |
|---|---|
| TranslationGroup | Canonical UUID。组内每种语言最多一篇 Article。不同语言各自保存 slug、版本和发布记录 |
| Article | Canonical UUID，关联 TranslationGroup。语言采用明确允许值，规范化 slug 后对语言与 slug 建立唯一约束。使用 `latest_version_id` 和 `published_version_id` 分别追踪最近修订和当前公开版本。两个指针都用复合外键限制在本文章内 |
| ArticleVersion | 版本 ID、文章 ID、版本序号。文章与版本序号唯一。正文、标题、摘要、结构化内容、媒体及分类引用作为不可变版本快照。单独记录编辑、审核和发布事件 |
| Category / ArticleCategory | 频道和标签共享这组对象，分类树需要循环保护。发布用分类关系绑定 ArticleVersion。第五频道 Cross-domain 仍是内容分类 |
| ArticleSource | 绑定 ArticleVersion。保存官方 URL、机构、来源日期、核验时间、核验主体、核验备注和可用时的证据哈希。新证据进入新版本 |
| Topic / ArticleTopic | 专题与文章多对多。专题公开投影独立检查发布状态，仅返回已发布文章 |
| FAQ | 文章内 FAQ 作为版本内容块随文章发布。独立知识库 FAQ 先设计标识与分类，采用独立审核记录和公开投影 |
| ReviewDecision / EditorialEvent | 版本、动作、授权领域、主体、时间、决定与原因。追加式记录，用于恢复完整发布历史 |
| EditorialAssignment | 授权给现有主体，包含角色、领域、有效期及撤销记录。支持一个人有多个领域授权，操作时逐项检查 |

数据库审查应核对主外键、唯一性与查询索引。审核队列按版本、审核类型、领域检索，公开读取按语言、slug 和发布时间检索。撤回后保留 slug 历史与版本，避免旧 URL 指向另一篇内容。PolicyUpdate 和 MediaAsset 完善方案排在 P2。政策核验状态与政策生命周期使用独立字段。

## 权限与审核

CMS 后端验证已有内部身份，将认证凭据和请求绑定到 Canonical 主体。当前 `INTERNAL` 上下文仅支持 `SERVICE` 主体且要求人员字段为空，`ADVISOR` 又要求有效的家庭案件分配。P1 的首项技术审查是核定独立 CMS 的人员授权和上下文绑定方式。备选是扩展受控的人员上下文，或使用经过服务端验证、一次性绑定的人员身份声明，由专用服务主体调用受限命令。后者必须同时审计服务主体和实际操作人，且数据库不得把浏览器提交的身份或角色当作授权证据。

| 角色 | 能力 |
|---|---|
| AUTHOR | 建立管辖范围内的草稿、提交来源与修订 |
| EDITOR | 编辑审核、退回并说明原因 |
| PROFESSIONAL_REVIEWER | 审核已获授权的 Compass 领域并记录核验结果 |
| SEO_REVIEWER | 核对文档元数据、候选域名与索引规则 |
| PUBLISHER | 调用发布及撤回命令，操作时重新检查审核证据 |
| READ_ONLY_AUDITOR | 读取授权范围的版本和审计记录 |

跨领域版本的审核任务由关联的专业领域产生。涉及两个领域须获得两个领域的审核决定。专业审核人与该版本的发布授权人必须不同。审批固定到版本，新的正文或来源修订重新送审。角色撤销、人员停用和范围变化应在下一次操作时生效。

CMS 与网站使用不同的运行权限。草稿、来源证据和审核记录由 RLS 及受控数据库函数限制。网站读取获准发布的投影，返回公开署名和更新时间等公开字段。内部主体标识、审核备注和媒体存储键保留在 Canonical 或受控后端。写入和访问拒绝复用 `audit` 的动作及结果记录方式，以及 PostgreSQL 日志和 `attempt_id`、`request_nonce` 的回滚关联机制。

## 版本、发布与撤回

1. CMS 通过服务端 API 创建草稿版本，提交编辑审核，完成所需专业审核，然后进入 `READY_TO_PUBLISH`。退回和重新送审均保留原因和操作人。
2. 发布命令应同时检查目标版本、角色范围、活跃身份、来源、媒体授权、元数据和发布面。锁定目标文章，校验预期版本，提交版本指针和发布事件。API 对重复请求使用幂等键，对过期版本返回冲突。审核中的新稿持有独立指针，当前公开版本继续可读。
3. 周期复核形成独立任务，记录复核日期和证据。需要改动时创建新版本。撤回清除公开指针并保留历史。站点缓存、Sitemap 和 RSS 的更新应可重试，从获准的同一发布版本读取。过期缓存与媒体撤回时效由发布审查定案。
4. 内容发布和站点开放在两个层面校验。Private Review 由服务端访问控制验证，`noindex` / `nofollow` 处理搜索收录。当前核验覆盖仓库索引配置，托管环境的访问保护仍需在发布审查时实测。公开域名和路由清单获批后，公开投影才可以驱动 Sitemap、RSS、Article Schema 与 hreflang。

拟议 API 覆盖编辑队列、读取版本、创建版本、提交审核、记录审核、发布、撤回、历史和正式内容读取。每项命令在服务端执行授权，命令结果包含版本及状态，用户身份及审核证据从服务端上下文获取。

## 独立媒体存储选型

| 候选 | 可纳入验证的方案 | 仍需确认 |
|---|---|---|
| Cloudflare R2 | 私有 Bucket，使用短时签名上传或后端操作。预览和上线媒体可由受控入口分别交付 | 当前官网无 R2 绑定。验证区域、访问日志、扫描链路、缓存撤回、用量和成本。[R2 签名 URL](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) · [R2 公开访问](https://developers.cloudflare.com/r2/buckets/public-buckets/) |
| Amazon S3 + CloudFront | 私有 S3，签名上传与下载。CloudFront 使用 Origin Access Control 访问私有源站 | 验证账号和区域、IAM 与日志运维、扫描与缓存撤回、传输和成本。[S3 签名 URL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html) · [CloudFront OAC](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html) |

两种方案采用同一验收链路：隔离上传 → 类型与大小检查 → 扫描与哈希 → 缩略图 → 权利及 Alt 元数据审核 → 受控交付 → 撤回与缓存清理。Canonical 保存文件和授权元数据，二进制驻留对象存储。选型证据需要区域与权限边界、实际样本处理结果、费用估算和撤回时效。当前两项均是候选，P1 隔离环境可用明确标记的审查素材验证内容与引用关系。

## 工程审查顺序

| 审查人 | 可核验事项 |
|---|---|
| Jimson / DB 负责人 | 确定 schema、迁移编号、键与索引、锁与幂等、审核记录关系；验证 Git 基线与目标环境迁移账本一致 |
| 玄武 | 验证人和服务主体绑定方式、RLS、函数权限、审计回滚存证、撤权及并发操作 |
| 麒麟 / 内容负责人 | 确认四类审核责任人、多领域审议规则和退回理由；用双语版本验证发布独立性 |
| 白虎 / 发布治理 | 确认审核与发布职责、Private Review 权限与公开索引门禁 |
| Founder | 按原审查稿分别批准正式 migration 和公开发布；媒体供应商与发布域名单独定案 |

隔离数据库验收至少覆盖迁移账本与拟议变更的顺序，RLS 允许与拒绝，授权撤销，同一人审核并发布的拒绝，缺领域审核的拒绝，编辑与发布竞争，重复提交，每种语言独立发布与撤回，历史版本不可覆盖，事务回滚后的审计关联，以及公开投影不包含草稿。上线前须验证日志采集与权限，按 `attempt_id` 对账数据库审计行和回滚后仍保留的日志。此次交付为审查稿，数据库读写和 CMS 流程测试将在实现后验证。
