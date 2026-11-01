/**
 * Phoenix Nova Education knowledge contract.
 *
 * This module is deliberately a pure, typed content boundary.  It does not
 * read from a database, call an API, or imply that a missing fact is known.
 * The production seed is intentionally small: it contains only the eight
 * UGC-funded universities and the fields that can be checked against official
 * public sources.
 */

export const EDUCATION_KNOWLEDGE_VERSION = "2.0.0" as const;
export const KNOWLEDGE_ACCESS_DATE = "2026-11-02" as const;

export type Locale = "zh" | "en";
export type LocalizedText = Readonly<Record<Locale, string>>;

export type EducationStageId =
  | "kindergarten"
  | "primary-schools"
  | "secondary-schools"
  | "hong-kong-universities"
  | "subdegrees"
  | "postgraduate"
  | "global"
  | "academy";

export interface EducationStageDescriptor {
  readonly id: EducationStageId;
  readonly names: LocalizedText;
  readonly descriptions: LocalizedText;
  /** Public, locale-preserving route used by the SSR hub. */
  readonly routes: Readonly<Record<Locale, string>>;
}

/**
 * The eight entry routes are descriptors, not claims that a catalogue exists
 * for each stage.  A route can therefore be rendered with an empty state.
 */
export const EDUCATION_STAGE_DESCRIPTORS: readonly EducationStageDescriptor[] = [
  {
    id: "kindergarten",
    names: { zh: "幼稚园与学前教育", en: "Kindergarten & Early Years" },
    descriptions: {
      zh: "了解幼稚园及学前阶段的教育选择与家庭准备方向。",
      en: "Explore kindergarten and early-years choices and family preparation.",
    },
    routes: { zh: "/zh/education/kindergarten", en: "/en/education/kindergarten" },
  },
  {
    id: "primary-schools",
    names: { zh: "小学教育", en: "Primary Education" },
    descriptions: {
      zh: "按地区、课程与家庭目标梳理小学阶段的规划方向。",
      en: "Review primary-stage directions by district, curriculum and family goals.",
    },
    routes: { zh: "/zh/education/primary-schools", en: "/en/education/primary-schools" },
  },
  {
    id: "secondary-schools",
    names: { zh: "中学教育", en: "Secondary Education" },
    descriptions: {
      zh: "了解中学阶段的课程、升学衔接与成长选择。",
      en: "Understand secondary curricula, progression and growth choices.",
    },
    routes: { zh: "/zh/education/secondary-schools", en: "/en/education/secondary-schools" },
  },
  {
    id: "hong-kong-universities",
    names: { zh: "香港大学与高等教育", en: "Hong Kong Universities & Higher Education" },
    descriptions: {
      zh: "查看香港大学及官方资讯入口；申请要求须向院校核实。",
      en: "Browse Hong Kong universities and official information entry points; verify requirements with each institution.",
    },
    routes: { zh: "/zh/education/hong-kong-universities", en: "/en/education/hong-kong-universities" },
  },
  {
    id: "subdegrees",
    names: { zh: "副学位与本科衔接", en: "Sub-degree & Undergraduate Progression" },
    descriptions: {
      zh: "了解副学位、本科入学及衔接方向，不替代院校录取判断。",
      en: "Explore sub-degree, undergraduate entry and progression directions without replacing institutional admission decisions.",
    },
    routes: { zh: "/zh/education/subdegrees", en: "/en/education/subdegrees" },
  },
  {
    id: "postgraduate",
    names: { zh: "香港硕士与研究生教育", en: "Hong Kong Postgraduate Study" },
    descriptions: {
      zh: "整理香港授课型及研究型硕士的官方资讯入口。",
      en: "Organise official information entry points for taught and research master’s study in Hong Kong.",
    },
    routes: { zh: "/zh/education/postgraduate", en: "/en/education/postgraduate" },
  },
  {
    id: "global",
    names: { zh: "国际升学申请", en: "International Admissions" },
    descriptions: {
      zh: "按目标地区与学习阶段查找升学规划方向；具体信息以官方来源为准。",
      en: "Explore admissions directions by destination and study stage; official sources remain authoritative.",
    },
    routes: { zh: "/zh/education/global", en: "/en/education/global" },
  },
  {
    id: "academy",
    names: { zh: "凤启学苑与学习支持", en: "Phoenix Academy & Learning Support" },
    descriptions: {
      zh: "了解凤启学苑及学习支持产品的公开介绍与开放状态。",
      en: "Review public descriptions and availability for Phoenix Academy and learning support products.",
    },
    routes: { zh: "/zh/education/academy", en: "/en/education/academy" },
  },
] as const;

export const educationStageDescriptors = EDUCATION_STAGE_DESCRIPTORS;

export const EDUCATION_STAGE_ROUTES: Readonly<Record<EducationStageId, Readonly<Record<Locale, string>>>> =
  Object.fromEntries(EDUCATION_STAGE_DESCRIPTORS.map(stage => [stage.id, stage.routes])) as Readonly<
    Record<EducationStageId, Readonly<Record<Locale, string>>>
  >;

export const educationStageRoutes = EDUCATION_STAGE_ROUTES;

export interface HongKongDistrict {
  readonly id: HongKongDistrictId;
  readonly names: LocalizedText;
}

export type HongKongDistrictId =
  | "central-and-western"
  | "wan-chai"
  | "eastern"
  | "southern"
  | "yau-tsim-mong"
  | "sham-shui-po"
  | "kowloon-city"
  | "wong-tai-sin"
  | "kwun-tong"
  | "tsuen-wan"
  | "tuen-mun"
  | "yuen-long"
  | "north"
  | "tai-po"
  | "sai-kung"
  | "sha-tin"
  | "kwai-tsing"
  | "islands";

/** Hong Kong's 18 districts, kept as a stable facet vocabulary. */
export const HONG_KONG_18_DISTRICTS: readonly HongKongDistrict[] = [
  { id: "central-and-western", names: { zh: "中西区", en: "Central and Western" } },
  { id: "wan-chai", names: { zh: "湾仔区", en: "Wan Chai" } },
  { id: "eastern", names: { zh: "东区", en: "Eastern" } },
  { id: "southern", names: { zh: "南区", en: "Southern" } },
  { id: "yau-tsim-mong", names: { zh: "油尖旺区", en: "Yau Tsim Mong" } },
  { id: "sham-shui-po", names: { zh: "深水埗区", en: "Sham Shui Po" } },
  { id: "kowloon-city", names: { zh: "九龙城区", en: "Kowloon City" } },
  { id: "wong-tai-sin", names: { zh: "黄大仙区", en: "Wong Tai Sin" } },
  { id: "kwun-tong", names: { zh: "观塘区", en: "Kwun Tong" } },
  { id: "tsuen-wan", names: { zh: "荃湾区", en: "Tsuen Wan" } },
  { id: "tuen-mun", names: { zh: "屯门区", en: "Tuen Mun" } },
  { id: "yuen-long", names: { zh: "元朗区", en: "Yuen Long" } },
  { id: "north", names: { zh: "北区", en: "North" } },
  { id: "tai-po", names: { zh: "大埔区", en: "Tai Po" } },
  { id: "sai-kung", names: { zh: "西贡区", en: "Sai Kung" } },
  { id: "sha-tin", names: { zh: "沙田区", en: "Sha Tin" } },
  { id: "kwai-tsing", names: { zh: "葵青区", en: "Kwai Tsing" } },
  { id: "islands", names: { zh: "离岛区", en: "Islands" } },
] as const;

export const HK18_DISTRICTS = HONG_KONG_18_DISTRICTS;
export const HK_18_DISTRICTS = HONG_KONG_18_DISTRICTS;
export const hongKongDistricts = HONG_KONG_18_DISTRICTS;

export type InstitutionKind = "kindergarten" | "school" | "university" | "academy" | "provider";
export type FundingLabel =
  | "ugc-funded"
  | "government"
  | "aided"
  | "direct-subsidy"
  | "private"
  | "self-financed"
  | "other"
  | "unknown";
export type OperationLabel = "public" | "statutory" | "private" | "university" | "independent" | "unknown";
export type LegalStatusLabel = "statutory-body" | "company" | "charity" | "registered-school" | "unknown";
export type CurriculumLabel =
  | "local"
  | "international"
  | "ib"
  | "ib-pyp"
  | "ib-myp"
  | "ib-dp"
  | "ib-cp"
  | "dse"
  | "a-level"
  | "igcse"
  | "as"
  | "a2"
  | "ap"
  | "national"
  | "cambridge"
  | "other"
  | "unknown";

/**
 * These dimensions are intentionally separate.  For example, UGC funding is
 * not treated as a legal form, and a curriculum is not inferred from a school
 * operator.  Each array is multi-label and may be empty when not verified.
 */
export interface EducationClassifications {
  readonly funding: readonly FundingLabel[];
  readonly operation: readonly OperationLabel[];
  readonly legal: readonly LegalStatusLabel[];
  readonly curricula: readonly CurriculumLabel[];
}

export type KnowledgeField =
  | "name"
  | "funding"
  | "officialHomepage"
  | "stage"
  | "district"
  | "operation"
  | "legal"
  | "curricula"
  | "description"
  | "programmeCycle";

export type VerificationState = "verified" | "candidate" | "unverified";

export interface KnowledgeSource {
  readonly id: string;
  readonly publisher: string;
  readonly title: LocalizedText;
  readonly url: string;
  readonly sourceType: "official" | "primary" | "secondary";
  readonly accessedOn: string;
  readonly supports: readonly KnowledgeField[];
}

export interface FieldVerification {
  readonly status: VerificationState;
  readonly verifiedFields: readonly KnowledgeField[];
  readonly lastVerifiedOn: string | null;
  readonly sources: readonly KnowledgeSource[];
  readonly note: LocalizedText;
}

export type PublicationState = "draft" | "candidate" | "published" | "expired" | "archived";
export type PublicationSurface = "hub" | "search" | "detail";

export interface PublicationGate {
  readonly state: PublicationState;
  readonly visibleIn: readonly PublicationSurface[];
  readonly publishedAt: string | null;
  readonly expiresAt: string | null;
}

export interface AgeRange {
  readonly min: number | null;
  readonly max: number | null;
  readonly unit: "years";
}

export interface FeeInformation {
  readonly currency: string | null;
  readonly minimum: number | null;
  readonly maximum: number | null;
  readonly note: LocalizedText | null;
}

export interface EducationInstitution {
  readonly entityId: string;
  readonly entityType: "institution";
  readonly names: LocalizedText;
  readonly aliases: readonly LocalizedText[];
  readonly institutionKind: InstitutionKind;
  readonly classifications: EducationClassifications;
  readonly stageIds: readonly EducationStageId[];
  readonly district: HongKongDistrictId | null;
  readonly languageOfInstruction: readonly string[] | null;
  readonly gender: "coeducational" | "girls" | "boys" | "unknown" | null;
  readonly ageRange: AgeRange | null;
  readonly fees: FeeInformation | null;
  readonly officialHomepage: string | null;
  readonly summary: LocalizedText | null;
  readonly updatedAt: string;
  readonly verification: FieldVerification;
  readonly publication: PublicationGate;
}

export interface ProgrammeCycle {
  readonly cycleId: string;
  readonly names: LocalizedText;
  readonly opensOn: string | null;
  readonly closesOn: string | null;
  readonly startsOn: string | null;
  readonly expiresAt: string | null;
  readonly publication: PublicationGate;
  readonly sources: readonly KnowledgeSource[];
}

export interface EducationProgramme {
  readonly entityId: string;
  readonly entityType: "programme";
  readonly names: LocalizedText;
  readonly aliases: readonly LocalizedText[];
  readonly institutionEntityId: string | null;
  readonly stageIds: readonly EducationStageId[];
  readonly district: HongKongDistrictId | null;
  readonly classifications: EducationClassifications;
  readonly description: LocalizedText | null;
  readonly officialHomepage: string | null;
  readonly cycles: readonly ProgrammeCycle[];
  readonly updatedAt: string;
  readonly verification: FieldVerification;
  readonly publication: PublicationGate;
}

export type EducationKnowledgeEntity = EducationInstitution | EducationProgramme;

export interface EducationKnowledgeDataset {
  readonly version: string;
  readonly institutions: readonly EducationInstitution[];
  readonly programmes: readonly EducationProgramme[];
  readonly stages: readonly EducationStageDescriptor[];
  readonly districts: readonly HongKongDistrict[];
}

const UGC_FUNDING_SOURCE: KnowledgeSource = {
  id: "ugc-funded-institutions",
  publisher: "University Grants Committee Hong Kong",
  title: {
    zh: "教资会资助院校",
    en: "UGC-funded institutions",
  },
  url: "https://www.ugc.edu.hk/eng/ugc/site/fund_inst.html",
  sourceType: "official",
  accessedOn: KNOWLEDGE_ACCESS_DATE,
  supports: ["name", "funding", "officialHomepage"],
};

const EDB_POSTSECONDARY_SOURCE: KnowledgeSource = {
  id: "edb-postsecondary-overview",
  publisher: "Education Bureau Hong Kong",
  title: {
    zh: "教育局专上教育概览",
    en: "EDB post-secondary education overview",
  },
  url: "https://www.edb.gov.hk/en/edu-system/postsecondary/index.html",
  sourceType: "official",
  accessedOn: KNOWLEDGE_ACCESS_DATE,
  supports: ["name", "funding"],
};

const officialHomepageSource = (institution: LocalizedText, url: string): KnowledgeSource => ({
  id: `official-homepage-${url.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`,
  publisher: institution.en,
  title: { zh: `${institution.zh}官方网站`, en: `${institution.en} official website` },
  url,
  sourceType: "official",
  accessedOn: KNOWLEDGE_ACCESS_DATE,
  supports: ["name", "officialHomepage"],
});

const emptyClassifications = (): EducationClassifications => ({
  funding: [],
  operation: [],
  legal: [],
  curricula: [],
});

const makeUgcInstitution = (args: {
  readonly entityId: string;
  readonly names: LocalizedText;
  readonly officialHomepage: string;
}): EducationInstitution => ({
  entityId: args.entityId,
  entityType: "institution",
  names: args.names,
  aliases: [],
  institutionKind: "university",
  classifications: { ...emptyClassifications(), funding: ["ugc-funded"] },
  stageIds: ["hong-kong-universities"],
  // Location, operation, legal form, curriculum, fees and admissions cycles
  // are intentionally null/empty until separately verified.
  district: null,
  languageOfInstruction: null,
  gender: null,
  ageRange: null,
  fees: null,
  officialHomepage: args.officialHomepage,
  summary: null,
  updatedAt: KNOWLEDGE_ACCESS_DATE,
  verification: {
    status: "verified",
    verifiedFields: ["name", "funding", "officialHomepage"],
    lastVerifiedOn: KNOWLEDGE_ACCESS_DATE,
    sources: [UGC_FUNDING_SOURCE, EDB_POSTSECONDARY_SOURCE, officialHomepageSource(args.names, args.officialHomepage)],
    note: {
      zh: "仅发布官方来源已核实的名称、教资会资助状态及官方网站；其他资料尚未核实，暂不展示为完整院校档案。",
      en: "Only the officially verified name, UGC funding status and official homepage are published; other facts remain unverified and are not presented as a complete profile.",
    },
  },
  publication: {
    state: "published",
    visibleIn: ["hub", "search"],
    publishedAt: KNOWLEDGE_ACCESS_DATE,
    expiresAt: null,
  },
});

/**
 * The only production institution seed.  Each record is intentionally a
 * hub-level summary; no admissions, ranking, fee or programme facts are
 * inferred from the institution name.
 */
export const UGC_FUNDED_INSTITUTIONS: readonly EducationInstitution[] = [
  makeUgcInstitution({
    entityId: "institution.hk.ugc.hku",
    names: { zh: "香港大学", en: "The University of Hong Kong" },
    officialHomepage: "https://www.hku.hk/",
  }),
  makeUgcInstitution({
    entityId: "institution.hk.ugc.cuhk",
    names: { zh: "香港中文大学", en: "The Chinese University of Hong Kong" },
    officialHomepage: "https://www.cuhk.edu.hk/",
  }),
  makeUgcInstitution({
    entityId: "institution.hk.ugc.hkust",
    names: { zh: "香港科技大学", en: "The Hong Kong University of Science and Technology" },
    officialHomepage: "https://hkust.edu.hk/",
  }),
  makeUgcInstitution({
    entityId: "institution.hk.ugc.polyu",
    names: { zh: "香港理工大学", en: "The Hong Kong Polytechnic University" },
    officialHomepage: "https://www.polyu.edu.hk/",
  }),
  makeUgcInstitution({
    entityId: "institution.hk.ugc.cityu",
    names: { zh: "香港城市大学", en: "City University of Hong Kong" },
    officialHomepage: "https://www.cityu.edu.hk/",
  }),
  makeUgcInstitution({
    entityId: "institution.hk.ugc.hkbu",
    names: { zh: "香港浸会大学", en: "Hong Kong Baptist University" },
    officialHomepage: "https://www.hkbu.edu.hk/",
  }),
  makeUgcInstitution({
    entityId: "institution.hk.ugc.lu",
    names: { zh: "岭南大学", en: "Lingnan University" },
    officialHomepage: "https://www.ln.edu.hk/",
  }),
  makeUgcInstitution({
    entityId: "institution.hk.ugc.eduhk",
    names: { zh: "香港教育大学", en: "The Education University of Hong Kong" },
    officialHomepage: "https://www.eduhk.hk/",
  }),
] as const;

export const educationInstitutions = UGC_FUNDED_INSTITUTIONS;

/** No programme cycles are seeded until an official programme source is verified. */
export const EDUCATION_PROGRAMMES: readonly EducationProgramme[] = [];

export const EDUCATION_KNOWLEDGE_DATASET: EducationKnowledgeDataset = {
  version: EDUCATION_KNOWLEDGE_VERSION,
  institutions: UGC_FUNDED_INSTITUTIONS,
  programmes: EDUCATION_PROGRAMMES,
  stages: EDUCATION_STAGE_DESCRIPTORS,
  districts: HONG_KONG_18_DISTRICTS,
};

export const educationKnowledgeDataset = EDUCATION_KNOWLEDGE_DATASET;

const toTime = (value: string | Date | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  const result = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(result) ? result : null;
};

/** Publication is closed rather than guessed when a supplied date is invalid. */
export function isPublicationVisible(
  publication: PublicationGate,
  asOf: string | Date = new Date(),
  surface: PublicationSurface = "search",
): boolean {
  if (publication.state !== "published" || !publication.visibleIn.includes(surface)) return false;
  const now = toTime(asOf);
  if (now === null) return false;
  const publishedAt = toTime(publication.publishedAt);
  const expiresAt = toTime(publication.expiresAt);
  if (publication.publishedAt !== null && publishedAt === null) return false;
  if (publication.expiresAt !== null && expiresAt === null) return false;
  if (publishedAt !== null && now < publishedAt) return false;
  if (expiresAt !== null && now >= expiresAt) return false;
  return true;
}

export function isProgrammeCycleVisible(
  cycle: ProgrammeCycle,
  asOf: string | Date = new Date(),
  surface: PublicationSurface = "search",
): boolean {
  if (!isPublicationVisible(cycle.publication, asOf, surface)) return false;
  const now = toTime(asOf);
  if (now === null) return false;
  const closesOn = toTime(cycle.closesOn);
  const expiresAt = toTime(cycle.expiresAt);
  if (cycle.closesOn !== null && closesOn === null) return false;
  if (cycle.expiresAt !== null && expiresAt === null) return false;
  if (closesOn !== null && now >= closesOn) return false;
  if (expiresAt !== null && now >= expiresAt) return false;
  return true;
}

export function visibleProgrammeCycles(
  programme: EducationProgramme,
  asOf: string | Date = new Date(),
  surface: PublicationSurface = "search",
): readonly ProgrammeCycle[] {
  if (!isPublicationVisible(programme.publication, asOf, surface)) return [];
  return programme.cycles.filter(cycle => isProgrammeCycleVisible(cycle, asOf, surface));
}

export const getVisibleProgrammeCycles = visibleProgrammeCycles;
