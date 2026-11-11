# Identity V3.1｜四国官方资料核验报告

**核验截止日：** 2026-11-02
**范围：** Saint Kitts and Nevis、Argentina、Vanuatu、São Tomé and Príncipe
**用途：** 为 Draft / IMPORT_REVIEW 阶段提供可追溯的官方来源清单与事实边界。
**本报告不构成法律意见，不发布国家资料，不把任何项目标记为 `ACTIVE`。**

## 1. 核验方法与状态规则

- 按 `Official Current > Approved Phoenix Baseline > Internal Experience > Model Inference` 分层。
- 本轮仅把政府法律文本、主管机构或政府官方站点作为“官方”证据；代理商、项目营销站、新闻转载和第三方数据库不用于证明项目开放或可申请。
- 已使用 agent-reach 网页检索路由；本环境没有可用的 `mcporter` / agent-reach CLI，因此以受控网页检索作为 fallback，并打开来源正文核对页面内容。
- `verified_at` 统一记录为 `2026-11-02`；页面没有发布日期时明确记为“页面日期未显示”，不推断其时效。
- “法律已设立”“主管机构有项目页面”“历史上曾开始”均不等于今日仍接受申请。未同时核实法律、实施细则和当前实际受理状态的项目，不得产生确定性 `ACTIVE` 结论。

## 2. 核验摘要

| 国家 | 官方事实可确认范围 | 当前申请/运行状态 | 本轮安全结论 |
|---|---|---|---|
| Saint Kitts and Nevis | CIU 官方站点及 2024 法规确认 CBI 法律框架、四类投资选项、尽调与申请流程 | 官方站点展示现行申请流程；本报告不写入 `ACTIVE` | 可作为官方规则候选；金额/费用/项目清单仍需逐字段核对 |
| Argentina | DNU 366/2025、Decreto 524/2025、2026 官方公告确认法律机制和拟定程序 | 2026-10-02 公告说预计在 2026 Q4 接收申请，不等于 2026-11-02 已开放；官方受理入口未核实 | `PRE_LAUNCH` / `UNKNOWN` 候选；不得显示 ACTIVE |
| Vanuatu | Citizenship Act [CAP 112] 及官方 COC 站点确认 CIIP、VCP、DSP、REO 的法律类别；REO 有 2021 启动公告 | 多数页面为历史通知；当前接受申请、代理授权和每个计划有效性未逐项核实 | 各计划 `UNKNOWN` / `NOT_VERIFIED`；不得把历史公告当今日 ACTIVE |
| São Tomé and Príncipe | 官方国家门户可访问；目标 Decree-Law No. 7/2025 的官方法律文本/官方受理入口本轮未能独立取得 | 未核实法律文本、实施机构、实际受理和护照签发程序 | `LEGAL_UNCERTAIN` / `UNKNOWN`；不得发布或显示为开放项目 |

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

## 4. Argentina

### 4.1 已核实事实

1. **DNU 366/2025。** 官方文本显示，2025-05-28 签发、2025-05-29 发布；其第 37--42 条修改 Citizenship Law No. 346：相关投资可以成为无论居住时长的归化路径，经济部负责界定“relevant investment”，并设立 Agencia de Programas de Ciudadanía por Inversión。
2. **Decreto 524/2025。** 官方 Boletín Oficial 文本显示 2025-07-30 签发、2025-07-31 发布（No. 35718 / Aviso 329061）。它规定 Agency 评估投资、调用安全/金融/身份等机构意见、向 Dirección Nacional de Migraciones 提出批准或拒绝建议，最终由 Migraciones 以有理由的行政行为决定；第 6 条仍要求 Agency 制定补充/说明规则。
3. **2026 官方公告。** 总统府/政府官方公告日期为 2026-10-02，使用“将在 2026 年第四季度开始接收申请”的未来时态，并介绍拟定机制。该公告是政策/实施计划，不是截至 2026-11-02 已开通受理入口或已实际受理案件的证据。
4. **机构存在。** Boletín Oficial 2026-04-28 页面列出 Decreto 285/2026 任命 Agencia 的执行负责人；这证明组织设置有后续动作，但不证明申请窗口开放。
5. **普通归化必须分开。** 2025-10-03 Migraciones 的官方数字化页面针对有居住条件的普通归化（Law 346 Article 2(1)），不能拿来证明投资入籍项目已开放。

### 4.2 状态与未决字段

- `legal_status`：`LAW_ENACTED`（DNU 366/2025 + Decreto 524/2025 的法律机制已在官方文本中出现）。
- `operational_status`：建议 `PRE_LAUNCH` 或 `UNKNOWN`；不得直接标记 `ACTIVE`。
- `application_status`：`NOT_VERIFIED`。截至核验日，官方公告只承诺 2026 Q4 进入接收申请阶段；本轮没有找到可验证的官方投资入籍申请入口、实时受理公告或已受理确认。
- **司法状态：** 未找到可作为本报告依据的官方法院最终裁判/官方司法公告来确认该投资入籍机制不存在司法争议或已经终局有效；因此 `judicial_review_status` 应保留 `UNKNOWN`，不要用媒体或代理商说法替代。
- 公告中的投资方式、家庭金额、费用等仅是官方公告的计划性说明；本轮不把它们写入产品商业数据或对外报价。

### 4.3 主要官方来源

| source_type | source / official_url | verified_at | claim | unknown / boundary | owner |
|---|---|---|---|---|---|
| OFFICIAL_CURRENT | [DNU 366/2025 official text](https://www.argentina.gob.ar/normativa/nacional/decreto-366-2025-413297/texto) | 2026-11-02（发布日期 2025-05-29） | 修改 Law 346，建立投资入籍法律机制及 Agency | 不代表项目已实际受理 | Poder Ejecutivo Nacional / Argentina.gob.ar |
| OFFICIAL_CURRENT | [Decreto 524/2025 official Boletín](https://www.boletinoficial.gov.ar/detalleAviso/primera/329061/20250731) | 2026-11-02（发布日期 2025-07-31） | 规定评估、跨机构核查、Agency 建议、Migraciones 最终决定 | 仍需补充/说明规则及实时申请入口 | Boletín Oficial / Ministry of Economy / DNM |
| OFFICIAL_CURRENT | [Official announcement, 2026-10-02](https://www.argentina.gob.ar/noticias/luis-caputo-anuncio-la-puesta-en-marcha-del-programa-de-ciudadania-por-inversion-de) | 2026-11-02 | 政府宣布预计 2026 Q4 接收申请 | “预计/将在”不等于截至核验日已开放或已受理 | Presidencia de la Nación |
| OFFICIAL_CURRENT | [Boletín Oficial 2026-04-28](https://www.boletinoficial.gov.ar/seccion/primera/20260428) | 2026-11-02 | 列出 Decreto 285/2026 任命 Agency 执行负责人 | 机构任命不等于申请窗口开放 | Boletín Oficial |
| OFFICIAL_CURRENT | [Law 346 updated text](https://www.argentina.gob.ar/normativa/nacional/norma-48854/actualizacion) | 2026-11-02 | 当前法条保留 Article 2(2) “relevant investment” 机制 | 需结合实施细则和个案审查，不得自动作出资格/批准结论 | Argentina.gob.ar |

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

## 6. São Tomé and Príncipe

### 6.1 官方来源结果

- `https://gov.st/` 是可访问的 São Tomé and Príncipe 官方 Portal do Cidadão；但截至核验日，其公开更新/服务页面没有提供目标 Decree-Law No. 7/2025 的法律正文、UCID 官方申请入口或当前接收申请公告。
- 官方 `DGRN` legislation page（`https://dgrn.gov.st/Legislacao.php`）可见较早期法律清单，但本次检索未从该主管机关页面取得 Decree-Law No. 7/2025 的正文或实施公告。
- 本轮搜索到的 `boe.incv.cv/Bulletins/Download/13504` 是**佛得角（Cabo Verde）**官方公报的 Decreto-Lei n.º 7/2025（2025-03-20，政府组织法），不是 São Tomé and Príncipe；已明确排除。
- 同编号的葡萄牙、东帝汶或其他葡语国家法律也不能替代 São Tomé and Príncipe 的官方公报。

### 6.2 非官方副本与安全结论

搜索结果出现 `rstp.st`、`imidaily.com`、代理/营销站以及 Portugal Global 的转述，均不是 São Tomé and Príncipe 主管机关的官方法律发布页；它们只能说明“存在一个被转述为 Decree-Law No. 07/2025、标题为 Regulamentação da Nacionalidade por Investimento ou Doação 的文件”，不能作为本产品把项目标记为现行/开放/可申请的证据。

因此本轮不确认以下内容：

- 目标法令的官方全文及是否仍有效；
- 主管机关/UCID 是否已正式设立并接受申请；
- 投资/捐赠方式、金额、家庭成员范围、尽调和费用；
- 实际申请入口、处理时间、审批或护照签发流程；
- 任何司法审查、暂停或撤销情况。

建议暂存：`legal_status = LEGAL_UNCERTAIN` 或 `UNKNOWN`，`operational_status = UNKNOWN`，`application_status = NOT_VERIFIED`，`passport_issuance_status = UNKNOWN`，直到取得 São Tomé and Príncipe 官方 Diário da República 或主管机关的可验证正文与当前公告。

### 6.3 主要官方来源与排除项

| source_type | source / official_url | verified_at | claim | unknown / boundary | owner |
|---|---|---|---|---|---|
| OFFICIAL_CURRENT | [Portal do Cidadão](https://gov.st/) | 2026-11-02 | 证明官方政府门户可访问 | 未提供目标法令正文或当前 CBI 受理证据 | Governo de São Tomé e Príncipe |
| OFFICIAL_CURRENT | [DGRN legislation page](https://dgrn.gov.st/Legislacao.php) | 2026-11-02 | 主管登记/公证机关公开法律清单 | 本轮未检索到目标 Decree-Law No. 7/2025 正文 | Direcção Geral dos Registos e do Notariado |
| EXCLUDED_NON_OFFICIAL | [Portugal Global summary](https://portugalglobal.pt/pt/noticias/2025/agosto/legislacao-sao-tome-e-principe-nacionalidade/) | 2026-11-02 | 转述该法令名称与日期 | Portugal Global 不是 São Tomé and Príncipe 法定发布机关；不能单独证明法律/开放状态 | 不用于产品规则 |
| EXCLUDED_NON_OFFICIAL | [Rádio Somos Todos Primos copy](https://rstp.st/wp-content/uploads/2025/08/STP-CBI-Act-01082025-1.pdf) | 2026-11-02 | 搜索到的 Diário 文本副本 | 非官方托管副本，需回到 STP 官方公报确认 | 不用于产品规则 |
| EXCLUDED_WRONG_JURISDICTION | [Cabo Verde official Boletim PDF](https://boe.incv.cv/Bulletins/Download/13504) | 2026-11-02 | 同编号 7/2025，但内容是 Cabo Verde 政府组织法 | 不是 São Tomé and Príncipe；严禁混入 | 不用于产品规则 |

## 7. 发布前必须补齐的证据

1. 四国分别取得带日期的主管机关“当前受理/暂停/关闭”确认；只要缺一项，就保持 `UNKNOWN` / `NOT_VERIFIED`。
2. Argentina：取得官方投资入籍申请入口或明确的已开始受理通知，并核对实施补充规则；司法状态仍需官方法院/公报证据。
3. Vanuatu：逐一取得 DSP、VCP、CIIP、REO 最新法规/政府通知、Designation/Cancelled Agents、当前费用和项目授权；核对是否存在后续修订。
4. São Tomé and Príncipe：取得官方 Diário da República No. 33（2025-08-01）中 Decree-Law No. 07/2025 的官方托管全文，以及 UCID/主管机关当前入口和执行通知；不能用代理商或镜像 PDF 替代。
5. 所有字段必须绑定 `source_type`, `source`, `official_url`（OFFICIAL 时必填）, `verified_at`, `effective_scope`, `effective_status`, `owner`；过期或未核验规则不得触发确定性结论。

## 8. 交付边界

- 本轮只新增本核验报告；未修改程序数据、状态、页面、数据库或迁移。
- 未使用任何批准概率、成功率、保证或法律结论。
- 未把居留、国籍、公民身份、护照、旅行证件或签证混为同一概念。
- 本文件只供父代理复核并决定是否进入 `IMPORT_REVIEW`；不代表 Founder/Legal 的最终批准。
