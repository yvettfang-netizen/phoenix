# argentina — independent source verification

Task: PHOENIX-IDENTITY-V31-CBI-DATABASE-20261102

Verified: 2026-11-02. Editorial review only; no public release or legal opinion. Missing facts remain NOT_VERIFIED. See sources-and-verification.md for the shared method and release requirements.

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
