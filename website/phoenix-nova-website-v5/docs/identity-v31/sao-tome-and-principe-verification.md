# sao-tome-and-principe — independent source verification

Task: PHOENIX-IDENTITY-V31-CBI-DATABASE-20261102

Verified: 2026-11-02. Editorial review only; no public release or legal opinion. Missing facts remain NOT_VERIFIED. See sources-and-verification.md for the shared method and release requirements.

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
