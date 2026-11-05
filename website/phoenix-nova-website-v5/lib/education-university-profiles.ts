/**
 * Candidate university detail records for the Education V2 knowledge layer.
 *
 * This file deliberately sits beside (rather than inside) education-knowledge.ts:
 * the existing hub records remain the source of truth for entity IDs and their
 * published field contract.  The records below add reviewable detail-page
 * material without silently upgrading an unverified field to a fact.
 */

import { UGC_FUNDED_INSTITUTIONS, type LocalizedText } from "./education-knowledge";

export const EDUCATION_UNIVERSITY_PROFILE_ACCESS_DATE = "2026-11-03" as const;

export type UniversityAdmissionLinks = Readonly<{
  undergraduate: string | null;
  postgraduate: string | null;
  researchPostgraduate: string | null;
  subdegreeOrSeniorYear: string | null;
  nonLocalOrInternational: string | null;
}>;

/**
 * The field names intentionally make the evidence boundary visible.  A null
 * field is not a negative assertion; it means that the field has not yet been
 * reviewed at programme level and must not be presented as a live value.
 */
export type EducationUniversityProfile = Readonly<{
  entityId: string;
  slug: string;
  names: LocalizedText;
  abbreviation: string;
  institutionKind: "university";
  fundingStatus: "ugc-funded";
  officialHomepage: string;
  officialAdmissions: UniversityAdmissionLinks;
  location: LocalizedText | null;
  institutionalSummary: LocalizedText;
  undergraduatePath: LocalizedText | null;
  postgraduatePath: LocalizedText | null;
  doctoralPath: LocalizedText | null;
  subdegreePath: LocalizedText | null;
  internationalApplicantPath: LocalizedText | null;
  mainlandApplicantPath: LocalizedText | null;
  programmeCatalogue: LocalizedText | null;
  applicationCycle: LocalizedText | null;
  tuitionAndFees: LocalizedText | null;
  admissionRequirements: LocalizedText | null;
  sourceUrls: readonly string[];
  verifiedFields: readonly string[];
  unknownFields: readonly string[];
  verificationNote: LocalizedText;
  phoenixPlanningNote: LocalizedText;
  lastVerifiedOn: string;
}>;

const UGC_DIRECTORY = "https://www.ugc.edu.hk/eng/ugc/site/fund_inst.html";

const pending = (zh: string, en: string): LocalizedText => ({ zh, en });

const profiles: readonly EducationUniversityProfile[] = [
  {
    entityId: "institution.hk.ugc.hku",
    slug: "hku",
    names: { zh: "香港大学", en: "The University of Hong Kong" },
    abbreviation: "HKU",
    institutionKind: "university",
    fundingStatus: "ugc-funded",
    officialHomepage: "https://www.hku.hk/",
    officialAdmissions: {
      undergraduate: "https://admissions.hku.hk/",
      postgraduate: null,
      researchPostgraduate: null,
      subdegreeOrSeniorYear: "https://admissions.hku.hk/programmes",
      nonLocalOrInternational: "https://admissions.hku.hk/",
    },
    location: null,
    institutionalSummary: {
      zh: "教资会官方名录将香港大学列为八所教资会资助大学之一。香港大学招生办公室的官方页面提供本科招生与不同申请资格入口；具体课程和申请条件须按官方项目页面核对。",
      en: "The UGC directory lists HKU as one of Hong Kong's eight UGC-funded universities. HKU's official Admissions Office provides undergraduate admissions and qualification-specific entry points; check the relevant official programme page for current requirements.",
    },
    undergraduatePath: pending("官方本科招生入口已核实；课程、资格及日期须按申请类别逐项确认。", "The official undergraduate admissions entry is verified; programme, qualification and date details must be checked by applicant route."),
    postgraduatePath: null,
    doctoralPath: null,
    subdegreePath: pending("官方招生网站列出香港副学位等相关入口；本页未逐项目核实。", "The official admissions site exposes Hong Kong sub-degree-related entry points; individual programmes are not reviewed here."),
    internationalApplicantPath: pending("官方本科招生页包含 International Qualifications 入口；不在本页推断资格或录取结果。", "The official undergraduate admissions site includes an International Qualifications entry; this page does not infer eligibility or outcomes."),
    mainlandApplicantPath: pending("官方招生页包含 Mainland NJCEE (Gao Kao) 入口；申请季与具体要求须向学校核实。", "The official admissions site includes a Mainland NJCEE (Gao Kao) entry; the cycle and requirements must be confirmed with HKU."),
    programmeCatalogue: null,
    applicationCycle: null,
    tuitionAndFees: null,
    admissionRequirements: null,
    sourceUrls: [UGC_DIRECTORY, "https://www.hku.hk/", "https://admissions.hku.hk/", "https://admissions.hku.hk/programmes"],
    verifiedFields: ["entityId", "officialChineseName", "officialEnglishName", "abbreviation", "ugcFunding", "officialHomepage", "undergraduateAdmissionsUrl", "internationalAdmissionsUrl", "mainlandAdmissionsUrl"],
    unknownFields: ["location", "faculties", "programmeCatalogue", "postgraduateAdmissionsUrl", "doctoralAdmissionsUrl", "subdegreeProgrammeDetails", "applicationCycle", "tuitionAndFees", "admissionRequirements"],
    verificationNote: {
      zh: "名称、简称、教资会资助身份、官方网站及上述招生入口来自官方来源。费用、申请季、课程清单和资格要求未在此版本逐字段核验。",
      en: "The official sources verify the name, abbreviation, UGC-funded status, homepage and the listed admissions entries. Fees, cycles, programme lists and requirements are not field-verified in this version.",
    },
    phoenixPlanningNote: {
      zh: "凤启教育仅提供规划准备与官方信息导航，不代表香港大学或其招生办公室，也不承诺录取。",
      en: "Phoenix Education provides planning preparation and official-information navigation only; it does not represent HKU or promise admission.",
    },
    lastVerifiedOn: EDUCATION_UNIVERSITY_PROFILE_ACCESS_DATE,
  },
  {
    entityId: "institution.hk.ugc.cuhk",
    slug: "cuhk",
    names: { zh: "香港中文大学", en: "The Chinese University of Hong Kong" },
    abbreviation: "CUHK",
    institutionKind: "university",
    fundingStatus: "ugc-funded",
    officialHomepage: "https://www.cuhk.edu.hk/",
    officialAdmissions: {
      undergraduate: "https://cuhk.edu.hk/english/admissions/admissions.html",
      postgraduate: "https://www.gs.cuhk.edu.hk/admissions/how-to-apply",
      researchPostgraduate: "https://www.gs.cuhk.edu.hk/admissions/how-to-apply",
      subdegreeOrSeniorYear: null,
      nonLocalOrInternational: "https://cuhk.edu.hk/english/admissions/admissions.html",
    },
    location: null,
    institutionalSummary: {
      zh: "教资会官方名录将香港中文大学列为八所教资会资助大学之一。香港中文大学官方招生总页提供本科及研究生入口，研究院官方页面说明研究生申请步骤；具体项目仍须以院校页面为准。",
      en: "The UGC directory lists CUHK as one of Hong Kong's eight UGC-funded universities. CUHK's official admissions page provides undergraduate and postgraduate entry points, while the Graduate School publishes postgraduate application steps; programme details remain institution-specific.",
    },
    undergraduatePath: pending("官方招生总页提供本科入口；具体入学类别、专业和日期未在本页逐项核验。", "The official admissions page provides an undergraduate entry; individual routes, programmes and dates are not reviewed here."),
    postgraduatePath: pending("研究院官方 How to Apply 页面已核实为研究生申请入口；具体学院可能使用不同申请系统。", "The Graduate School's official How to Apply page is verified as a postgraduate entry; some faculties may use different application systems."),
    doctoralPath: pending("研究院入口涵盖研究生申请；博士项目要求需按项目核实。", "The Graduate School entry covers postgraduate applications; doctoral requirements must be checked by programme."),
    subdegreePath: null,
    internationalApplicantPath: pending("官方招生页提供本科招生信息；非本地申请人的资格与材料须按申请类别核实。", "The official admissions page provides undergraduate information; non-local eligibility and documents must be checked by applicant category."),
    mainlandApplicantPath: null,
    programmeCatalogue: null,
    applicationCycle: null,
    tuitionAndFees: null,
    admissionRequirements: null,
    sourceUrls: [UGC_DIRECTORY, "https://www.cuhk.edu.hk/", "https://cuhk.edu.hk/english/admissions/admissions.html", "https://www.gs.cuhk.edu.hk/admissions/how-to-apply"],
    verifiedFields: ["entityId", "officialChineseName", "officialEnglishName", "abbreviation", "ugcFunding", "officialHomepage", "undergraduateAdmissionsUrl", "postgraduateAdmissionsUrl", "researchPostgraduateAdmissionsUrl"],
    unknownFields: ["location", "faculties", "programmeCatalogue", "subdegreeProgrammeDetails", "applicationCycle", "tuitionAndFees", "admissionRequirements", "mainlandAdmissionsUrl"],
    verificationNote: {
      zh: "官方来源支持名称、简称、资助身份、官方网站及本科/研究生入口。课程目录、学费、申请季、内地路径和项目要求未在本版本完整核实。",
      en: "Official sources support the name, abbreviation, funding status, homepage and undergraduate/postgraduate entries. Programme catalogues, fees, cycles, mainland routes and programme requirements are not fully verified in this version.",
    },
    phoenixPlanningNote: {
      zh: "凤启教育不代替香港中文大学招生决定；申请人应直接向官方页面核实资格及截止日期。",
      en: "Phoenix Education does not replace CUHK's admissions decisions; applicants should verify eligibility and deadlines directly on official pages.",
    },
    lastVerifiedOn: EDUCATION_UNIVERSITY_PROFILE_ACCESS_DATE,
  },
  {
    entityId: "institution.hk.ugc.hkust",
    slug: "hkust",
    names: { zh: "香港科技大学", en: "The Hong Kong University of Science and Technology" },
    abbreviation: "HKUST",
    institutionKind: "university",
    fundingStatus: "ugc-funded",
    officialHomepage: "https://hkust.edu.hk/",
    officialAdmissions: {
      undergraduate: "https://join.hkust.edu.hk/",
      postgraduate: null,
      researchPostgraduate: null,
      subdegreeOrSeniorYear: "https://join.hkust.edu.hk/admissions/post-secondary/application-procedures",
      nonLocalOrInternational: "https://join.hkust.edu.hk/apply",
    },
    location: null,
    institutionalSummary: {
      zh: "教资会官方名录将香港科技大学列为八所教资会资助大学之一。HKUST 官方本科招生入口按国际资格、专上资格及内地高考等申请类别提供信息；具体年份和项目要求会随招生周期更新。",
      en: "The UGC directory lists HKUST as one of Hong Kong's eight UGC-funded universities. HKUST's official undergraduate admissions entry provides routes for international qualifications, post-secondary qualifications and Mainland Gaokao; year-specific requirements are subject to the live admissions cycle.",
    },
    undergraduatePath: pending("官方本科招生入口与申请程序页已核实；具体专业和申请季不在本页固定。", "The official undergraduate entry and application-procedures page are verified; this page does not freeze programme or cycle details."),
    postgraduatePath: null,
    doctoralPath: null,
    subdegreePath: pending("官方申请程序页明确提供 post-secondary 申请路径；具体可申请项目须按当年页面核实。", "The official application-procedures page provides a post-secondary route; eligible programmes must be checked on the current page."),
    internationalApplicantPath: pending("官方 Apply 页按 International Qualifications 提供申请入口。", "The official Apply page provides an International Qualifications route."),
    mainlandApplicantPath: pending("官方 Apply 页提供 Mainland Gaokao 申请路径；不在此页推断录取条件。", "The official Apply page provides a Mainland Gaokao route; this page does not infer admission conditions."),
    programmeCatalogue: null,
    applicationCycle: null,
    tuitionAndFees: null,
    admissionRequirements: null,
    sourceUrls: [UGC_DIRECTORY, "https://hkust.edu.hk/", "https://join.hkust.edu.hk/", "https://join.hkust.edu.hk/apply", "https://join.hkust.edu.hk/admissions/post-secondary/application-procedures"],
    verifiedFields: ["entityId", "officialChineseName", "officialEnglishName", "abbreviation", "ugcFunding", "officialHomepage", "undergraduateAdmissionsUrl", "internationalAdmissionsUrl", "postSecondaryAdmissionsUrl", "mainlandAdmissionsUrl"],
    unknownFields: ["location", "faculties", "programmeCatalogue", "postgraduateAdmissionsUrl", "doctoralAdmissionsUrl", "applicationCycle", "tuitionAndFees", "admissionRequirements"],
    verificationNote: {
      zh: "官方来源支持名称、简称、资助身份、官方网站及本科申请类别入口。研究生入口、课程清单、费用、申请季和要求未在本版本逐字段核验。",
      en: "Official sources support the name, abbreviation, funding status, homepage and undergraduate applicant-route entries. Postgraduate entries, programme lists, fees, cycles and requirements are not field-verified here.",
    },
    phoenixPlanningNote: {
      zh: "本页只作官方入口导航与规划准备，不代表香港科技大学或承诺录取。",
      en: "This page is an official-entry guide and planning aid only; it does not represent HKUST or promise admission.",
    },
    lastVerifiedOn: EDUCATION_UNIVERSITY_PROFILE_ACCESS_DATE,
  },
  {
    entityId: "institution.hk.ugc.polyu",
    slug: "polyu",
    names: { zh: "香港理工大学", en: "The Hong Kong Polytechnic University" },
    abbreviation: "PolyU",
    institutionKind: "university",
    fundingStatus: "ugc-funded",
    officialHomepage: "https://www.polyu.edu.hk/",
    officialAdmissions: {
      undergraduate: "https://www.polyu.edu.hk/admissions/",
      postgraduate: "https://www.polyu.edu.hk/admissions/",
      researchPostgraduate: null,
      subdegreeOrSeniorYear: "https://www38.polyu.edu.hk/eAdmission/index.do",
      nonLocalOrInternational: "https://www38.polyu.edu.hk/eAdmission/index.do",
    },
    location: null,
    institutionalSummary: {
      zh: "教资会官方名录将香港理工大学列为八所教资会资助大学之一。PolyU 官方招生页链接到 eAdmission，官方申请入口显示本科一年级/高年级及研究生入口；时间和项目资料须按当前周期查看。",
      en: "The UGC directory lists PolyU as one of Hong Kong's eight UGC-funded universities. PolyU's official admissions page links to eAdmission, whose official portal exposes undergraduate Year 1/Senior Year and postgraduate entries; dates and programmes must be checked for the current cycle.",
    },
    undergraduatePath: pending("官方招生页及 eAdmission 已核实；一年级、高年级和申请类别需按当年系统确认。", "The official admissions page and eAdmission portal are verified; Year 1, Senior Year and applicant routes must be confirmed for the current cycle."),
    postgraduatePath: pending("官方招生页与 eAdmission 提供研究生入口；具体学院要求未在本页逐项核实。", "The official admissions page and eAdmission provide a postgraduate entry; faculty-level requirements are not reviewed here."),
    doctoralPath: null,
    subdegreePath: pending("eAdmission 官方入口显示本科高年级等申请路径；不据此推断学分衔接或录取。", "The official eAdmission entry exposes senior-year routes; it does not establish credit articulation or admission."),
    internationalApplicantPath: pending("eAdmission 官方入口包含非本地/国际申请类别；具体资格须直接向系统核实。", "The official eAdmission portal includes non-local/international routes; eligibility must be checked in the system."),
    mainlandApplicantPath: pending("官方 eAdmission 入口提供相关申请类别；内地申请人应按当年通知核实。", "The official eAdmission entry provides relevant applicant routes; Mainland applicants should check the current notice."),
    programmeCatalogue: null,
    applicationCycle: null,
    tuitionAndFees: null,
    admissionRequirements: null,
    sourceUrls: [UGC_DIRECTORY, "https://www.polyu.edu.hk/", "https://www.polyu.edu.hk/admissions/", "https://www38.polyu.edu.hk/eAdmission/index.do"],
    verifiedFields: ["entityId", "officialChineseName", "officialEnglishName", "abbreviation", "ugcFunding", "officialHomepage", "undergraduateAdmissionsUrl", "postgraduateAdmissionsUrl", "seniorYearAdmissionsUrl", "internationalAdmissionsUrl"],
    unknownFields: ["location", "faculties", "programmeCatalogue", "doctoralAdmissionsUrl", "applicationCycle", "tuitionAndFees", "admissionRequirements", "creditArticulation"],
    verificationNote: {
      zh: "官方来源支持名称、简称、资助身份、官方网站和本科/研究生官方入口。具体课程、费用、申请季、博士及衔接要求未在本版本逐字段核验。",
      en: "Official sources support the name, abbreviation, funding status, homepage and undergraduate/postgraduate entry points. Specific programmes, fees, cycles, doctoral and articulation requirements are not field-verified in this version.",
    },
    phoenixPlanningNote: {
      zh: "凤启教育不代替理大招生系统或院系审核；请以官方 eAdmission 信息为准。",
      en: "Phoenix Education does not replace PolyU's admissions system or faculty review; the official eAdmission information remains authoritative.",
    },
    lastVerifiedOn: EDUCATION_UNIVERSITY_PROFILE_ACCESS_DATE,
  },
  {
    entityId: "institution.hk.ugc.cityu",
    slug: "cityuhk",
    names: { zh: "香港城市大学", en: "City University of Hong Kong" },
    abbreviation: "CityUHK",
    institutionKind: "university",
    fundingStatus: "ugc-funded",
    officialHomepage: "https://www.cityu.edu.hk/",
    officialAdmissions: {
      undergraduate: "https://www.cityu.edu.hk/en/admissions/ug",
      postgraduate: "https://www.cityu.edu.hk/en/pg/programme-search",
      researchPostgraduate: "https://www.cityu.edu.hk/admissions",
      subdegreeOrSeniorYear: "https://www.cityu.edu.hk/en/admissions/ug",
      nonLocalOrInternational: "https://www.cityu.edu.hk/admissions",
    },
    location: null,
    institutionalSummary: {
      zh: "教资会官方名录将香港城市大学列为八所教资会资助大学之一。CityUHK 官方招生页列出 JUPAS、非联招、高年级、国际、内地等本科申请入口，并分别提供研究生项目检索；具体资格和期限须按官方页面核对。",
      en: "The UGC directory lists CityUHK as one of Hong Kong's eight UGC-funded universities. CityUHK's official admissions pages list JUPAS, Non-JUPAS, senior-year, international and mainland undergraduate routes, with a separate postgraduate programme search; verify current eligibility and dates on the official pages.",
    },
    undergraduatePath: pending("官方本科招生页列出 JUPAS、非联招、高年级、国际、内地及交换等入口。", "The official undergraduate page lists JUPAS, Non-JUPAS, senior-year, international, mainland and exchange routes."),
    postgraduatePath: pending("官方研究生项目检索页已核实；项目、模式与截止日期随页面更新。", "The official postgraduate programme-search page is verified; programmes, modes and deadlines change on the live page."),
    doctoralPath: pending("官方招生页列出 Research Degree 与 Professional Doctorate 方向；具体要求须按项目核实。", "The official admissions page lists Research Degree and Professional Doctorate directions; requirements must be checked per programme."),
    subdegreePath: pending("本科招生页提供 Senior-Year 入口；不在本页推断副学位衔接或学分。", "The undergraduate page provides a Senior-Year entry; this page does not infer sub-degree articulation or credits."),
    internationalApplicantPath: pending("官方招生页列出 International Admissions 入口。", "The official admissions page lists an International Admissions entry."),
    mainlandApplicantPath: pending("官方招生页列出 Mainland Admissions 入口；申请安排以当年公告为准。", "The official admissions page lists a Mainland Admissions entry; arrangements follow the current notice."),
    programmeCatalogue: null,
    applicationCycle: null,
    tuitionAndFees: null,
    admissionRequirements: null,
    sourceUrls: [UGC_DIRECTORY, "https://www.cityu.edu.hk/", "https://www.cityu.edu.hk/admissions", "https://www.cityu.edu.hk/en/admissions/ug", "https://www.cityu.edu.hk/en/pg/programme-search"],
    verifiedFields: ["entityId", "officialChineseName", "officialEnglishName", "abbreviation", "ugcFunding", "officialHomepage", "undergraduateAdmissionsUrl", "postgraduateProgrammeSearchUrl", "researchPostgraduateUrl", "internationalAdmissionsUrl", "mainlandAdmissionsUrl"],
    unknownFields: ["location", "faculties", "programmeCatalogue", "applicationCycle", "tuitionAndFees", "admissionRequirements", "creditArticulation"],
    verificationNote: {
      zh: "官方来源支持名称、简称、资助身份、官方网站、本科申请类别及研究生项目检索入口。费用、申请季和具体项目要求未在此版本逐字段核验。",
      en: "Official sources support the name, abbreviation, funding status, homepage, undergraduate applicant routes and postgraduate programme-search entry. Fees, cycles and programme-specific requirements are not field-verified here.",
    },
    phoenixPlanningNote: {
      zh: "本页只帮助用户找到 CityUHK 官方申请入口，不代表学校、不代替招生审核。",
      en: "This page helps users find CityUHK's official application entries only; it does not represent the university or replace admissions review.",
    },
    lastVerifiedOn: EDUCATION_UNIVERSITY_PROFILE_ACCESS_DATE,
  },
  {
    entityId: "institution.hk.ugc.hkbu",
    slug: "hkbu",
    names: { zh: "香港浸会大学", en: "Hong Kong Baptist University" },
    abbreviation: "HKBU",
    institutionKind: "university",
    fundingStatus: "ugc-funded",
    officialHomepage: "https://www.hkbu.edu.hk/",
    officialAdmissions: {
      undergraduate: "https://admissions.hkbu.edu.hk/",
      postgraduate: null,
      researchPostgraduate: null,
      subdegreeOrSeniorYear: "https://admissions.hkbu.edu.hk/",
      nonLocalOrInternational: "https://admissions.hkbu.edu.hk/",
    },
    location: null,
    institutionalSummary: {
      zh: "教资会官方名录将香港浸会大学列为八所教资会资助大学之一。HKBU 官方本科招生平台按 HKDSE、国际资格、专上资格、中国内地高考及直接入学等类别提供入口；本页不把本科入口推断为研究生资料。",
      en: "The UGC directory lists HKBU as one of Hong Kong's eight UGC-funded universities. HKBU's official undergraduate admissions platform provides HKDSE, international, post-secondary, Mainland JEE and direct-admission routes; the undergraduate entry is not treated as postgraduate evidence here.",
    },
    undergraduatePath: pending("官方本科招生平台已核实，并按申请资格提供筛选。", "The official undergraduate admissions platform is verified and provides qualification-based routes."),
    postgraduatePath: null,
    doctoralPath: null,
    subdegreePath: pending("官方本科招生平台显示 Senior Year 及专上资格入口；具体项目需逐项核实。", "The official undergraduate platform shows Senior Year and post-secondary routes; individual programmes require separate review."),
    internationalApplicantPath: pending("官方平台提供 International Qualifications 入口。", "The official platform provides an International Qualifications entry."),
    mainlandApplicantPath: pending("官方平台提供 Chinese Mainland JEE 入口；不在此页写入申请日期或成绩要求。", "The official platform provides a Chinese Mainland JEE entry; no dates or score requirements are written here."),
    programmeCatalogue: null,
    applicationCycle: null,
    tuitionAndFees: null,
    admissionRequirements: null,
    sourceUrls: [UGC_DIRECTORY, "https://www.hkbu.edu.hk/", "https://admissions.hkbu.edu.hk/"],
    verifiedFields: ["entityId", "officialChineseName", "officialEnglishName", "abbreviation", "ugcFunding", "officialHomepage", "undergraduateAdmissionsUrl", "seniorYearAdmissionsUrl", "internationalAdmissionsUrl", "mainlandAdmissionsUrl"],
    unknownFields: ["location", "faculties", "programmeCatalogue", "postgraduateAdmissionsUrl", "doctoralAdmissionsUrl", "applicationCycle", "tuitionAndFees", "admissionRequirements"],
    verificationNote: {
      zh: "官方来源支持名称、简称、资助身份、官方网站及本科申请平台入口。研究生与博士入口、费用、申请季及项目要求未在本版本逐字段核验。",
      en: "Official sources support the name, abbreviation, funding status, homepage and undergraduate admissions platform. Postgraduate/doctoral entries, fees, cycles and programme requirements are not field-verified in this version.",
    },
    phoenixPlanningNote: {
      zh: "申请人应直接在 HKBU 官方平台核实申请类别和材料；本页不提供录取判断。",
      en: "Applicants should verify their route and documents on HKBU's official platform; this page does not make admission judgements.",
    },
    lastVerifiedOn: EDUCATION_UNIVERSITY_PROFILE_ACCESS_DATE,
  },
  {
    entityId: "institution.hk.ugc.lu",
    slug: "lu",
    names: { zh: "岭南大学", en: "Lingnan University" },
    abbreviation: "LU",
    institutionKind: "university",
    fundingStatus: "ugc-funded",
    officialHomepage: "https://www.ln.edu.hk/",
    officialAdmissions: {
      undergraduate: "https://www.ln.edu.hk/admissions/ug/",
      postgraduate: "https://www.ln.edu.hk/sgs/for-prospective-students/taught-postgraduate-programmes/admission-information",
      researchPostgraduate: "https://www.ln.edu.hk/information-for/prospective-students",
      subdegreeOrSeniorYear: "https://www.ln.edu.hk/information-for/prospective-students",
      nonLocalOrInternational: "https://www.ln.edu.hk/admissions/ug/",
    },
    location: null,
    institutionalSummary: {
      zh: "教资会官方名录将岭南大学列为八所教资会资助大学之一。岭南大学官方 Prospective Students 页面明确列出本科、授课型研究生、研究型研究生，以及副学位/高等文凭等入口；本科招生页提供独立申请信息。",
      en: "The UGC directory lists Lingnan University as one of Hong Kong's eight UGC-funded universities. Lingnan's official Prospective Students page identifies undergraduate, taught postgraduate, research postgraduate and associate/higher-diploma routes, with a separate undergraduate admissions page.",
    },
    undergraduatePath: pending("官方本科招生页提供 2027 入学及不同申请人类别入口；日期与资格须查看实时页面。", "The official undergraduate admissions page provides 2027-entry and applicant-category entries; dates and eligibility must be checked on the live page."),
    postgraduatePath: pending("官方 Prospective Students 页面及研究院招生信息页已核实授课型研究生方向。", "The official Prospective Students and graduate admissions pages identify taught postgraduate routes."),
    doctoralPath: pending("官方 Prospective Students 页面列出研究型研究生方向；博士要求须按项目核实。", "The official Prospective Students page identifies research postgraduate routes; doctoral requirements must be checked by programme."),
    subdegreePath: pending("官方 Prospective Students 页面列出 Associate Degree、Higher Diploma 及 Continuing Education 入口。", "The official Prospective Students page lists Associate Degree, Higher Diploma and Continuing Education entries."),
    internationalApplicantPath: pending("官方本科招生页列出持国际资格申请人入口。", "The official undergraduate page lists an entry for applicants holding international qualifications."),
    mainlandApplicantPath: pending("官方本科招生页列出 Mainland Gaokao 入口；要求随招生年度更新。", "The official undergraduate page lists a Mainland Gaokao entry; requirements update by admission year."),
    programmeCatalogue: null,
    applicationCycle: null,
    tuitionAndFees: null,
    admissionRequirements: null,
    sourceUrls: [UGC_DIRECTORY, "https://www.ln.edu.hk/", "https://www.ln.edu.hk/information-for/prospective-students", "https://www.ln.edu.hk/admissions/ug/", "https://www.ln.edu.hk/sgs/for-prospective-students/taught-postgraduate-programmes/admission-information"],
    verifiedFields: ["entityId", "officialChineseName", "officialEnglishName", "abbreviation", "ugcFunding", "officialHomepage", "undergraduateAdmissionsUrl", "postgraduateAdmissionsUrl", "researchPostgraduateUrl", "subdegreeAdmissionsUrl", "internationalAdmissionsUrl", "mainlandAdmissionsUrl"],
    unknownFields: ["location", "faculties", "programmeCatalogue", "applicationCycle", "tuitionAndFees", "admissionRequirements", "creditArticulation"],
    verificationNote: {
      zh: "官方来源支持名称、简称、资助身份、官方网站及本科、研究生、研究型研究生与副学位入口。费用、申请季和项目要求未在本版本逐字段核验。",
      en: "Official sources support the name, abbreviation, funding status, homepage and undergraduate, postgraduate, research-postgraduate and sub-degree entries. Fees, cycles and programme requirements are not field-verified in this version.",
    },
    phoenixPlanningNote: {
      zh: "岭大申请路径和项目资料应以官方招生页面为准；凤启不代表岭南大学。",
      en: "Lingnan's official admissions pages remain authoritative for routes and programme information; Phoenix does not represent Lingnan University.",
    },
    lastVerifiedOn: EDUCATION_UNIVERSITY_PROFILE_ACCESS_DATE,
  },
  {
    entityId: "institution.hk.ugc.eduhk",
    slug: "eduhk",
    names: { zh: "香港教育大学", en: "The Education University of Hong Kong" },
    abbreviation: "EdUHK",
    institutionKind: "university",
    fundingStatus: "ugc-funded",
    officialHomepage: "https://www.eduhk.hk/",
    officialAdmissions: {
      undergraduate: "https://www.eduhk.hk/acadprog/undergrad/",
      postgraduate: "https://www.eduhk.hk/acadprog/postgrad/index.html",
      researchPostgraduate: "https://www.eduhk.hk/acadprog/postgrad/index.html",
      subdegreeOrSeniorYear: "https://www.eduhk.hk/acadprog/application/",
      nonLocalOrInternational: "https://www.eduhk.hk/acadprog/application/",
    },
    location: null,
    institutionalSummary: {
      zh: "教资会官方名录将香港教育大学列为八所教资会资助大学之一。EdUHK 官方 Academic Programmes and Admissions 平台分别提供本科、研究生、专业发展及申请说明；官方申请页强调课程与入学要求应按具体项目核实。",
      en: "The UGC directory lists EdUHK as one of Hong Kong's eight UGC-funded universities. EdUHK's official Academic Programmes and Admissions platform provides separate undergraduate, postgraduate, professional-development and application guidance, with requirements to be checked by programme.",
    },
    undergraduatePath: pending("官方本科课程页提供 Year 1 / Senior Year 入口；项目要求须按课程页核实。", "The official undergraduate page provides Year 1 / Senior Year entries; requirements must be checked on the individual programme page."),
    postgraduatePath: pending("官方研究生课程页列出研究型、专业博士及授课型研究生入口。", "The official postgraduate page lists research postgraduate, professional doctorate and taught postgraduate entries."),
    doctoralPath: pending("官方研究生页列出 Professional Doctorate 与 Research Postgraduate；具体项目要求未在本页展开。", "The official postgraduate page lists Professional Doctorate and Research Postgraduate entries; programme requirements are not expanded here."),
    subdegreePath: pending("官方申请说明列出 Sub-degree 申请类别；具体课程与衔接未在此版本核实。", "The official application guidance lists a Sub-degree applicant category; programmes and articulation are not reviewed here."),
    internationalApplicantPath: pending("官方申请说明包含 Non-local Applicants 部分；申请资料须按当年页面核实。", "The official application guidance includes a Non-local Applicants section; documents must be checked on the current page."),
    mainlandApplicantPath: null,
    programmeCatalogue: null,
    applicationCycle: null,
    tuitionAndFees: null,
    admissionRequirements: null,
    sourceUrls: [UGC_DIRECTORY, "https://www.eduhk.hk/", "https://www.eduhk.hk/acadprog/", "https://www.eduhk.hk/acadprog/undergrad/", "https://www.eduhk.hk/acadprog/postgrad/index.html", "https://www.eduhk.hk/acadprog/application/"],
    verifiedFields: ["entityId", "officialChineseName", "officialEnglishName", "abbreviation", "ugcFunding", "officialHomepage", "undergraduateAdmissionsUrl", "postgraduateAdmissionsUrl", "researchPostgraduateUrl", "professionalDoctorateUrl", "subdegreeAdmissionsUrl", "nonLocalAdmissionsUrl"],
    unknownFields: ["location", "faculties", "programmeCatalogue", "applicationCycle", "tuitionAndFees", "admissionRequirements", "mainlandAdmissionsUrl", "creditArticulation"],
    verificationNote: {
      zh: "官方来源支持名称、简称、资助身份、官方网站及本科/研究生/副学位申请入口。费用、申请季、具体课程与内地路径未在本版本逐字段核验。",
      en: "Official sources support the name, abbreviation, funding status, homepage and undergraduate/postgraduate/sub-degree entries. Fees, cycles, programme details and mainland route are not field-verified in this version.",
    },
    phoenixPlanningNote: {
      zh: "EdUHK 申请资料与费用应直接以官方 Academic Programmes and Admissions 页面为准；凤启不代替学校审核。",
      en: "EdUHK's official Academic Programmes and Admissions pages remain authoritative for documents and fees; Phoenix does not replace the University's review.",
    },
    lastVerifiedOn: EDUCATION_UNIVERSITY_PROFILE_ACCESS_DATE,
  },
] as const;

/** Stable slug-to-profile lookup used by the detail route. */
export const educationUniversityProfiles = profiles;

export const EDUCATION_UNIVERSITY_PROFILE_BY_SLUG: Readonly<Record<string, EducationUniversityProfile>> = Object.freeze(
  Object.fromEntries(profiles.map(profile => [profile.slug, profile])),
);

/**
 * Return null for an unknown slug.  The route turns this into Next's 404 rather
 * than falling back to an unrelated institution.
 */
export function getEducationUniversityProfile(slug: string): EducationUniversityProfile | null {
  return EDUCATION_UNIVERSITY_PROFILE_BY_SLUG[slug] ?? null;
}

/** The route only exposes the eight entities already present in education-knowledge.ts. */
export const EDUCATION_UNIVERSITY_PROFILE_ENTITY_IDS = profiles.map(profile => profile.entityId) as readonly string[];

/** Defensive consistency check for tests and future data reviews. */
export function hasKnownEducationUniversityEntity(entityId: string): boolean {
  return UGC_FUNDED_INSTITUTIONS.some(institution => institution.entityId === entityId);
}
