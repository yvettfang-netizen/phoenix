# vanuatu — independent source verification

Task: PHOENIX-IDENTITY-V31-CBI-DATABASE-20261102

Verified: 2026-11-02. Editorial review only; no public release or legal opinion. Missing facts remain NOT_VERIFIED. See sources-and-verification.md for the shared method and release requirements.

## 5. Vanuatu

### 5.1 主管机构与法律框架

1. **主管机构。** 官方 Citizenship Office & Commission（`vancitizenship.gov.vu`）说明 COC 是由 Citizenship Act [CAP 112] 设立的法定实体，负责处理/批准/暂缓/拒绝公民申请并可撤销不符法律或宪法的公民身份。
2. **法律类别。** 官方 Types of Citizenship 页面明确列出 CIIP、DSP（Honorary Citizenship）、VCP 和 REO 等投资/项目类别；官方 2021 Consolidated Edition of Citizenship [CAP 112] 的第 13C--13F 也分别规定 CIIP、Contribution Program、DSP、REO 的申请法律框架、家庭成员和委员会决定时限。
3. **DSP。** 官方 `Citizenship (Development Support Program) Regulations, Order No. 33 of 2019` 明确依 Citizenship Act [CAP 112] 第 13E 制定 DSP；官方站点的新闻页面还要求 DSP/VCP agents 遵守政府规定的费用规则，但该页面没有提供可作为 2026 当前受理状态的日期证明。
4. **VCP。** CAP 112 第 13D 规定 Contribution Program 的法律类别；官方新闻索引指向 Order No. 34 of 2019 的费用规则。当前费用、代理及实际受理状态未逐项核实。
5. **CIIP。** 官方历史通知称政府曾于 2016-03-21 解除 CIIP suspension，并称批准三家代理依 Order 93 of 2023 运作。该页面没有给出当日更新日期，因此只作为历史/官方背景证据，不能单独证明 2026-11-02 仍在接受申请。
6. **REO。** 官方公告称 REO 于 2021-07-23 开始，依据 Citizenship Act 第 13F 和 Regulation Order No. 93 of 2021，并列出政府批准项目。该公告同样是历史启动证据，不等于当前项目和每个房地产项目仍开放。

### 5.2 护照与非公民旅行证件边界

- 官方 Department of Immigration and Passport Services FAQ 明确：只有 Vanuatu citizens 才有资格申请 Vanuatu Passport；该官方页面将 Vanuatu Passport 和 Certificate of Identity 列为两种批准的 Vanuatu travel documents。
- 官方入境要求把 Ni-Vanuatu citizen 与 non-citizen 的入境文件要求分开；non-citizen 需要其本国护照或其他有效旅行文件及适用签证条件。
- `vnb.vu` 及类似非政府/营销域名的“National Status”“Non-Citizen Travel Document”等说法未被本报告采用。官方 COC 首页明确提醒，应核对 `.gov.vu` 政府域名；因此不能把 vnb.vu 自称的机构或文件当作政府授权、国籍或公民护照证据。

### 5.3 状态与未决字段

- `legal_status`：各计划的法律框架可记录为 `LAW_ENACTED` / `REGULATED`（分维度保存）。
- `operational_status` / `application_status`：CIIP、VCP、DSP、REO 均建议 `UNKNOWN` / `NOT_VERIFIED`，不得依据历史网页直接标记 `ACTIVE`。
- `passport_issuance_status`：只能写“取得公民身份并满足护照签发条件后，向主管护照机构申请”；不能把投资、批准或非公民旅行文件等同于护照签发。
- 当前 Designated Agents、最新政府价格、尽调服务流程、每个项目是否仍获授权，以及是否暂停/撤销，需由 COC 逐项提供带日期的官方确认。

### 5.4 主要官方来源

| source_type | source / official_url | verified_at | claim | unknown / boundary | owner |
|---|---|---|---|---|---|
| OFFICIAL_CURRENT | [COC establishment](https://vancitizenship.gov.vu/index.php/about-us/establishment) | 2026-11-02 | COC 是依据 Citizenship Act [CAP 112] 设立的法定实体 | 页面未提供每个项目的当前受理状态 | Vanuatu Citizenship Office & Commission |
| OFFICIAL_CURRENT | [COC role](https://vancitizenship.gov.vu/index.php/about-us/role) | 2026-11-02 | COC 可批准、暂缓、拒绝和撤销公民身份 | 权力存在不等于具体计划当前开放 | COC |
| OFFICIAL_CURRENT | [Types of Citizenship](https://vancitizenship.gov.vu/index.php/citizenship/types-of-citizenship) | 2026-11-02 | 官方列出 CIIP、DSP、VCP、REO 类别 | 类别列出不等于当前 ACTIVE | COC |
| OFFICIAL_CURRENT | [Citizenship Act [CAP 112], consolidated 2021](https://vancitizenship.gov.vu/images/pdf/20220913191325519.pdf) | 2026-11-02（合并版 2021） | 第 13C--13F 的法律框架、家庭成员和委员会决定条款 | 需要确认后续修订是否改变当前细节 | Parliament / COC |
| OFFICIAL_CURRENT | [DSP Regulations Order No. 33 of 2019](https://vancitizenship.gov.vu/images/Order_No_33_of_2019_-_New_DSP_Regulations.pdf) | 2026-11-02（法规 2019） | DSP 依据 CAP 112 第 13E 设立 | 不是当前受理证明；VCP Order 34 需单独取得正文 | Minister / COC |
| OFFICIAL_CURRENT | [REO commencement notice](https://vancitizenship.gov.vu/index.php/news-and-updates/90-commencement-of-the-reo-program) | 2026-11-02（公告正文日期未显示；内容指 2021-07-23） | REO 依据第 13F 和 Order No. 93 of 2021 开始 | 历史启动不等于今日 ACTIVE | COC |
| OFFICIAL_CURRENT | [CIIP historical notice](https://vancitizenship.gov.vu/index.php/news-and-updates/98-vanuatu-contribution-program-vcp-vanuatu-development-support-program-dsp-ciip-suspension-removed) | 2026-11-02（页面日期未显示） | 页面称 CIIP suspension 于 2016-03-21 解除并提及 Order 93 of 2023 代理 | 不能证明 2026-11-02 当前受理 | Vanuatu Government / COC |
| OFFICIAL_CURRENT | [Immigration passport FAQ](https://immigration.gov.vu/frequently-asked-questions-2/) | 2026-11-02 | 仅公民可申请 Vanuatu Passport；Passport 与 Certificate of Identity 是官方旅行文件 | 不支持任何 vnb.vu 非公民身份/旅行文件宣传 | Department of Immigration and Passport Services |
| OFFICIAL_CURRENT | [Official COC home](https://vancitizenship.gov.vu/) | 2026-11-02 | 页面提醒官方 Vanuatu Government sites 使用 `.gov.vu`，并列出当前官网栏目 | 域名提示不是对第三方站点授权的证明 | COC |
