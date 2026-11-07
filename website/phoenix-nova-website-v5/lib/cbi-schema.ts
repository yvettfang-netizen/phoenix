/**
 * Phoenix Identity V3.1 Citizenship-by-Investment (CBI) import contract.
 *
 * This is a data contract only. It contains no database adapter, publication
 * authority or policy conclusion. Missing nullable values stay null and are
 * never inferred from a country, programme or URL.
 */

export const CBI_ALLOWED_COUNTRY_CODES = ["KN", "AR", "VU", "ST"] as const;
export const ALLOWED_COUNTRY_CODES = CBI_ALLOWED_COUNTRY_CODES;
export type CbiCountryCode = (typeof CBI_ALLOWED_COUNTRY_CODES)[number];

export const CBI_PROGRAMME_TYPE = [
  "CITIZENSHIP_BY_INVESTMENT",
  "CITIZENSHIP_BY_DONATION",
  "INVESTMENT_CITIZENSHIP_MECHANISM",
] as const;
export type CbiProgrammeType = (typeof CBI_PROGRAMME_TYPE)[number];

export const CBI_LEGAL_STATUS = ["LAW_ENACTED", "REGULATED", "LEGAL_REVIEW", "LEGAL_UNCERTAIN", "REPEALED", "UNKNOWN"] as const;
export type CbiLegalStatus = (typeof CBI_LEGAL_STATUS)[number];

export const CBI_OPERATIONAL_STATUS = ["ACTIVE", "PRE_LAUNCH", "SUSPENDED", "NOT_ACCEPTING_APPLICATIONS", "CLOSED", "UNKNOWN"] as const;
export type CbiOperationalStatus = (typeof CBI_OPERATIONAL_STATUS)[number];

export const CBI_APPLICATION_STATUS = ["ACCEPTING", "NOT_ACCEPTING", "NOT_VERIFIED"] as const;
export type CbiApplicationStatus = (typeof CBI_APPLICATION_STATUS)[number];

export const CBI_PASSPORT_ISSUANCE_STATUS = [
  "CITIZEN_PASSPORT_AVAILABLE_AFTER_APPROVAL",
  "ISSUANCE_PENDING",
  "NON_CITIZEN_TRAVEL_DOCUMENT",
  "NOT_APPLICABLE",
  "UNKNOWN",
] as const;
export type CbiPassportIssuanceStatus = (typeof CBI_PASSPORT_ISSUANCE_STATUS)[number];

export const CBI_CONTENT_STATUS = ["IMPORT_REVIEW", "PUBLISHED", "WITHDRAWN"] as const;
export type CbiContentStatus = (typeof CBI_CONTENT_STATUS)[number];

export const CBI_SOURCE_TYPE = ["OFFICIAL", "INTERNAL_EXPERIENCE", "MODEL_INFERENCE"] as const;
export type CbiSourceType = (typeof CBI_SOURCE_TYPE)[number];

export const CBI_EFFECTIVE_STATUS = ["CURRENT", "EXPIRED", "UNKNOWN"] as const;
export type CbiEffectiveStatus = (typeof CBI_EFFECTIVE_STATUS)[number];

export const CBI_IMPORT_APPROVAL_STATUS = ["IMPORT_REVIEW", "APPROVED", "REJECTED"] as const;
export type CbiImportApprovalStatus = (typeof CBI_IMPORT_APPROVAL_STATUS)[number];

export const CBI_IMPORT_VERIFICATION_STATUS = ["UNVERIFIED", "PARTIALLY_VERIFIED", "VERIFIED", "EXPIRED"] as const;
export type CbiImportVerificationStatus = (typeof CBI_IMPORT_VERIFICATION_STATUS)[number];

export const CBI_PROVENANCE = ["OFFICIAL", "MIXED", "INTERNAL_EXPERIENCE", "MODEL_INFERENCE", "UNKNOWN"] as const;
export type CbiProvenance = (typeof CBI_PROVENANCE)[number];

// Supported currencies are intentionally finite. Country currency is not
// guessed from country_code; it must be supplied and validated explicitly.
export const CBI_CURRENCY_CODES = ["ARS", "AUD", "CAD", "CHF", "CNY", "EUR", "GBP", "HKD", "JPY", "STN", "USD", "VUV", "XCD"] as const;
export type CbiCurrencyCode = (typeof CBI_CURRENCY_CODES)[number];

export const CBI_STATUS_ENUMS = Object.freeze({
  legal: CBI_LEGAL_STATUS,
  operational: CBI_OPERATIONAL_STATUS,
  application: CBI_APPLICATION_STATUS,
  passportIssuance: CBI_PASSPORT_ISSUANCE_STATUS,
  content: CBI_CONTENT_STATUS,
  approval: CBI_IMPORT_APPROVAL_STATUS,
  verification: CBI_IMPORT_VERIFICATION_STATUS,
  provenance: CBI_PROVENANCE,
} as const);

export interface BilingualText {
  zh: string | null;
  en: string | null;
}

export interface PolicyRule {
  source_type: CbiSourceType;
  source: string;
  official_url: string | null;
  verified_at: string | null;
  effective_scope: string | null;
  effective_status: CbiEffectiveStatus;
  owner: string | null;
}

export type OfficialSource = PolicyRule;

export const CBI_FAMILY_CATEGORY = ["INDIVIDUAL", "COUPLE", "MINOR_CHILDREN", "ADULT_CHILDREN", "PARENTS"] as const;
export type CbiFamilyCategory = (typeof CBI_FAMILY_CATEGORY)[number];

/**
 * A planning-only residence classification. It is deliberately an enum rather
 * than a value inferred from prose: UNKNOWN remains the safe value until a
 * field-level source explicitly verifies the category.
 */
export const CBI_RESIDENCE_REQUIREMENT_CATEGORY = ["NONE", "LIMITED", "REQUIRED", "UNKNOWN"] as const;
export type CbiResidenceRequirementCategory = (typeof CBI_RESIDENCE_REQUIREMENT_CATEGORY)[number];

export const CBI_PLANNING_DETAIL_FIELDS = [
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
] as const;
export type CbiPlanningDetailField = (typeof CBI_PLANNING_DETAIL_FIELDS)[number];

export interface CbiPlanningDetails {
  country_overview?: BilingualText | null;
  nationality_system?: BilingualText | null;
  investment_term?: BilingualText | null;
  eligibility?: BilingualText | null;
  family_supplement_fees?: BilingualText | null;
  passport_fees?: BilingualText | null;
  professional_fees?: BilingualText | null;
  third_party_fees?: BilingualText | null;
  principal_applicant?: BilingualText | null;
  spouse?: BilingualText | null;
  minor_children?: BilingualText | null;
  adult_children?: BilingualText | null;
  parents?: BilingualText | null;
  other_dependants?: BilingualText | null;
  age_dependency?: BilingualText | null;
  relationship_evidence?: BilingualText | null;
  landing_requirement?: BilingualText | null;
  biometrics_requirement?: BilingualText | null;
  criminal_record_requirement?: BilingualText | null;
  due_diligence_requirement?: BilingualText | null;
  application_process?: BilingualText | null;
  nationality_acquisition?: BilingualText | null;
  nationality_approval?: BilingualText | null;
  nationality_loss?: BilingualText | null;
  processing_time_observed?: BilingualText | null;
  policy_updates?: BilingualText | null;
  travel_restrictions?: BilingualText | null;
  family_categories?: CbiFamilyCategory[] | null;
  residence_requirement_category?: CbiResidenceRequirementCategory | null;
}

export interface TravelAccessData {
  passport_class: string | null;
  visa_free_count: number | null;
  visa_on_arrival_count: number | null;
  evisa_count: number | null;
  eta_count?: number | null;
  visa_required_count?: number | null;
  statistics_date: string | null;
  statistics_method: BilingualText | null;
  source_name: BilingualText | null;
  source_url: string | null;
  restrictions?: BilingualText | null;
}

/** Exact UI-facing CountryRecord contract. */
export interface CountryRecord {
  country_id: string;
  country_code: CbiCountryCode;
  country_name_zh: string;
  country_name_en: string;
  official_name: string;
  flag_asset: string | null;
  programme_name: BilingualText | null;
  programme_type: CbiProgrammeType | null;
  legal_basis: BilingualText | null;
  investment_options: BilingualText[] | null;
  minimum_investment: number | null;
  currency: string | null;
  government_fees: BilingualText | null;
  due_diligence_fees: BilingualText | null;
  family_eligibility: BilingualText | null;
  residence_requirement: BilingualText | null;
  interview_requirement: BilingualText | null;
  source_of_funds_requirement: BilingualText | null;
  processing_time: BilingualText | null;
  dual_nationality_policy: BilingualText | null;
  passport_validity: BilingualText | null;
  passport_renewal: BilingualText | null;
  travel_access_data: TravelAccessData | null;
  legal_status: CbiLegalStatus;
  operational_status: CbiOperationalStatus;
  application_status: CbiApplicationStatus;
  passport_issuance_status: CbiPassportIssuanceStatus;
  official_authority: BilingualText | null;
  official_sources: PolicyRule[];
  last_verified_at: string | null;
  next_review_at: string | null;
  content_status: CbiContentStatus;
  programme_id: string | null;
  data_version: string;
  planning_details?: CbiPlanningDetails | null;
  field_sources?: Record<string, PolicyRule>;
}

export type SchemaIssueSeverity = "error" | "warning";
export interface SchemaIssue {
  code: string;
  path: string;
  message: string;
  severity: SchemaIssueSeverity;
}
export interface SchemaValidation {
  ok: boolean;
  errors: SchemaIssue[];
  warnings: SchemaIssue[];
}

const CBI_OFFICIAL_HOSTS: Record<CbiCountryCode, readonly string[]> = {
  KN: ["gov.kn"],
  AR: ["gob.ar"],
  VU: ["gov.vu"],
  ST: ["gov.st"],
};

const CBI_REQUIRED_FIELDS: readonly (keyof CountryRecord)[] = [
  "country_id", "country_code", "country_name_zh", "country_name_en", "official_name", "legal_status", "operational_status", "application_status", "passport_issuance_status", "official_sources", "content_status", "data_version",
];

const CBI_ALLOWED_RECORD_FIELDS = new Set<string>([
  "country_id", "country_code", "country_name_zh", "country_name_en", "official_name", "flag_asset", "programme_name", "programme_name_zh", "programme_name_en", "programme_type", "legal_basis", "legal_basis_zh", "legal_basis_en", "investment_options", "minimum_investment", "currency", "government_fees", "government_fees_zh", "government_fees_en", "due_diligence_fees", "due_diligence_fees_zh", "due_diligence_fees_en", "family_eligibility", "family_eligibility_zh", "family_eligibility_en", "residence_requirement", "residence_requirement_zh", "residence_requirement_en", "interview_requirement", "interview_requirement_zh", "interview_requirement_en", "source_of_funds_requirement", "source_of_funds_requirement_zh", "source_of_funds_requirement_en", "processing_time", "processing_time_zh", "processing_time_en", "dual_nationality_policy", "dual_nationality_policy_zh", "dual_nationality_policy_en", "passport_validity", "passport_validity_zh", "passport_validity_en", "passport_renewal", "passport_renewal_zh", "passport_renewal_en", "travel_access_data", "legal_status", "operational_status", "application_status", "passport_issuance_status", "official_authority", "official_authority_zh", "official_authority_en", "official_sources", "last_verified_at", "next_review_at", "content_status", "programme_id", "data_version", "planning_details", "field_sources",
]);

export const CBI_FIELD_SOURCE_KEYS = new Set<string>([
  "country_id", "country_code", "country_name_zh", "country_name_en", "official_name", "flag_asset", "programme_name", "programme_type", "legal_basis", "investment_options", "minimum_investment", "currency", "government_fees", "due_diligence_fees", "family_eligibility", "residence_requirement", "interview_requirement", "source_of_funds_requirement", "processing_time", "dual_nationality_policy", "passport_validity", "passport_renewal", "travel_access_data", "legal_status", "operational_status", "application_status", "passport_issuance_status", "official_authority", "official_sources", "last_verified_at", "next_review_at", "content_status", "programme_id", "data_version", "planning_details", "family_categories", "residence_requirement_category",
  ...CBI_PLANNING_DETAIL_FIELDS,
  ...CBI_PLANNING_DETAIL_FIELDS.map(field => `planning_details.${field}`),
  "planning_details.family_categories",
  "planning_details.residence_requirement_category",
]);

const CBI_PLANNING_FIELD_SOURCE_ALIASES = [
  ...CBI_PLANNING_DETAIL_FIELDS,
  "family_categories",
  "residence_requirement_category",
] as const;
const CBI_POLICY_RULE_FIELDS = ["source_type", "source", "official_url", "verified_at", "effective_scope", "effective_status", "owner"] as const;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isOneOf = <T extends readonly string[]>(value: unknown, values: T): value is T[number] => typeof value === "string" && (values as readonly string[]).includes(value);
const issue = (code: string, path: string, message: string, severity: SchemaIssueSeverity = "error"): SchemaIssue => ({ code, path, message, severity });

export const isCbiCountryCode = (value: unknown): value is CbiCountryCode => isOneOf(value, CBI_ALLOWED_COUNTRY_CODES);

export const isStrictIsoDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return month >= 1 && month <= 12 && day >= 1 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

export const isFormulaInjection = (value: unknown): boolean => typeof value === "string" && /^[=+@-]/.test(value.trimStart());

const validateBilingual = (value: unknown, path: string, errors: SchemaIssue[], required = false): value is BilingualText => {
  if (value === null || value === undefined) {
    if (required) errors.push(issue("MISSING_FIELD", path, "Bilingual text must be supplied or explicitly null."));
    return false;
  }
  if (!isObject(value) || !("zh" in value) || !("en" in value)) {
    errors.push(issue("INVALID_BILINGUAL_TEXT", path, "Use the bilingual shape { zh, en }; do not infer a language."));
    return false;
  }
  for (const locale of ["zh", "en"] as const) {
    const part = value[locale];
    if (part !== null && typeof part !== "string") errors.push(issue("INVALID_TEXT", `${path}.${locale}`, "Text must be a string or null."));
    if (isFormulaInjection(part)) errors.push(issue("FORMULA_INJECTION", `${path}.${locale}`, "Spreadsheet formula-like values are not accepted."));
  }
  return true;
};

const validateHttpsUrl = (url: unknown, countryCode: CbiCountryCode, path: string): SchemaIssue[] => {
  if (typeof url !== "string" || url.trim() === "") return [issue("OFFICIAL_URL_REQUIRED", path, "OFFICIAL sources require an HTTPS official_url.")];
  try {
    const parsed = new URL(url);
    const allowed = CBI_OFFICIAL_HOSTS[countryCode];
    const hostAllowed = allowed.some(host => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
    if (parsed.protocol !== "https:") return [issue("OFFICIAL_URL_HTTPS_REQUIRED", path, "official_url must use HTTPS.")];
    if (parsed.username || parsed.password) return [issue("OFFICIAL_URL_CREDENTIALS_REJECTED", path, "official_url must not contain username or password credentials.")];
    if (parsed.port && parsed.port !== "443") return [issue("OFFICIAL_URL_PORT_NOT_ALLOWED", path, "official_url must use the default HTTPS port.")];
    if (!hostAllowed) return [issue("OFFICIAL_URL_DOMAIN_NOT_ALLOWED", path, `official_url host is not allowlisted for ${countryCode}.`)];
  } catch {
    return [issue("OFFICIAL_URL_INVALID", path, "official_url is not a valid URL.")];
  }
  return [];
};

export const validateOfficialUrl = validateHttpsUrl;

export const validatePolicyRule = (value: unknown, countryCode: CbiCountryCode, path = "official_sources[0]"): SchemaValidation => {
  const errors: SchemaIssue[] = [];
  const warnings: SchemaIssue[] = [];
  if (!isObject(value)) return { ok: false, errors: [issue("INVALID_POLICY_RULE", path, "Policy rule must be an object.")], warnings };
  for (const field of ["source_type", "source", "official_url", "verified_at", "effective_scope", "effective_status", "owner"] as const) if (!(field in value)) errors.push(issue("MISSING_POLICY_FIELD", `${path}.${field}`, "Every policy rule must include this field."));
  for (const field of ["source_type", "source", "effective_status"] as const) if (typeof value[field] !== "string" || value[field].trim() === "") errors.push(issue("MISSING_POLICY_FIELD", `${path}.${field}`, "Every policy rule must include this field."));
  if (!isOneOf(value.source_type, CBI_SOURCE_TYPE)) errors.push(issue("INVALID_SOURCE_TYPE", `${path}.source_type`, "source_type must be OFFICIAL, INTERNAL_EXPERIENCE or MODEL_INFERENCE."));
  if (!isOneOf(value.effective_status, CBI_EFFECTIVE_STATUS)) errors.push(issue("INVALID_EFFECTIVE_STATUS", `${path}.effective_status`, "effective_status must be CURRENT, EXPIRED or UNKNOWN."));
  if (value.verified_at !== null && value.verified_at !== undefined && !isStrictIsoDate(value.verified_at)) errors.push(issue("INVALID_DATE", `${path}.verified_at`, "verified_at must be YYYY-MM-DD or null."));
  if (value.source_type === "OFFICIAL") errors.push(...validateHttpsUrl(value.official_url, countryCode, `${path}.official_url`));
  else if (value.official_url !== null && value.official_url !== undefined && typeof value.official_url !== "string") errors.push(issue("INVALID_OFFICIAL_URL", `${path}.official_url`, "official_url must be a string or null."));
  if (value.effective_status !== "CURRENT" || value.source_type !== "OFFICIAL") warnings.push(issue("SOURCE_NOT_CURRENT_OFFICIAL", path, "The source is review-only and cannot be treated as a current official conclusion.", "warning"));
  for (const field of ["effective_scope", "owner"] as const) {
    if (value[field] !== null && value[field] !== undefined && typeof value[field] !== "string") errors.push(issue("INVALID_POLICY_FIELD_TYPE", `${path}.${field}`, `${field} must be a string or null.`));
  }
  for (const field of ["source", "effective_scope", "owner"] as const) if (value[field] !== null && value[field] !== undefined && isFormulaInjection(value[field])) errors.push(issue("FORMULA_INJECTION", `${path}.${field}`, "Spreadsheet formula-like values are not accepted."));
  return { ok: errors.length === 0, errors, warnings };
};

const validatePlanningDetails = (value: unknown, path = "planning_details"): SchemaValidation => {
  const errors: SchemaIssue[] = [];
  const warnings: SchemaIssue[] = [];
  if (!isObject(value)) return { ok: false, errors: [issue("INVALID_PLANNING_DETAILS", path, "planning_details must be an object or null.")], warnings };
  const allowed = new Set<string>([...CBI_PLANNING_DETAIL_FIELDS, "family_categories", "residence_requirement_category"]);
  for (const key of Object.keys(value)) if (!allowed.has(key)) errors.push(issue("UNKNOWN_PLANNING_FIELD", `${path}.${key}`, "Unknown planning_details fields are rejected."));
  for (const field of CBI_PLANNING_DETAIL_FIELDS) {
    const item = value[field];
    if (item !== null && item !== undefined) validateBilingual(item, `${path}.${field}`, errors);
  }
  const categories = value.family_categories;
  if (categories !== null && categories !== undefined) {
    if (!Array.isArray(categories)) errors.push(issue("INVALID_FAMILY_CATEGORIES", `${path}.family_categories`, "family_categories must be an enum array or null."));
    else categories.forEach((category, index) => {
      if (!isOneOf(category, CBI_FAMILY_CATEGORY)) errors.push(issue("INVALID_FAMILY_CATEGORY", `${path}.family_categories[${index}]`, "Unknown family category; eligibility is not inferred."));
    });
  }
  const residenceCategory = value.residence_requirement_category;
  if (residenceCategory !== null && residenceCategory !== undefined && !isOneOf(residenceCategory, CBI_RESIDENCE_REQUIREMENT_CATEGORY)) {
    errors.push(issue("INVALID_RESIDENCE_REQUIREMENT_CATEGORY", `${path}.residence_requirement_category`, "residence_requirement_category must be NONE, LIMITED, REQUIRED or UNKNOWN; no value is inferred."));
  }
  return { ok: errors.length === 0, errors, warnings };
};

const policyRuleFieldsEqual = (left: unknown, right: unknown): boolean => {
  if (!isObject(left) || !isObject(right)) return false;
  return CBI_POLICY_RULE_FIELDS.every(field => {
    const leftValue = left[field];
    const rightValue = right[field];
    if (Object.is(leftValue, rightValue)) return true;
    if (isObject(leftValue) && isObject(rightValue)) return JSON.stringify(leftValue) === JSON.stringify(rightValue);
    return false;
  });
};

const validateFieldSources = (value: unknown, countryCode: CbiCountryCode, path = "field_sources"): SchemaValidation => {
  const errors: SchemaIssue[] = [];
  const warnings: SchemaIssue[] = [];
  if (!isObject(value)) return { ok: false, errors: [issue("INVALID_FIELD_SOURCES", path, "field_sources must be a keyed PolicyRule object.")], warnings };
  const today = new Date().toISOString().slice(0, 10);
  for (const [field, rule] of Object.entries(value)) {
    if (!CBI_FIELD_SOURCE_KEYS.has(field)) {
      errors.push(issue("UNKNOWN_FIELD_SOURCE_KEY", `${path}.${field}`, "field_sources key is not a known root or planning field."));
      continue;
    }
    const result = validatePolicyRule(rule, countryCode, `${path}.${field}`);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    if (!isObject(rule) || rule.source_type !== "OFFICIAL" || rule.effective_status !== "CURRENT" || !isStrictIsoDate(rule.verified_at)) errors.push(issue("FIELD_SOURCE_NOT_CURRENT_OFFICIAL", `${path}.${field}`, "Field-level provenance requires an OFFICIAL source with CURRENT status and a valid verification date."));
    else if (rule.verified_at > today) errors.push(issue("FIELD_SOURCE_DATE_FUTURE", `${path}.${field}.verified_at`, "Field-level verification date cannot be in the future."));
    if (!isObject(rule) || typeof rule.effective_scope !== "string" || rule.effective_scope.trim() === "") errors.push(issue("FIELD_SOURCE_SCOPE_REQUIRED", `${path}.${field}.effective_scope`, "Current field-level sources require a non-empty effective_scope."));
    if (!isObject(rule) || typeof rule.owner !== "string" || rule.owner.trim() === "") errors.push(issue("FIELD_SOURCE_OWNER_REQUIRED", `${path}.${field}.owner`, "Current field-level sources require a non-empty owner."));
  }
  for (const field of CBI_PLANNING_FIELD_SOURCE_ALIASES) {
    const bareKey = field;
    const qualifiedKey = `planning_details.${field}`;
    if (!(bareKey in value) || !(qualifiedKey in value)) continue;
    if (!policyRuleFieldsEqual(value[bareKey], value[qualifiedKey])) errors.push(issue("CONFLICTING_FIELD_SOURCES", `${path}.${bareKey}`, `Both ${bareKey} and ${qualifiedKey} are supplied with different provenance rules.`));
  }
  return { ok: errors.length === 0, errors, warnings };
};

export const validateCountryRecord = (value: unknown): SchemaValidation => {
  const errors: SchemaIssue[] = [];
  const warnings: SchemaIssue[] = [];
  if (!isObject(value)) return { ok: false, errors: [issue("INVALID_RECORD", "record", "CountryRecord must be an object.")], warnings };
  for (const key of Object.keys(value)) if (!CBI_ALLOWED_RECORD_FIELDS.has(key)) errors.push(issue("UNKNOWN_FIELD", key, "Unknown fields are rejected instead of being silently discarded."));
  for (const field of CBI_REQUIRED_FIELDS) if (!(field in value) || value[field] === null || value[field] === undefined || value[field] === "") errors.push(issue("MISSING_FIELD", field, "Required field is missing."));
  for (const field of ["country_id", "country_name_zh", "country_name_en", "official_name", "data_version"] as const) {
    if (typeof value[field] !== "string" || value[field].trim() === "") errors.push(issue("INVALID_TEXT", field, "Field must be a non-empty string."));
    if (isFormulaInjection(value[field])) errors.push(issue("FORMULA_INJECTION", field, "Spreadsheet formula-like values are not accepted."));
  }
  if (!isCbiCountryCode(value.country_code)) errors.push(issue("COUNTRY_NOT_ALLOWLISTED", "country_code", `country_code must be one of ${CBI_ALLOWED_COUNTRY_CODES.join(", ")}.`));
  const countryCode = isCbiCountryCode(value.country_code) ? value.country_code : null;
  if (!isOneOf(value.legal_status, CBI_LEGAL_STATUS)) errors.push(issue("INVALID_LEGAL_STATUS", "legal_status", "Unknown legal_status."));
  if (!isOneOf(value.operational_status, CBI_OPERATIONAL_STATUS)) errors.push(issue("INVALID_OPERATIONAL_STATUS", "operational_status", "Unknown operational_status."));
  if (!isOneOf(value.application_status, CBI_APPLICATION_STATUS)) errors.push(issue("INVALID_APPLICATION_STATUS", "application_status", "application_status must describe whether the programme accepts applications."));
  if (!isOneOf(value.passport_issuance_status, CBI_PASSPORT_ISSUANCE_STATUS)) errors.push(issue("INVALID_PASSPORT_ISSUANCE_STATUS", "passport_issuance_status", "Unknown passport_issuance_status."));
  if (!isOneOf(value.content_status, CBI_CONTENT_STATUS)) errors.push(issue("INVALID_CONTENT_STATUS", "content_status", "Unknown content_status."));
  if (value.content_status === "PUBLISHED") errors.push(issue("PUBLISHED_NOT_ALLOWED_IN_IMPORT", "content_status", "Imported rows must enter IMPORT_REVIEW; publication is a server approval transition."));
  if (value.content_status === "WITHDRAWN") errors.push(issue("IMPORT_REVIEW_REQUIRED", "content_status", "New imports must enter IMPORT_REVIEW; withdrawal requires an audited server transition."));

  if (value.flag_asset !== null && value.flag_asset !== undefined && typeof value.flag_asset !== "string") errors.push(issue("INVALID_FLAG_ASSET", "flag_asset", "flag_asset must be a string or null."));
  if (value.programme_id !== null && value.programme_id !== undefined && typeof value.programme_id !== "string") errors.push(issue("INVALID_PROGRAMME_ID", "programme_id", "programme_id must be a string or null."));
  if (value.programme_name !== null && value.programme_name !== undefined) validateBilingual(value.programme_name, "programme_name", errors);
  if (!isOneOf(value.programme_type, CBI_PROGRAMME_TYPE) && value.programme_type !== null && value.programme_type !== undefined) errors.push(issue("INVALID_PROGRAMME_TYPE", "programme_type", "Unknown programme_type."));
  if (value.legal_basis !== null && value.legal_basis !== undefined) validateBilingual(value.legal_basis, "legal_basis", errors);
  if (value.official_authority !== null && value.official_authority !== undefined) validateBilingual(value.official_authority, "official_authority", errors);
  for (const field of ["government_fees", "due_diligence_fees", "family_eligibility", "residence_requirement", "interview_requirement", "source_of_funds_requirement", "processing_time", "dual_nationality_policy", "passport_validity", "passport_renewal"] as const) if (value[field] !== null && value[field] !== undefined) validateBilingual(value[field], field, errors);
  if (value.investment_options !== null && value.investment_options !== undefined) {
    if (!Array.isArray(value.investment_options)) errors.push(issue("INVALID_INVESTMENT_OPTIONS", "investment_options", "investment_options must be a bilingual array or null."));
    else value.investment_options.forEach((item, index) => validateBilingual(item, `investment_options[${index}]`, errors, true));
  }
  if (value.minimum_investment !== null && value.minimum_investment !== undefined && (typeof value.minimum_investment !== "number" || !Number.isFinite(value.minimum_investment) || value.minimum_investment < 0)) errors.push(issue("INVALID_AMOUNT", "minimum_investment", "minimum_investment must be a finite non-negative number or null."));
  if (value.currency !== null && value.currency !== undefined && (!isOneOf(value.currency, CBI_CURRENCY_CODES) || typeof value.currency !== "string")) errors.push(issue("INVALID_CURRENCY", "currency", "currency must be an allowlisted currency code or null."));
  if (value.minimum_investment !== null && value.minimum_investment !== undefined && (value.currency === null || value.currency === undefined || value.currency === "")) errors.push(issue("CURRENCY_REQUIRED", "currency", "currency is required when minimum_investment is present."));

  if (value.planning_details !== null && value.planning_details !== undefined) {
    const planning = validatePlanningDetails(value.planning_details);
    errors.push(...planning.errors);
    warnings.push(...planning.warnings);
  }
  if (value.field_sources !== undefined) {
    if (countryCode) {
      const fieldSources = validateFieldSources(value.field_sources, countryCode);
      errors.push(...fieldSources.errors);
      warnings.push(...fieldSources.warnings);
    } else errors.push(issue("FIELD_SOURCE_COUNTRY_REQUIRED", "field_sources", "A valid allowlisted country_code is required to validate field-level provenance."));
  }

  if (value.travel_access_data !== null && value.travel_access_data !== undefined) {
    if (!isObject(value.travel_access_data)) errors.push(issue("INVALID_TRAVEL_ACCESS_DATA", "travel_access_data", "travel_access_data must be an object or null."));
    else {
      for (const field of ["visa_free_count", "visa_on_arrival_count", "evisa_count", "eta_count", "visa_required_count"] as const) if (value.travel_access_data[field] !== null && value.travel_access_data[field] !== undefined && (typeof value.travel_access_data[field] !== "number" || !Number.isInteger(value.travel_access_data[field]) || value.travel_access_data[field] < 0)) errors.push(issue("INVALID_TRAVEL_COUNT", `travel_access_data.${field}`, "Travel counts must be finite non-negative integers or null."));
      if (value.travel_access_data.passport_class !== null && value.travel_access_data.passport_class !== undefined && (typeof value.travel_access_data.passport_class !== "string" || value.travel_access_data.passport_class.trim() === "")) errors.push(issue("INVALID_PASSPORT_CLASS", "travel_access_data.passport_class", "passport_class must be a non-empty string or null."));
      if (value.travel_access_data.statistics_date !== null && value.travel_access_data.statistics_date !== undefined && !isStrictIsoDate(value.travel_access_data.statistics_date)) errors.push(issue("INVALID_DATE", "travel_access_data.statistics_date", "statistics_date must be YYYY-MM-DD or null."));
      if (value.travel_access_data.statistics_method !== null && value.travel_access_data.statistics_method !== undefined) validateBilingual(value.travel_access_data.statistics_method, "travel_access_data.statistics_method", errors);
      if (value.travel_access_data.source_name !== null && value.travel_access_data.source_name !== undefined) validateBilingual(value.travel_access_data.source_name, "travel_access_data.source_name", errors);
      if (value.travel_access_data.source_url !== null && value.travel_access_data.source_url !== undefined) {
        if (typeof value.travel_access_data.source_url !== "string") errors.push(issue("INVALID_URL", "travel_access_data.source_url", "travel_access_data.source_url must be a string or null."));
        else try { if (new URL(value.travel_access_data.source_url).protocol !== "https:") errors.push(issue("SOURCE_URL_HTTPS_REQUIRED", "travel_access_data.source_url", "Travel statistics source_url must use HTTPS.")); } catch { errors.push(issue("INVALID_URL", "travel_access_data.source_url", "travel_access_data.source_url is not a valid URL.")); }
      }
      if (value.travel_access_data.restrictions !== null && value.travel_access_data.restrictions !== undefined) validateBilingual(value.travel_access_data.restrictions, "travel_access_data.restrictions", errors);
      const hasTravelCount = [value.travel_access_data.visa_free_count, value.travel_access_data.visa_on_arrival_count, value.travel_access_data.evisa_count, value.travel_access_data.eta_count, value.travel_access_data.visa_required_count].some(count => count !== null && count !== undefined);
      if (hasTravelCount) {
        if (!value.travel_access_data.passport_class) errors.push(issue("TRAVEL_PASSPORT_CLASS_REQUIRED", "travel_access_data.passport_class", "Travel counts require an explicit passport_class."));
        if (!value.travel_access_data.source_name) errors.push(issue("TRAVEL_SOURCE_NAME_REQUIRED", "travel_access_data.source_name", "Travel counts require a source_name."));
        if (!value.travel_access_data.source_url) errors.push(issue("TRAVEL_SOURCE_URL_REQUIRED", "travel_access_data.source_url", "Travel counts require a source_url."));
        if (!isStrictIsoDate(value.travel_access_data.statistics_date)) errors.push(issue("TRAVEL_STATISTICS_DATE_REQUIRED", "travel_access_data.statistics_date", "Travel counts require a strict statistics_date."));
        if (!value.travel_access_data.statistics_method) errors.push(issue("TRAVEL_STATISTICS_METHOD_REQUIRED", "travel_access_data.statistics_method", "Travel counts require a statistics_method."));
      }
    }
  }
  for (const field of ["last_verified_at", "next_review_at"] as const) if (value[field] !== null && value[field] !== undefined && !isStrictIsoDate(value[field])) errors.push(issue("INVALID_DATE", field, `${field} must be YYYY-MM-DD or null.`));
  if (!Array.isArray(value.official_sources) || value.official_sources.length === 0) {
    if (value.content_status === "IMPORT_REVIEW") warnings.push(issue("OFFICIAL_SOURCE_PENDING_REVIEW", "official_sources", "No official source is available yet; the record remains review-only and cannot be published.", "warning"));
    else errors.push(issue("OFFICIAL_SOURCE_REQUIRED", "official_sources", "At least one official_sources item is required outside IMPORT_REVIEW."));
  }
  else if (countryCode) value.official_sources.forEach((source, index) => {
    const result = validatePolicyRule(source, countryCode, `official_sources[${index}]`);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  });
  if (value.operational_status === "ACTIVE") {
    if (!(value.legal_status === "LAW_ENACTED" || value.legal_status === "REGULATED")) errors.push(issue("ACTIVE_LEGAL_STATUS_REQUIRED", "legal_status", "ACTIVE requires LAW_ENACTED or REGULATED; legal existence alone is not enough."));
    if (value.application_status !== "ACCEPTING") errors.push(issue("ACTIVE_APPLICATION_STATUS_REQUIRED", "application_status", "ACTIVE requires explicit ACCEPTING application_status."));
    if (!value.legal_basis || !isObject(value.legal_basis) || (!value.legal_basis.zh && !value.legal_basis.en)) errors.push(issue("ACTIVE_LEGAL_BASIS_REQUIRED", "legal_basis", "ACTIVE requires a non-empty legal_basis."));
    if (!value.official_authority || !isObject(value.official_authority) || (!value.official_authority.zh && !value.official_authority.en)) errors.push(issue("ACTIVE_OFFICIAL_AUTHORITY_REQUIRED", "official_authority", "ACTIVE requires a non-empty official_authority."));
    const hasCurrentOfficial = Array.isArray(value.official_sources) && value.official_sources.some(source => isObject(source) && source.source_type === "OFFICIAL" && source.effective_status === "CURRENT" && isStrictIsoDate(source.verified_at));
    if (!hasCurrentOfficial) errors.push(issue("ACTIVE_CURRENT_OFFICIAL_SOURCE_REQUIRED", "official_sources", "ACTIVE requires a current official source with a verification date."));
    const today = new Date().toISOString().slice(0, 10);
    if (!isStrictIsoDate(value.last_verified_at)) errors.push(issue("ACTIVE_LAST_VERIFIED_REQUIRED", "last_verified_at", "ACTIVE requires last_verified_at."));
    if (!isStrictIsoDate(value.next_review_at) || value.next_review_at < today) errors.push(issue("ACTIVE_NEXT_REVIEW_REQUIRED", "next_review_at", "ACTIVE requires a current or future next_review_at."));
  }
  return { ok: errors.length === 0, errors, warnings };
};

export const assertCountryRecord = (value: unknown): asserts value is CountryRecord => {
  const result = validateCountryRecord(value);
  if (!result.ok) throw new Error(result.errors.map(item => `${item.path}: ${item.message}`).join("; "));
};

export const officialHostsFor = (countryCode: CbiCountryCode): readonly string[] => CBI_OFFICIAL_HOSTS[countryCode];
