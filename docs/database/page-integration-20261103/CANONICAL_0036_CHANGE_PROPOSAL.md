# Forward变更分流：复用既有0036，不另起主线

**现状核对PASS；合并/常设安装HOLD；本轮未写SQL。** main仍只有0001–0035；已有0036候选在PR41、HEAD3de5c99fcc1974ca542db587fcb01494ffe3dc58，SQL SHA-256为2c977cb44e3ec01f7ad00d4c0d8f32c5e2cd8e8fd2fed796340a919dfd0b7719。本任务不另造0036，不修改历史Migration，不把候选当已生效。

| 接入需求 | 当前物理依据/差异 | 最小处理 | 状态 |
|---|---|---|---|
| 已发布课程目录 | 0022 list_published_courses及精确EXECUTE已存在 | CONTRACT_ONLY：API/DTO/只读连接适配，无新表 | 审计PASS；实现NOT RUN |
| 合法Family/Student/Client读取 | core/CRM及身份、Family解析已存在；旧DTO字段未全覆盖 | 先做最小投影和source-ID映射，不为旧DTO兼容复制Master | HOLD（身份/字段合同） |
| 明确入口/GEO版本与四领域人类需求 | 旧compass_kind四值不足，First Touch不可改；已有0036技术候选 | 复用PR41：ADDITIVE_MIGRATION_REQUIRED已由独立候选承担，须真实Review后才能考虑整合 | HOLD（独立审核/运行事实） |
| ASKWISE Student外部映射 | legacy_id_mappings有目标类型，但现有管理API限定Family | 先批准source/Student生命周期，再提出窄函数/约束候选；不直接插表、不新增Student | HOLD |
| 评估/报告、GEO政策修订、约课改期/课时、委托SERVICE断言 | 0035/0036不覆盖完整业务合同 | EVIDENCE_MISSING：先字段/状态/权限/保留合同，再确定Forward是否必要 | HOLD |
| Health病历、Finance真实账本、历史导入 | 明确超出当前授权 | 不纳入本次SQL/API | HOLD |

0036仅处理必要的来源/需求语义，不承载完整Health、Identity政策库、学习引擎或Finance。下一迁移号应在实际开工时重新核验最新远端目录和并发PR；不预占0037、不复用旧006或Family sandbox编号。已进入常设环境的Migration不能按候选修订方式改写。

本轮代码差异只应是本审计文档/索引，不包含数据库Schema、API路由、密钥或部署修改。C-1～C-4已批准状态保持；真实source publication、issuer/audience/JWKS、app/binder/signing引用、route与适用保留条款仍缺证，不能以批准政策替代实际参数。
