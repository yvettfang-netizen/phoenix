import type { BilingualText, CountryRecord, PolicyRule } from "@/lib/cbi-schema";

export type CbiLocale = "zh" | "en";

export type CbiText = {
  zh: string;
  en: string;
};

export type CbiFaq = {
  question: CbiText;
  answer: CbiText;
};

export type CbiPolicyRule = {
  sourceType: string;
  source: CbiText;
  officialUrl: string | null;
  verifiedAt: string | null;
  effectiveScope: CbiText;
  effectiveStatus: CbiText;
  owner: CbiText;
};

export type CbiCountry = {
  code: string;
  slug: string;
  flagAsset: string | null;
  name: CbiText;
  officialName: CbiText;
  programmeName: CbiText;
  region: CbiText;
  publicationStatus: string;
  sourceType: string;
  officialSource: {
    name: CbiText;
    url: string | null;
  };
  policyRules: CbiPolicyRule[];
  sourceDate: string | null;
  verifiedAt: string | null;
  effectiveScope: CbiText;
  effectiveStatus: CbiText;
  owner: CbiText;
  legalBasis: CbiText;
  programmeType: CbiText;
  investmentOptions: CbiText[];
  minimumInvestment: number | null;
  currency: string | null;
  governmentFees: CbiText;
  dueDiligenceFees: CbiText;
  familyEligibility: CbiText;
  residenceRequirement: CbiText;
  interviewRequirement: CbiText;
  sourceOfFundsRequirement: CbiText;
  processingTime: CbiText;
  dualNationalityPolicy: CbiText;
  passportValidity: CbiText;
  passportRenewal: CbiText;
  legalStatus: CbiText;
  operationalStatus: CbiText;
  applicationStatus: CbiText;
  passportIssuanceStatus: CbiText;
  officialAuthority: CbiText;
  officialApplicationUrl: string | null;
  passportType: CbiText;
  identityRelationships: CbiText[];
  acquisitionPaths: CbiText[];
  eligibility: CbiText;
  residencyPrerequisite: CbiText;
  travelAccessData: CbiText;
  nextReviewAt: string | null;
  contentStatus: string;
  dataVersion: string | null;
  travelPolicy: {
    visaFree: number | null;
    visaOnArrival: number | null;
    eta: number | null;
    evisa: number | null;
    visaRequired: number | null;
    methodology: CbiText;
    source: CbiText;
    date: string | null;
  };
  verifiedAmount: number | null;
  updatedAt: string | null;
  faq: CbiFaq[];
};

const EMPTY_TEXT: CbiText = { zh: "", en: "" };
const PENDING: CbiText = { zh: "待核实，未形成答复", en: "Pending verification; no answer has been formed." };
const PROGRAMME_LABELS: Record<string, CbiText> = {
  CITIZENSHIP_BY_INVESTMENT: { zh: "投资入籍", en: "Citizenship by investment" },
  CITIZENSHIP_BY_DONATION: { zh: "捐赠取得国籍", en: "Citizenship by donation" },
  INVESTMENT_CITIZENSHIP_MECHANISM: { zh: "投资取得国籍机制", en: "Investment citizenship mechanism" },
};
const LEGAL_LABELS: Record<string, CbiText> = {
  LAW_ENACTED: { zh: "已有法律依据", en: "Law enacted" }, REGULATED: { zh: "受监管", en: "Regulated" }, LEGAL_REVIEW: { zh: "法律复核中", en: "Legal review" }, LEGAL_UNCERTAIN: { zh: "法律状态待核实", en: "Legal status uncertain" }, REPEALED: { zh: "已废止", en: "Repealed" }, UNKNOWN: PENDING,
};
const OPERATIONAL_LABELS: Record<string, CbiText> = {
  ACTIVE: { zh: "运营中", en: "Active" }, PRE_LAUNCH: { zh: "待上线", en: "Pre-launch" }, SUSPENDED: { zh: "已暂停", en: "Suspended" }, NOT_ACCEPTING_APPLICATIONS: { zh: "暂不受理", en: "Not accepting applications" }, CLOSED: { zh: "已关闭", en: "Closed" }, UNKNOWN: PENDING,
};
const APPLICATION_LABELS: Record<string, CbiText> = { ACCEPTING: { zh: "受理状态已确认", en: "Accepting" }, NOT_ACCEPTING: { zh: "不受理", en: "Not accepting" }, NOT_VERIFIED: PENDING };
const PASSPORT_LABELS: Record<string, CbiText> = {
  CITIZEN_PASSPORT_AVAILABLE_AFTER_APPROVAL: { zh: "获批并完成条件后可签发公民护照", en: "Citizen passport available after approval" }, ISSUANCE_PENDING: { zh: "签发状态待定", en: "Issuance pending" }, NON_CITIZEN_TRAVEL_DOCUMENT: { zh: "非公民旅行证件", en: "Non-citizen travel document" }, NOT_APPLICABLE: { zh: "不适用", en: "Not applicable" }, UNKNOWN: PENDING,
};
const EFFECTIVE_LABELS: Record<string, CbiText> = { CURRENT: { zh: "当前有效", en: "Current" }, EXPIRED: { zh: "已过期", en: "Expired" }, UNKNOWN: PENDING };

function bilingual(value: BilingualText | null | undefined, fallback: CbiText = PENDING): CbiText {
  if (!value) return fallback;
  return { zh: value.zh ?? fallback.zh, en: value.en ?? fallback.en };
}

function bilingualStrict(value: BilingualText | null | undefined): CbiText {
  if (!value) return PENDING;
  return { zh: value.zh ?? PENDING.zh, en: value.en ?? PENDING.en };
}

function policyText(value: string | null | undefined): CbiText {
  return value ? { zh: value, en: value } : PENDING;
}

function enumText(value: string | null | undefined, labels: Record<string, CbiText>): CbiText {
  if (!value) return PENDING;
  return labels[value] ?? { zh: value, en: value };
}

function statusAnswer(value: string | null | undefined, labels: Record<string, CbiText>): CbiText {
  return !value || value === "UNKNOWN" || value === "NOT_VERIFIED" || value === "LEGAL_UNCERTAIN" ? PENDING : enumText(value, labels);
}

function list(values: readonly BilingualText[] | null | undefined): CbiText[] {
  return values?.map((value) => bilingual(value)).filter((value) => value.zh || value.en) ?? [];
}

function policyRules(values: readonly PolicyRule[]): CbiPolicyRule[] {
  return values.map((value) => ({
    sourceType: value.source_type,
    source: policyText(value.source),
    officialUrl: value.official_url,
    verifiedAt: value.verified_at,
    effectiveScope: policyText(value.effective_scope),
    effectiveStatus: enumText(value.effective_status, EFFECTIVE_LABELS),
    owner: policyText(value.owner),
  }));
}

function faqFor(record: CountryRecord): CbiFaq[] {
  const combined = (zh: string, en: string, value: CbiText) => value === PENDING ? PENDING : { zh: `${zh}${value.zh}`, en: `${en}${value.en}` };
  return [
    { question: { zh: "是否依法设有 CBI 机制？", en: "Is there a lawful CBI mechanism?" }, answer: statusAnswer(record.legal_status, LEGAL_LABELS) },
    { question: { zh: "法律依据是什么？", en: "What is the legal basis?" }, answer: bilingual(record.legal_basis) },
    { question: { zh: "当前是否受理申请？", en: "Are applications currently accepted?" }, answer: record.application_status === "NOT_VERIFIED" || record.operational_status === "UNKNOWN" ? PENDING : combined("申请状态：", "Application status: ", statusAnswer(record.application_status, APPLICATION_LABELS)) },
    { question: { zh: "有哪些投资方式？", en: "What investment routes are listed?" }, answer: record.investment_options?.length ? { zh: record.investment_options.map((item) => bilingual(item).zh).join("、"), en: record.investment_options.map((item) => bilingual(item).en).join(", ") } : PENDING },
    { question: { zh: "家庭成员如何处理？", en: "How are family members treated?" }, answer: bilingual(record.family_eligibility) },
    { question: { zh: "居住要求是什么？", en: "What are the residence requirements?" }, answer: bilingual(record.residence_requirement) },
    { question: { zh: "尽职调查如何处理？", en: "How is due diligence handled?" }, answer: bilingual(record.due_diligence_fees) },
    { question: { zh: "国籍及护照流程如何确认？", en: "How are nationality and passport steps confirmed?" }, answer: combined("护照签发状态：", "Passport issuance status: ", statusAnswer(record.passport_issuance_status, PASSPORT_LABELS)) },
    { question: { zh: "是否允许双重国籍？", en: "Is dual nationality allowed?" }, answer: bilingual(record.dual_nationality_policy) },
    { question: { zh: "最近有什么变化？", en: "What changed recently?" }, answer: record.last_verified_at ? { zh: `最近核实：${record.last_verified_at}；如需确认变化，请以官方来源当前内容为准。`, en: `Last verified: ${record.last_verified_at}; confirm any change against the current official source.` } : PENDING },
  ];
}

/** Strict mapper for the single data-worker CountryRecord contract. It does
 * not infer fields from country code, programme name, or source URL. */
export function normalizeCbiCountry(record: CountryRecord): CbiCountry {
  const rules = policyRules(record.official_sources);
  const firstRule = rules[0];
  const travel = record.travel_access_data;
  return {
    code: record.country_code,
    slug: record.country_id,
    flagAsset: record.flag_asset,
    name: { zh: record.country_name_zh, en: record.country_name_en },
    officialName: { zh: record.official_name, en: record.official_name },
    programmeName: bilingualStrict(record.programme_name),
    region: EMPTY_TEXT,
    publicationStatus: record.content_status,
    sourceType: firstRule?.sourceType ?? "UNKNOWN",
    officialSource: { name: firstRule?.source ?? PENDING, url: firstRule?.officialUrl ?? null },
    policyRules: rules,
    sourceDate: record.last_verified_at,
    verifiedAt: record.last_verified_at,
    effectiveScope: firstRule?.effectiveScope ?? PENDING,
    effectiveStatus: firstRule?.effectiveStatus ?? PENDING,
    owner: firstRule?.owner ?? PENDING,
    legalBasis: bilingual(record.legal_basis),
    programmeType: enumText(record.programme_type, PROGRAMME_LABELS),
    investmentOptions: list(record.investment_options),
    minimumInvestment: record.minimum_investment,
    currency: record.currency,
    governmentFees: bilingual(record.government_fees),
    dueDiligenceFees: bilingual(record.due_diligence_fees),
    familyEligibility: bilingual(record.family_eligibility),
    residenceRequirement: bilingual(record.residence_requirement),
    interviewRequirement: bilingual(record.interview_requirement),
    sourceOfFundsRequirement: bilingual(record.source_of_funds_requirement),
    processingTime: bilingual(record.processing_time),
    dualNationalityPolicy: bilingual(record.dual_nationality_policy),
    passportValidity: bilingual(record.passport_validity),
    passportRenewal: bilingual(record.passport_renewal),
    legalStatus: enumText(record.legal_status, LEGAL_LABELS),
    operationalStatus: enumText(record.operational_status, OPERATIONAL_LABELS),
    applicationStatus: enumText(record.application_status, APPLICATION_LABELS),
    passportIssuanceStatus: enumText(record.passport_issuance_status, PASSPORT_LABELS),
    officialAuthority: bilingual(record.official_authority),
    officialApplicationUrl: null,
    passportType: PENDING,
    identityRelationships: [],
    acquisitionPaths: [],
    eligibility: PENDING,
    residencyPrerequisite: bilingual(record.residence_requirement),
    travelAccessData: PENDING,
    nextReviewAt: record.next_review_at,
    contentStatus: record.content_status,
    dataVersion: record.data_version,
    travelPolicy: {
      visaFree: travel?.visa_free_count ?? null,
      visaOnArrival: travel?.visa_on_arrival_count ?? null,
      // An electronic visa is not an electronic travel authorisation.
      // The current import contract has no separately verified ETA count.
      eta: null,
      evisa: travel?.evisa_count ?? null,
      visaRequired: null,
      methodology: bilingual(travel?.statistics_method),
      source: bilingual(travel?.source_name),
      date: travel?.statistics_date ?? null,
    },
    verifiedAmount: record.minimum_investment,
    updatedAt: record.last_verified_at,
    faq: faqFor(record),
  };
}

export function normalizeCbiCountries(value: readonly CountryRecord[]): CbiCountry[] {
  return value.map(normalizeCbiCountry);
}

export function localizedText(value: CbiText, locale: CbiLocale): string {
  return value[locale] || value[locale === "zh" ? "en" : "zh"] || PENDING[locale];
}

export function countryFlag(code: string): string {
  const normalized = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return "◎";
  return [...normalized].map((letter) => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65)).join("");
}

export function displayDate(value: string | null, locale: CbiLocale): string {
  if (!value) return localizedText(PENDING, locale);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

export function displayNumber(value: number | null, locale: CbiLocale): string {
  if (value === null) return localizedText(PENDING, locale);
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-GB").format(value);
}
