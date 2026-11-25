# ID 决策溯源与复用

**源码及既有决策核对 PASS；本轮不重新制定 ID 方案。** 私有引用均固定于已核验归档提交 `7b0e42362e1a639c286835840133596a2e39861f`。只读核验使用当前工程仓库中的 Git 对象，没有扫描其他工作区或读取真实数据库。

| 依据 | 原文状态及核对 | 本轮复用 |
|---|---|---|
| [Founder 登记表 FD-2 / F-18](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/7b0e42362e1a639c286835840133596a2e39861f/canonical-db/phase2-gate/PRODUCTION_DATABASE_FOUNDER_DECISION_REGISTER_V1.0.md) | 2026-10-15 14:37 typed approval；原字节 SHA-256 `ed1d5838ef54e45c1b99f2f18c4bf75fa88ceb10b792d003a247d7097e53d3a0`，与独立批准记录一致 | UUIDv7 为内部权威；per_/fam_/stu_/gdn_ + 32 位小写十六进制为公开 ID；usr_ 预留登录主体，不是自然人 ID |
| [业务基线](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/7b0e42362e1a639c286835840133596a2e39861f/canonical-db/phase2-gate/CANONICAL_BUSINESS_CONTRACT_V1.0_EFFECTIVE.md) | FD-2 绑定 SHA-256 `f89a1bbe3cff78ed96e8e6620fce7d41837ae4d30de0b9fd91929f2f6bcf4c93` 实测匹配 | Person 唯一主档；Student 为 Person profile；Guardian 为有时限授权，无第二套主数据 |
| [FM-1～FM-8 决策](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/7b0e42362e1a639c286835840133596a2e39861f/canonical-db/phase2-gate/FOUNDER_DECISION_FAMILY_MAPPING_MANAGEMENT_API_V1.0.md) | 批准记录绑定 SHA-256 `41dc44d03dd9ba6cdd6b5812d0b050e07445ac5db129f2693d304b29f9501475` 实测匹配 | 固定 PHOENIX_FAMILY_OS / FAMILY，受控 propose/verify/revoke/supersede；不重开来源或核定规则 |
| [0003 public_ids](../../../database/canonical/migrations/0003_core_consent_access.sql)、[0009 创建接口](../../../database/canonical/migrations/0009_application_write_api.sql)、[0013 管理接口](../../../database/canonical/migrations/0013_management_write_api.sql) | 已合并 SQL；创建时登记前缀 + UUID 去连字符值；Student 的 canonical_id 就是 person_id | 翻译读取已登记行，不自动生成/补建 public_id、不自动建人或学生 |
| [0030](../../../database/canonical/migrations/0030_m0_organization_identity_governance.sql) | 已合并 SQL 扩充 ORGANIZATION / org_ | 本方案仅 FAMILY / STUDENT_PROFILE；不扩展组织、个人或监护列表查询 |
| [历史学生映射 R1](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/7b0e42362e1a639c286835840133596a2e39861f/canonical-db/release/v1.9/STUDENT_ID_MAPPING_CONTRACT_R1.md) | 明确含 PROPOSED、ACCESS BLOCKED、NOT RUN 条款 | 不将草案视为新增 Consent / 旧 ID 导入批准；本轮不实现 Education/ASKWISE 旧 ID 对账 |

## 必须分开的四层 ID

| 层 | 解析权威 | 禁止混用 |
|---|---|---|
| 登录 subject（可形如 usr_） | issuer + subject → auth.external_identities → principal；0017/0023 | 不解码为 person_id，不从当前 Jimson 会话推断数据库身份 |
| 应用家庭 fam_ | source_system=PHOENIX_FAMILY_OS、entity_kind=FAMILY、VERIFIED legacy_id_mappings；0023–0025 | 即便字符串形状相同，也不是 Canonical public fam_ 的权威 |
| Canonical 内部 UUIDv7 | core.families.family_id / core.student_profiles.person_id | 不把 PR46 的 UUID 预览 DTO 宣称为正式公开 ID |
| Canonical public fam_/stu_ | integration.public_ids 的类型化已登记映射，且目标对象存在并已授权 | 不从前缀获得权限；不根据姓名/手机号/邮箱或字符串巧合合并 |

public ID 当前编码包含内部 UUID 的十六进制表示，**不是匿名化、加密或秘密**。授权仍必须校验家庭、主体、有效关系和可信上下文。0003/0030 的 CHECK 只限制允许前缀集合，不保证 entity_kind 与具体前缀一一对应，也没有对多态 canonical_id 的通用外键。本窄接口必须类型匹配、目标 join、UUIDv7 校验和一致性检查；异常默认拒绝，不在本轮补数据或静默重编号。若以后需要全表强化约束，另提 Forward 方案及存量审计，不能借本接口改写历史数据。

原始签名文件、审批正文和真实事实引用保留在私有证据库；本目录只公开经检查的源码规则、摘要和链接，不复制签名材料、密钥引用值或运行日志。
