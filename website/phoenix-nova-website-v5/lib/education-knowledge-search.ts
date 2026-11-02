import {
  EDUCATION_KNOWLEDGE_DATASET,
  isPublicationVisible,
  type CurriculumLabel,
  type EducationInstitution,
  type EducationKnowledgeDataset,
  type EducationKnowledgeEntity,
  type EducationProgramme,
  type EducationStageId,
  type FundingLabel,
  type HongKongDistrictId,
  type InstitutionKind,
  type LegalStatusLabel,
  type Locale,
  type OperationLabel,
  type ProgrammeDegree,
  type ProgrammeStudyMode,
  type ProgrammeSubjectArea,
  type PublicationState,
  type PublicationSurface,
} from "./education-knowledge";

export type EducationKnowledgeEntityKind = "institution" | "programme" | "all";
export type EducationKnowledgeSort = "relevance" | "name-asc" | "name-desc" | "updated-desc" | "updated-asc";

/**
 * Facets are OR'd inside one dimension and AND'd across dimensions.  All
 * fields are optional so an SSR route can add one facet at a time without
 * rebuilding a different search implementation.
 */
export interface EducationKnowledgeFacetFilters {
  readonly stageIds?: readonly EducationStageId[];
  readonly stages?: readonly EducationStageId[];
  readonly districtIds?: readonly HongKongDistrictId[];
  readonly districts?: readonly HongKongDistrictId[];
  readonly institutionKinds?: readonly InstitutionKind[];
  readonly fundingLabels?: readonly FundingLabel[];
  readonly funding?: readonly FundingLabel[];
  readonly operationLabels?: readonly OperationLabel[];
  readonly operation?: readonly OperationLabel[];
  readonly legalLabels?: readonly LegalStatusLabel[];
  readonly legal?: readonly LegalStatusLabel[];
  readonly curriculumLabels?: readonly CurriculumLabel[];
  readonly curricula?: readonly CurriculumLabel[];
  /** Programme-only dimensions. Kept outside institution facets. */
  readonly degree?: ProgrammeDegree;
  readonly degrees?: readonly ProgrammeDegree[];
  readonly mode?: ProgrammeStudyMode;
  readonly studyModes?: readonly ProgrammeStudyMode[];
  readonly subject?: ProgrammeSubjectArea;
  readonly subjectAreas?: readonly ProgrammeSubjectArea[];
  /** Exact admission-cycle IDs; a cycle must also be currently visible. */
  readonly cycle?: string;
  readonly cycleIds?: readonly string[];
}

export interface EducationKnowledgeSearchQuery extends EducationKnowledgeFacetFilters {
  readonly filters?: EducationKnowledgeFacetFilters;
  readonly facets?: EducationKnowledgeFacetFilters;
  readonly text?: string;
  readonly locale?: Locale;
  readonly entityKind?: EducationKnowledgeEntityKind;
  readonly entityType?: EducationKnowledgeEntityKind;
  readonly surface?: PublicationSurface;
  readonly includeUnpublished?: boolean;
  readonly includeExpired?: boolean;
  readonly publicationStates?: readonly PublicationState[];
  readonly sort?: EducationKnowledgeSort;
  /** One-based page number. */
  readonly page?: number;
  readonly pageSize?: number;
  /** Injectable clock keeps SSR and tests deterministic. */
  readonly asOf?: string | Date;
}

export interface EducationKnowledgePage<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly hasPrevious: boolean;
  readonly hasNext: boolean;
}

export interface EducationKnowledgeSearchResult extends EducationKnowledgePage<EducationKnowledgeEntity> {
  readonly query: EducationKnowledgeSearchQuery;
}

export const DEFAULT_EDUCATION_SEARCH_PAGE_SIZE = 20;
export const MAX_EDUCATION_SEARCH_PAGE_SIZE = 100;

const unique = <T>(values: readonly T[]): readonly T[] => [...new Set(values)];

const normaliseQueryPart = (part: EducationKnowledgeFacetFilters | undefined): EducationKnowledgeFacetFilters => part ?? {};

/**
 * Combine independent UI facets without introducing state.  Distinct
 * dimensions remain AND filters; repeated values in a dimension are unioned
 * (OR) and de-duplicated, which makes checkbox facets straightforward.
 */
export function composeEducationFilters(
  ...parts: readonly EducationKnowledgeFacetFilters[]
): EducationKnowledgeFacetFilters {
  const result: Record<string, unknown> = {};
  for (const rawPart of parts) {
    const part = normaliseQueryPart(rawPart);
    for (const [key, value] of Object.entries(part)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        const previous = Array.isArray(result[key]) ? (result[key] as unknown[]) : [];
        result[key] = unique([...previous, ...value]);
      } else {
        result[key] = value;
      }
    }
  }
  return result as EducationKnowledgeFacetFilters;
}

export function composeEducationSearchQuery(
  ...parts: readonly Partial<EducationKnowledgeSearchQuery>[]
): EducationKnowledgeSearchQuery {
  let result: EducationKnowledgeSearchQuery = {};
  for (const part of parts) {
    const nested = composeEducationFilters(
      result,
      part,
      ...(part.filters ? [part.filters] : []),
      ...(part.facets ? [part.facets] : []),
    );
    result = { ...result, ...nested, ...part };
    delete (result as { filters?: EducationKnowledgeFacetFilters }).filters;
    delete (result as { facets?: EducationKnowledgeFacetFilters }).facets;
  }
  return result;
}

/** Reset is a fresh object; callers may safely mutate their copy for UI state. */
export function resetEducationKnowledgeSearchQuery(): EducationKnowledgeSearchQuery {
  return {};
}

export const resetEducationSearch = resetEducationKnowledgeSearchQuery;
export const createEducationKnowledgeSearchQuery = resetEducationKnowledgeSearchQuery;

const normalise = (value: string): string => value.normalize("NFKC").trim().toLocaleLowerCase();

const selected = <T>(primary: readonly T[] | undefined, secondary: readonly T[] | undefined): readonly T[] =>
  primary && primary.length > 0 ? primary : secondary ?? [];

const filterValues = (query: EducationKnowledgeSearchQuery, key: keyof EducationKnowledgeFacetFilters): readonly unknown[] => {
  const nested = query.filters ?? query.facets;
  const direct = query[key] as readonly unknown[] | undefined;
  const nestedValue = nested?.[key] as readonly unknown[] | undefined;
  return direct && direct.length > 0 ? direct : nestedValue ?? [];
};

const asStrings = (value: unknown): readonly string[] => {
  if (typeof value === "string") return value.trim() ? [value] : [];
  if (!Array.isArray(value)) return [];
  return value.filter((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0);
};

const PROGRAMME_DEGREE_FILTERS: ReadonlySet<string> = new Set([
  "undergraduate",
  "associate",
  "higher-diploma",
  "master",
  "doctoral",
  "professional",
]);
const PROGRAMME_MODE_FILTERS: ReadonlySet<string> = new Set(["full-time", "part-time", "taught", "research"]);
const PROGRAMME_SUBJECT_FILTERS: ReadonlySet<string> = new Set([
  "business",
  "finance",
  "accounting",
  "economics",
  "data-science",
  "artificial-intelligence",
  "computing",
  "engineering",
  "education",
  "media",
  "health",
  "law",
  "design",
  "social-sciences",
  "other",
]);

/**
 * Return null for an invalid request rather than silently dropping an
 * unknown value. This keeps future/unrecognised query parameters from
 * matching a record by accident and treats `unknown` as non-searchable.
 */
const programmeSelection = (
  singular: unknown,
  plural: unknown,
  allowed: ReadonlySet<string>,
): readonly string[] | null => {
  const values = unique([...asStrings(singular), ...asStrings(plural)]);
  if (values.some(value => !allowed.has(value))) return null;
  return values;
};

const matchesAny = <T>(selectedValues: readonly T[], recordValues: readonly T[]): boolean =>
  selectedValues.length === 0 || selectedValues.some(value => recordValues.includes(value));

const isInstitution = (record: EducationKnowledgeEntity): record is EducationInstitution => record.entityType === "institution";
const isProgramme = (record: EducationKnowledgeEntity): record is EducationProgramme => record.entityType === "programme";

const namesAndSearchText = (record: EducationKnowledgeEntity): readonly string[] => {
  const values = [record.names.zh, record.names.en, ...record.aliases.flatMap(alias => [alias.zh, alias.en])];
  if (isInstitution(record)) {
    if (record.summary) values.push(record.summary.zh, record.summary.en);
  } else if (record.description) {
    values.push(record.description.zh, record.description.en);
  }
  return values.filter(Boolean);
};

const textMatches = (record: EducationKnowledgeEntity, text: string): boolean => {
  const terms = normalise(text).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalise(namesAndSearchText(record).join(" "));
  return terms.every(term => haystack.includes(term));
};

const publicationAllowed = (
  publication: EducationKnowledgeEntity["publication"],
  query: EducationKnowledgeSearchQuery,
  asOf: string | Date,
): boolean => {
  const surface = query.surface ?? "search";
  const states = query.publicationStates ?? [];
  if (!publication.visibleIn.includes(surface)) return false;
  if (states.length > 0 && !states.includes(publication.state)) return false;
  if (!query.includeUnpublished && publication.state !== "published") return false;
  const now = asOf instanceof Date ? asOf.getTime() : Date.parse(asOf);
  if (!Number.isFinite(now)) return false;
  if (publication.publishedAt !== null) {
    const publishedAt = Date.parse(publication.publishedAt);
    if (!Number.isFinite(publishedAt) || now < publishedAt) return false;
  }
  if (!query.includeExpired && publication.expiresAt !== null) {
    const expiresAt = Date.parse(publication.expiresAt);
    if (!Number.isFinite(expiresAt) || now >= expiresAt) return false;
  }
  // The strict helper is retained as the published-only gate.  Draft and
  // candidate records are permitted only when the caller explicitly opts in.
  if (!query.includeUnpublished && !isPublicationVisible(publication, asOf, surface)) return false;
  return true;
};

const cycleAllowed = (
  cycle: EducationProgramme["cycles"][number],
  query: EducationKnowledgeSearchQuery,
  asOf: string | Date,
): boolean => {
  // publicationStates selects the programme record; a programme's cycle has
  // its own publication gate and should not be forced to share that state.
  if (!publicationAllowed(cycle.publication, { ...query, publicationStates: undefined }, asOf)) return false;
  if (query.includeExpired) return true;
  const now = asOf instanceof Date ? asOf.getTime() : Date.parse(asOf);
  if (!Number.isFinite(now)) return false;
  for (const end of [cycle.closesOn, cycle.expiresAt]) {
    if (end !== null) {
      const time = Date.parse(end);
      if (!Number.isFinite(time) || now >= time) return false;
    }
  }
  return true;
};

const hasVisibleCycle = (record: EducationProgramme, query: EducationKnowledgeSearchQuery, asOf: string | Date): boolean =>
  record.cycles.length === 0 || record.cycles.some(cycle => cycleAllowed(cycle, query, asOf));

const matchesProgrammeDimensions = (
  record: EducationProgramme,
  query: EducationKnowledgeSearchQuery,
  asOf: string | Date,
): boolean => {
  const degrees = programmeSelection(query.degree, query.degrees, PROGRAMME_DEGREE_FILTERS);
  const modes = programmeSelection(query.mode, query.studyModes, PROGRAMME_MODE_FILTERS);
  const subjects = programmeSelection(query.subject, query.subjectAreas, PROGRAMME_SUBJECT_FILTERS);

  // An invalid value, including `unknown`, is a real no-match rather than a
  // request to ignore that filter.
  if (degrees === null || modes === null || subjects === null) return false;

  if (degrees.length > 0 && (!record.degree || !degrees.includes(record.degree))) return false;
  if (modes.length > 0 && (!record.mode || !modes.includes(record.mode))) return false;
  if (subjects.length > 0 && (!record.subject || !subjects.includes(record.subject))) return false;

  // Cycle IDs are exact identifiers. A matching cycle must pass the same
  // publication/expiry gate as the rest of programme search.
  const cycleValues = [...asStrings(query.cycle), ...asStrings(query.cycleIds)];
  if (cycleValues.length > 0) {
    const requestedCycles = unique(cycleValues);
    if (!record.cycles.some(cycle => requestedCycles.includes(cycle.cycleId) && cycleAllowed(cycle, query, asOf))) return false;
  }
  return true;
};

export function matchesEducationKnowledgeFilters(
  record: EducationKnowledgeEntity,
  query: EducationKnowledgeSearchQuery = {},
): boolean {
  const asOf = query.asOf ?? new Date();
  const kind = query.entityKind ?? query.entityType ?? "all";
  if (kind !== "all" && record.entityType !== kind) return false;
  if (!publicationAllowed(record.publication, query, asOf)) return false;
  if (isProgramme(record) && !hasVisibleCycle(record, query, asOf)) return false;
  if (isProgramme(record) && !matchesProgrammeDimensions(record, query, asOf)) return false;
  if (!textMatches(record, query.text ?? "")) return false;

  const stages = selected(
    query.stageIds,
    selected(query.stages, filterValues(query, "stageIds") as EducationStageId[]),
  );
  const districts = selected(
    query.districtIds,
    selected(query.districts, filterValues(query, "districtIds") as HongKongDistrictId[]),
  );
  const institutionKinds = filterValues(query, "institutionKinds") as InstitutionKind[];
  const funding = selected(query.fundingLabels, filterValues(query, "fundingLabels") as FundingLabel[]);
  const operation = selected(query.operationLabels, filterValues(query, "operationLabels") as OperationLabel[]);
  const legal = selected(query.legalLabels, filterValues(query, "legalLabels") as LegalStatusLabel[]);
  const curricula = selected(query.curriculumLabels, filterValues(query, "curriculumLabels") as CurriculumLabel[]);

  if (!matchesAny(stages, record.stageIds)) return false;
  if (districts.length > 0 && !districts.includes(record.district as HongKongDistrictId)) return false;
  if (institutionKinds.length > 0 && (!isInstitution(record) || !institutionKinds.includes(record.institutionKind))) return false;
  if (!matchesAny(funding, record.classifications.funding)) return false;
  if (!matchesAny(operation, record.classifications.operation)) return false;
  if (!matchesAny(legal, record.classifications.legal)) return false;
  if (!matchesAny(curricula, record.classifications.curricula)) return false;
  return true;
}

export const filterEducationKnowledge = (
  records: readonly EducationKnowledgeEntity[],
  query: EducationKnowledgeSearchQuery = {},
): readonly EducationKnowledgeEntity[] => records.filter(record => matchesEducationKnowledgeFilters(record, query));

const relevanceScore = (record: EducationKnowledgeEntity, text: string, locale: Locale): number => {
  const term = normalise(text);
  if (!term) return 0;
  const preferred = normalise(record.names[locale]);
  const other = normalise(record.names[locale === "zh" ? "en" : "zh"]);
  const aliases = record.aliases.flatMap(alias => [normalise(alias.zh), normalise(alias.en)]);
  let score = 0;
  for (const value of [preferred, other, ...aliases]) {
    if (value === term) score = Math.max(score, 100);
    else if (value.startsWith(term)) score = Math.max(score, 70);
    else if (value.includes(term)) score = Math.max(score, 40);
  }
  return score;
};

export function sortEducationKnowledge(
  records: readonly EducationKnowledgeEntity[],
  sort: EducationKnowledgeSort = "relevance",
  text = "",
  locale: Locale = "zh",
): readonly EducationKnowledgeEntity[] {
  return [...records].sort((left, right) => {
    let difference = 0;
    if (sort === "name-asc" || sort === "name-desc") {
      difference = left.names[locale].localeCompare(right.names[locale], locale);
      if (sort === "name-desc") difference *= -1;
    } else if (sort === "updated-desc" || sort === "updated-asc") {
      difference = Date.parse(left.updatedAt) - Date.parse(right.updatedAt);
      if (sort === "updated-desc") difference *= -1;
    } else {
      difference = relevanceScore(right, text, locale) - relevanceScore(left, text, locale);
    }
    return difference || left.entityId.localeCompare(right.entityId);
  });
}

export function paginateEducationKnowledge<T>(
  records: readonly T[],
  page = 1,
  pageSize = DEFAULT_EDUCATION_SEARCH_PAGE_SIZE,
): EducationKnowledgePage<T> {
  const safePageSize = Math.min(MAX_EDUCATION_SEARCH_PAGE_SIZE, Math.max(1, Math.floor(pageSize) || DEFAULT_EDUCATION_SEARCH_PAGE_SIZE));
  const total = records.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(totalPages, Math.max(1, Math.floor(page) || 1));
  const start = (safePage - 1) * safePageSize;
  return {
    items: records.slice(start, start + safePageSize),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
    hasPrevious: safePage > 1,
    hasNext: safePage < totalPages,
  };
}

const allRecords = (dataset: EducationKnowledgeDataset): readonly EducationKnowledgeEntity[] => [
  ...dataset.institutions,
  ...dataset.programmes,
];

export function searchEducationKnowledge(
  dataset: EducationKnowledgeDataset = EDUCATION_KNOWLEDGE_DATASET,
  query: EducationKnowledgeSearchQuery = {},
): EducationKnowledgeSearchResult {
  const filtered = filterEducationKnowledge(allRecords(dataset), query);
  const sorted = sortEducationKnowledge(filtered, query.sort ?? "relevance", query.text ?? "", query.locale ?? "zh");
  const paged = paginateEducationKnowledge(sorted, query.page, query.pageSize);
  return { ...paged, query: { ...query } };
}

export const searchEducation = searchEducationKnowledge;
export const searchEducationKnowledgeRecords = searchEducationKnowledge;

export interface EducationKnowledgeFacetCounts {
  readonly stages: Readonly<Record<string, number>>;
  readonly districts: Readonly<Record<string, number>>;
  readonly institutionKinds: Readonly<Record<string, number>>;
  readonly funding: Readonly<Record<string, number>>;
  readonly operation: Readonly<Record<string, number>>;
  readonly legal: Readonly<Record<string, number>>;
  readonly curricula: Readonly<Record<string, number>>;
}

const count = (counts: Record<string, number>, values: readonly string[]): void => {
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
};

/** Counts are computed from the filtered set and are suitable for SSR facet controls. */
export function getEducationKnowledgeFacetCounts(
  dataset: EducationKnowledgeDataset = EDUCATION_KNOWLEDGE_DATASET,
  query: EducationKnowledgeSearchQuery = {},
): EducationKnowledgeFacetCounts {
  const records = filterEducationKnowledge(allRecords(dataset), query);
  const result: Record<string, Record<string, number>> = {
    stages: {}, districts: {}, institutionKinds: {}, funding: {}, operation: {}, legal: {}, curricula: {},
  };
  for (const record of records) {
    count(result.stages, record.stageIds);
    if (record.district) count(result.districts, [record.district]);
    if (isInstitution(record)) count(result.institutionKinds, [record.institutionKind]);
    count(result.funding, record.classifications.funding);
    count(result.operation, record.classifications.operation);
    count(result.legal, record.classifications.legal);
    count(result.curricula, record.classifications.curricula);
  }
  return {
    stages: result.stages,
    districts: result.districts,
    institutionKinds: result.institutionKinds,
    funding: result.funding,
    operation: result.operation,
    legal: result.legal,
    curricula: result.curricula,
  };
}

export const getEducationKnowledgeFacets = getEducationKnowledgeFacetCounts;
