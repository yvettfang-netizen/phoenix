# 数据完整性核验方案及证据范围

只对自有一次性PG16/17合成集群取指纹，包含core.people/families/student_profiles/family_memberships/guardian_authorities、consent.grants、service.projects/project_subjects、crm.clients/deals、integration.legacy_id_mappings及migration_name+sha256账本。

每张表记录合成行数量和有序JSON的SHA-256；故障前后精确比较。审计行按预期新增单独核验，不能因审计增长就覆盖业务指纹。逻辑dump前保存基准，restore后、后续回归新增fixture之前比较。

没有执行的检查标NOT RUN；某表0行只能证明其空状态还原，不能证明非空CRM/Service关系正确。原backup恢复会复验RLS、角色、guardian/ID mapping和审计故障，仍不能替代完整WAL/PITR或外部系统对账。

旧0001–0037文件、正式数据库、旧资产不改；真实资料不读取、不复制、不散列。指纹只针对本轮合成fixture。原始表级摘要在私有记录，不向公众输出拓扑或运行配置。
