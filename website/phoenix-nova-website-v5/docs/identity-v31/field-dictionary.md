# Identity V3.1 国家资料数据字典

版本：2026-11-02。规范类型与校验实现：lib/cbi-schema.ts。只接受 KN、AR、VU、ST；原有身份目的地不自动加入投资入籍目录。

| 字段 | TypeScript 类型 | 填写规则 |
|---|---|---|
| country_id | string | 必须显式提供 |
| country_code | CbiCountryCode | 必须显式提供 |
| country_name_zh | string | 必须显式提供 |
| country_name_en | string | 必须显式提供 |
| official_name | string | 必须显式提供 |
| flag_asset | string \| null | 允许空值；不自动推断 |
| programme_name | BilingualText \| null | 允许空值；不自动推断 |
| programme_type | CbiProgrammeType \| null | 允许空值；不自动推断 |
| legal_basis | BilingualText \| null | 允许空值；不自动推断 |
| investment_options | BilingualText[] \| null | 允许空值；不自动推断 |
| minimum_investment | number \| null | 允许空值；不自动推断 |
| currency | string \| null | 允许空值；不自动推断 |
| government_fees | BilingualText \| null | 允许空值；不自动推断 |
| due_diligence_fees | BilingualText \| null | 允许空值；不自动推断 |
| family_eligibility | BilingualText \| null | 允许空值；不自动推断 |
| residence_requirement | BilingualText \| null | 允许空值；不自动推断 |
| interview_requirement | BilingualText \| null | 允许空值；不自动推断 |
| source_of_funds_requirement | BilingualText \| null | 允许空值；不自动推断 |
| processing_time | BilingualText \| null | 允许空值；不自动推断 |
| dual_nationality_policy | BilingualText \| null | 允许空值；不自动推断 |
| passport_validity | BilingualText \| null | 允许空值；不自动推断 |
| passport_renewal | BilingualText \| null | 允许空值；不自动推断 |
| travel_access_data | TravelAccessData \| null | 允许空值；不自动推断 |
| legal_status | CbiLegalStatus | 必须显式提供 |
| operational_status | CbiOperationalStatus | 必须显式提供 |
| application_status | CbiApplicationStatus | 必须显式提供 |
| passport_issuance_status | CbiPassportIssuanceStatus | 必须显式提供 |
| official_authority | BilingualText \| null | 允许空值；不自动推断 |
| official_sources | PolicyRule[] | 必须显式提供 |
| last_verified_at | string \| null | 允许空值；不自动推断 |
| next_review_at | string \| null | 允许空值；不自动推断 |
| content_status | CbiContentStatus | 必须显式提供 |
| programme_id | string \| null | 允许空值；不自动推断 |
| data_version | string | 必须显式提供 |
| planning_details | CbiPlanningDetails \| null | 可选；所有规划字段须逐项提供，缺失保持缺失，不从国家、项目名称或文字关键词推断 |
| field_sources | Record<string, PolicyRule> \| undefined | 可选字段级来源；键必须是已知 root/planning 字段，且必须逐项满足 OFFICIAL、CURRENT、有效核验日期及官方 HTTPS 域名 |

## 语义与空值

- CountryRecord 是国家及项目资料版本，不是 Person、Client、Family 或申请人记录。同一 ISO 国家允许多个独立项目，但不得产生第二个国家实体。
- BilingualText = { zh: string|null, en: string|null }；两种语言独立填写，不能把中文自动当作英文。CSV/XLSX 可用 JSON 单元格或明确的 _zh/_en 字段。具体支持以导入器校验为准。
- minimum_investment 为非负有限十进制数字或 null；有金额必须有币种，不做汇率换算。含歧义的地区分隔符、负数、NaN、Infinity 被拒绝。0 不等于空值。
- government_fees / due_diligence_fees 是带来源的费用说明，不构成商业报价、付款或合同。周期和家庭资格允许 null。
- 日期使用真实日历的 YYYY-MM-DD。last_verified_at 只表示记录所述核验范围；不能把一次网页访问解释为所有字段核验完成。next_review_at 不是官方政策生效期限。
- official_sources 每项保留 source_type/source/official_url/verified_at/effective_scope/effective_status/owner；域名允许不等于来源内容已经核实。每条待发布事实仍需人工审核。
- travel_access_data 必须保留来源、统计日期、方法和适用证件类别；不同指数不得拼接，不计算国家排名。没有可靠资料时为 null。evisa_count 是电子签证数量，不能用作电子旅行授权（ETA）数量；eta_count 与 visa_required_count 为独立的、非负整数统计字段，restrictions 使用 BilingualText。计数出现时仍须来源、日期和统计方法齐全。
- planning_details 的双语字段包括 country_overview、nationality_system、investment_term、eligibility、family_supplement_fees、passport_fees、professional_fees、third_party_fees、principal_applicant、spouse、minor_children、adult_children、parents、other_dependants、age_dependency、relationship_evidence、landing_requirement、biometrics_requirement、criminal_record_requirement、due_diligence_requirement、application_process、nationality_acquisition、nationality_approval、nationality_loss、processing_time_observed、policy_updates、travel_restrictions。family_categories 只能使用 INDIVIDUAL / COUPLE / MINOR_CHILDREN / ADULT_CHILDREN / PARENTS。
- planning_details.residence_requirement_category 只能使用 NONE / LIMITED / REQUIRED / UNKNOWN；UNKNOWN 或缺失不等于 NONE，不能从 residence_requirement 文本或用户偏好推导。只有同名 field_sources 中经核验的 OFFICIAL/CURRENT 来源才可支持确认展示；minimum_investment 同理，记录级 official_sources 不会替代字段级核验。

## 独立状态

Legal：LAW_ENACTED / REGULATED / LEGAL_REVIEW / LEGAL_UNCERTAIN / REPEALED / UNKNOWN。

Operational：ACTIVE / PRE_LAUNCH / SUSPENDED / NOT_ACCEPTING_APPLICATIONS / CLOSED / UNKNOWN。

Application：ACCEPTING / NOT_ACCEPTING / NOT_VERIFIED。

Passport issuance：CITIZEN_PASSPORT_AVAILABLE_AFTER_APPROVAL / ISSUANCE_PENDING / NON_CITIZEN_TRAVEL_DOCUMENT / NOT_APPLICABLE / UNKNOWN。

Content：IMPORT_REVIEW / PUBLISHED / WITHDRAWN。文件不能自行指定已批准发布；实际批准与写入必须经服务端可信授权及追加版本接口。

法律颁布、项目运营、申请受理、投资批准、国籍取得、护照签发分别记录，不相互推导。

## Part 8 字段来源边界

`field_sources` 可使用 root 字段键以及上述 planning 字段的裸键或 `planning_details.<field>` 形式；未知键会被拒绝。每条规则仍须完整包含 source_type、source、official_url、verified_at、effective_scope、effective_status、owner。字段来源过期、未来日期、非官方或非当前时，只能停留在审核状态，不能形成确定性结论。

## 文件与版本治理

CSV、XLSX、JSON 原始文件必须保留哈希、文件名、批次、操作者、来源文件、导入时间、原始/数据版本、核验和审批状态。未授权或未知操作者不得标记 Founder。候选预览及错误报告不等于已导入正式数据库。

重复或冲突不会自动覆盖已审核版本。正式 Repository/RBAC/事务与原始文件持久化需按 Jimson 的有效 Canonical V2.0 契约接入；目前保持 HOLD，参见 canonical-mapping.md 与 permissions.md。
