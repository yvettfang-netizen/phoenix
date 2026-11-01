import type { HealthGeoLocale, LocalizedHealthText } from "./health-geo";

/**
 * Content-only contract for Health GEO.  The records are deliberately draft
 * and noindex: they are a source-boundary for the SSR layer, not a medical
 * directory and not a database or API client.
 */
export const HEALTH_GEO_CONTENT_VERSION = "3.0.0" as const;
export const HEALTH_GEO_CONTENT_VERIFIED_AT = "2026-11-02" as const;

const L = (zh: string, en: string): LocalizedHealthText => ({ zh, en });

export type HealthGeoHubId =
  | "family-health-planning"
  | "foreign-patients-china"
  | "overseas-chinese-returning"
  | "shenzhen-international-medical"
  | "hong-kong-greater-bay-area"
  | "international-insurance-claims";

export type HealthGeoGuideId =
  | "foreigners-can-seek-care-in-china"
  | "foreign-patient-shenzhen-preparation"
  | "shenzhen-international-private-medical"
  | "overseas-chinese-returning-care"
  | "hong-kong-resident-shenzhen-care"
  | "greater-bay-area-cross-border-resources"
  | "shenzhen-international-medical-services"
  | "english-care-in-shenzhen"
  | "hong-kong-doctor-shenzhen-registration"
  | "shenzhen-hong-kong-private-cost-comparison"
  | "international-medical-insurance-claims-china"
  | "international-patient-gba-appointment-travel";

export interface HealthGeoSource {
  readonly id: string;
  readonly publisher: string;
  readonly title: LocalizedHealthText;
  readonly url: string;
  readonly sourceType: "government" | "regulator" | "institution" | "official-city-media";
  /** What this link can support; it is not a blanket endorsement. */
  readonly factScope: LocalizedHealthText;
  /** Short machine-readable scope used by the SSR source notes. */
  readonly linkScope: readonly string[];
  readonly verifiedAt: string;
  readonly caution: LocalizedHealthText | null;
}

export interface HealthGeoSection {
  readonly heading: LocalizedHealthText;
  readonly body: LocalizedHealthText;
  readonly points: readonly LocalizedHealthText[];
}

export interface HealthGeoApplicability {
  readonly suitableFor: LocalizedHealthText;
  readonly checkBeforeProceeding: LocalizedHealthText;
  readonly notCovered: LocalizedHealthText;
}

export interface HealthGeoCTA {
  readonly id: string;
  readonly label: LocalizedHealthText;
  readonly href: Readonly<Record<HealthGeoLocale, string>>;
  readonly mode: "controlled-preview";
  readonly note: LocalizedHealthText;
}

export interface HealthGeoHubDescriptor {
  readonly entityId: string;
  readonly id: HealthGeoHubId;
  readonly names: LocalizedHealthText;
  readonly descriptions: LocalizedHealthText;
  readonly paths: Readonly<Record<HealthGeoLocale, string>>;
  readonly routeKind: "existing" | "new-draft";
  readonly guideIds: readonly HealthGeoGuideId[];
  readonly cta: HealthGeoCTA;
  readonly publicationStatus: "draft";
  readonly indexable: false;
}

export interface HealthGeoGuide {
  readonly entityId: string;
  readonly id: HealthGeoGuideId;
  readonly hubId: HealthGeoHubId;
  readonly intent: LocalizedHealthText;
  readonly paths: Readonly<Record<HealthGeoLocale, string>>;
  readonly title: LocalizedHealthText;
  readonly description: LocalizedHealthText;
  readonly directAnswer: LocalizedHealthText;
  readonly sections: readonly [HealthGeoSection, HealthGeoSection, HealthGeoSection];
  readonly applicability: HealthGeoApplicability;
  readonly sourceIds: readonly HealthGeoSourceId[];
  readonly officialSources: readonly HealthGeoSource[];
  readonly verifiedAt: string;
  readonly relatedGuideIds: readonly HealthGeoGuideId[];
  readonly cta: HealthGeoCTA;
  readonly publicationStatus: "draft";
  readonly indexable: false;
  readonly clinicalScope: "non-clinical-preparation-and-navigation";
}

export type HealthGeoSourceId = keyof typeof HEALTH_GEO_SOURCES;

/**
 * Current primary references.  Scope is intentionally narrow: an official
 * institution announcement supports that institution's announcement only;
 * it cannot be used to generalise to all Shenzhen hospitals.
 */
export const HEALTH_GEO_SOURCES = {
  eyeshenzhenInternationalServices2026: {
    id: "eyeshenzhen-international-services-2026",
    publisher: "Amazing Shenzhen / Shenzhen Media Group",
    title: L("深圳医院国际医疗服务概览", "International medical services in Shenzhen hospitals"),
    url: "https://www.eyeshenzhen.com/content/2026-01/16/content_31904902.htm",
    sourceType: "official-city-media",
    factScope: L("仅支持该篇官方城市英文媒体所列机构的服务描述；不是全市医院名录，也不构成合作或接诊保证。", "Supports only the named institutions and descriptions in this official city-media article; it is not a complete city directory or a guarantee of partnership or acceptance."),
    linkScope: ["named-institutions", "international-service-descriptions", "health-shenzhen-appointment-reference"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    caution: L("文中明确提示其他医院也可能接收外籍人士，使用前应逐家核实。", "The article notes that other hospitals may also accept expatriates; verify each institution before relying on it."),
  },
  sysuInternationalCenter2026: {
    id: "sysu-international-center-shenzhen-2026",
    publisher: "Sun Yat-sen University",
    title: L("中山大学附属第八医院在深圳启用国际医疗中心", "SYSU launches an International Medical Center in Shenzhen"),
    url: "https://www.sysu.edu.cn/sysuen/info/1023/58451.htm",
    sourceType: "institution",
    factScope: L("仅支持中山大学附属第八医院国际医疗中心公告中的开设、双语服务及其自述范围。", "Supports only the launch, bilingual service and stated scope of the Eighth Affiliated Hospital of Sun Yat-sen University International Medical Center."),
    linkScope: ["specific-institution-announcement", "specific-center-bilingual-service"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    caution: L("不得据此推断深圳所有机构均提供相同服务。", "Do not generalise this institution's announcement to all Shenzhen providers."),
  },
  nhcHongKongMacaoPhysicianRule: {
    id: "nhc-hong-kong-macao-physician-short-term-practice-rule",
    publisher: "National Health Commission of the PRC",
    title: L("港澳医师在内地短期行医管理规定", "Rules for short-term practice by Hong Kong and Macao physicians in Mainland China"),
    url: "https://www.nhc.gov.cn/wjw/c100221/202201/55f3e85ddf12403388b0f00739407444.shtml",
    sourceType: "government",
    factScope: L("支持港澳医师在内地短期行医的注册、执业地点、类别、范围及证书要求核对。", "Supports checking registration, practice location, category, scope and certificate requirements for Hong Kong and Macao physicians practising short-term in Mainland China."),
    linkScope: ["hk-macao-physician-registration", "practice-location-and-scope"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    caution: L("实际申请应向注册机关和聘用医疗机构核实，本文不判断任何个人资格。", "Verify an actual application with the registration authority and employing medical institution; this page does not assess any individual's eligibility."),
  },
  nhcPublicSearch: {
    id: "nhc-public-health-information-search",
    publisher: "National Health Commission of the PRC",
    title: L("国家卫生健康委政务服务平台信息查询", "NHC public health information search"),
    url: "https://zwfw.nhc.gov.cn/cxx/",
    sourceType: "government",
    factScope: L("支持公众查找执业医师、医院执业登记等官方查询入口。", "Supports official public search entry points for practising physicians and hospital practice registration."),
    linkScope: ["official-physician-search", "official-institution-search"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    caution: L("查询结果和可见字段以官方平台当时显示为准。", "Results and visible fields depend on what the official platform displays at the time of search."),
  },
  shenzhenWjwDirectory: {
    id: "shenzhen-health-commission-provider-and-physician-directory",
    publisher: "Shenzhen Municipal Health Commission",
    title: L("深圳市卫生健康委员会医疗机构及医师查询入口", "Shenzhen Municipal Health Commission provider and physician search"),
    url: "https://wjw.sz.gov.cn/bmfw/wycx/hygl/wjglbm/index.html",
    sourceType: "government",
    factScope: L("支持深圳医疗机构名称、医师执业注册等官方查询入口；不替代逐家核验。", "Supports official entry points for Shenzhen institution names and physician registration; it does not replace institution-by-institution verification."),
    linkScope: ["shenzhen-provider-name-search", "shenzhen-physician-registration-search"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    caution: L("不构成凤启推荐、合作或可预约承诺。", "It is not a Phoenix recommendation, partnership or appointment guarantee."),
  },
  shenzhenWjwPhysicianRegistration: {
    id: "shenzhen-health-commission-physician-registration",
    publisher: "Shenzhen Municipal Health Commission",
    title: L("深圳市医师执业注册办事指南", "Shenzhen physician practice registration guidance"),
    url: "https://wjw.sz.gov.cn/ztzl/yszyzc/",
    sourceType: "government",
    factScope: L("支持深圳辖区医师执业注册审批机关和条件核对。", "Supports checking the authority and conditions for physician practice registration in Shenzhen."),
    linkScope: ["shenzhen-physician-registration-authority", "registration-conditions"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    caution: L("不代表任何未核验医生已具备特定执业范围。", "It does not establish that any unverified doctor has a particular practice scope."),
  },
  shenzhenWjwInstitutionRegistration: {
    id: "shenzhen-health-commission-institution-registration-rules",
    publisher: "Shenzhen Municipal Health Commission",
    title: L("深圳市医疗机构执业登记办法", "Shenzhen medical institution practice registration rules"),
    url: "https://wjw.sz.gov.cn/gkmlpt/content/7/7391/post_7391852.html",
    sourceType: "government",
    factScope: L("支持医疗机构取得执业登记或备案后执业这一监管核对方向。", "Supports the regulatory check that medical institutions require practice registration or filing before operating."),
    linkScope: ["institution-practice-registration", "institution-licensing-check"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    caution: L("具体机构的现行许可及业务范围仍需查询最新官方记录。", "A specific institution's current licence and scope still require a current official-record check."),
  },
  hkGovCrossBoundary2026: {
    id: "hk-government-cross-boundary-healthcare-2026",
    publisher: "Hong Kong Special Administrative Region Government",
    title: L("便利公众跨境使用医疗服务", "Facilitating cross-boundary use of healthcare services"),
    url: "https://www.info.gov.hk/gia/general/202602/25/P2026022500444p.htm",
    sourceType: "government",
    factScope: L("支持香港政府对特定群组跨境医疗试点、电子健康记录及合作安排的说明。", "Supports the Hong Kong Government's description of pilot measures, eHealth functions and cooperation arrangements for specific groups using cross-boundary healthcare."),
    linkScope: ["hong-kong-cross-boundary-pilot-context", "designated-institutions", "ehealth-cross-boundary-context"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    caution: L("试点、指定机构和适用对象会变化，不是一般性资格或接诊承诺。", "Pilots, designated institutions and eligible groups can change; this is not a general eligibility or acceptance promise."),
  },
  hkGovCrossBoundaryInsurance2024: {
    id: "hk-government-cross-boundary-insurance-arrangements-2024",
    publisher: "Hong Kong Special Administrative Region Government",
    title: L("促进跨境医疗咨询的措施", "Measures to facilitate cross-boundary medical consultations"),
    url: "https://www.info.gov.hk/gia/general/202407/17/P2024071700469p.htm",
    sourceType: "government",
    factScope: L("支持香港政府对保险公司个别跨境预先批核和直接理赔安排的说明。", "Supports the Hong Kong Government's description of individual insurers' cross-boundary pre-approval and direct-claim arrangements."),
    linkScope: ["individual-insurer-arrangements", "pre-approval-context", "direct-claim-context"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    caution: L("保险安排取决于个别保险公司、保单及医疗机构，不能概括为普遍保障。", "Arrangements depend on the insurer, policy and provider; they cannot be generalised as universal coverage."),
  },
  hkInsuranceAuthorityClaims: {
    id: "hong-kong-insurance-authority-medical-claims-guidance",
    publisher: "Insurance Authority Hong Kong",
    title: L("医疗保险索偿注意事项", "Insurance Authority tips on making medical insurance claims"),
    url: "https://www.ia.org.hk/en/medical_insurance/tips_on_making_claims.html",
    sourceType: "regulator",
    factScope: L("支持预先批核、索偿文件、时限、最终赔偿决定和合理及惯常费用的准备提示。", "Supports preparation points on pre-authorisation, claim documents, deadlines, final claim decisions and reasonable-and-customary charges."),
    linkScope: ["claim-preparation", "pre-authorisation", "claim-deadline", "policy-terms"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    caution: L("保险保障范围、赔偿额及保费以具体保单条款为准。", "Coverage, claim amounts and premiums depend on the specific policy terms."),
  },
  hkInsuranceAuthorityPolicyholders: {
    id: "hong-kong-insurance-authority-policyholder-protection",
    publisher: "Insurance Authority Hong Kong",
    title: L("医疗保险保单持有人保障", "Insurance Authority protection of policy holders"),
    url: "https://www.ia.org.hk/en/medical_insurance/protection_of_policy_holders.html",
    sourceType: "regulator",
    factScope: L("支持核对香港保险公司和中介的授权、牌照及投诉路径。", "Supports checking authorisation, licensing and complaint routes for Hong Kong insurers and intermediaries."),
    linkScope: ["insurer-authorisation", "intermediary-licensing", "complaint-route"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    caution: L("监管机构不替代保险公司作出个案赔偿决定。", "The regulator does not replace an insurer's case-specific claim decision."),
  },
  shenzhenMedicalPrices: {
    id: "shenzhen-healthcare-security-medical-service-prices",
    publisher: "Shenzhen Healthcare Security Bureau",
    title: L("深圳市医疗服务价格项目", "Shenzhen medical service price items"),
    url: "https://hsa.sz.gov.cn/zwfw/mdml/ylfwxmjg/index.html",
    sourceType: "government",
    factScope: L("支持查找深圳医疗服务价格项目目录和更新时间；不代表某机构最终报价。", "Supports finding Shenzhen medical-service price catalogues and update dates; it is not a final quotation from a particular provider."),
    linkScope: ["shenzhen-price-catalogue", "public-price-reference"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    caution: L("市场调节价、项目范围和实际账单需向医疗机构逐项确认。", "Market-regulated items, scope and the actual bill must be confirmed item by item with the provider."),
  },
  hkHospitalAuthorityFees: {
    id: "hong-kong-hospital-authority-fees-and-charges-2026",
    publisher: "Hospital Authority Hong Kong",
    title: L("香港医院管理局费用及收费", "Hospital Authority fees and charges"),
    url: "https://www.ha.org.hk/visitor/fees_and_charges.asp?lang=ENG",
    sourceType: "government",
    factScope: L("支持核对香港医院管理局公营医疗收费类别和2026年生效的收费资料。", "Supports checking Hong Kong Hospital Authority public-service fee categories and charges effective in 2026."),
    linkScope: ["hong-kong-public-fees", "eligible-and-noneligible-categories"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    caution: L("香港公营医疗收费不等同香港私营医疗报价，不能用于承诺跨境节省。", "Hong Kong public fees are not private-sector quotations and cannot be used to promise cross-boundary savings."),
  },
  shenzhenHospitalAppointmentExample: {
    id: "shenzhen-government-hospital-appointment-example",
    publisher: "Shenzhen Municipal Government hospital information page",
    title: L("深圳市妇幼保健院预约及就诊流程示例", "Shenzhen hospital appointment and visit-flow example"),
    url: "https://www.sz.gov.cn/hospital/ssyy/szfybjy/content/post_9371219.html",
    sourceType: "government",
    factScope: L("仅支持该医院公布的预约方式示例，不代表所有医院的预约流程。", "Supports only the appointment example published for this hospital; it does not represent every hospital's process."),
    linkScope: ["single-hospital-appointment-example"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    caution: L("应以目标医疗机构的最新官方预约页面为准。", "Use the target provider's current official appointment page."),
  },
} as const satisfies Record<string, HealthGeoSource>;

const sourceRefs = (ids: readonly HealthGeoSourceId[]): readonly HealthGeoSource[] => ids.map(id => HEALTH_GEO_SOURCES[id]);
const draftCta = (id: string, label: LocalizedHealthText, note: LocalizedHealthText): HealthGeoCTA => ({
  id,
  label,
  href: { zh: "/zh/health#consultation", en: "/en/health#consultation" },
  mode: "controlled-preview",
  note,
});

const hubCta = (id: string, label: LocalizedHealthText, paths: Readonly<Record<HealthGeoLocale, string>>): HealthGeoCTA => ({
  id,
  label,
  href: paths,
  mode: "controlled-preview",
  note: L("内容和咨询入口处于受控预览；不会自动提交患者资料。", "Content and consultation entry remain in controlled preview; no patient data is submitted automatically."),
});

export const HEALTH_GEO_HUBS: readonly HealthGeoHubDescriptor[] = [
  {
    entityId: "health.hub.family-health-planning",
    id: "family-health-planning",
    names: L("家庭健康规划", "Family Health Planning"),
    descriptions: L("从家庭事务安排、资料授权和协调准备出发，连接现有家庭健康规划与 Health Compass。", "Organise family health-related tasks, permission and preparation through the existing family planning page and Health Compass."),
    paths: { zh: "/zh/health/family", en: "/en/health/family" },
    routeKind: "existing",
    guideIds: [],
    cta: hubCta("family-health-planning", L("进入家庭健康规划", "Enter Family Health Planning"), { zh: "/zh/health/family", en: "/en/health/family" }),
    publicationStatus: "draft",
    indexable: false,
  },
  {
    entityId: "health.hub.foreign-patients-china",
    id: "foreign-patients-china",
    names: L("外国人来中国就医", "International Patients in China"),
    descriptions: L("面向计划在中国了解医疗服务的外国人士，整理非临床准备、机构核实和语言沟通方向。", "For international visitors exploring care in China, with non-clinical preparation, provider checks and communication planning."),
    paths: { zh: "/zh/health/foreign-patients-china", en: "/en/health/international-patients-china" },
    routeKind: "new-draft",
    guideIds: ["foreigners-can-seek-care-in-china", "foreign-patient-shenzhen-preparation", "english-care-in-shenzhen"],
    cta: hubCta("foreign-patients-china", L("准备国际医疗咨询", "Prepare an international-care enquiry"), { zh: "/zh/health/foreign-patients-china#consultation", en: "/en/health/international-patients-china#consultation" }),
    publicationStatus: "draft",
    indexable: false,
  },
  {
    entityId: "health.hub.overseas-chinese-returning",
    id: "overseas-chinese-returning",
    names: L("海外华人回国就医", "Overseas Chinese Returning for Care"),
    descriptions: L("帮助海外华人从资料、家庭沟通和机构预约角度准备回中国了解医疗服务。", "Help overseas Chinese families prepare to explore care in China through records, family communication and provider coordination."),
    paths: { zh: "/zh/health/overseas-chinese-returning", en: "/en/health/overseas-chinese-returning" },
    routeKind: "new-draft",
    guideIds: ["overseas-chinese-returning-care", "international-patient-gba-appointment-travel"],
    cta: hubCta("overseas-chinese-returning", L("准备回国就医咨询", "Prepare a returning-care enquiry"), { zh: "/zh/health/overseas-chinese-returning#consultation", en: "/en/health/overseas-chinese-returning#consultation" }),
    publicationStatus: "draft",
    indexable: false,
  },
  {
    entityId: "health.hub.shenzhen-international-medical",
    id: "shenzhen-international-medical",
    names: L("深圳国际医疗", "Shenzhen International Medical"),
    descriptions: L("以官方机构登记和机构自述为起点，核对深圳国际医疗服务、语言支持与预约入口。", "Start with official registration and provider statements when checking international services, language support and appointment entry points in Shenzhen."),
    paths: { zh: "/zh/health/shenzhen-international-medical", en: "/en/health/shenzhen-international-medical" },
    routeKind: "new-draft",
    guideIds: ["shenzhen-international-private-medical", "shenzhen-international-medical-services", "english-care-in-shenzhen", "hong-kong-doctor-shenzhen-registration", "shenzhen-hong-kong-private-cost-comparison"],
    cta: hubCta("shenzhen-international-medical", L("准备深圳医疗协调咨询", "Prepare a Shenzhen care-coordination enquiry"), { zh: "/zh/health/shenzhen-international-medical#consultation", en: "/en/health/shenzhen-international-medical#consultation" }),
    publicationStatus: "draft",
    indexable: false,
  },
  {
    entityId: "health.hub.hong-kong-greater-bay-area",
    id: "hong-kong-greater-bay-area",
    names: L("香港与大湾区跨境医疗", "Hong Kong & Greater Bay Area Cross-boundary Care"),
    descriptions: L("整理香港居民、家庭与指定计划可能涉及的跨境医疗准备、机构和保险核实方向。", "Organise cross-boundary preparation, provider checks and insurance questions for Hong Kong residents, families and designated schemes."),
    paths: { zh: "/zh/health/hong-kong-greater-bay-area", en: "/en/health/hong-kong-greater-bay-area" },
    routeKind: "new-draft",
    guideIds: ["hong-kong-resident-shenzhen-care", "greater-bay-area-cross-border-resources", "international-patient-gba-appointment-travel"],
    cta: hubCta("hong-kong-greater-bay-area", L("准备跨境医疗咨询", "Prepare a cross-boundary-care enquiry"), { zh: "/zh/health/hong-kong-greater-bay-area#consultation", en: "/en/health/hong-kong-greater-bay-area#consultation" }),
    publicationStatus: "draft",
    indexable: false,
  },
  {
    entityId: "health.hub.international-insurance-claims",
    id: "international-insurance-claims",
    names: L("国际医疗保险与理赔", "International Medical Insurance & Claims"),
    descriptions: L("从保单条款、预先批核、资料整理和理赔行政沟通角度准备跨境医疗安排。", "Prepare cross-boundary care through policy checks, pre-authorisation, document organisation and claims administration."),
    paths: { zh: "/zh/health/international-insurance-claims", en: "/en/health/international-insurance-claims" },
    routeKind: "new-draft",
    guideIds: ["international-medical-insurance-claims-china", "shenzhen-hong-kong-private-cost-comparison", "hong-kong-resident-shenzhen-care"],
    cta: hubCta("international-insurance-claims", L("准备保险理赔协调咨询", "Prepare an insurance-claims enquiry"), { zh: "/zh/health/international-insurance-claims#consultation", en: "/en/health/international-insurance-claims#consultation" }),
    publicationStatus: "draft",
    indexable: false,
  },
] as const;

const section = (heading: LocalizedHealthText, body: LocalizedHealthText, points: readonly LocalizedHealthText[]): HealthGeoSection => ({ heading, body, points });
const applicability = (suitableFor: LocalizedHealthText, checkBeforeProceeding: LocalizedHealthText, notCovered: LocalizedHealthText): HealthGeoApplicability => ({ suitableFor, checkBeforeProceeding, notCovered });

const guide = (input: Omit<HealthGeoGuide, "officialSources" | "publicationStatus" | "indexable" | "clinicalScope">): HealthGeoGuide => ({
  ...input,
  officialSources: sourceRefs(input.sourceIds),
  publicationStatus: "draft",
  indexable: false,
  clinicalScope: "non-clinical-preparation-and-navigation",
});

export const HEALTH_GEO_GUIDES: readonly HealthGeoGuide[] = [
  guide({
    entityId: "health.guide.foreigners-can-seek-care-in-china",
    id: "foreigners-can-seek-care-in-china",
    hubId: "foreign-patients-china",
    intent: L("外国人是否可以在中国就医？", "Can a foreign national seek care in China?"),
    paths: { zh: "/zh/health/guides/foreigners-can-seek-care-in-china", en: "/en/health/guides/foreigners-can-seek-care-in-china" },
    title: L("外国人如何到中国看病？", "How can a foreign national seek care in China?"),
    description: L("从机构核实、预约准备和沟通安排开始，了解外国患者在中国就医前应核对什么。", "A preparation guide for checking providers, appointment steps and communication before an international patient seeks care in China."),
    directAnswer: L("外国人士可以向具体中国医疗机构了解并申请医疗服务，但是否接诊、所需资料、语言支持和费用必须由目标机构逐项确认；本页不判断医疗资格，也不代替医院决定。", "A foreign national may contact a specific Chinese provider about care, but acceptance, required documents, language support and charges must be confirmed with that provider. This page does not decide eligibility or replace a hospital's decision."),
    sections: [
      section(L("先确认目标机构", "Start with the target provider"), L("官方城市英文媒体列出了一些深圳医院的国际医疗服务，但明确不是完整名录。应以医疗机构自己的最新页面和官方登记为准。", "Official city English media lists some Shenzhen hospitals with international services, but it is not a complete directory. Use the provider's current page and official registration."), [L("核对机构名称、执业登记、地址和预约入口。", "Check the provider name, practice registration, address and appointment entry."), L("不要把媒体列表当作凤启合作或保证接诊。", "Do not treat a media list as a Phoenix partnership or acceptance guarantee.")]),
      section(L("准备非临床信息", "Prepare non-clinical information"), L("先整理希望了解的服务类别、所在地区、预计时间、语言需要及陪同安排，不在公开页面上传病历或保险文件。", "Organise the service category, location, timing, language needs and support arrangements; do not upload medical records or insurance files on this public page."), [L("按机构要求准备身份和预约资料。", "Prepare identity and appointment information requested by the provider."), L("医疗判断、检查和治疗由医疗机构负责。", "The provider is responsible for clinical decisions, examinations and treatment.")]),
      section(L("预约后再确认", "Confirm after contacting the provider"), L("预约是否成功、医生是否出诊、服务是否有英文支持及费用如何计算，都应取得目标机构的书面或官方确认。", "Obtain official confirmation of the appointment, clinician availability, language support and charges from the target provider."), [L("需要时可请中文陪同者或非临床协调人员协助沟通。", "A Chinese-speaking companion or non-clinical coordinator may help with communication when needed."), L("紧急情况请联系所在地紧急医疗服务。", "For emergencies, contact local emergency medical services.")]),
    ],
    applicability: applicability(L("计划在中国了解非紧急医疗服务的外国人士及家庭。", "International visitors and families exploring non-emergency care in China."), L("确认机构是否接收国际患者、所需身份资料、语言安排和付款方式。", "Confirm international-patient acceptance, identity requirements, language arrangements and payment method."), L("不适用于紧急救治、诊断、治疗选择或签证判断。", "Not for emergency care, diagnosis, treatment choices or visa decisions.")),
    sourceIds: ["eyeshenzhenInternationalServices2026", "nhcPublicSearch", "shenzhenWjwDirectory"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    relatedGuideIds: ["foreign-patient-shenzhen-preparation", "shenzhen-international-medical-services", "international-patient-gba-appointment-travel"],
    cta: draftCta("foreigners-can-seek-care-in-china-consultation", L("准备国际患者协调咨询", "Prepare an international-patient enquiry"), L("这是受控咨询准备入口，不会自动发送答案或医疗资料。", "This is a controlled enquiry-preparation entry; answers and medical files are not sent automatically.")),
  }),
  guide({
    entityId: "health.guide.foreign-patient-shenzhen-preparation",
    id: "foreign-patient-shenzhen-preparation",
    hubId: "foreign-patients-china",
    intent: L("外国人在深圳看病需要准备什么？", "What should a foreign patient prepare before care in Shenzhen?"),
    paths: { zh: "/zh/health/guides/foreign-patient-shenzhen-preparation", en: "/en/health/guides/foreign-patient-shenzhen-preparation" },
    title: L("外国人在深圳看病需要准备什么？", "What should a foreign patient prepare before care in Shenzhen?"),
    description: L("以目标机构要求为中心，梳理身份、预约、语言、行程和费用核对事项。", "A provider-led checklist for identity, appointments, language, travel and cost questions."),
    directAnswer: L("先确定目标医疗机构和服务类型，再按其官方要求准备身份、预约、语言及付款信息；不同机构的流程、可接收患者范围和费用不同，不能用一份清单代替逐家确认。", "First identify the provider and service type, then prepare identity, appointment, language and payment information requested by that provider. Processes, patient acceptance and charges vary by provider."),
    sections: [
      section(L("预约前", "Before appointment"), L("从深圳官方医疗机构查询入口或目标机构官网确认机构名称、地址和预约渠道。", "Use the Shenzhen official provider search or the provider's website to confirm its name, address and appointment channel."), [L("记录目标科室或服务类别，而不是先假定医生或床位。", "Record the department or service category rather than assuming a clinician or bed."), L("询问是否接受外国护照持有人及是否需要翻译。", "Ask whether foreign passport holders are accepted and whether interpretation is available.")]),
      section(L("到诊前", "Before the visit"), L("把机构要求的身份文件、预约确认、联系方式、语言需要和付款方式整理在安全位置。", "Keep the provider-requested identity documents, booking confirmation, contact details, language needs and payment method securely organised."), [L("不在公开咨询入口提交完整病历、证件或保险文件。", "Do not submit full records, identity documents or insurance files through a public enquiry form."), L("如需要资料授权，应按机构和患者授权流程另行确认。", "If records are needed, confirm a separate provider and patient-authorisation process.")]),
      section(L("行程与费用", "Travel and costs"), L("分别核对交通、住宿、协调服务费、机构医疗费用、押金和保险预授权；不要把任何估算当作最终账单。", "Check travel, accommodation, coordination fees, provider charges, deposits and insurance pre-authorisation separately; estimates are not final bills."), [L("要求机构说明付款对象和取消规则。", "Ask the provider to explain payees and cancellation rules."), L("保险是否承担必须由保险公司按保单确认。", "Insurance coverage must be confirmed by the insurer under the policy.")]),
    ],
    applicability: applicability(L("需要到深圳了解非紧急医疗服务的外国人士。", "Foreign visitors exploring non-emergency care in Shenzhen."), L("确认机构接受范围、身份证明、语言和支付要求。", "Confirm provider acceptance, identity, language and payment requirements."), L("不构成医疗建议、签证或入境意见，也不保证预约。", "Not medical, visa or entry advice and does not guarantee an appointment.")),
    sourceIds: ["eyeshenzhenInternationalServices2026", "shenzhenWjwDirectory", "shenzhenWjwInstitutionRegistration"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    relatedGuideIds: ["foreigners-can-seek-care-in-china", "english-care-in-shenzhen", "international-patient-gba-appointment-travel"],
    cta: draftCta("foreign-patient-shenzhen-preparation-consultation", L("准备深圳患者导航咨询", "Prepare a Shenzhen patient-navigation enquiry"), L("仅提供非临床准备与协调说明。", "Only non-clinical preparation and coordination information is provided.")),
  }),
  guide({
    entityId: "health.guide.shenzhen-international-private-medical",
    id: "shenzhen-international-private-medical",
    hubId: "shenzhen-international-medical",
    intent: L("深圳国际化私立医疗服务如何了解？", "How should international private medical services in Shenzhen be assessed?"),
    paths: { zh: "/zh/health/guides/shenzhen-international-private-medical", en: "/en/health/guides/shenzhen-international-private-medical" },
    title: L("深圳国际化私立医疗服务介绍：先核实，再安排", "International private medical services in Shenzhen: verify before arranging"),
    description: L("不以‘国际化’或‘私立’作质量保证，按执业登记、服务范围、语言和费用逐项核实。", "Do not treat ‘international’ or ‘private’ as a quality guarantee; verify registration, scope, language and charges item by item."),
    directAnswer: L("深圳不同医疗机构的性质、国际患者服务和收费方式并不相同。应先查机构执业登记，再向机构确认服务范围、语言支持、医生信息、报价和预约条件。", "Shenzhen providers differ in legal status, international-patient services and charging. Check practice registration first, then confirm scope, language, clinician information, quotations and appointment conditions with the provider."),
    sections: [
      section(L("机构性质与登记", "Status and registration"), L("深圳卫健委公开了医疗机构执业登记的监管要求和查询入口。登记核对是起点，不是对医疗质量或结果的评价。", "Shenzhen health authorities publish practice-registration rules and search entry points. Registration is a starting check, not a quality or outcome assessment."), [L("区分公立、社会办、门诊部和医院等不同主体。", "Distinguish public, non-public, clinic and hospital entities."), L("确认当前执业地点与业务范围。", "Confirm the current practice location and scope.")]),
      section(L("国际服务的实际范围", "Actual international-service scope"), L("官方城市媒体列出的国际医疗服务包括不同机构的门诊、住院、语言或保险协作描述，但每一项只适用于被列出的机构。", "The official city-media list describes outpatient, inpatient, language or insurer arrangements for named institutions; each description applies only to that institution."), [L("不要把其他机构的英语、病房或直付安排套用到目标机构。", "Do not transfer another institution's English, room or direct-billing claims to the target provider."), L("香港医生出诊或远程服务须由机构和医生分别确认。", "Confirm Hong Kong-doctor visits or remote services separately with the provider and clinician.")]),
      section(L("费用与预约", "Charges and appointments"), L("在确定医疗安排前，分别取得机构报价、医生费用、检查治疗费用、押金、取消条款和保险预授权信息。", "Before making arrangements, obtain separate information on provider charges, clinician fees, examinations, treatment, deposits, cancellation and insurance pre-authorisation."), [L("费用目录或公开价格不是个案最终账单。", "A price catalogue or public price is not a case-specific final bill."), L("任何接诊与预约均以机构确认为准。", "Acceptance and appointments remain subject to provider confirmation.")]),
    ],
    applicability: applicability(L("比较深圳不同国际患者服务入口的家庭和个人。", "Families and individuals comparing international-patient entry points in Shenzhen."), L("核对机构登记、具体服务范围、报价和保险条件。", "Check registration, actual scope, quotations and insurance conditions."), L("不提供医院排名、疗效判断、医生推荐或合作保证。", "Does not rank hospitals, assess outcomes, recommend doctors or guarantee partnerships.")),
    sourceIds: ["shenzhenWjwInstitutionRegistration", "shenzhenWjwDirectory", "eyeshenzhenInternationalServices2026"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    relatedGuideIds: ["shenzhen-international-medical-services", "english-care-in-shenzhen", "shenzhen-hong-kong-private-cost-comparison"],
    cta: draftCta("shenzhen-international-private-medical-consultation", L("准备深圳机构核对咨询", "Prepare a Shenzhen provider-check enquiry"), L("具体机构资料仍需逐项核实。", "Specific provider details still require item-by-item verification.")),
  }),
  guide({
    entityId: "health.guide.overseas-chinese-returning-care",
    id: "overseas-chinese-returning-care",
    hubId: "overseas-chinese-returning",
    intent: L("海外华人回中国看病如何准备？", "How can overseas Chinese prepare to seek care in China?"),
    paths: { zh: "/zh/health/guides/overseas-chinese-returning-care", en: "/en/health/guides/overseas-chinese-returning-care" },
    title: L("海外华人回中国看病指南", "A guide for overseas Chinese returning to China for care"),
    description: L("把原机构资料、家庭沟通、目标机构和保险核对拆成可执行的非临床准备步骤。", "Break records, family communication, target-provider and insurance checks into practical non-clinical preparation steps."),
    directAnswer: L("回中国就医前，先整理自己愿意授权的资料范围和目标服务，再向目标机构确认预约、资料、语言与费用要求；不要把海外病历直接发到普通咨询入口。", "Before returning for care, decide what records you are willing to authorise and what service you need, then confirm appointment, records, language and cost requirements with the provider; do not send overseas records to a general enquiry form."),
    sections: [
      section(L("资料整理", "Records preparation"), L("先列出原机构、资料名称、日期和可提供方式，明确哪些资料只能在患者授权后通过受控渠道传递。", "List the original provider, record types, dates and available formats, and identify what may be shared only through a controlled, patient-authorised channel."), [L("保留原文件，不在网页公开上传。", "Keep originals and do not upload them publicly."), L("需要翻译时确认由谁翻译及是否由机构接受。", "If translation is needed, confirm who will translate and whether the provider accepts it.")]),
      section(L("目标机构与家庭", "Provider and family planning"), L("用官方机构入口核对目标机构、地址、预约方式和家属沟通安排。", "Use official provider entry points to check the target institution, address, appointment method and family communication plan."), [L("预约和接诊由医疗机构决定。", "The medical institution decides appointments and acceptance."), L("家庭成员的资料共享应按患者授权。", "Family sharing should follow patient authorisation.")]),
      section(L("费用与后续", "Costs and follow-up"), L("分别询问医疗费用、协调费用、交通住宿、保险预授权和后续复诊安排；任何方案都应以书面确认范围为基础。", "Ask separately about medical charges, coordination fees, travel, accommodation, insurance pre-authorisation and follow-up; base any plan on written scope confirmation."), [L("不要把‘回国就医’理解为自动获得某项医疗资格。", "Returning to China does not automatically create a healthcare entitlement."), L("跨境保险理赔由保险公司按保单决定。", "Cross-border claims are decided by the insurer under the policy.")]),
    ],
    applicability: applicability(L("居住海外、考虑回中国了解非紧急医疗服务的华人家庭。", "Overseas Chinese families exploring non-emergency care in China."), L("确认资料授权、目标机构、行程和保险要求。", "Confirm record authorisation, provider, travel and insurance requirements."), L("不处理急症、诊疗方案、病历评估或签证事项。", "Does not handle emergencies, treatment plans, record assessment or visa matters.")),
    sourceIds: ["nhcPublicSearch", "shenzhenWjwDirectory", "hkInsuranceAuthorityClaims"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    relatedGuideIds: ["foreign-patient-shenzhen-preparation", "international-medical-insurance-claims-china", "international-patient-gba-appointment-travel"],
    cta: draftCta("overseas-chinese-returning-care-consultation", L("准备回国就医协调咨询", "Prepare a returning-care coordination enquiry"), L("不自动接收或上传病历。", "Records are not automatically received or uploaded.")),
  }),
  guide({
    entityId: "health.guide.hong-kong-resident-shenzhen-care",
    id: "hong-kong-resident-shenzhen-care",
    hubId: "hong-kong-greater-bay-area",
    intent: L("香港居民到深圳看病如何安排？", "How can a Hong Kong resident arrange care in Shenzhen?"),
    paths: { zh: "/zh/health/guides/hong-kong-resident-shenzhen-care", en: "/en/health/guides/hong-kong-resident-shenzhen-care" },
    title: L("香港居民到深圳看病如何安排？", "How can a Hong Kong resident arrange care in Shenzhen?"),
    description: L("从目标机构、跨境行程、资料授权和保险预先批核四个层面准备。", "Prepare across the target provider, cross-boundary travel, record authorisation and insurance pre-authorisation."),
    directAnswer: L("香港居民赴深圳就医应先确认目标机构和服务范围，再分别核对跨境行程、预约、资料授权、付款和保险安排；政府试点或指定机构的条件不能推广到所有人。", "A Hong Kong resident should confirm the provider and scope first, then separately check travel, appointments, authorisation, payment and insurance. Conditions for a government pilot or designated provider do not apply universally."),
    sections: [
      section(L("先看适用计划", "Check applicable schemes first"), L("香港政府资料说明部分跨境医疗安排针对特定群组、试点或指定机构。先确认自己是否属于计划范围，再联系目标机构。", "Hong Kong Government materials describe measures for specific groups, pilots or designated institutions. Check whether a scheme applies before contacting a provider."), [L("不要把政策背景当作个人资格。", "Do not treat policy context as personal eligibility."), L("指定机构名单和条件需要查看最新官方页面。", "Check current official pages for designated institutions and conditions.")]),
      section(L("深圳就医安排", "Shenzhen care arrangements"), L("用深圳卫健委官方入口核对机构登记、地址、预约和医生信息；交通与陪同应另行安排。", "Use Shenzhen health authority entry points to check registration, address, appointment and physician information; arrange transport and support separately."), [L("香港医生在深圳执业须另行核对注册范围。", "Hong Kong doctors practising in Shenzhen require a separate registration-scope check."), L("机构接诊、检查和治疗由机构决定。", "The provider decides acceptance, examinations and treatment.")]),
      section(L("保险与资料", "Insurance and records"), L("香港保险监管资料提示，预先批核和直接结算不是所有保单或机构都具备；须向保险公司取得个案确认。", "Hong Kong insurance guidance notes that pre-authorisation and direct settlement are not available under every policy or provider; obtain case-specific confirmation from the insurer."), [L("保留报价、预授权确认、收据及医疗文件清单。", "Keep quotations, pre-authorisation confirmations, receipts and a document checklist."), L("理赔结果由保险公司决定。", "The insurer decides the claim outcome.")]),
    ],
    applicability: applicability(L("香港居民及家庭计划在深圳了解非紧急医疗服务。", "Hong Kong residents and families exploring non-emergency care in Shenzhen."), L("确认计划范围、指定机构、跨境行程、授权和保险条款。", "Confirm scheme scope, designated providers, travel, authorisation and policy terms."), L("不构成跨境资格、入境、医疗或保险赔付保证。", "Not a guarantee of cross-boundary eligibility, entry, care or insurance payment.")),
    sourceIds: ["hkGovCrossBoundary2026", "hkGovCrossBoundaryInsurance2024", "shenzhenWjwDirectory", "hkInsuranceAuthorityClaims"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    relatedGuideIds: ["greater-bay-area-cross-border-resources", "hong-kong-doctor-shenzhen-registration", "international-medical-insurance-claims-china"],
    cta: draftCta("hong-kong-resident-shenzhen-care-consultation", L("准备香港赴深医疗咨询", "Prepare a Hong Kong-to-Shenzhen care enquiry"), L("跨境安排必须逐项确认。", "Cross-boundary arrangements must be checked item by item.")),
  }),
  guide({
    entityId: "health.guide.greater-bay-area-cross-border-resources",
    id: "greater-bay-area-cross-border-resources",
    hubId: "hong-kong-greater-bay-area",
    intent: L("中国大湾区有哪些跨境医疗资源？", "What cross-boundary healthcare resources exist in the Greater Bay Area?"),
    paths: { zh: "/zh/health/guides/greater-bay-area-cross-border-resources", en: "/en/health/guides/greater-bay-area-cross-border-resources" },
    title: L("中国大湾区跨境医疗资源介绍", "Cross-boundary healthcare resources in China's Greater Bay Area"),
    description: L("以官方试点、指定机构和医疗机构登记为边界，避免把区域概念写成普遍服务承诺。", "A source-bounded overview of pilots, designated providers and registration checks without turning a regional concept into a universal service promise."),
    directAnswer: L("大湾区存在跨境医疗试点、指定机构和个别保险安排，但适用对象、机构和流程各不相同；应先核对最新官方方案，再与具体医疗机构及保险公司确认。", "The GBA has cross-boundary pilots, designated providers and individual insurance arrangements, but scope, providers and processes vary. Check the latest official scheme and confirm with the provider and insurer."),
    sections: [
      section(L("资源分层", "Resource layers"), L("把信息分成政府试点、指定医疗机构、机构自述服务和普通公开信息四层，不能混作‘合作资源’。", "Separate government pilots, designated providers, provider statements and ordinary public information; do not label them all as partnership resources."), [L("标注来源日期和适用对象。", "Label source dates and eligible groups."), L("不要从一个城市或一家机构推断整个大湾区。", "Do not infer the whole GBA from one city or provider.")]),
      section(L("跨境资料与记录", "Cross-boundary records"), L("部分香港政府资料提及指定机构和电子健康记录跨境功能；实际可用性取决于计划、机构和授权。", "Hong Kong Government material refers to designated institutions and cross-boundary eHealth functions; actual availability depends on scheme, provider and authorisation."), [L("患者应明确资料可共享范围和撤回方式。", "Patients should define the sharing scope and withdrawal method."), L("本页不接收原始病历或影像。", "This page does not receive original records or images.")]),
      section(L("协调边界", "Coordination boundary"), L("Phoenix Nova 可协助整理目标、预约问题、语言和行程清单；接诊、诊断、治疗、转诊和理赔由相应机构决定。", "Phoenix Nova may help organise goals, appointment questions, language and travel checklists; providers decide acceptance, diagnosis, treatment, referral and claims."), [L("每项服务须有明确授权和范围。", "Each service needs clear authorisation and scope."), L("紧急转运不属于公开页面的普通咨询服务。", "Emergency transfer is not an ordinary public-page enquiry service.")]),
    ],
    applicability: applicability(L("需要比较香港、深圳及大湾区跨境医疗准备路径的家庭。", "Families comparing cross-boundary preparation paths across Hong Kong, Shenzhen and the GBA."), L("核对最新试点、指定机构、资料授权和保险渠道。", "Check current pilots, designated providers, record authorisation and insurance channels."), L("不构成大湾区通用医疗资格、机构合作或跨境转运保证。", "Not a universal GBA healthcare entitlement, partnership or transfer guarantee.")),
    sourceIds: ["hkGovCrossBoundary2026", "hkGovCrossBoundaryInsurance2024", "nhcPublicSearch", "shenzhenWjwDirectory"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    relatedGuideIds: ["hong-kong-resident-shenzhen-care", "international-patient-gba-appointment-travel", "international-medical-insurance-claims-china"],
    cta: draftCta("greater-bay-area-cross-border-resources-consultation", L("准备大湾区医疗协调咨询", "Prepare a GBA care-coordination enquiry"), L("只提供非临床信息整理和协调准备。", "Only non-clinical information organisation and coordination preparation are provided.")),
  }),
  guide({
    entityId: "health.guide.shenzhen-international-medical-services",
    id: "shenzhen-international-medical-services",
    hubId: "shenzhen-international-medical",
    intent: L("深圳有哪些国际化医疗服务？", "What international medical services are available in Shenzhen?"),
    paths: { zh: "/zh/health/guides/shenzhen-international-medical-services", en: "/en/health/guides/shenzhen-international-medical-services" },
    title: L("深圳有哪些国际化医疗服务？", "What international medical services are available in Shenzhen?"),
    description: L("查看已公开的机构示例，并理解英语、保险、预约和住院描述的核实边界。", "Review publicly described examples while understanding the verification limits around English, insurance, appointments and inpatient services."),
    directAnswer: L("深圳有部分机构公开介绍国际医疗部门或服务，但公开列表不是完整目录；英语、保险直付、专科和住院安排必须向具体机构确认。", "Some Shenzhen providers publicly describe international departments or services, but public lists are not complete directories. Confirm English, direct billing, specialties and inpatient arrangements with each provider."),
    sections: [
      section(L("可核对的服务类型", "Service types to check"), L("官方城市英文媒体列出深圳部分机构的国际医疗部门、国际中心、语言团队或跨境保险描述。", "Official city English media describes international departments, international centres, language teams or cross-border insurer arrangements at some Shenzhen institutions."), [L("媒体文章的事实范围只到被列机构。", "The article's factual scope ends with the named providers."), L("名单、服务和排班可能变化。", "Lists, services and schedules may change.")]),
      section(L("英语就诊", "English consultations"), L("英语支持可能由特定中心、志愿团队或双语团队提供，不能从机构名称或‘国际’标签推断。", "English support may come from a particular centre, volunteer team or bilingual team and cannot be inferred from an institution's name or an 'international' label."), [L("预约前询问语言、翻译和书面沟通方式。", "Ask about language, interpretation and written communication before booking."), L("医疗翻译不等于临床判断。", "Medical interpretation does not equal clinical judgement.")]),
      section(L("预约和保险", "Appointments and insurance"), L("预约平台、付款方式和保险协作各机构不同；保险公司的预先批核不等同最终理赔。", "Appointment platforms, payment methods and insurer arrangements differ; pre-authorisation is not the final claim decision."), [L("用官方机构页面确认入口。", "Use the provider's official page to confirm the entry point."), L("把机构收费与协调服务费分开记录。", "Record provider charges separately from coordination fees.")]),
    ],
    applicability: applicability(L("希望比较深圳国际医疗服务入口的国际人士和跨境家庭。", "International visitors and cross-border families comparing Shenzhen international-care entry points."), L("逐项核对机构、科室、语言、保险和预约条件。", "Check provider, department, language, insurance and appointment conditions item by item."), L("不构成医疗机构推荐、合作或服务可用性保证。", "Not a provider recommendation, partnership or availability guarantee.")),
    sourceIds: ["eyeshenzhenInternationalServices2026", "sysuInternationalCenter2026", "shenzhenWjwDirectory", "hkInsuranceAuthorityClaims"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    relatedGuideIds: ["english-care-in-shenzhen", "shenzhen-international-private-medical", "foreigners-can-seek-care-in-china"],
    cta: draftCta("shenzhen-international-medical-services-consultation", L("准备深圳国际医疗咨询", "Prepare a Shenzhen international-care enquiry"), L("机构服务仍需逐家核实。", "Provider services still require individual verification.")),
  }),
  guide({
    entityId: "health.guide.english-care-in-shenzhen",
    id: "english-care-in-shenzhen",
    hubId: "shenzhen-international-medical",
    intent: L("在深圳看病可以使用英语吗？", "Can a patient use English for care in Shenzhen?"),
    paths: { zh: "/zh/health/guides/english-care-in-shenzhen", en: "/en/health/guides/english-care-in-shenzhen" },
    title: L("在深圳看病可以使用英语吗？", "Can a patient use English for care in Shenzhen?"),
    description: L("区分机构、中心和个别团队的英语服务，不把一篇机构公告泛化为全市承诺。", "Distinguish English support at a provider, centre or team instead of generalising one announcement to the city."),
    directAnswer: L("部分深圳医疗机构或国际医疗中心公开说明有英语或双语服务，但是否覆盖预约、问诊、文件和住院各环节，必须向目标机构确认。", "Some Shenzhen providers or international centres publicly describe English or bilingual services, but coverage across booking, consultation, documents and inpatient care must be confirmed with the target provider."),
    sections: [
      section(L("服务层级", "Service levels"), L("英语可能只覆盖前台、预约、志愿协助或特定中心；临床沟通和文件翻译需要单独核对。", "English may cover reception, appointments, volunteer support or a particular centre only; clinical communication and document translation require separate checks."), [L("询问是否提供口译以及由谁提供。", "Ask whether interpretation is available and who provides it."), L("确认报告和同意文件的语言版本。", "Confirm the language of reports and consent documents.")]),
      section(L("官方例子", "Official examples"), L("中山大学附属第八医院公告描述其国际医疗中心提供中英文服务，这是该中心的公告，不是所有深圳机构的统一标准。", "A Sun Yat-sen University announcement describes bilingual service at its International Medical Center; that is a centre-specific announcement, not a city-wide standard."), [L("查看目标机构最新公告。", "Check the target provider's latest announcement."), L("不要用旧文章替代预约前确认。", "Do not use an older article instead of confirmation before booking.")]),
      section(L("沟通准备", "Communication preparation"), L("提前准备语言偏好、联系人、既往资料清单和想问的问题；不要在公开网页写入敏感医疗信息。", "Prepare language preference, contact person, a record checklist and questions in advance; do not enter sensitive health information on a public webpage."), [L("可安排家属或独立翻译协助。", "A family member or independent interpreter may assist."), L("翻译不替代医生的诊疗决定。", "Interpretation does not replace a doctor's clinical decision.")]),
    ],
    applicability: applicability(L("需要英语就诊准备的外国人士、海外华人和跨境家庭。", "Foreign visitors, overseas Chinese and cross-border families needing English-care preparation."), L("确认具体机构和环节的语言服务。", "Confirm language support for the specific provider and each step."), L("不保证英语接诊、翻译质量或医疗结果。", "Does not guarantee English acceptance, interpretation quality or medical outcomes.")),
    sourceIds: ["sysuInternationalCenter2026", "eyeshenzhenInternationalServices2026", "shenzhenWjwDirectory"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    relatedGuideIds: ["shenzhen-international-medical-services", "foreign-patient-shenzhen-preparation", "shenzhen-international-private-medical"],
    cta: draftCta("english-care-in-shenzhen-consultation", L("准备语言沟通协调咨询", "Prepare a language-coordination enquiry"), L("不自动传送医疗资料。", "Medical records are not sent automatically.")),
  }),
  guide({
    entityId: "health.guide.hong-kong-doctor-shenzhen-registration",
    id: "hong-kong-doctor-shenzhen-registration",
    hubId: "shenzhen-international-medical",
    intent: L("香港医生在深圳执业需要满足什么条件？", "What must a Hong Kong doctor check to practise in Shenzhen?"),
    paths: { zh: "/zh/health/guides/hong-kong-doctor-shenzhen-registration", en: "/en/health/guides/hong-kong-doctor-shenzhen-registration" },
    title: L("香港医生在深圳执业需要满足什么条件？", "What must a Hong Kong doctor check before practising in Shenzhen?"),
    description: L("以国家和深圳官方注册规则为起点，说明为什么不能只看宣传页或个人简介。", "Start with national and Shenzhen registration rules and understand why a profile or promotional page is not enough."),
    directAnswer: L("港澳医生在内地短期行医需要依规定办理执业注册并在注册的地点、类别和范围内执业；深圳具体审批和现行材料应向深圳卫健委及聘用机构核实。", "A Hong Kong or Macao doctor practising short-term in Mainland China must follow the applicable practice-registration rules and practise within the registered location, category and scope. Confirm current procedures with Shenzhen health authorities and the employing provider."),
    sections: [
      section(L("国家规则的核对点", "National-rule checks"), L("国家卫健委规定涉及聘用医疗机构、注册、执业类别、地点和范围等要素。", "NHC rules address the employing medical institution, registration, practice category, location and scope."), [L("短期行医与取得内地医师资格后的注册路径不同。", "Short-term practice and registration after obtaining Mainland qualifications are different paths."), L("不能以‘香港医生’身份自动推断可在深圳执业。", "Being a Hong Kong doctor does not automatically establish permission to practise in Shenzhen.")]),
      section(L("深圳办理与公开查询", "Shenzhen process and public checks"), L("深圳卫健委公开了医师执业注册办事入口和查询方向；具体受理机关、材料和状态以当前页面为准。", "Shenzhen health authorities publish practice-registration entry points and search directions; current pages govern the authority, documents and status."), [L("核对注册地点、类别、范围和有效期。", "Check registered location, category, scope and validity."), L("需要时要求机构提供可核验的官方信息。", "Ask the provider for verifiable official information when needed.")]),
      section(L("页面表达边界", "Publishing boundary"), L("健康内容只能解释核验路径，不能列出未经核验的医生姓名、出诊时间或‘香港医生团队’。", "Health content may explain the verification path but must not publish unverified doctor names, schedules or a 'Hong Kong doctor team'."), [L("凤启不判断个人执业资格。", "Phoenix does not assess an individual's licence."), L("预约和诊疗由医疗机构及医生确认。", "The provider and doctor confirm appointments and care.")]),
    ],
    applicability: applicability(L("需要核对港澳医生在深圳服务合法性的患者、家庭或合作方。", "Patients, families or partners checking the practice status of Hong Kong or Macao doctors in Shenzhen."), L("查看注册机关、聘用机构、执业地点、类别、范围和有效期。", "Check the registration authority, employing provider, location, category, scope and validity."), L("不构成法律意见、资格认定或合作方背书。", "Not legal advice, a licence determination or partner endorsement.")),
    sourceIds: ["nhcHongKongMacaoPhysicianRule", "shenzhenWjwPhysicianRegistration", "nhcPublicSearch"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    relatedGuideIds: ["shenzhen-international-medical-services", "shenzhen-international-private-medical", "hong-kong-resident-shenzhen-care"],
    cta: draftCta("hong-kong-doctor-shenzhen-registration-consultation", L("准备医生信息核对咨询", "Prepare a clinician-information check enquiry"), L("仅协助整理官方核验路径。", "Only official verification paths can be organised.")),
  }),
  guide({
    entityId: "health.guide.shenzhen-hong-kong-private-cost-comparison",
    id: "shenzhen-hong-kong-private-cost-comparison",
    hubId: "international-insurance-claims",
    intent: L("深圳私立医院与香港私立医疗费用如何比较？", "How should private healthcare costs in Shenzhen and Hong Kong be compared?"),
    paths: { zh: "/zh/health/guides/shenzhen-hong-kong-private-cost-comparison", en: "/en/health/guides/shenzhen-hong-kong-private-cost-comparison" },
    title: L("深圳私立医院与香港私立医疗费用比较：先统一项目", "Comparing Shenzhen and Hong Kong private healthcare costs: define the item first"),
    description: L("不发布固定节省比例，先统一服务项目、患者类别、医生费、医院费和保险条件。", "Avoid fixed savings claims; align the service item, patient category, doctor fee, hospital fee and insurance conditions first."),
    directAnswer: L("深圳与香港的医疗费用不能用单一数字直接比较。应以同一服务项目和患者类别分别取得机构报价、医生费用、检查治疗、押金及保险条件，再核对最终账单。", "Shenzhen and Hong Kong healthcare costs cannot be compared with one number. Obtain provider quotations, clinician fees, examinations, treatment, deposits and insurance terms for the same service and patient category."),
    sections: [
      section(L("先统一比较口径", "Align the comparison"), L("门诊、住院、医生费、检查、药品、耗材、陪诊和翻译可能由不同主体收费。", "Outpatient, inpatient, clinician, examination, medication, consumables, concierge and interpretation charges may come from different parties."), [L("确认币种、时点、患者类别和是否含税。", "Confirm currency, date, patient category and whether tax is included."), L("把协调服务费与医疗机构费用分开。", "Separate coordination fees from provider charges.")]),
      section(L("官方价格资料的边界", "Limits of official price references"), L("深圳医保局提供医疗服务价格项目目录；香港医院管理局提供公营医疗收费资料。这些资料不是深圳私立医院与香港私立医院的统一价目表。", "Shenzhen's healthcare-security bureau provides price-item catalogues; Hong Kong Hospital Authority provides public-service charges. Neither is a universal price list for Shenzhen private hospitals versus Hong Kong private hospitals."), [L("香港公营收费不能当作私营报价。", "Hong Kong public charges are not private-sector quotations."), L("深圳市场调节价和个案报价要向机构核对。", "Confirm Shenzhen market-regulated and case-specific prices with the provider.")]),
      section(L("保险与最终账单", "Insurance and final bills"), L("保险公司可能要求预先批核，并按合理及惯常费用、限额和除外责任处理；预授权不是最终赔偿。", "An insurer may require pre-authorisation and assess reasonable-and-customary charges, limits and exclusions; pre-authorisation is not the final payment."), [L("在接受非紧急服务前索取书面估算。", "Request a written estimate before non-emergency care."), L("保留收据、报告和授权记录。", "Keep receipts, reports and authorisation records.")]),
    ],
    applicability: applicability(L("需要做深圳与香港非紧急医疗预算比较的家庭。", "Families comparing a budget for non-emergency care in Shenzhen and Hong Kong."), L("统一项目、患者类别、费用主体、汇率和保险条款。", "Align service item, patient category, payees, exchange rate and policy terms."), L("不提供省钱比例、报价或保险赔付承诺。", "Does not provide savings percentages, quotations or claim guarantees.")),
    sourceIds: ["shenzhenMedicalPrices", "hkHospitalAuthorityFees", "hkInsuranceAuthorityClaims"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    relatedGuideIds: ["international-medical-insurance-claims-china", "shenzhen-international-private-medical", "hong-kong-resident-shenzhen-care"],
    cta: draftCta("shenzhen-hong-kong-private-cost-comparison-consultation", L("准备费用核对咨询", "Prepare a cost-check enquiry"), L("费用只在机构和保险公司确认后成立。", "Costs only become actionable after provider and insurer confirmation.")),
  }),
  guide({
    entityId: "health.guide.international-medical-insurance-claims-china",
    id: "international-medical-insurance-claims-china",
    hubId: "international-insurance-claims",
    intent: L("国际医疗保险在中国如何申请理赔？", "How can an international medical insurance claim be prepared in China?"),
    paths: { zh: "/zh/health/guides/international-medical-insurance-claims-china", en: "/en/health/guides/international-medical-insurance-claims-china" },
    title: L("国际医疗保险在中国如何申请理赔？", "How to prepare an international medical insurance claim in China"),
    description: L("以保险监管机构的通用提示为框架，整理预授权、资料、时限和沟通边界。", "Use regulator guidance as a framework for pre-authorisation, documents, deadlines and communication boundaries."),
    directAnswer: L("先向保险公司确认保障范围、预授权要求、指定机构和索赔期限，再按其表格和文件清单提交；理赔是否批准、金额和支付方式由保险公司按保单决定。", "First confirm coverage, pre-authorisation, designated providers and claim deadlines with the insurer, then submit the required forms and documents. Approval, amount and payment method are decided by the insurer under the policy."),
    sections: [
      section(L("就医前", "Before care"), L("部分保险公司提供预先批核或直接结算安排，但是否适用要看具体保单、保险公司和医疗机构。", "Some insurers offer pre-authorisation or direct-settlement arrangements, but applicability depends on the policy, insurer and provider."), [L("取得书面预授权或付款保证信息。", "Obtain written pre-authorisation or guarantee-of-payment information."), L("不要把医疗机构‘可用保险’理解为你的保单必然承保。", "Do not treat a provider's acceptance of insurance as proof that your policy covers the care.")]),
      section(L("提交资料", "Submitting documents"), L("监管机构提示的常见资料包括索偿表格、收据、转介或医疗文件；实际清单以保险公司和个案为准。", "Regulator guidance describes common documents such as claim forms, receipts and referral or medical documents; the actual checklist depends on the insurer and case."), [L("保留原件、翻译件和提交时间记录。", "Keep originals, translations and submission timestamps."), L("医疗文件只通过受控保险或机构渠道传递。", "Send medical documents only through controlled insurer or provider channels.")]),
      section(L("理赔结果", "Claim outcome"), L("预授权金额可能与最终费用不同，合理及惯常费用、限额和除外责任可能影响赔偿。", "A pre-authorised amount may differ from the final cost; reasonable-and-customary charges, limits and exclusions may affect payment."), [L("需要解释时直接联系保险公司。", "Contact the insurer directly when clarification is needed."), L("Phoenix Nova 只能在授权范围内协助行政整理，不决定理赔。", "Phoenix Nova may assist with administration within authorisation but does not decide claims.")]),
    ],
    applicability: applicability(L("持有国际或香港医疗保险、准备在中国接受非紧急服务的客户。", "Clients with international or Hong Kong medical insurance preparing for non-emergency care in China."), L("核对保单、预授权、指定机构、文件和期限。", "Check the policy, pre-authorisation, designated providers, documents and deadlines."), L("不构成保险建议、承保判断或理赔保证。", "Not insurance advice, coverage determination or a claim guarantee.")),
    sourceIds: ["hkInsuranceAuthorityClaims", "hkInsuranceAuthorityPolicyholders", "hkGovCrossBoundaryInsurance2024"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    relatedGuideIds: ["shenzhen-hong-kong-private-cost-comparison", "hong-kong-resident-shenzhen-care", "greater-bay-area-cross-border-resources"],
    cta: draftCta("international-medical-insurance-claims-china-consultation", L("准备理赔资料协调咨询", "Prepare a claims-document coordination enquiry"), L("不会自动接收保险文件或病历。", "Insurance files and medical records are not automatically received.")),
  }),
  guide({
    entityId: "health.guide.international-patient-gba-appointment-travel",
    id: "international-patient-gba-appointment-travel",
    hubId: "overseas-chinese-returning",
    intent: L("国际患者赴大湾区就医如何安排预约和行程？", "How should an international patient plan appointments and travel in the GBA?"),
    paths: { zh: "/zh/health/guides/international-patient-gba-appointment-travel", en: "/en/health/guides/international-patient-gba-appointment-travel" },
    title: L("国际患者赴大湾区就医的预约及行程指南", "Appointment and travel planning for international patients visiting the GBA"),
    description: L("把机构确认、预约凭证、交通住宿、语言和后续跟进分开准备，不把行程建议当作接诊承诺。", "Separate provider confirmation, booking evidence, travel, accommodation, language and follow-up without treating travel advice as acceptance."),
    directAnswer: L("先取得目标机构的预约或接诊确认，再按患者情况安排交通、住宿、陪同和语言支持；不要先购买不可退行程，也不要把城市交通便利等同于医疗安排已确认。", "Obtain the target provider's appointment or acceptance confirmation before arranging transport, accommodation, support and language assistance; do not buy non-refundable travel first."),
    sections: [
      section(L("机构确认", "Provider confirmation"), L("预约方式、所需资料、到诊时间、押金和取消规则必须由目标机构确认。", "The target provider must confirm appointment method, required documents, arrival time, deposit and cancellation rules."), [L("保存官方确认和联系人。", "Keep the official confirmation and contact details."), L("不要以咨询记录替代预约成功。", "Do not treat an enquiry record as a confirmed appointment.")]),
      section(L("行程安排", "Travel planning"), L("在医疗机构确认后，再协调交通、住宿、陪同、翻译和家庭成员的时间；跨境证件和入境事项应向主管部门核实。", "After provider confirmation, coordinate transport, accommodation, support, interpretation and family schedules; verify travel documents and entry matters with the competent authorities."), [L("为改期、延误和机构变更保留缓冲。", "Keep contingency for rescheduling, delays and provider changes."), L("不在公开页面提交护照或完整行程文件。", "Do not submit passports or full itineraries on a public page.")]),
      section(L("到诊与后续", "Arrival and follow-up"), L("把到诊报到、费用支付、资料取回、复诊和保险文件整理成清单；临床决定由医疗机构完成。", "Turn arrival, payment, record return, follow-up and insurance documents into a checklist; the provider makes clinical decisions."), [L("如出现紧急情况，联系当地紧急服务。", "For emergencies, contact local emergency services."), L("需要跨境转运时，必须由相应医疗机构和主管计划评估。", "Cross-boundary transfer must be assessed by the relevant providers and authorised scheme.")]),
    ],
    applicability: applicability(L("计划赴深圳或大湾区了解非紧急医疗服务的国际患者及家庭。", "International patients and families planning non-emergency care in Shenzhen or the GBA."), L("取得机构确认，核对行程、授权、保险和取消条款。", "Obtain provider confirmation and check travel, authorisation, insurance and cancellation terms."), L("不提供签证、入境、急救、转运或医疗资格保证。", "Does not provide visa, entry, emergency, transfer or healthcare-eligibility guarantees.")),
    sourceIds: ["eyeshenzhenInternationalServices2026", "hkGovCrossBoundary2026", "shenzhenHospitalAppointmentExample"],
    verifiedAt: HEALTH_GEO_CONTENT_VERIFIED_AT,
    relatedGuideIds: ["foreign-patient-shenzhen-preparation", "hong-kong-resident-shenzhen-care", "greater-bay-area-cross-border-resources"],
    cta: draftCta("international-patient-gba-appointment-travel-consultation", L("准备预约与行程协调咨询", "Prepare an appointment and travel-coordination enquiry"), L("仅提供非临床行程准备，不代替机构确认。", "Only non-clinical travel preparation is provided; it does not replace provider confirmation.")),
  }),
] as const;

export const healthGeoHubs = HEALTH_GEO_HUBS;
export const healthGeoGuides = HEALTH_GEO_GUIDES;
export const healthGeoSources = HEALTH_GEO_SOURCES;

export function getHealthGeoHub(id: HealthGeoHubId): HealthGeoHubDescriptor | undefined {
  return HEALTH_GEO_HUBS.find(hub => hub.id === id);
}

export function getHealthGeoGuide(id: HealthGeoGuideId): HealthGeoGuide | undefined {
  return HEALTH_GEO_GUIDES.find(guideRecord => guideRecord.id === id);
}

export function healthGeoGuidesForHub(id: HealthGeoHubId): readonly HealthGeoGuide[] {
  return HEALTH_GEO_GUIDES.filter(guideRecord => guideRecord.hubId === id);
}

export function getHealthGeoSource(id: HealthGeoSourceId): HealthGeoSource {
  return HEALTH_GEO_SOURCES[id];
}
