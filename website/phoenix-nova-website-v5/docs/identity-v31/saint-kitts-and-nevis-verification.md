# saint-kitts-and-nevis — independent source verification

Task: PHOENIX-IDENTITY-V31-CBI-DATABASE-20261102

Verified: 2026-11-02. Editorial review only; no public release or legal opinion. Missing facts remain NOT_VERIFIED. See sources-and-verification.md for the shared method and release requirements.

## 3. Saint Kitts and Nevis

### 3.1 已核实事实

1. **法律及法规。** CIU 发布的《Saint Christopher and Nevis Citizenship by Substantial Investment Regulations, 2024》（Statutory Rules and Orders No. 20 of 2024）标明依据 Citizenship Act, Cap. 1.05 制定，并于 2024-07-08 在 Extra-Ordinary Gazette No. 37 发布；该法规明确废止 2023 年同名法规。法规把 CBI options 定义为 Developer’s Real Estate、Sustainable Island State Contribution、Private Real Estate Sale、Public Benefit 四类。
2. **官方选项页。** CIU 的 CBI options 页面列出 Sustainable Island State Contribution、Developer’s Real Estate Investment、Private Real Estate Sale、Public Benefit Option 四个主路径，并标注 Citizenship Unit Act 2024。
3. **申请与尽调。** CIU 的 application process 页面说明申请须经官方 Authorised Agent 提交；CIU 进行尽调后可能发出 approval-in-principle，之后才进行投资，并在取得 citizenship certificate 后再申请护照。法规要求 16 岁以上申请人及相关家庭成员接受背景核查，且要求资金来源证据。
4. **主管机构。** CBI options 页面末尾说明 Citizenship Unit 是负责促进和管理申请的法定机构；页面版权标注 Government of St. Christopher and Nevis, 2026。

### 3.2 状态与未决字段

- `legal_status`：上述官方法规可支持法律工具存在的候选证据；对当前完整法律状态完成复核后，应在 `LAW_ENACTED` 与 `REGULATED` 等枚举中选择一个值，不同时赋多个值。候选程序数据目前仍为 `UNKNOWN`。
- `operational_status`、`application_status`：本报告不写入 `ACTIVE`。官方页面呈现申请流程，但最终产品仍应在发布前重新核对当前 Authorised Agents、批准项目清单和实际受理确认。
- 费用、投资金额、周期、家庭资格和护照更新等字段：即使官方页面出现数字，也应逐字段保存来源和核实日期；本轮不向产品数据库预填完整商业金额或报价。
- 护照不是投资本身的结果：官方流程先取得公民证书，再申请护照；任何页面不得写成“投资直接购买护照”或保证签发。

### 3.3 主要官方来源

| source_type | source / official_url | verified_at | claim | unknown / boundary | owner |
|---|---|---|---|---|---|
| OFFICIAL_CURRENT | [CIU CBI options](https://ciu.gov.kn/cbi-options/) | 2026-11-02（页面日期未显示；页脚版权 2026） | 四类主投资路径及 Citizenship Unit 主管机构 | 当前每个项目是否仍有名额/受理、项目批准清单需再次核对 | Citizenship Unit / Government of St. Christopher and Nevis |
| OFFICIAL_CURRENT | [CIU application process](https://ciu.gov.kn/application-process/) | 2026-11-02 | Authorised Agent、尽调、approval-in-principle、投资及公民证书流程 | 不能单独证明每个申请人的资格或结果 | Citizenship Unit |
| OFFICIAL_CURRENT | [Statutory Rules and Orders No. 20 of 2024](https://ciu.gov.kn/wp-content/uploads/2025/01/sro-20-of-2024.pdf) | 2026-11-02（法规发布日期 2024-07-08） | 2024 法规、法律依据、四类 CBI option、尽调与费用规则 | 具体项目/费用随法规或政府通知更新时需重新核实 | Minister / Citizenship Unit |
| OFFICIAL_CURRENT | [CIU eligibility criteria](https://ciu.gov.kn/eligibility-criteria/) | 2026-11-02 | 主申请人、家庭成员、排除条件的官方说明 | 不作为自动资格判断；实际案件仍需个案核查 | Citizenship Unit |
