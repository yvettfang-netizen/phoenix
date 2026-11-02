import {
  CBI_ALLOWED_COUNTRY_CODES, isStrictIsoDate, officialHostsFor, validateCountryRecord,
  type CountryRecord, type PolicyRule,
// @ts-expect-error Explicit extension is required by the standalone TypeScript test loader.
} from "./cbi-schema.ts";

export type ComparisonLocale = "zh" | "en";
export const COMPARISON_NOTICE = {
  zh: "本报告为公开资料整理及初步规划参考，不构成法律、税务、投资或移民申请意见。实际资格、投资条件及国籍批准由相关国家主管机关决定。",
  en: "This report organises public information for preliminary planning only. It is not legal, tax, investment or immigration application advice. Actual eligibility, investment conditions and citizenship approval are determined by the competent national authorities.",
};
const todayIso = () => new Date().toISOString().slice(0, 10);
const pending = (locale: ComparisonLocale) => locale === "zh" ? "待核实" : "Pending verification";
const text = (zh: string, en: string, locale: ComparisonLocale) => locale === "zh" ? zh : en;

function currentSource(record: CountryRecord, source: PolicyRule | undefined, today: string): boolean {
  if (!source || source.source_type !== "OFFICIAL" || source.effective_status !== "CURRENT" || typeof source.source !== "string" || !source.source.trim() || typeof source.owner !== "string" || !source.owner.trim() || typeof source.effective_scope !== "string" || !source.effective_scope.trim()) return false;
  if (!isStrictIsoDate(source.verified_at) || source.verified_at > today || !isStrictIsoDate(record.next_review_at) || record.next_review_at < today) return false;
  try {
    const url = new URL(source.official_url ?? "");
    return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") && officialHostsFor(record.country_code).some(host => url.hostname === host || url.hostname.endsWith("." + host));
  } catch { return false; }
}

/** A record-level official URL never verifies a particular amount or condition. */
export function verifiedField(record: CountryRecord, field: string, today = todayIso()): boolean {
  const direct = record.field_sources?.[field];
  const scoped = record.field_sources?.[`planning_details.${field}`];
  const ruleKeys = ["source_type", "source", "official_url", "verified_at", "effective_scope", "effective_status", "owner"] as const;
  if (direct && scoped && ruleKeys.some(key => direct[key] !== scoped[key])) return false;
  return CBI_ALLOWED_COUNTRY_CODES.includes(record.country_code) && currentSource(record, direct ?? scoped, today);
}

export function formalComparable(record: CountryRecord, today = todayIso()): boolean {
  // The schema validator is deliberately import-only and rejects PUBLISHED.
  // Validate its field contract as a review row; separately require the original
  // server publication state here. This does not publish or mutate the record.
  return CBI_ALLOWED_COUNTRY_CODES.includes(record.country_code) && record.content_status === "PUBLISHED" && validateCountryRecord({ ...record, content_status: "IMPORT_REVIEW" }).ok && record.passport_issuance_status !== "NON_CITIZEN_TRAVEL_DOCUMENT" && isStrictIsoDate(record.last_verified_at) && record.last_verified_at <= today && record.official_sources.some(source => currentSource(record, source, today));
}

export function comparisonSelection(records: readonly CountryRecord[], slugs: readonly string[], review = false, today = todayIso()): CountryRecord[] {
  const unique = [...new Set(slugs)];
  if (unique.length < 2 || unique.length > 4) return [];
  const selected = unique.map(slug => records.find(record => record.country_id === slug));
  if (selected.some(record => !record || !CBI_ALLOWED_COUNTRY_CODES.includes(record.country_code) || !validateCountryRecord({ ...record, content_status: "IMPORT_REVIEW" }).ok || record.passport_issuance_status === "NON_CITIZEN_TRAVEL_DOCUMENT" || (!review && !formalComparable(record, today)))) return [];
  return selected as CountryRecord[];
}

function rawField(record: CountryRecord, field: string): unknown {
  const root = record as unknown as Record<string, unknown>;
  const details = record.planning_details as unknown as Record<string, unknown> | undefined;
  return field in root ? root[field] : details?.[field];
}

export function comparisonField(record: CountryRecord, field: string, locale: ComparisonLocale, today = todayIso()): string {
  if (!verifiedField(record, field, today)) return pending(locale);
  const value = rawField(record, field);
  if (value === null || value === undefined || value === "") return pending(locale);
  if (Array.isArray(value)) return value.map(item => item?.[locale]).filter(Boolean).join(locale === "zh" ? "、" : ", ") || pending(locale);
  if (typeof value === "object") return (value as Record<string, string | null>)[locale] || pending(locale);
  if (["legal_status", "operational_status", "application_status", "passport_issuance_status"].includes(field)) {
    const labels: Record<string, [string, string]> = {
      LAW_ENACTED: ["已有法律依据", "Law enacted"], REGULATED: ["已有实施规范", "Regulated"], LEGAL_REVIEW: ["法律复核中", "Legal review"], REPEALED: ["已废止", "Repealed"],
      ACTIVE: ["运营中", "Active"], PRE_LAUNCH: ["尚未开放", "Pre-launch"], SUSPENDED: ["已暂停", "Suspended"], NOT_ACCEPTING_APPLICATIONS: ["暂不接受申请", "Not accepting applications"], CLOSED: ["已关闭", "Closed"], ACCEPTING: ["接受申请", "Accepting applications"], NOT_ACCEPTING: ["不接受申请", "Not accepting applications"],
      CITIZEN_PASSPORT_AVAILABLE_AFTER_APPROVAL: ["获批并满足签发条件后可申请公民护照", "Citizen passport available after approval and issuance conditions"], ISSUANCE_PENDING: ["签发待确认", "Issuance pending"], NOT_APPLICABLE: ["不适用", "Not applicable"],
    };
    const label = labels[String(value)]; return label ? text(label[0], label[1], locale) : pending(locale);
  }
  return String(value);
}

export function verifiedMinimum(record: CountryRecord, today = todayIso()): number | null {
  return verifiedField(record, "minimum_investment", today) && verifiedField(record, "currency", today) && record.currency && typeof record.minimum_investment === "number" && Number.isFinite(record.minimum_investment) && record.minimum_investment >= 0 ? record.minimum_investment : null;
}

export function amountRangeMatches(record: CountryRecord, range: { min: string; max: string; currency: string }, today = todayIso()): boolean {
  if (!range.min && !range.max) return true;
  if (!range.currency || ![range.min, range.max].every(value => value === "" || /^\d+(?:\.\d+)?$/.test(value))) return false;
  const min = range.min === "" ? 0 : Number(range.min);
  const max = range.max === "" ? Infinity : Number(range.max);
  const amount = verifiedMinimum(record, today);
  return Number.isFinite(min) && (Number.isFinite(max) || max === Infinity) && min <= max && amount !== null && record.currency === range.currency && amount >= min && amount <= max;
}

export const FAMILY_PREFERENCES = ["INDIVIDUAL", "COUPLE", "MINOR_CHILDREN", "ADULT_CHILDREN", "PARENTS"] as const;
export function familyPreferenceMatches(record: CountryRecord, preferences: readonly string[], today = todayIso()): boolean {
  if (!preferences.length) return true;
  if (!verifiedField(record, "family_categories", today)) return false;
  return preferences.every(preference => FAMILY_PREFERENCES.includes(preference as typeof FAMILY_PREFERENCES[number]) && record.planning_details?.family_categories?.includes(preference as typeof FAMILY_PREFERENCES[number]));
}

export type ComparisonRow = { key: string; label: string; values: string[] };
export function comparisonRows(records: readonly CountryRecord[], locale: ComparisonLocale, today = todayIso()): ComparisonRow[] {
  const row = (key: string, zh: string, en: string): ComparisonRow => ({ key, label: text(zh, en, locale), values: records.map(record => comparisonField(record, key, locale, today)) });
  return [
    row("legal_basis", "法律基础与实施法规", "Legal basis and regulations"),
    row("legal_status", "法律状态", "Legal status"),
    row("operational_status", "实际运营状态", "Operational status"),
    row("application_status", "当前受理状态", "Application intake"),
    row("investment_options", "投资方式", "Investment options"),
    row("investment_term", "投资期限", "Investment term"), row("eligibility", "申请资格要求", "Application requirements"), row("source_of_funds_requirement", "资金来源要求", "Source-of-funds requirements"),
    { key: "minimum_investment", label: text("最低法定投资额（原币）", "Legal minimum investment (original currency)", locale), values: records.map(record => { const amount = verifiedMinimum(record, today); return amount === null ? pending(locale) : `${amount.toLocaleString(locale === "zh" ? "zh-CN" : "en-GB")} ${record.currency}`; }) },
    row("government_fees", "政府费用", "Government fees"), row("due_diligence_requirement", "尽职调查要求", "Due diligence requirements"),
    row("due_diligence_fees", "尽职调查费用", "Due diligence fees"), row("family_supplement_fees", "家庭成员附加费用", "Additional family fees"),
    row("passport_fees", "护照签发费用", "Passport fees"), row("professional_fees", "专业服务费用", "Professional service fees"), row("third_party_fees", "其他第三方费用", "Other third-party fees"),
    row("family_eligibility", "家庭成员条件", "Family eligibility"), row("residence_requirement", "实际居住要求", "Residence requirements"), row("interview_requirement", "面试要求", "Interview requirements"),
    row("processing_time", "官方公布处理时间", "Official processing time"), row("processing_time_observed", "实际统计处理时间（独立来源）", "Observed processing time (separate source)"),
    row("nationality_acquisition", "国籍取得方式", "Acquisition of nationality"), row("nationality_approval", "国籍批准程序", "Nationality approval procedure"),
    row("passport_issuance_status", "护照签发状态", "Passport issuance status"),
    row("application_process", "申请与签发流程", "Application and issuance procedure"), row("dual_nationality_policy", "双重国籍政策", "Dual nationality policy"), row("passport_validity", "护照有效期", "Passport validity"), row("passport_renewal", "护照续发要求", "Passport renewal"),
    row("nationality_loss", "国籍丧失或撤销规定", "Loss or revocation of nationality"), row("travel_restrictions", "旅行特殊限制", "Travel restrictions"), row("policy_updates", "政策更新", "Policy updates"),
    { key: "travel", label: text("旅行便利度与适用证件", "Travel access and passport class", locale), values: records.map(record => {
      if (!verifiedField(record, "travel_access_data", today) || !record.travel_access_data) return pending(locale);
      const data = record.travel_access_data; const count = (value: number | null | undefined) => value === null || value === undefined ? pending(locale) : String(value);
      return `${text("免签 / 落地签 / ETA / 电子签 / 事先签证", "Visa free / arrival / ETA / eVisa / advance visa", locale)}: ${[data.visa_free_count,data.visa_on_arrival_count,data.eta_count,data.evisa_count,data.visa_required_count].map(count).join(" / ")} · ${data.passport_class ?? pending(locale)} · ${data.statistics_date ?? pending(locale)} · ${data.source_url ?? pending(locale)}`;
    }) },
    { key: "tax", label: text("税务事项", "Tax matters", locale), values: records.map(() => text("取得国籍不等于自动取得税务居民身份；须另行获得专业意见。", "Citizenship does not automatically establish tax residency; separate professional advice is required.", locale)) },
    { key: "fx", label: text("汇率与成本边界", "Currency and cost boundary", locale), values: records.map(() => text("保留原币，未进行换算，无适用汇率；投资、政府、第三方及服务费用分别列示，不合计或排名。", "Original currency retained; no conversion or exchange rate applied. Investment, government, third-party and service fees remain separate, without totals or ranking.", locale)) },
  ];
}

export function buildComparisonReport(records: readonly CountryRecord[], locale: ComparisonLocale, review = false, today = todayIso()) {
  const selected = comparisonSelection(records, records.map(record => record.country_id), review, today);
  if (selected.length < 2) throw new Error("VERIFIED_COMPARISON_SELECTION_REQUIRED");
  return {
    title: "Phoenix Nova™ Global Identity Comparison Report", locale,
    status: review ? "INTERNAL_REVIEW_NOT_FOR_PUBLICATION" : "VERIFIED_PUBLIC_INFORMATION",
    countries: selected.map(record => ({ country_id: record.country_id, country_name_zh: record.country_name_zh, country_name_en: record.country_name_en, programme: record.programme_name?.[locale] ?? pending(locale), data_version: record.data_version, verified_at: record.last_verified_at, next_review_at: record.next_review_at })),
    rows: comparisonRows(selected, locale, today),
    risks: text("政策可能变化；法律、受理、国籍批准与护照签发互不替代。暂停及未开放项目仅展示真实状态，不作为可办理建议。", "Policies may change. Law, intake, nationality approval and passport issuance are separate. Suspended or pre-launch status is information, not an application recommendation.", locale),
    gaps: selected.flatMap(record => comparisonRows([record], locale, today).filter(row => row.values[0] === pending(locale)).map(row => ({ country_id: record.country_id, field: row.key, status: "NOT_VERIFIED" }))),
    official_sources: selected.map(record => ({ country_id: record.country_id, sources: record.official_sources.filter(source => currentSource(record, source, today)), field_sources: Object.entries(record.field_sources ?? {}).filter(([, source]) => currentSource(record, source, today)).map(([field, source]) => ({ field, ...source })) })),
    notice: COMPARISON_NOTICE[locale],
  };
}
