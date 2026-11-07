import { verifiedField, verifiedMinimum } from "@/lib/cbi-comparison-engine";
import type {
  BilingualText,
  CbiFamilyCategory,
  CbiPlanningDetailField,
  CountryRecord,
  PolicyRule,
} from "@/lib/cbi-schema";

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

export type CbiPlanningDetailsView = Record<CbiPlanningDetailField, CbiText>;

export type CbiCountry = {
  /** The canonical record object. The view below is a projection, never a second master. */
  raw: CountryRecord;
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
    passportClass: string | null;
    restrictions: CbiText;
    methodology: CbiText;
    source: CbiText;
    sourceUrl: string | null;
    date: string | null;
  };
  planningDetails: CbiPlanningDetailsView;
  familyCategories: CbiText[];
  fieldSources: Record<string, CbiPolicyRule>;
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
const ALWAYS_GUARDED_FIELDS = new Set<string>([
  "minimum_investment",
  "currency",
  "government_fees",
  "due_diligence_fees",
  "family_supplement_fees",
  "passport_fees",
  "professional_fees",
  "third_party_fees",
]);

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

function canExpose(record: CountryRecord, field: string): boolean {
  return !ALWAYS_GUARDED_FIELDS.has(field) && record.content_status !== "PUBLISHED" ? true : verifiedField(record, field);
}

function visibleText(record: CountryRecord, field: string, value: BilingualText | null | undefined): CbiText {
  return canExpose(record, field) ? bilingual(value) : PENDING;
}

function visibleList(record: CountryRecord, field: string, value: readonly BilingualText[] | null | undefined): CbiText[] {
  return canExpose(record, field) ? list(value) : [];
}

function visibleEnum(record: CountryRecord, field: string, value: string | null | undefined, labels: Record<string, CbiText>): CbiText {
  return canExpose(record, field) ? enumText(value, labels) : PENDING;
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

function fieldSourceMap(values: Record<string, PolicyRule> | undefined): Record<string, CbiPolicyRule> {
  if (!values) return {};
  return Object.fromEntries(Object.entries(values).map(([key, value]) => {
    const normalizedKey = key.startsWith("planning_details.") ? key.slice("planning_details.".length) : key;
    return [normalizedKey, policyRules([value])[0]] as const;
  }).filter((entry): entry is [string, CbiPolicyRule] => Boolean(entry[1])));
}

const FAMILY_CATEGORY_LABELS: Record<CbiFamilyCategory, CbiText> = {
  INDIVIDUAL: { zh: "主申请人", en: "Principal applicant" },
  COUPLE: { zh: "配偶／伴侣", en: "Spouse / partner" },
  MINOR_CHILDREN: { zh: "未成年子女", en: "Minor children" },
  ADULT_CHILDREN: { zh: "成年子女", en: "Adult children" },
  PARENTS: { zh: "父母", en: "Parents" },
};

function planningDetails(record: CountryRecord): CbiPlanningDetailsView {
  const output = {} as CbiPlanningDetailsView;
  const source = record.planning_details;
  for (const key of [
    "country_overview",
    "nationality_system",
    "investment_term",
    "eligibility",
    "family_supplement_fees",
    "passport_fees",
    "professional_fees",
    "third_party_fees",
    "principal_applicant",
    "spouse",
    "minor_children",
    "adult_children",
    "parents",
    "other_dependants",
    "age_dependency",
    "relationship_evidence",
    "landing_requirement",
    "biometrics_requirement",
    "criminal_record_requirement",
    "due_diligence_requirement",
    "application_process",
    "nationality_acquisition",
    "nationality_approval",
    "nationality_loss",
    "processing_time_observed",
    "policy_updates",
    "travel_restrictions",
  ] as CbiPlanningDetailField[]) {
    output[key] = canExpose(record, key) ? bilingual(source?.[key]) : PENDING;
  }
  return output;
}

function familyCategories(record: CountryRecord): CbiText[] {
  return canExpose(record, "family_categories") ? record.planning_details?.family_categories?.map((value) => FAMILY_CATEGORY_LABELS[value] ?? policyText(value)) ?? [] : [];
}

function faqFor(record: CountryRecord): CbiFaq[] {
  const combined = (zh: string, en: string, value: CbiText) => value === PENDING ? PENDING : { zh: `${zh}${value.zh}`, en: `${en}${value.en}` };
  const legalStatus = visibleEnum(record, "legal_status", record.legal_status, LEGAL_LABELS);
  const applicationStatus = visibleEnum(record, "application_status", record.application_status, APPLICATION_LABELS);
  const operationalStatus = visibleEnum(record, "operational_status", record.operational_status, OPERATIONAL_LABELS);
  return [
    { question: { zh: "是否依法设有 CBI 机制？", en: "Is there a lawful CBI mechanism?" }, answer: legalStatus },
    { question: { zh: "法律依据是什么？", en: "What is the legal basis?" }, answer: visibleText(record, "legal_basis", record.legal_basis) },
    { question: { zh: "当前是否受理申请？", en: "Are applications currently accepted?" }, answer: record.application_status === "NOT_VERIFIED" || record.operational_status === "UNKNOWN" ? PENDING : combined("申请状态：", "Application status: ", applicationStatus === PENDING ? PENDING : operationalStatus === PENDING ? PENDING : applicationStatus) },
    { question: { zh: "有哪些投资方式？", en: "What investment routes are listed?" }, answer: visibleList(record, "investment_options", record.investment_options).length ? { zh: visibleList(record, "investment_options", record.investment_options).map((item) => item.zh).join("、"), en: visibleList(record, "investment_options", record.investment_options).map((item) => item.en).join(", ") } : PENDING },
    { question: { zh: "家庭成员如何处理？", en: "How are family members treated?" }, answer: visibleText(record, "family_eligibility", record.family_eligibility) },
    { question: { zh: "居住要求是什么？", en: "What are the residence requirements?" }, answer: visibleText(record, "residence_requirement", record.residence_requirement) },
    { question: { zh: "尽职调查如何处理？", en: "How is due diligence handled?" }, answer: visibleText(record, "due_diligence_requirement", record.planning_details?.due_diligence_requirement) },
    { question: { zh: "国籍及护照流程如何确认？", en: "How are nationality and passport steps confirmed?" }, answer: combined("护照签发状态：", "Passport issuance status: ", visibleEnum(record, "passport_issuance_status", record.passport_issuance_status, PASSPORT_LABELS)) },
    { question: { zh: "是否允许双重国籍？", en: "Is dual nationality allowed?" }, answer: visibleText(record, "dual_nationality_policy", record.dual_nationality_policy) },
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
    raw: record,
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
    legalBasis: visibleText(record, "legal_basis", record.legal_basis),
    programmeType: visibleEnum(record, "programme_type", record.programme_type, PROGRAMME_LABELS),
    investmentOptions: visibleList(record, "investment_options", record.investment_options),
    minimumInvestment: verifiedMinimum(record),
    currency: canExpose(record, "currency") ? record.currency : null,
    governmentFees: visibleText(record, "government_fees", record.government_fees),
    dueDiligenceFees: visibleText(record, "due_diligence_fees", record.due_diligence_fees),
    familyEligibility: visibleText(record, "family_eligibility", record.family_eligibility),
    residenceRequirement: visibleText(record, "residence_requirement", record.residence_requirement),
    interviewRequirement: visibleText(record, "interview_requirement", record.interview_requirement),
    sourceOfFundsRequirement: visibleText(record, "source_of_funds_requirement", record.source_of_funds_requirement),
    processingTime: visibleText(record, "processing_time", record.processing_time),
    dualNationalityPolicy: visibleText(record, "dual_nationality_policy", record.dual_nationality_policy),
    passportValidity: visibleText(record, "passport_validity", record.passport_validity),
    passportRenewal: visibleText(record, "passport_renewal", record.passport_renewal),
    legalStatus: visibleEnum(record, "legal_status", record.legal_status, LEGAL_LABELS),
    operationalStatus: visibleEnum(record, "operational_status", record.operational_status, OPERATIONAL_LABELS),
    applicationStatus: visibleEnum(record, "application_status", record.application_status, APPLICATION_LABELS),
    passportIssuanceStatus: visibleEnum(record, "passport_issuance_status", record.passport_issuance_status, PASSPORT_LABELS),
    officialAuthority: visibleText(record, "official_authority", record.official_authority),
    officialApplicationUrl: null,
    passportType: PENDING,
    identityRelationships: [],
    acquisitionPaths: [],
    eligibility: PENDING,
    residencyPrerequisite: visibleText(record, "residence_requirement", record.residence_requirement),
    travelAccessData: canExpose(record, "travel_access_data") ? bilingual(travel?.source_name) : PENDING,
    nextReviewAt: record.next_review_at,
    contentStatus: record.content_status,
    dataVersion: record.data_version,
    travelPolicy: {
      visaFree: canExpose(record, "travel_access_data") ? travel?.visa_free_count ?? null : null,
      visaOnArrival: canExpose(record, "travel_access_data") ? travel?.visa_on_arrival_count ?? null : null,
      eta: canExpose(record, "travel_access_data") ? travel?.eta_count ?? null : null,
      evisa: canExpose(record, "travel_access_data") ? travel?.evisa_count ?? null : null,
      visaRequired: canExpose(record, "travel_access_data") ? travel?.visa_required_count ?? null : null,
      passportClass: canExpose(record, "travel_access_data") ? travel?.passport_class ?? null : null,
      restrictions: canExpose(record, "travel_access_data") ? bilingual(travel?.restrictions) : PENDING,
      methodology: canExpose(record, "travel_access_data") ? bilingual(travel?.statistics_method) : PENDING,
      source: canExpose(record, "travel_access_data") ? bilingual(travel?.source_name) : PENDING,
      sourceUrl: canExpose(record, "travel_access_data") ? travel?.source_url ?? null : null,
      date: canExpose(record, "travel_access_data") ? travel?.statistics_date ?? null : null,
    },
    planningDetails: planningDetails(record),
    familyCategories: familyCategories(record),
    fieldSources: fieldSourceMap(record.field_sources),
    verifiedAmount: verifiedMinimum(record),
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
