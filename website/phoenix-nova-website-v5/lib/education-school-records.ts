/**
 * Source-preserved Hong Kong school records for the Education candidate.
 *
 * This is intentionally separate from the existing UGC university seed. The
 * source supplies school names, district, gender, website, school level,
 * funding type and category only. Curriculum, teaching language, fees and
 * legal/non-profit status remain empty rather than inferred.
 */

import { safeEducationWebsite } from "./education-external-url";
import officialSchools from "./data/education-schools-official.json";
import type {
  EducationInstitution,
  EducationStageId,
  FundingLabel,
  HongKongDistrictId,
  KnowledgeField,
  KnowledgeSource,
  LocalizedText,
} from "./education-knowledge";

export type SchoolGender = "coeducational" | "girls" | "boys";

export type SchoolSourceProvenance = Readonly<{
  sourceUrl: string;
  sourceLastModified: string;
  sourceSha256: string;
  retrievedOn: string;
  sourceRecordCount: number;
}>;

export type EducationSchoolInstitution = EducationInstitution & Readonly<{
  sourceRowNumber: number;
  sourceSchoolCode: string;
  sourceSession: string;
  sourceKey: string;
  sourceDuplicateCount: number;
  sourceDuplicateOrdinal: number;
  sourceEnglishCategory: string;
  sourceChineseCategory: string;
  sourceSchoolLevel: string;
  sourceFinanceType: string;
  sourceDistrict: string;
  sourceGender: string;
  sourceWebsite: string | null;
  sourceSchoolType: string;
  sourceProvenance: SchoolSourceProvenance;
  sourceVerifiedFields: readonly string[];
}>;

type OfficialSchoolRecord = Readonly<{
  entityId: string;
  sourceRowNumber: number;
  sourceSchoolCode: string;
  sourceSession: string;
  sourceKey: string;
  sourceDuplicateCount: number;
  sourceDuplicateOrdinal: number;
  sourceEnglishCategory: string;
  sourceChineseCategory: string;
  sourceSchoolLevel: string;
  sourceFinanceType: string;
  sourceDistrict: string;
  sourceGender: string;
  sourceWebsite: string | null;
  name: LocalizedText;
  district: HongKongDistrictId;
  gender: SchoolGender;
  website: string | null;
  stageId: EducationStageId;
  funding: FundingLabel;
  sourceProvenance: SchoolSourceProvenance;
}>;

type OfficialSchoolDataset = Readonly<{
  schemaVersion: string;
  source: SchoolSourceProvenance;
  records: readonly OfficialSchoolRecord[];
}>;

const dataset = officialSchools as OfficialSchoolDataset;

export const EDUCATION_SCHOOLS_SOURCE: SchoolSourceProvenance = dataset.source;

const EDB_SCHOOLS_SOURCE: KnowledgeSource = {
  id: "edb-school-location-json-2026-10-02",
  publisher: "Education Bureau Hong Kong",
  title: {
    zh: "教育局学校位置及类别资料",
    en: "Education Bureau school location and category data",
  },
  url: dataset.source.sourceUrl,
  sourceType: "official",
  accessedOn: dataset.source.retrievedOn,
  supports: ["name", "district", "stage", "funding", "officialHomepage"],
};

export const EDUCATION_SCHOOLS_KNOWLEDGE_SOURCE = EDB_SCHOOLS_SOURCE;

const verifiedFields: readonly KnowledgeField[] = ["name", "district", "stage", "funding", "officialHomepage"];

const toInstitution = (record: OfficialSchoolRecord): EducationSchoolInstitution => ({
  entityId: record.entityId,
  entityType: "institution",
  names: record.name,
  aliases: [],
  institutionKind: record.stageId === "kindergarten" ? "kindergarten" : "school",
  classifications: {
    funding: [record.funding],
    // The EDB source does not establish these independent dimensions.
    operation: [],
    legal: [],
    curricula: [],
  },
  stageIds: [record.stageId],
  district: record.district,
  languageOfInstruction: null,
  gender: record.gender,
  ageRange: null,
  fees: null,
  officialHomepage: safeEducationWebsite(record.website),
  summary: null,
  updatedAt: record.sourceProvenance.sourceLastModified,
  verification: {
    status: "verified",
    verifiedFields,
    lastVerifiedOn: record.sourceProvenance.sourceLastModified,
    sources: [EDB_SCHOOLS_SOURCE],
    note: {
      zh: "仅发布教育局官方资料明确提供的名称、地区、教育阶段、资助种类、学生性别及网站字段；课程、授课语言、费用、法律及非牟利属性不由本资料推断。",
      en: "Only the name, district, stage, funding type, student gender and website fields explicitly provided by the Education Bureau are published; curriculum, language, fees, legal and non-profit status are not inferred.",
    },
  },
  // Candidate records may be used by an explicitly enabled review/search
  // surface, while the page metadata and sitemap remain noindex.
  publication: {
    state: "candidate",
    visibleIn: ["search"],
    publishedAt: null,
    expiresAt: null,
  },
  sourceRowNumber: record.sourceRowNumber,
  sourceSchoolCode: record.sourceSchoolCode,
  sourceSession: record.sourceSession,
  sourceKey: record.sourceKey,
  sourceDuplicateCount: record.sourceDuplicateCount,
  sourceDuplicateOrdinal: record.sourceDuplicateOrdinal,
  sourceEnglishCategory: record.sourceEnglishCategory,
  sourceChineseCategory: record.sourceChineseCategory,
  sourceSchoolLevel: record.sourceSchoolLevel,
  sourceFinanceType: record.sourceFinanceType,
  sourceDistrict: record.sourceDistrict,
  sourceGender: record.sourceGender,
  sourceWebsite: record.sourceWebsite,
  sourceSchoolType: record.sourceSchoolLevel,
  sourceProvenance: record.sourceProvenance,
  sourceVerifiedFields: ["name", "district", "gender", "website", "stage", "funding", "schooltype"],
});

export const SCHOOL_INSTITUTIONS: readonly EducationSchoolInstitution[] = dataset.records.map(toInstitution);

export const SCHOOL_INSTITUTIONS_BY_SOURCE_KEY: ReadonlyMap<string, readonly EducationSchoolInstitution[]> = new Map(
  [...new Set(SCHOOL_INSTITUTIONS.map(record => record.sourceKey))].map(key => [
    key,
    SCHOOL_INSTITUTIONS.filter(record => record.sourceKey === key),
  ]),
);
