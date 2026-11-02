# Identity V3.1 Founder 验收交付索引

任务：PHOENIX-IDENTITY-V31-CBI-DATABASE-20261102。基线 main：`259753248ff54b07fd9c52f270e45ae1c877bc09`。分支：`codex/identity-v31-cbi-review`。

本次是可审核的工程候选版本，不是已通过全部 Gate 的发布版本。保持 Draft PR；不合并 main、不部署、不执行生产数据库 Migration。

## 已完成并验证

- 原 Identity V3 页面增量新增四国 CBI 检索入口；原四服务、五阶段、全球目的地、共享品牌及受控 Compass 保留。既有页面浏览器回归 22/22。
- 中英文检索、10 类筛选、组合搜索、排序、清除、2–4 国比较及 8 个独立详情页面；浏览器分组检查 24/24，覆盖 320/390/768/1024/1440px。
- CSV/XLSX/JSON 本地文件解析、固定数据字典映射、格式/来源/重复校验、IMPORT_REVIEW 预览和错误报告导出。三格式真实文件浏览器检查通过，手机 320px 无页面溢出。
- 纯模型测试 36/36（其中 CBI 15）；typecheck 零错误；项目原 lint 脚本零错误、1 条原有 Bell 未使用警告；标准 Vinext build 通过，保留既有构建方式。ExcelJS 客户端包较大，构建存在体积警告。
- 10 个双语页面的服务器正文、唯一 H1/Title、Description、Canonical、Hreflang、WebPage/Organization/BreadcrumbList 结构校验通过。不是外部搜索引擎认证。
- 默认模式公开检索为空、未发布详情 404、导入页 404；robots 禁止索引、sitemap 不包含未批准资料。审核预览须在本地服务端显式开启，不作为生产身份认证。

## Gate 判定与未完成项

| Gate | 结果 | 说明 |
|---|---|---|
| 0 工程保护 | PASS | 从已核实 main 建独立 worktree；原脏工作区保留；无 Compass、Education、Health、首页、Auth/API 或既有 migration 修改 |
| 1 页面交互 | 工程检查 PASS / 视觉待批准 | 中文、英文、筛选、比较、详情交互已验证；国旗资产尚未导入，仅显示 ISO 标识及待核实状态 |
| 2 法律资料 | NOT_VERIFIED / HOLD | 四份独立核验报告存在；未确认每国法律、细则与实际受理全链路；圣多美官方目标法令全文未取得 |
| 3 数据导入 | PREVIEW_PASS / DATA_IMPORT_PASS HOLD | 三格式预览已完成；没有真实资料持久化、跨批历史冲突查询、原文件留存、审批界面或正式写入 adapter；仅固定字段映射，无任意列映射界面 |
| 4 状态机 | 模型检查 PASS / 集成 HOLD | 三状态独立、ACTIVE 必须有当前官方证据；发布接口缺失时拒绝；历史、事务及 rollback 仅 mock/接口契约验证，没有真实数据库恢复证明 |
| 5 GEO | LOCAL_TECHNICAL_PASS / 发布 HOLD | 本地结构正确；全站沿用 private-review/noindex。正式域名、可索引 sitemap、公开 FAQ 逐答案证据及上线后的搜索验证未批准 |
| 6 安全 | HOLD | 生产依赖扫描 18 项：1 critical、7 high、10 moderate；既有 Next 风险与新增 ExcelJS 依赖链均已列出；本地预览开关不替代 RBAC |
| 7 Canonical | HOLD / APPROVAL_MISSING | 已核对 V1 与实际 V2 分支源证据；Jimson/Founder 尚未锁定生效 V2 contract、领域 DDL、RLS/API 及 adapter；未执行 migration |
| 8 全面测试 | LOCAL_PARTIAL / CI_PENDING | 本地构建、类型、lint、模型与 UI 检查通过；Windows 原 Workers runtime 出现 0xc0000005，不能宣称全部 runtime 测试通过；新增 Ubuntu CI 运行全套 tests/*.test.mjs |
| 9 Founder | 待验收 | 截图、模板、报告、源文件与 Draft PR 供审核；Founder 视觉及发布批准尚未取得 |

四国均为 `IMPORT_REVIEW`，无 `ACTIVE`，金额/费用/周期/家庭资格空值不填猜测。阿根廷保留 PRE_LAUNCH，不以公告代替实际开放证明；瓦努阿图非公民旅行文件不进入 CBI 公民护照目录。

## 交付文件与证据

以下 `outputs/identity-v31/` 文件由真实本地检查生成，因仓库既有规则忽略而不进入源码 commit；CI 同类结果作为 Actions artifact 保存。证据包 manifest 记录对应源码 SHA。

| Founder 要求 | 交付位置 |
|---|---|
| 完整中文、英文截图 | outputs/identity-v31/regression/identity-{zh,en}-{1440,1024,768,390,320}-full.png |
| 国家检索截图 | outputs/identity-v31/cbi-explorer-{zh,en}-{1440,390}.png |
| 四国详情截图 | outputs/identity-v31/cbi-detail-{zh,en}-{country-slug}.png |
| 2/3/4 国比较截图 | outputs/identity-v31/cbi-compare-{2,3,4}.png |
| 三格式导入预览 | outputs/identity-v31/import-{csv,xlsx,json}-preview.png；import-inputs/ 有对应文件 |
| 错误报告示例、导入模板 | templates/cbi-error-report.example.csv、cbi-country-record.template.{csv,xlsx,json} |
| 字段字典 | [field-dictionary.md](field-dictionary.md)、lib/cbi-schema.ts |
| 四国官方来源与状态核验 | [sources-and-verification.md](sources-and-verification.md)；四个独立 *-verification.md |
| GEO URL 及 Schema | [geo-urls.md](geo-urls.md)、outputs/identity-v31/geo-results.json |
| Canonical 映射、概念 ERD、migration 计划及回滚草案 | [canonical-mapping.md](canonical-mapping.md)；无可执行 Migration，待批准 |
| 权限矩阵 | [permissions.md](permissions.md)；拟议权限与现有隔离明确区分 |
| 安全扫描 | [security-audit.md](security-audit.md)、outputs/identity-v31/security-audit.json |
| 真实测试日志 | outputs/identity-v31/{build,typecheck,lint,model-tests,identity-browser,cbi-browser,import-browser,geo}.log |
| 修改文件与完整 SHA | outputs/identity-v31/source-manifest.json 与 Draft PR Files changed |
| 独立 Draft PR | GitHub 分支 codex/identity-v31-cbi-review，具体 PR URL 见交付消息及 manifest |

## 建议下一项

先由 Jimson/Founder 锁定 Canonical V2 生效版本及国家/项目领域存储和审核权限契约，再实现持久化导入与审批发布 adapter、真实历史/恢复测试。同时完成依赖安全修复和四国逐字段法律复核。不得将本候选版本直接切换为 PUBLISHED。
