import type { CountryRecord, PolicyRule } from "./cbi-schema";

const text = (zh: string, en: string) => ({ zh, en });
const source = (name: string, url: string, scope: string): PolicyRule => ({
  source_type: "OFFICIAL", source: name, official_url: url,
  verified_at: "2026-11-02", effective_scope: scope, effective_status: "CURRENT",
  owner: "Phoenix Identity editorial review",
});

const blank = {
  flag_asset: null, minimum_investment: null, currency: null,
  government_fees: null, due_diligence_fees: null, family_eligibility: null,
  residence_requirement: null, interview_requirement: null,
  source_of_funds_requirement: null, processing_time: null,
  dual_nationality_policy: null, passport_validity: null, passport_renewal: null,
  travel_access_data: null, legal_status: "UNKNOWN", operational_status: "UNKNOWN",
  application_status: "NOT_VERIFIED", passport_issuance_status: "UNKNOWN",
  last_verified_at: "2026-11-02", next_review_at: "2026-11-09",
  content_status: "IMPORT_REVIEW", data_version: "identity-cbi-review-20261102",
} as const;

/** Editorial review records, never an assertion that applications are open. */
export const cbiCountries: readonly CountryRecord[] = [
  {
    ...blank, country_id: "saint-kitts-and-nevis", country_code: "KN",
    country_name_zh: "圣基茨和尼维斯", country_name_en: "Saint Kitts and Nevis",
    official_name: "Saint Kitts and Nevis", programme_id: "kn-cbi",
    programme_name: text("投资入籍计划", "Citizenship by Investment Programme"),
    programme_type: "CITIZENSHIP_BY_INVESTMENT",
    legal_basis: text("Citizenship by Investment Act 及现行实施法规，法律沿革待逐项复核。", "Citizenship by Investment Act and implementing regulations; current legal instruments require individual review."),
    investment_options: [
      text("可持续岛国贡献（SISC）", "Sustainable Island State Contribution"),
      text("公共利益选项", "Public Benefit Option"),
      text("私人房地产投资", "Private Real Estate Investment"),
      text("开发商房地产投资", "Developer’s Real Estate Investment"),
    ],
    official_authority: text("投资入籍部门（CIU）", "Citizenship Unit (CIU)"),
    official_sources: [source("Citizenship Unit — Investment Options", "https://ciu.gov.kn/cbi-options/", "Four named investment options only; fees, admission and passport issuance are not verified by this record.")],
  },
  {
    ...blank, country_id: "argentina", country_code: "AR",
    country_name_zh: "阿根廷", country_name_en: "Argentina", official_name: "Argentina",
    programme_id: "ar-investment-citizenship",
    programme_name: text("投资取得国籍机制（实施状态待确认）", "Investment citizenship mechanism — implementation pending verification"),
    programme_type: "INVESTMENT_CITIZENSHIP_MECHANISM",
    legal_basis: text("Law 346、DNU 366/2025、Decree 524/2025；现行效力、细则与司法进展须复核。", "Law 346, DNU 366/2025 and Decree 524/2025; current effect, implementing rules and judicial developments require review."),
    investment_options: null, operational_status: "PRE_LAUNCH",
    official_authority: text("经济部／投资入籍项目机构及移民部门，权限须按现行规定复核。", "Ministry of Economy / investment citizenship agency and migration authority; current responsibilities require verification."),
    official_sources: [source("Ministry of Economy — Announcement, 2 October 2026", "https://www.argentina.gob.ar/noticias/luis-caputo-anuncio-la-puesta-en-marcha-del-programa-de-ciudadania-por-inversion-de", "Announcement describes planned receipt during Q4 2026; does not verify present intake, final legal amounts or judicial status.")],
  },
  {
    ...blank, country_id: "vanuatu", country_code: "VU",
    country_name_zh: "瓦努阿图", country_name_en: "Vanuatu", official_name: "Vanuatu",
    programme_id: "vu-citizenship-programmes",
    programme_name: text("投资入籍计划资料核验", "Investment citizenship programmes under review"),
    programme_type: "CITIZENSHIP_BY_INVESTMENT",
    legal_basis: text("Citizenship Act [CAP 112] 及适用修订法规；逐计划核验。", "Citizenship Act [CAP 112] and applicable amendments; programme-specific verification required."),
    investment_options: [
      text("发展支持计划（DSP，状态待核实）", "Development Support Program (DSP; status unverified)"),
      text("贡献计划（VCP，状态待核实）", "Vanuatu Contribution Program (VCP; status unverified)"),
      text("资本投资移民计划（CIIP，状态待核实）", "Capital Investment Immigration Plan (CIIP; status unverified)"),
      text("房地产选项（REO，状态待核实）", "Real Estate Option Program (REO; status unverified)"),
    ],
    official_authority: text("瓦努阿图公民事务办公室与委员会", "Vanuatu Citizenship Office and Commission"),
    official_sources: [source("Vanuatu Citizenship Office — News and Updates", "https://vancitizenship.gov.vu/index.php/news-and-updates", "Programme names and due-diligence notices only; each current programme and admission channel requires independent verification. Non-citizen documents are excluded.")],
  },
  {
    ...blank, country_id: "sao-tome-and-principe", country_code: "ST",
    country_name_zh: "圣多美和普林西比", country_name_en: "São Tomé and Príncipe",
    official_name: "São Tomé and Príncipe", programme_id: "st-citizenship-investment-donation",
    programme_name: text("投资或捐赠取得国籍（待核验）", "Nationality by investment or donation — unverified"),
    programme_type: "CITIZENSHIP_BY_DONATION",
    legal_basis: text("Founder 提供的 Decree-Law No. 7/2025，正式法律文本及现行适用范围待核验。", "Founder-provided reference to Decree-Law No. 7/2025; official legal text and current applicability require verification."),
    investment_options: null, official_authority: null, official_sources: [],
    last_verified_at: null, next_review_at: null,
  },
];

export function getCbiCountry(slug: string): CountryRecord | undefined {
  return cbiCountries.find(country => country.country_id === slug);
}

export function getCbiPreviewCountries(): readonly CountryRecord[] { return cbiCountries; }

/** No record is publicly released until an authenticated approval adapter is integrated. */
export function getPublishedCbiCountries(): readonly CountryRecord[] { return []; }

export function getVisibleCbiCountries(): readonly CountryRecord[] {
  return process.env.IDENTITY_CBI_REVIEW_PREVIEW === "1" ? getCbiPreviewCountries() : getPublishedCbiCountries();
}
