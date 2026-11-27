/**
 * Candidate Hong Kong identity-pathway and policy-source registry.
 *
 * This file is deliberately a source registry, not an eligibility engine. The
 * keys below are product candidates and must be reconciled with the Canonical
 * PostgreSQL enum before they are persisted or used for an automated decision.
 * No initial stay duration, historic approval, or case outcome is encoded here.
 */

export const IDENTITY_POLICY_AS_OF = "2026-11-28" as const;

export const identityPolicySources = {
  immDEntryIndex: "https://www.immd.gov.hk/eng/services/index.html",
  admissionSchemesOverview:
    "https://www.immd.gov.hk/eng/useful_information/admission-schemes-talents-professionals-entrepreneurs.html",
  ttps: "https://www.immd.gov.hk/eng/services/visas/TTPS.html",
  ttpsFaq: "https://www.immd.gov.hk/eng/faq/TTPS.html",
  ttpsGuidebook: "https://www.immd.gov.hk/pdforms/ID%28E%291026.pdf",
  qmas:
    "https://www.immd.gov.hk/eng/services/visas/quality_migrant_admission_scheme.html",
  asmtp: "https://www.immd.gov.hk/eng/services/visas/ASMTP.html",
  gep: "https://www.immd.gov.hk/eng/services/visas/GEP.html",
  student: "https://www.immd.gov.hk/eng/services/visas/study.html",
  iang: "https://www.immd.gov.hk/eng/services/visas/IANG.html",
  newCies: "https://www.immd.gov.hk/eng/services/visas/newcies.html",
  newCiesLaunchNotice:
    "https://www.immd.gov.hk/sc/services/hk-visas/capital-investment-entrant.html",
  newCiesInvestHKResources: "https://www.newcies.gov.hk/en/resources/",
  newCiesInvestHKFaqs: "https://www.newcies.gov.hk/en/resources/faqs/",
  legacyCiesSuspension:
    "https://www.immd.gov.hk/eng/press/press-releases/20150114.html",
  legacyCiesFaq:
    "https://www.immd.gov.hk/eng/faq/suspension-of-the-capital-investment-entrant-scheme.html",
  gepTpAndAsmtpTp: "https://www.immd.gov.hk/eng/services/visas/TPStream.html",
  techTas: "https://www.immd.gov.hk/eng/services/visas/TECHTAS.html",
  vpas: "https://www.immd.gov.hk/eng/services/visas/vpas.html",
  roaEligibility: "https://www.immd.gov.hk/eng/services/roa/eligible.html",
  roaTerms: "https://www.immd.gov.hk/eng/services/roa/term.html",
  roaFaq: "https://www.immd.gov.hk/eng/faq/faqroa.html",
  roaApplication:
    "https://www.immd.gov.hk/eng/services/right-of-abode-in-hksar/apply.html",
  reEntryIntoHk:
    "https://www.immd.gov.hk/eng/services/visas/re_entry_into_HK.html",
  hkIdFaq: "https://www.immd.gov.hk/eng/faq/faq_hkic.html",
  hkIdRegistration:
    "https://www.immd.gov.hk/eng/services/hkid/reg_replace.html",
  hkIdDocumentGuide: "https://www.immd.gov.hk/pdforms/rop138.pdf",
  hksarPassport:
    "https://www.immd.gov.hk/eng/service/travel_document/apply_for_hksar_passport.html",
} as const;

export type IdentityPathwayKey =
  | "TTPS_A"
  | "TTPS_B"
  | "TTPS_C"
  | "QMAS"
  | "ASMTP"
  | "GEP"
  | "STUDENT"
  | "IANG"
  | "NEW_CIES"
  | "LEGACY_CIES"
  | "HK_BIRTH_RIGHT_OF_ABODE"
  | "DEPENDANT"
  | "HK_PERMANENT_RESIDENT"
  | "RIGHT_TO_LAND"
  | "UNCONDITIONAL_STAY"
  | "TECHTAS"
  | "VPAS"
  | "GEP_TP"
  | "ASMTP_TP"
  | "OTHER";

export type IdentityPathwayCategory =
  | "admission"
  | "residence"
  | "document"
  | "relationship"
  | "other";

export type IdentityPathway = Readonly<{
  key: IdentityPathwayKey;
  labelZh: string;
  labelEn: string;
  category: IdentityPathwayCategory;
  candidateOnly: true;
  policyRuleIds: readonly string[];
  sourceUrls: readonly string[];
}>;

const reminderGuardRule = "IDP-REMINDER-CASE-WINDOW";

export const identityPathways = {
  TTPS_A: {
    key: "TTPS_A",
    labelZh: "高才通 A 类",
    labelEn: "Top Talent Pass Scheme — Category A",
    category: "admission",
    candidateOnly: true,
    policyRuleIds: ["IDP-TTPS", reminderGuardRule],
    sourceUrls: [identityPolicySources.ttps, identityPolicySources.ttpsFaq],
  },
  TTPS_B: {
    key: "TTPS_B",
    labelZh: "高才通 B 类",
    labelEn: "Top Talent Pass Scheme — Category B",
    category: "admission",
    candidateOnly: true,
    policyRuleIds: ["IDP-TTPS", reminderGuardRule],
    sourceUrls: [identityPolicySources.ttps, identityPolicySources.ttpsFaq],
  },
  TTPS_C: {
    key: "TTPS_C",
    labelZh: "高才通 C 类",
    labelEn: "Top Talent Pass Scheme — Category C",
    category: "admission",
    candidateOnly: true,
    policyRuleIds: ["IDP-TTPS", reminderGuardRule],
    sourceUrls: [identityPolicySources.ttps, identityPolicySources.ttpsFaq],
  },
  QMAS: {
    key: "QMAS",
    labelZh: "优秀人才入境计划",
    labelEn: "Quality Migrant Admission Scheme",
    category: "admission",
    candidateOnly: true,
    policyRuleIds: ["IDP-QMAS", reminderGuardRule],
    sourceUrls: [identityPolicySources.qmas],
  },
  ASMTP: {
    key: "ASMTP",
    labelZh: "输入内地人才计划",
    labelEn: "Admission Scheme for Mainland Talents and Professionals",
    category: "admission",
    candidateOnly: true,
    policyRuleIds: ["IDP-ASMTP", reminderGuardRule],
    sourceUrls: [identityPolicySources.asmtp],
  },
  GEP: {
    key: "GEP",
    labelZh: "一般就业政策",
    labelEn: "General Employment Policy",
    category: "admission",
    candidateOnly: true,
    policyRuleIds: ["IDP-GEP", reminderGuardRule],
    sourceUrls: [identityPolicySources.gep],
  },
  STUDENT: {
    key: "STUDENT",
    labelZh: "学生身份（教育／学习）",
    labelEn: "Student status (education / study)",
    category: "admission",
    candidateOnly: true,
    policyRuleIds: ["IDP-STUDENT", reminderGuardRule],
    sourceUrls: [identityPolicySources.immDEntryIndex],
  },
  IANG: {
    key: "IANG",
    labelZh: "非本地毕业生留港／回港就业安排",
    labelEn: "Immigration Arrangements for Non-local Graduates",
    category: "admission",
    candidateOnly: true,
    policyRuleIds: ["IDP-IANG", reminderGuardRule],
    sourceUrls: [identityPolicySources.iang],
  },
  NEW_CIES: {
    key: "NEW_CIES",
    labelZh: "新资本投资者入境计划",
    labelEn: "New Capital Investment Entrant Scheme",
    category: "admission",
    candidateOnly: true,
    policyRuleIds: ["IDP-NEW-CIES", reminderGuardRule],
    sourceUrls: [
      identityPolicySources.newCies,
      identityPolicySources.newCiesLaunchNotice,
      identityPolicySources.newCiesInvestHKResources,
      identityPolicySources.newCiesInvestHKFaqs,
    ],
  },
  LEGACY_CIES: {
    key: "LEGACY_CIES",
    labelZh: "资本投资者入境计划（历史记录）",
    labelEn: "Capital Investment Entrant Scheme (historical record)",
    category: "admission",
    candidateOnly: true,
    policyRuleIds: ["IDP-LEGACY-CIES", reminderGuardRule],
    sourceUrls: [
      identityPolicySources.legacyCiesSuspension,
      identityPolicySources.legacyCiesFaq,
    ],
  },
  HK_BIRTH_RIGHT_OF_ABODE: {
    key: "HK_BIRTH_RIGHT_OF_ABODE",
    labelZh: "香港出生及相关居留权路径",
    labelEn: "Hong Kong birth and related right-of-abode pathway",
    category: "residence",
    candidateOnly: true,
    policyRuleIds: ["IDP-HK-BIRTH-ROA", "IDP-ROA-ELIGIBILITY", reminderGuardRule],
    sourceUrls: [identityPolicySources.roaEligibility, identityPolicySources.roaFaq],
  },
  DEPENDANT: {
    key: "DEPENDANT",
    labelZh: "受养人身份",
    labelEn: "Dependant status",
    category: "relationship",
    candidateOnly: true,
    policyRuleIds: ["IDP-DEPENDANT", reminderGuardRule],
    sourceUrls: [identityPolicySources.admissionSchemesOverview],
  },
  HK_PERMANENT_RESIDENT: {
    key: "HK_PERMANENT_RESIDENT",
    labelZh: "香港永久居民身份",
    labelEn: "Hong Kong permanent resident status",
    category: "residence",
    candidateOnly: true,
    policyRuleIds: [
      "IDP-ROA-ELIGIBILITY",
      "IDP-ROA-ORDINARY-RESIDENCE",
      "IDP-ABSENCE-CIRCUMSTANCES",
      "IDP-HKIC-ADULT",
      "IDP-HKSAR-PASSPORT",
      reminderGuardRule,
    ],
    sourceUrls: [
      identityPolicySources.roaEligibility,
      identityPolicySources.roaTerms,
      identityPolicySources.roaFaq,
      identityPolicySources.hkIdRegistration,
      identityPolicySources.hksarPassport,
    ],
  },
  RIGHT_TO_LAND: {
    key: "RIGHT_TO_LAND",
    labelZh: "入境权／居留权相关状态",
    labelEn: "Right to land / related residence status",
    category: "residence",
    candidateOnly: true,
    policyRuleIds: ["IDP-RIGHT-TO-LAND", "IDP-ROA-ORDINARY-RESIDENCE", reminderGuardRule],
    sourceUrls: [identityPolicySources.roaTerms, identityPolicySources.roaFaq],
  },
  UNCONDITIONAL_STAY: {
    key: "UNCONDITIONAL_STAY",
    labelZh: "无条件限制逗留",
    labelEn: "Unconditional stay",
    category: "residence",
    candidateOnly: true,
    policyRuleIds: ["IDP-UNCONDITIONAL-STAY", "IDP-REENTRY-CONDITION", reminderGuardRule],
    sourceUrls: [identityPolicySources.roaTerms],
  },
  TECHTAS: {
    key: "TECHTAS",
    labelZh: "科技人才入境计划",
    labelEn: "Technology Talent Admission Scheme",
    category: "admission",
    candidateOnly: true,
    policyRuleIds: ["IDP-TECHTAS", reminderGuardRule],
    sourceUrls: [identityPolicySources.techTas],
  },
  VPAS: {
    key: "VPAS",
    labelZh: "职业专业人士入境计划",
    labelEn: "Vocational Professionals Admission Scheme",
    category: "admission",
    candidateOnly: true,
    policyRuleIds: ["IDP-VPAS", reminderGuardRule],
    sourceUrls: [identityPolicySources.vpas],
  },
  GEP_TP: {
    key: "GEP_TP",
    labelZh: "一般就业政策（技术专才类别）",
    labelEn: "General Employment Policy (Technical Professionals Stream)",
    category: "admission",
    candidateOnly: true,
    policyRuleIds: ["IDP-GEP-TP", reminderGuardRule],
    sourceUrls: [identityPolicySources.gepTpAndAsmtpTp],
  },
  ASMTP_TP: {
    key: "ASMTP_TP",
    labelZh: "输入内地人才计划（技术专才类别）",
    labelEn: "ASMTP (Technical Professionals Stream)",
    category: "admission",
    candidateOnly: true,
    policyRuleIds: ["IDP-ASMTP-TP", reminderGuardRule],
    sourceUrls: [identityPolicySources.gepTpAndAsmtpTp],
  },
  OTHER: {
    key: "OTHER",
    labelZh: "其他待核验身份类别",
    labelEn: "Other identity category pending verification",
    category: "other",
    candidateOnly: true,
    policyRuleIds: ["IDP-OTHER", reminderGuardRule],
    sourceUrls: [identityPolicySources.immDEntryIndex],
  },
} as const satisfies Readonly<Record<IdentityPathwayKey, IdentityPathway>>;

export type IdentityPolicyReviewedState =
  | "OFFICIAL_SOURCE_REVIEWED"
  | "SOURCE_REVIEW_REQUIRED"
  | "HISTORICAL_SCOPE_REVIEW_REQUIRED"
  | "PRODUCT_GOVERNANCE_REQUIRED";

/** Stable schema version for this candidate registry (not an official policy version). */
export const IDENTITY_POLICY_REGISTRY_VERSION =
  "identity-policy-registry-v1.0.0" as const;

export type IdentityPolicyRule = Readonly<{
  ruleId: string;
  registryVersion: typeof IDENTITY_POLICY_REGISTRY_VERSION;
  /** Null means the official source did not expose a revision date in this review. */
  officialSourceRevisionDate: string | null;
  titleZh: string;
  titleEn: string;
  pathwayKeys: readonly (IdentityPathwayKey | "GENERAL")[];
  sourceUrls: readonly string[];
  sourceVerified: boolean;
  reviewedState: IdentityPolicyReviewedState;
  sourceCheckedOn: typeof IDENTITY_POLICY_AS_OF;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  conditionsZh: readonly string[];
  conditionsEn: readonly string[];
  humanReviewConditionZh: string;
  humanReviewConditionEn: string;
  automationGuardrail: "NO_AUTOMATIC_DECISION" | "NO_AUTOMATIC_REMINDER";
}>;

const caseReviewZh =
  "须由人工核对个案批准文件、实际身份、日期、适用版本及官方要求；资料不完整时保持待核验。";
const caseReviewEn =
  "A human must verify the case approval document, actual status, dates, applicable version and official requirements; incomplete evidence remains pending review.";

type IdentityPolicyRuleDraft = Omit<
  IdentityPolicyRule,
  "registryVersion" | "officialSourceRevisionDate"
>;

const rule = <T extends IdentityPolicyRuleDraft>(
  value: T,
): IdentityPolicyRule => ({
  ...value,
  registryVersion: IDENTITY_POLICY_REGISTRY_VERSION,
  officialSourceRevisionDate: null,
});

export const identityPolicyRules = {
  "IDP-TTPS": rule({
    ruleId: "IDP-TTPS",
    titleZh: "高才通类别及官方入境安排",
    titleEn: "TTPS categories and official entry arrangements",
    pathwayKeys: ["TTPS_A", "TTPS_B", "TTPS_C"],
    sourceUrls: [identityPolicySources.ttps, identityPolicySources.ttpsFaq],
    sourceVerified: true,
    reviewedState: "OFFICIAL_SOURCE_REVIEWED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: [
      "官方页面按 A、B、C 类分别描述申请条件；具体个案仍以入境处决定及已核发文件为准。",
      "官方页面中的逗留安排不在本候选目录中预设；不得用通用期限覆盖个案批准期限或历史记录。",
    ],
    conditionsEn: [
      "The official page describes Categories A, B and C separately; each case remains subject to ImmD determination and issued documents.",
      "Stay arrangements shown by the official source are intentionally not preset here; a generic duration must not replace a case-approved or historical duration.",
    ],
    humanReviewConditionZh: caseReviewZh,
    humanReviewConditionEn: caseReviewEn,
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  "IDP-QMAS": rule({
    ruleId: "IDP-QMAS",
    titleZh: "优秀人才入境计划来源",
    titleEn: "QMAS source record",
    pathwayKeys: ["QMAS"],
    sourceUrls: [identityPolicySources.qmas],
    sourceVerified: true,
    reviewedState: "OFFICIAL_SOURCE_REVIEWED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: ["规则、计分或甄选安排可能更新；以官方当期版本为准。"],
    conditionsEn: ["Rules, scoring or selection arrangements may change; use the current official version."],
    humanReviewConditionZh: caseReviewZh,
    humanReviewConditionEn: caseReviewEn,
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  "IDP-ASMTP": rule({
    ruleId: "IDP-ASMTP",
    titleZh: "输入内地人才计划来源",
    titleEn: "ASMTP source record",
    pathwayKeys: ["ASMTP"],
    sourceUrls: [identityPolicySources.asmtp],
    sourceVerified: true,
    reviewedState: "OFFICIAL_SOURCE_REVIEWED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: ["申请条件及续期事项以入境处现行页面和个案文件为准。"],
    conditionsEn: ["Entry and extension conditions must be taken from the current ImmD page and the case documents."],
    humanReviewConditionZh: caseReviewZh,
    humanReviewConditionEn: caseReviewEn,
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  "IDP-GEP": rule({
    ruleId: "IDP-GEP",
    titleZh: "一般就业政策来源",
    titleEn: "GEP source record",
    pathwayKeys: ["GEP"],
    sourceUrls: [identityPolicySources.gep],
    sourceVerified: true,
    reviewedState: "OFFICIAL_SOURCE_REVIEWED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: ["个案申请、受聘安排、续期和受养人安排均须分别核验。"],
    conditionsEn: ["The case application, employment arrangement, extension and dependant arrangement require separate verification."],
    humanReviewConditionZh: caseReviewZh,
    humanReviewConditionEn: caseReviewEn,
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  "IDP-STUDENT": rule({
    ruleId: "IDP-STUDENT",
    titleZh: "学生身份来源",
    titleEn: "Student status source record",
    pathwayKeys: ["STUDENT"],
    sourceUrls: [identityPolicySources.immDEntryIndex],
    sourceVerified: false,
    reviewedState: "SOURCE_REVIEW_REQUIRED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: ["本候选项只标记学习／教育用途；具体学校、课程、签证及逗留期限须另行按官方个案资料核验。"],
    conditionsEn: ["This candidate marks education/study purpose only; school, programme, visa and stay details require separate official case verification."],
    humanReviewConditionZh: caseReviewZh,
    humanReviewConditionEn: caseReviewEn,
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  "IDP-IANG": rule({
    ruleId: "IDP-IANG",
    titleZh: "非本地毕业生安排来源",
    titleEn: "IANG source record",
    pathwayKeys: ["IANG"],
    sourceUrls: [identityPolicySources.iang],
    sourceVerified: true,
    reviewedState: "OFFICIAL_SOURCE_REVIEWED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: ["须核验相关毕业资格、身份状态、工作安排及当期政策版本。"],
    conditionsEn: ["Relevant graduation qualification, status, employment arrangement and current policy version must be verified."],
    humanReviewConditionZh: caseReviewZh,
    humanReviewConditionEn: caseReviewEn,
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  "IDP-NEW-CIES": rule({
    ruleId: "IDP-NEW-CIES",
    titleZh: "新资本投资者入境计划来源",
    titleEn: "New CIES source record",
    pathwayKeys: ["NEW_CIES"],
    sourceUrls: [
      identityPolicySources.newCies,
      identityPolicySources.newCiesLaunchNotice,
      identityPolicySources.newCiesInvestHKResources,
      identityPolicySources.newCiesInvestHKFaqs,
    ],
    sourceVerified: true,
    reviewedState: "OFFICIAL_SOURCE_REVIEWED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: "2024-03-01",
    effectiveTo: null,
    conditionsZh: ["官方资料显示新计划于 2024-03-01 推出；投资、资产、申请及延期条件不可从本目录推断。"],
    conditionsEn: ["Official material records the New Scheme launch on 2024-03-01; investment, asset, application and extension conditions must not be inferred from this registry."],
    humanReviewConditionZh: caseReviewZh,
    humanReviewConditionEn: caseReviewEn,
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  "IDP-LEGACY-CIES": rule({
    ruleId: "IDP-LEGACY-CIES",
    titleZh: "旧资本投资者入境计划历史来源",
    titleEn: "Legacy CIES historical source record",
    pathwayKeys: ["LEGACY_CIES"],
    sourceUrls: [identityPolicySources.legacyCiesSuspension, identityPolicySources.legacyCiesFaq],
    sourceVerified: true,
    reviewedState: "HISTORICAL_SCOPE_REVIEW_REQUIRED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: "2015-01-15",
    conditionsZh: ["官方资料显示旧计划自 2015-01-15 起暂停；已批准或历史个案必须按其当时批准文件及适用规则处理。"],
    conditionsEn: ["Official material records suspension from 2015-01-15; approved or historical cases require their contemporaneous approval documents and applicable rules."],
    humanReviewConditionZh: "须人工核对收件日、批准／原则上批准状态及当时适用规则；禁止以现行新计划覆盖历史事实。",
    humanReviewConditionEn: "A human must verify receipt date, approval or approval-in-principle status and the rules then in force; the current New Scheme must not overwrite historical facts.",
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  "IDP-HK-BIRTH-ROA": rule({
    ruleId: "IDP-HK-BIRTH-ROA",
    titleZh: "香港出生及相关居留权来源",
    titleEn: "Hong Kong birth and related ROA source record",
    pathwayKeys: ["HK_BIRTH_RIGHT_OF_ABODE"],
    sourceUrls: [identityPolicySources.roaEligibility, identityPolicySources.roaFaq],
    sourceVerified: true,
    reviewedState: "OFFICIAL_SOURCE_REVIEWED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: ["香港出生、父母身份、国籍及永久居民／居留权类别须按适用法律和个案文件分别核验。"],
    conditionsEn: ["Birth in Hong Kong, parent status, nationality and the applicable permanent-residence/ROA category require separate legal and case-document verification."],
    humanReviewConditionZh: caseReviewZh,
    humanReviewConditionEn: caseReviewEn,
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  "IDP-DEPENDANT": rule({
    ruleId: "IDP-DEPENDANT",
    titleZh: "受养人及保证关系来源",
    titleEn: "Dependant and sponsorship relationship source record",
    pathwayKeys: ["DEPENDANT"],
    sourceUrls: [identityPolicySources.admissionSchemesOverview, identityPolicySources.gep],
    sourceVerified: true,
    reviewedState: "OFFICIAL_SOURCE_REVIEWED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: ["保证人、受养人、关系证明及各自获准逗留期限必须独立记录和核验，不得以保证人的日期覆盖受养人日期。"],
    conditionsEn: ["Sponsor, dependant, relationship evidence and each approved stay period must be recorded and verified independently; a sponsor date must not overwrite a dependant date."],
    humanReviewConditionZh: caseReviewZh,
    humanReviewConditionEn: caseReviewEn,
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  "IDP-ROA-ELIGIBILITY": rule({
    ruleId: "IDP-ROA-ELIGIBILITY",
    titleZh: "香港永久居民及居留权资格来源",
    titleEn: "Hong Kong permanent residence and ROA eligibility source",
    pathwayKeys: ["HK_PERMANENT_RESIDENT", "HK_BIRTH_RIGHT_OF_ABODE"],
    sourceUrls: [identityPolicySources.roaEligibility, identityPolicySources.roaApplication],
    sourceVerified: true,
    reviewedState: "OFFICIAL_SOURCE_REVIEWED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: ["官方页面列出法定资格类别；本规则不代替永久居民身份核实或入境处决定。"],
    conditionsEn: ["The official page lists statutory eligibility categories; this rule does not replace verification of permanent-resident status or an ImmD determination."],
    humanReviewConditionZh: "须人工核对有效旅行证件、永久居民身份证／确认书、国籍及适用资格类别。",
    humanReviewConditionEn: "A human must verify the valid travel document, permanent identity card/acknowledgement, nationality and applicable eligibility category.",
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  "IDP-ROA-ORDINARY-RESIDENCE": rule({
    ruleId: "IDP-ROA-ORDINARY-RESIDENCE",
    titleZh: "通常居住与永久居民辅助记录",
    titleEn: "Ordinary residence and permanent-residence support record",
    pathwayKeys: ["HK_PERMANENT_RESIDENT", "RIGHT_TO_LAND"],
    sourceUrls: [identityPolicySources.roaTerms, identityPolicySources.roaFaq],
    sourceVerified: true,
    reviewedState: "OFFICIAL_SOURCE_REVIEWED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: ["通常居住须按官方定义及实际事实评估；累计在港天数不得直接等同通常居住或永居资格。"],
    conditionsEn: ["Ordinary residence must be assessed against the official definition and actual facts; accumulated days in Hong Kong must not be equated with ordinary residence or permanent-residence eligibility."],
    humanReviewConditionZh: "须人工核对居住事实、离港原因、连续离港区间及相关证据；资料不完整时只显示待核验区间。",
    humanReviewConditionEn: "A human must review residence facts, reasons for absence, continuous absence intervals and evidence; incomplete data remains a pending-verification interval.",
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  "IDP-ABSENCE-CIRCUMSTANCES": rule({
    ruleId: "IDP-ABSENCE-CIRCUMSTANCES",
    titleZh: "离港及通常居住例外情形来源",
    titleEn: "Absence and ordinary-residence circumstances source",
    pathwayKeys: ["HK_PERMANENT_RESIDENT", "RIGHT_TO_LAND"],
    sourceUrls: [identityPolicySources.roaFaq],
    sourceVerified: true,
    reviewedState: "OFFICIAL_SOURCE_REVIEWED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: ["离港原因、家庭联系、工作／业务、回港安排等事实可能影响个案评估；不存在统一的法定回港周期。"],
    conditionsEn: ["Reasons for absence, family ties, work/business and return arrangements may affect case assessment; there is no single uniform statutory return cycle."],
    humanReviewConditionZh: "须人工审阅离港事实和证据，不得由提醒引擎自行判断永久居民资格。",
    humanReviewConditionEn: "A human must review absence facts and evidence; the reminder engine must not determine permanent-resident eligibility.",
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  "IDP-RIGHT-TO-LAND": rule({
    ruleId: "IDP-RIGHT-TO-LAND",
    titleZh: "入境权来源",
    titleEn: "Right to land source record",
    pathwayKeys: ["RIGHT_TO_LAND"],
    sourceUrls: [identityPolicySources.roaTerms, identityPolicySources.roaFaq],
    sourceVerified: true,
    reviewedState: "OFFICIAL_SOURCE_REVIEWED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: ["入境权与居留权、永久居民身份及无条件限制逗留分别管理；不能互相推定。"],
    conditionsEn: ["Right to land, right of abode, permanent-resident status and unconditional stay are managed separately and must not be inferred from one another."],
    humanReviewConditionZh: caseReviewZh,
    humanReviewConditionEn: caseReviewEn,
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  "IDP-UNCONDITIONAL-STAY": rule({
    ruleId: "IDP-UNCONDITIONAL-STAY",
    titleZh: "无条件限制逗留来源",
    titleEn: "Unconditional stay source record",
    pathwayKeys: ["UNCONDITIONAL_STAY"],
    sourceUrls: [identityPolicySources.roaTerms, identityPolicySources.reEntryIntoHk],
    sourceVerified: true,
    reviewedState: "OFFICIAL_SOURCE_REVIEWED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: ["无条件限制逗留是状态描述，不是统一的签证期限或永居资格判定。"],
    conditionsEn: ["Unconditional stay is a status description, not a universal visa duration or permanent-residence determination."],
    humanReviewConditionZh: caseReviewZh,
    humanReviewConditionEn: caseReviewEn,
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  "IDP-REENTRY-CONDITION": rule({
    ruleId: "IDP-REENTRY-CONDITION",
    titleZh: "按获准逗留期限核对回港条件",
    titleEn: "Conditional re-entry check against permitted stay",
    pathwayKeys: ["GENERAL"],
    sourceUrls: [identityPolicySources.reEntryIntoHk],
    sourceVerified: true,
    reviewedState: "OFFICIAL_SOURCE_REVIEWED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: [
      "非永久居民回港须在获准逗留期限有效期内，并且取得居留身份的情况没有改变。",
      "该页面不构成个案回港资格判断；实际提醒必须引用经核验的个案期限。",
    ],
    conditionsEn: [
      "A non-permanent resident's return depends on returning within the validity of the permitted limit of stay and the circumstances on which residence status was acquired remaining unchanged.",
      "The page is not a case-level re-entry determination; any reminder must reference a verified case-specific limit of stay.",
    ],
    humanReviewConditionZh: caseReviewZh,
    humanReviewConditionEn: caseReviewEn,
    automationGuardrail: "NO_AUTOMATIC_REMINDER",
  }),
  "IDP-TECHTAS": rule({
    ruleId: "IDP-TECHTAS",
    titleZh: "科技人才入境计划来源",
    titleEn: "TechTAS source record",
    pathwayKeys: ["TECHTAS"],
    sourceUrls: [identityPolicySources.techTas],
    sourceVerified: true,
    reviewedState: "OFFICIAL_SOURCE_REVIEWED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: ["须核验配额、公司及人才条件、获批文件和当前适用版本。"],
    conditionsEn: ["Quota, company and talent conditions, approval documents and the applicable current version require verification."],
    humanReviewConditionZh: caseReviewZh,
    humanReviewConditionEn: caseReviewEn,
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  "IDP-VPAS": rule({
    ruleId: "IDP-VPAS",
    titleZh: "职业专业人士入境计划来源",
    titleEn: "VPAS source record",
    pathwayKeys: ["VPAS"],
    sourceUrls: [identityPolicySources.vpas],
    sourceVerified: true,
    reviewedState: "OFFICIAL_SOURCE_REVIEWED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: ["VPAS 为受特定学年和专业安排约束的计划；不可由本目录外推持续开放或个案结果。"],
    conditionsEn: ["VPAS is subject to specified academic-year and trade arrangements; continued availability or an outcome must not be inferred from this registry."],
    humanReviewConditionZh: caseReviewZh,
    humanReviewConditionEn: caseReviewEn,
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  "IDP-GEP-TP": rule({
    ruleId: "IDP-GEP-TP",
    titleZh: "GEP 技术专才类别来源",
    titleEn: "GEP Technical Professionals Stream source record",
    pathwayKeys: ["GEP_TP"],
    sourceUrls: [identityPolicySources.gepTpAndAsmtpTp],
    sourceVerified: true,
    reviewedState: "OFFICIAL_SOURCE_REVIEWED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: ["该类别与一般 GEP 分开记录；行业、配额、技能及个案文件必须分别核验。"],
    conditionsEn: ["This stream is recorded separately from the general GEP; sector, quota, skill and case-document conditions require separate verification."],
    humanReviewConditionZh: caseReviewZh,
    humanReviewConditionEn: caseReviewEn,
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  "IDP-ASMTP-TP": rule({
    ruleId: "IDP-ASMTP-TP",
    titleZh: "ASMTP 技术专才类别来源",
    titleEn: "ASMTP Technical Professionals Stream source record",
    pathwayKeys: ["ASMTP_TP"],
    sourceUrls: [identityPolicySources.gepTpAndAsmtpTp],
    sourceVerified: true,
    reviewedState: "OFFICIAL_SOURCE_REVIEWED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: ["该类别与一般 ASMTP 分开记录；不得以同义类别覆盖 Canonical 枚举或历史个案。"],
    conditionsEn: ["This stream is recorded separately from general ASMTP; a synonym must not overwrite a Canonical enum or historical case."],
    humanReviewConditionZh: caseReviewZh,
    humanReviewConditionEn: caseReviewEn,
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  "IDP-HKIC-11-18": rule({
    ruleId: "IDP-HKIC-11-18",
    titleZh: "香港身份证 11 岁及 18 岁节点",
    titleEn: "HKIC age-11 and age-18 milestones",
    pathwayKeys: ["HK_BIRTH_RIGHT_OF_ABODE", "HK_PERMANENT_RESIDENT"],
    sourceUrls: [identityPolicySources.hkIdFaq, identityPolicySources.hkIdRegistration, identityPolicySources.hkIdDocumentGuide],
    sourceVerified: true,
    reviewedState: "OFFICIAL_SOURCE_REVIEWED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: ["11 岁登记／换领儿童身份证与 18 岁换领成人身份证是独立证件事件；只记录官方窗口，不把它们当作身份资格结论。"],
    conditionsEn: ["Age-11 registration/replacement and age-18 adult-card replacement are separate document events; record official windows without treating them as status conclusions."],
    humanReviewConditionZh: "须人工核对出生日期、当前身份证类别、在港／离港事实和原件；未满 11 岁规则另行处理。",
    humanReviewConditionEn: "A human must verify date of birth, current card type, presence/absence facts and originals; under-11 rules are handled separately.",
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  "IDP-HKIC-ADULT": rule({
    ruleId: "IDP-HKIC-ADULT",
    titleZh: "成人及永久身份证记录",
    titleEn: "Adult and permanent identity-card record",
    pathwayKeys: ["HK_PERMANENT_RESIDENT"],
    sourceUrls: [identityPolicySources.hkIdFaq, identityPolicySources.hkIdRegistration],
    sourceVerified: true,
    reviewedState: "OFFICIAL_SOURCE_REVIEWED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: ["永久居民身份证、普通身份证及证件补领事件分别记录；不得与获准逗留期限混为同一字段。"],
    conditionsEn: ["Permanent, ordinary identity-card and replacement events are recorded separately; they must not be conflated with a limit of stay."],
    humanReviewConditionZh: caseReviewZh,
    humanReviewConditionEn: caseReviewEn,
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  "IDP-HKSAR-PASSPORT": rule({
    ruleId: "IDP-HKSAR-PASSPORT",
    titleZh: "香港特别行政区护照来源",
    titleEn: "HKSAR passport source record",
    pathwayKeys: ["HK_PERMANENT_RESIDENT"],
    sourceUrls: [identityPolicySources.hksarPassport, identityPolicySources.hkIdFaq],
    sourceVerified: true,
    reviewedState: "OFFICIAL_SOURCE_REVIEWED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: ["护照申请资格与永久居民身份证、国籍及居留权分别核验；递交成功不等于批准。"],
    conditionsEn: ["Passport eligibility is verified separately against permanent identity card, nationality and residence status; successful submission does not mean approval."],
    humanReviewConditionZh: "须人工核对有效永久居民身份证、国籍及官方申请材料，不得自动判定护照资格。",
    humanReviewConditionEn: "A human must verify the valid permanent identity card, nationality and official application material; passport eligibility must not be automated.",
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  "IDP-OTHER": rule({
    ruleId: "IDP-OTHER",
    titleZh: "其他身份类别待核验",
    titleEn: "Other identity category pending verification",
    pathwayKeys: ["OTHER"],
    sourceUrls: [identityPolicySources.immDEntryIndex],
    sourceVerified: false,
    reviewedState: "SOURCE_REVIEW_REQUIRED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: ["仅作为捕获未映射类别的候选占位；必须在 Canonical 枚举审查和人工政策审查后才能具体化。"],
    conditionsEn: ["Placeholder for an unmapped category only; it requires Canonical enum review and human policy review before being made specific."],
    humanReviewConditionZh: "必须人工确认身份名称、官方来源、历史适用范围及是否存在重复同义枚举。",
    humanReviewConditionEn: "A human must confirm the identity name, official source, historical scope and whether a duplicate synonym exists in the Canonical enum.",
    automationGuardrail: "NO_AUTOMATIC_DECISION",
  }),
  [reminderGuardRule]: rule({
    ruleId: reminderGuardRule,
    titleZh: "提醒引擎个案窗口闸门",
    titleEn: "Reminder engine case-window gate",
    pathwayKeys: ["GENERAL"],
    sourceUrls: [],
    sourceVerified: false,
    reviewedState: "PRODUCT_GOVERNANCE_REQUIRED",
    sourceCheckedOn: IDENTITY_POLICY_AS_OF,
    effectiveFrom: null,
    effectiveTo: null,
    conditionsZh: [
      "没有经核验的个案获准逗留期限、官方申请窗口或经授权的内部建议窗口时，不得自动排程提醒。",
      "政策变更不得自动改写已核验的个案事实；日期变更、撤权、时区和闰年须可审计。",
    ],
    conditionsEn: [
      "Do not schedule an automatic reminder without a verified case-approved stay date, official application window or authorised internal recommendation window.",
      "Policy changes must not rewrite verified case facts; date changes, revocation, timezone and leap-year handling must remain auditable.",
    ],
    humanReviewConditionZh: "须由授权人员确认个案窗口及提醒授权；通知渠道须另有授权与送达回执。",
    humanReviewConditionEn: "An authorised person must confirm the case window and reminder consent; notification channels require separate consent and delivery receipts.",
    automationGuardrail: "NO_AUTOMATIC_REMINDER",
  }),
} as const satisfies Readonly<Record<string, IdentityPolicyRule>>;

export type IdentityPolicyRuleId = keyof typeof identityPolicyRules;
