# Education 最后一轮升级恢复审计

日期：2026-11-03，Asia/Shanghai。结论：原 V3 已合并；V2.0 GEO 未整体完成。不得把检索控件、空库、来源链接或合成测试当作真实资料库完成。

## Git 与工作树

- 当前 main：`2be78cdb6435fc8a569db05531e5afbe4ab7328f`。Education V3 已由 PR #32 合并，合并提交 `259753248ff54b07fd9c52f270e45ae1c877bc09`。
- 恢复前 V2.0：本地 `dcf255c7f6bc519cf5fbe3f3bf3228ebf4855ec6`，无远端分支、无 PR。独立工作树 `D:\CODEX\PhoenixNova\_Worktrees\education-v20-geo` 原为干净状态。
- 已保留本地提交，同步最新 main 为 `e0cdc4d444d94918048646d82a198887079ddee1`，Push 并建立 Draft PR #38，目标 main。没有合并 main。
- 根工作树仍有 Education Compass 多个未提交 UI 文件、ASKWISE 文件和其他未跟踪目录。它们未纳入本 PR、未 stash/reset/clean/覆盖。独立网站工作树与根问卷未提交成果分开保护。

## 七项完成度

| 核查项 | 恢复前实际状态 | 本次继续实施及剩余项 |
|---|---|---|
| 幼儿园、小学、中学检索 | 本地已提交框架，真实学校库为空 | 本次接入教育局 3,496 条来源记录，含名称/阶段/地区/资助/性别/官网；候选页面支持组合检索、分页和排序。课程、费用等字段仍不完整 |
| 学校分类 | 已有资助/办学/法律/课程分维度类型，但非牟利枚举和 UI 不全 | 增加独立非牟利属性；国际学校、私立独立学校仍需独立类别数据，不能由 IB 或 private 推断 |
| DSE/IB/A-Level/AP | 纯引擎具备标签组合；旧 UI 单选、无实际学校课程记录 | 多选、IB 子类及阶段 UI；真实课程提供情况仍需逐校官网核实 |
| 八大及其他大学详情 | 八大只有官方名录入口，无详情页；其他院校缺失 | 本次补充八大独立双语资料页，复用实体 ID 与官方招生来源；未核实的学费、日期、专业与要求明确待审；其他认可院校未完成 |
| 本科/硕士/副学位/专业/申请季 | 有阶段介绍与候选数据契约；专业库为空 | 新增专业检索入口与实过滤契约；真实专业、费用、要求与有效申请季仍未完成 |
| GEO | 部分实体/官方来源/Canonical/Hreflang及发布门禁；实际 JSON-LD 和 sitemap 缺失 | 阶段/大学 JSON-LD、草稿空 sitemap/index/robots 增补；完整知识关系、独立问题指南、外部验证、搜索监测未完成 |
| 双语、真实数据、浏览器 | 历史首批报告 7 单测/62 浏览器，不可沿用为当前 PASS | 本次重新运行并在 PR 记录；真实学校/专业数据覆盖测试仍不具备，合成 fixtures 与真实数据必须分开 |

## 分类官方依据

已保存官方 JSON 原始证据并记录 SHA-256：`6CE338319E4E09482CA2CD19DCFE909FFBD3203C6D6F299F2BA96E0402395709`。来源 `https://www.edb.gov.hk/attachment/en/student-parents/sch-info/sch-search/sch-location-info/SCH_LOC_EDB.json`，获取 2026-11-03，Last-Modified 2026-10-02。`scripts/import-education-schools.mjs` 校验原始哈希后生成 `lib/data/education-schools-official.json`。源记录保留学校编号、时段与重复序号，不把源行数等同独立学校数；来源不提供课程、学费、语言、非牟利或申请季，不作推断。

学校数据在模型中为 candidate；只有禁止索引的学校预览页明确允许来源已核实 candidate 与 published，不显示 draft，不更改全局发布门禁。界面按源记录展示，正式发布仍待 Founder 批准。

2026-11-03 查阅：[教育局幼稚园概览](https://www.edb.gov.hk/en/edu-system/preprimary-kindergarten/overview/index.html)：幼稚园由私人营办，NPM 与 PI 分类不可等同于官立/资助中小学。非牟利与参加幼稚园教育计划也是不同事实。

[教育局学校类型说明](https://internationalschools.edb.gov.hk/en/about/our-schools.html)：政府/资助/直资、国际学校及私立独立学校须按官方类别处理，不从课程名称反推学校类别。不得推断所有国际学校提供 IB 或全部 IB 阶段。

大学来源和逐字段缺口记录在 `lib/education-university-profiles.ts`；只有明确核实字段才显示为事实。学校或专业未核实数据不采用 AI 编造值。

## GEO 与业务边界

Founder 提供 `http://edu.phoenixnova.com.cn`，正式 HTTPS/TLS、跳转和部署仍未证明。本次所有页面 noindex，robots 禁止抓取，各 sitemap 暂时不含草稿 URL，不提交任何搜索平台。不把空 sitemap 称为已完成公开索引。外部 Google Rich Results Test / Schema Validator、Search Console、Bing 和 AI 引用监测仍未完成。

不修改 Education Compass 题库、规则或未提交原型；不接通未批准的咨询、CRM、Family OS 或数据库写入。未创建 Migration，未部署生产。

## 实际测试与截图

本次验证结果由当前 PR checks 及新运行的 `outputs/education-v20/results.json` 记录。大学与检索的真实字段覆盖仍须以已核实数据为准。验收截图随本轮证据目录提交，历史截图仅作为修改前参照，不代替当前测试。

本轮实际结果：直接 vinext 构建 PASS、TypeScript PASS、Lint 零错误及原有 Bell 警告；13 项纯逻辑/官方数据/检索契约测试 PASS；156 项浏览器检查 PASS，覆盖中英 320/390/768/1440px、八阶段、八大详情、真实官立小学结果、保留条件的分页及未知 IB 不被推断。首次 320px 大学长链接溢出已修复后重跑通过。Windows 本地使用前端 Node 适配器，真实 Workers/原 Compass 的远端验证以最新 PR CI 为准。Education Compass 相对当前 main 无源码差异，根工作区未提交改动保持原状。

新截图与结果：[中文桌面首页](previews/education-v20-recovery/zh-1440-home.png)、[英文桌面首页](previews/education-v20-recovery/en-1440-home.png)、[中文手机首页](previews/education-v20-recovery/zh-390-home.png)、[英文手机首页](previews/education-v20-recovery/en-390-home.png)、[真实学校检索](previews/education-v20-recovery/zh-1440-schools.png)、[手机学校检索](previews/education-v20-recovery/zh-390-schools.png)、[八大详情示例](previews/education-v20-recovery/zh-1440-hku.png)、[手机详情](previews/education-v20-recovery/zh-390-hku.png)、[156 项结果](previews/education-v20-recovery/browser-results.json)。[完整改动清单](EDUCATION_V20_CHANGED_FILES_20261103.md)。本地预览 `http://127.0.0.1:4441/zh/education`，英文 `/en/education`。

## 未完成的实质工作

补充原有 Education 浏览器回归：重新运行 16/16 PASS（中英 320/390/768/1024/1440、咨询不上传、三处评估入口禁用、Footer、无 JavaScript、无运行时错误），结果见 [original-browser-results.json](previews/education-v20-recovery/original-browser-results.json)。测试定位明确区分 Hero、阶段与 Compass，不改变问卷业务。加上知识平台 156 项，共 172 项本地浏览器检查通过。远端曾因临时 PostgreSQL 连接失败导致 Canonical job 失败，后续运行已通过，不能将该故障归咎于学校数据或宣称执行过生产迁移。

逐校课程与费用、非牟利及幼稚园教育计划资格、其他认可院校完整档案、Faculty/Department/Programme/Admission Cycle 真实关系、完整 22 字段及来源治理、专业/申请季检索真实数据、原创问题指南、外部 GEO 验证及受权 OS 交接均未整体完成。PR 保持 WIP；恢复保全和这轮增量通过不等于整个 Education V2.0 完成。
