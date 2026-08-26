import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { invariant } from '../errors'
import {
  AssessmentLevel,
  EducationSystem,
  FormalEducationSystem,
  FrozenOption,
  FrozenQuestion,
  FrozenQuestionValidation,
  GROWTH_DISCOVERY_QUESTIONNAIRE_VERSION,
  QuestionnaireBank,
  QuestionnairePresentationMetaV1,
  QuestionnaireQuestionType,
  RegistrySourceIntegrity,
  FREE_PARENT_QUESTIONNAIRE_VERSION
} from './contracts'

const QUESTION_BANK_RELATIVE_PATH = 'docs/product/freeze/education-compass-v1-rc1/QUESTION_BANKS_V1_RC1.json'
const TAXONOMY_RELATIVE_PATH = 'docs/product/freeze/education-compass-v1-rc1/TAXONOMY_REGISTRY_V1_RC1.json'
const QUESTION_BANK_SHA256 = 'EFAE34EE595FC5E4A2FE8B6C5B89B1F182625BF15518620AC475320E4FD978F9'
const TAXONOMY_SHA256 = '53691402AA191489317E013CFC5BBE121339301EECFD43F7C6430415B11E2231'

export const FORMAL_EDUCATION_SYSTEMS = Object.freeze([
  'GAOKAO', 'DSE', 'IGCSE', 'A_LEVEL', 'AP_US'
] as const satisfies readonly FormalEducationSystem[])

export const FALLBACK_EDUCATION_SYSTEMS = Object.freeze([
  'IB', 'OTHER'
] as const satisfies readonly EducationSystem[])

export const ALL_EDUCATION_SYSTEMS = Object.freeze([
  ...FORMAL_EDUCATION_SYSTEMS, ...FALLBACK_EDUCATION_SYSTEMS
] as const satisfies readonly EducationSystem[])

interface RawOption { code: unknown; label: unknown }
interface RawQuestion {
  id?: unknown
  key?: unknown
  label?: unknown
  type?: unknown
  required?: unknown
  options?: unknown
  options_ref?: unknown
  options_ref_by_system?: unknown
  validation?: unknown
  dimensions?: unknown
  signal_codes?: unknown
  scored?: unknown
  exit_rule?: unknown
  privacy_note?: unknown
}

interface RawQuestionBankFile {
  schema_version?: unknown
  candidate_version?: unknown
  option_catalogs?: unknown
  level_1?: unknown
  level_2?: unknown
  external_option_registries?: unknown
}

interface RawTaxonomyFile {
  registry_version?: unknown
  education_system?: unknown
  education_pathway_target?: unknown
  [key: string]: unknown
}

interface ParsedLevelBank {
  bankVersion: string
  questions: readonly RawQuestion[]
  questionIds: readonly string[]
  requiredQuestionIds: readonly string[]
  optionalQuestionIds: readonly string[]
}

export interface EducationCompassRegistry {
  schemaVersion: 'phoenix_question_bank_schema_v1'
  candidateVersion: string
  taxonomyVersion: string
  level1: ParsedLevelBank
  level2Common: ParsedLevelBank
  level2SystemBanks: Readonly<Record<FormalEducationSystem, ParsedLevelBank>>
  optionCatalogs: Readonly<Record<string, readonly FrozenOption[]>>
  externalOptionRegistries: Readonly<Record<string, readonly FrozenOption[]>>
  educationPathwayOptions: readonly FrozenOption[]
  sourceIntegrity: {
    questionBanks: RegistrySourceIntegrity
    taxonomy: RegistrySourceIntegrity
  }
}

let cached: EducationCompassRegistry | undefined
const bankCache = new Map<string, QuestionnaireBank>()

function object(value: unknown, code: string): Record<string, unknown> {
  invariant(value !== null && typeof value === 'object' && !Array.isArray(value), 500, code, '冻结题库结构无效')
  return value as Record<string, unknown>
}

function string(value: unknown, code: string): string {
  invariant(typeof value === 'string' && value.length > 0, 500, code, '冻结题库文本字段无效')
  return value
}

function stringArray(value: unknown, code: string): string[] {
  invariant(Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0), 500, code, '冻结题库列表字段无效')
  return [...value]
}

function resolveFrozenPath(relativePath: string): string {
  const candidates = [
    resolve(process.cwd(), relativePath),
    resolve(process.cwd(), '..', relativePath),
    resolve(__dirname, '..', '..', '..', '..', relativePath),
    resolve(__dirname, '..', '..', '..', '..', '..', relativePath)
  ]
  const found = candidates.find((candidate) => existsSync(candidate))
  invariant(found, 500, 'EDUCATION_COMPASS_FREEZE_FILE_MISSING', '服务端冻结题库文件缺失', { relativePath })
  return found
}

function loadVerifiedJson(relativePath: string, expectedSha256: string): {
  parsed: unknown
  integrity: RegistrySourceIntegrity
} {
  const resolvedPath = resolveFrozenPath(relativePath)
  const raw = readFileSync(resolvedPath)
  const actualSha256 = createHash('sha256').update(raw).digest('hex').toUpperCase()
  invariant(actualSha256 === expectedSha256, 500, 'EDUCATION_COMPASS_FREEZE_HASH_MISMATCH', '服务端冻结题库校验失败', {
    relativePath,
    expectedSha256,
    actualSha256
  })
  let parsed: unknown
  try {
    parsed = JSON.parse(raw.toString('utf8')) as unknown
  } catch {
    invariant(false, 500, 'EDUCATION_COMPASS_FREEZE_JSON_INVALID', '服务端冻结题库 JSON 无效', { relativePath })
  }
  return {
    parsed,
    integrity: Object.freeze({ relativePath, resolvedPath, expectedSha256, actualSha256, verified: true as const })
  }
}

function frozenOptions(value: unknown, code: string): FrozenOption[] {
  invariant(Array.isArray(value), 500, code, '冻结选项列表无效')
  const options = value.map((entry) => {
    const raw = object(entry, code) as unknown as RawOption
    return Object.freeze({ code: string(raw.code, code), label: string(raw.label, code) })
  })
  invariant(new Set(options.map((option) => option.code)).size === options.length, 500, code, '冻结选项 code 重复')
  return options
}

function taxonomyOptions(taxonomy: Record<string, unknown>, key: string): FrozenOption[] {
  return frozenOptions(taxonomy[key], 'EDUCATION_COMPASS_TAXONOMY_INVALID')
}

function parseLevelBank(value: unknown, common: boolean): ParsedLevelBank {
  const raw = object(value, 'EDUCATION_COMPASS_BANK_INVALID')
  const questionKey = common ? (raw.common_questions === undefined ? 'questions' : 'common_questions') : 'questions'
  const questionIdsKey = common ? (raw.common_question_ids === undefined ? 'question_ids' : 'common_question_ids') : 'question_ids'
  const requiredKey = common ? (raw.required_common_question_ids === undefined ? 'required_question_ids' : 'required_common_question_ids') : 'required_question_ids'
  const optionalKey = common ? (raw.optional_common_question_ids === undefined ? 'optional_question_ids' : 'optional_common_question_ids') : 'optional_question_ids'
  invariant(Array.isArray(raw[questionKey]), 500, 'EDUCATION_COMPASS_BANK_INVALID', '冻结题库 questions 无效')
  const questions = raw[questionKey] as RawQuestion[]
  const questionIds = stringArray(raw[questionIdsKey], 'EDUCATION_COMPASS_BANK_INVALID')
  const requiredQuestionIds = stringArray(raw[requiredKey], 'EDUCATION_COMPASS_BANK_INVALID')
  const optionalQuestionIds = stringArray(raw[optionalKey], 'EDUCATION_COMPASS_BANK_INVALID')
  invariant(questions.length === questionIds.length && questions.every((question, index) => question.id === questionIds[index]),
    500, 'EDUCATION_COMPASS_BANK_ORDER_INVALID', '冻结题库题号或顺序无效')
  invariant(requiredQuestionIds.length + optionalQuestionIds.length === questionIds.length &&
    [...requiredQuestionIds, ...optionalQuestionIds].every((id) => questionIds.includes(id)),
    500, 'EDUCATION_COMPASS_BANK_PARTITION_INVALID', '冻结题库必答与选答分区无效')
  return Object.freeze({
    bankVersion: string(raw.bank_version, 'EDUCATION_COMPASS_BANK_INVALID'),
    questions: Object.freeze([...questions]),
    questionIds: Object.freeze(questionIds),
    requiredQuestionIds: Object.freeze(requiredQuestionIds),
    optionalQuestionIds: Object.freeze(optionalQuestionIds)
  })
}

function sha256Canonical(value: unknown): string {
  const canonical = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(canonical)
    if (item !== null && typeof item === 'object') {
      return Object.fromEntries(Object.entries(item as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonical(child)]))
    }
    return item
  }
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
}

function parseValidation(value: unknown): FrozenQuestionValidation {
  const raw = object(value ?? {}, 'EDUCATION_COMPASS_QUESTION_VALIDATION_INVALID')
  const validation: FrozenQuestionValidation = {}
  for (const [key, item] of Object.entries(raw)) {
    invariant([
      'minSelections', 'maxSelections', 'exclusiveOptions', 'allowedSubmitValues', 'min', 'max',
      'sentinelValues', 'allowNotProvided', 'maxRows', 'allowEmpty'
    ].includes(key), 500, 'EDUCATION_COMPASS_QUESTION_VALIDATION_INVALID', '冻结题目 validation 含未知字段')
    if (['minSelections', 'maxSelections', 'maxRows'].includes(key)) {
      invariant(Number.isInteger(item) && Number(item) >= 0, 500, 'EDUCATION_COMPASS_QUESTION_VALIDATION_INVALID', '冻结题目数值限制无效')
      Object.assign(validation, { [key]: item })
    } else if (['exclusiveOptions', 'allowedSubmitValues', 'sentinelValues'].includes(key)) {
      Object.assign(validation, { [key]: Object.freeze(stringArray(item, 'EDUCATION_COMPASS_QUESTION_VALIDATION_INVALID')) })
    } else if (key === 'min' || key === 'max') {
      invariant(typeof item === 'number' || item === 'CURRENT_YEAR' || item === 'CURRENT_YEAR_PLUS_8', 500,
        'EDUCATION_COMPASS_QUESTION_VALIDATION_INVALID', '冻结题目年份限制无效')
      Object.assign(validation, { [key]: item })
    } else {
      invariant(typeof item === 'boolean', 500, 'EDUCATION_COMPASS_QUESTION_VALIDATION_INVALID', '冻结题目布尔限制无效')
      Object.assign(validation, { [key]: item })
    }
  }
  return Object.freeze(validation)
}

function load(): EducationCompassRegistry {
  const questionSource = loadVerifiedJson(QUESTION_BANK_RELATIVE_PATH, QUESTION_BANK_SHA256)
  const taxonomySource = loadVerifiedJson(TAXONOMY_RELATIVE_PATH, TAXONOMY_SHA256)
  const questionFile = object(questionSource.parsed, 'EDUCATION_COMPASS_BANK_INVALID') as unknown as RawQuestionBankFile
  const taxonomyFile = object(taxonomySource.parsed, 'EDUCATION_COMPASS_TAXONOMY_INVALID') as RawTaxonomyFile
  invariant(questionFile.schema_version === 'phoenix_question_bank_schema_v1', 500, 'EDUCATION_COMPASS_BANK_VERSION_INVALID', '冻结题库 schema 版本无效')
  invariant(taxonomyFile.registry_version === 'education_compass_taxonomy_v1.0.0-rc1', 500,
    'EDUCATION_COMPASS_TAXONOMY_VERSION_INVALID', '冻结 taxonomy 版本无效')
  const optionCatalogObject = object(questionFile.option_catalogs, 'EDUCATION_COMPASS_BANK_INVALID')
  const optionCatalogs = Object.freeze(Object.fromEntries(Object.entries(optionCatalogObject).map(([key, value]) => [
    key, Object.freeze(frozenOptions(value, 'EDUCATION_COMPASS_BANK_INVALID'))
  ])))
  const taxonomy = taxonomyFile as Record<string, unknown>
  const externalRaw = object(questionFile.external_option_registries, 'EDUCATION_COMPASS_BANK_INVALID')
  const externalOptionRegistries = Object.freeze(Object.fromEntries(Object.entries(externalRaw).map(([key, value]) => {
    const codes = stringArray(value, 'EDUCATION_COMPASS_BANK_INVALID')
    const options = taxonomyOptions(taxonomy, key)
    invariant(options.map((option) => option.code).join('|') === codes.join('|'), 500,
      'EDUCATION_COMPASS_TAXONOMY_BANK_MISMATCH', '题库与 taxonomy 的区间 code 不一致')
    return [key, Object.freeze(options)]
  })))
  const level2Raw = object(questionFile.level_2, 'EDUCATION_COMPASS_BANK_INVALID')
  const systemBankRaw = object(level2Raw.system_banks, 'EDUCATION_COMPASS_BANK_INVALID')
  const level2SystemBanks = Object.fromEntries(FORMAL_EDUCATION_SYSTEMS.map((system) => [
    system, parseLevelBank(systemBankRaw[system], false)
  ])) as Record<FormalEducationSystem, ParsedLevelBank>
  const level1 = parseLevelBank(questionFile.level_1, true)
  const level2Common = parseLevelBank(questionFile.level_2, true)
  invariant(level1.bankVersion === FREE_PARENT_QUESTIONNAIRE_VERSION && level2Common.bankVersion === GROWTH_DISCOVERY_QUESTIONNAIRE_VERSION,
    500, 'EDUCATION_COMPASS_BANK_VERSION_INVALID', '冻结问卷版本不匹配')
  const allIds = [
    ...level1.questionIds,
    ...level2Common.questionIds,
    ...Object.values(level2SystemBanks).flatMap((bank) => bank.questionIds)
  ]
  invariant(new Set(allIds).size === allIds.length, 500, 'EDUCATION_COMPASS_QUESTION_ID_DUPLICATE', '冻结题号重复')
  return Object.freeze({
    schemaVersion: 'phoenix_question_bank_schema_v1' as const,
    candidateVersion: string(questionFile.candidate_version, 'EDUCATION_COMPASS_BANK_VERSION_INVALID'),
    taxonomyVersion: string(taxonomyFile.registry_version, 'EDUCATION_COMPASS_TAXONOMY_VERSION_INVALID'),
    level1,
    level2Common,
    level2SystemBanks: Object.freeze(level2SystemBanks),
    optionCatalogs,
    externalOptionRegistries,
    educationPathwayOptions: Object.freeze(frozenOptions(
      object(taxonomy.education_pathway_target, 'EDUCATION_COMPASS_TAXONOMY_INVALID').values,
      'EDUCATION_COMPASS_TAXONOMY_INVALID'
    )),
    sourceIntegrity: Object.freeze({ questionBanks: questionSource.integrity, taxonomy: taxonomySource.integrity })
  })
}

export function loadEducationCompassRegistry(): EducationCompassRegistry {
  cached ??= load()
  return cached
}

export function getEducationCompassRegistryIntegrity(): EducationCompassRegistry['sourceIntegrity'] {
  return loadEducationCompassRegistry().sourceIntegrity
}

export function isEducationSystem(value: unknown): value is EducationSystem {
  return typeof value === 'string' && (ALL_EDUCATION_SYSTEMS as readonly string[]).includes(value)
}

function resolveReference(reference: string, system: EducationSystem | null, registry: EducationCompassRegistry): readonly FrozenOption[] {
  if (reference.startsWith('option_catalogs.')) {
    const key = reference.slice('option_catalogs.'.length)
    const options = registry.optionCatalogs[key]
    invariant(options, 500, 'EDUCATION_COMPASS_OPTION_REFERENCE_INVALID', '冻结题目选项引用无效')
    return options
  }
  if (reference === 'taxonomy.education_pathway_target.values') return registry.educationPathwayOptions
  const external = registry.externalOptionRegistries[reference]
  invariant(external, 500, 'EDUCATION_COMPASS_OPTION_REFERENCE_INVALID', '冻结题目区间引用无效', { reference, system })
  return external
}

function normalizeQuestion(raw: RawQuestion, systems: readonly EducationSystem[], registry: EducationCompassRegistry): FrozenQuestion {
  const id = string(raw.id, 'EDUCATION_COMPASS_QUESTION_INVALID')
  const type = string(raw.type, 'EDUCATION_COMPASS_QUESTION_INVALID') as QuestionnaireQuestionType
  invariant([
    'SINGLE_CHOICE', 'MULTI_CHOICE', 'MULTI_CHOICE_DYNAMIC', 'YEAR_SELECT',
    'PROVINCE_REGION_SELECT', 'SUBJECT_RANGE_MATRIX'
  ].includes(type), 500, 'EDUCATION_COMPASS_QUESTION_TYPE_INVALID', '冻结题型无效', { questionId: id })
  invariant(raw.required === true || raw.required === false, 500, 'EDUCATION_COMPASS_QUESTION_INVALID', '冻结题目 required 无效')
  invariant(raw.scored === false, 500, 'EDUCATION_COMPASS_SCORING_FORBIDDEN', '本版本题目不得计分')
  const system = systems.length === 1 ? systems[0] ?? null : null
  let options: readonly FrozenOption[] = []
  let matrixSubjectOptions: readonly FrozenOption[] | undefined
  let matrixRangeOptions: readonly FrozenOption[] | undefined
  if (Array.isArray(raw.options)) {
    options = frozenOptions(raw.options, 'EDUCATION_COMPASS_QUESTION_INVALID')
  } else if (typeof raw.options_ref === 'string') {
    const references = raw.options_ref.split('+').map((item) => item.trim())
    if (type === 'SUBJECT_RANGE_MATRIX') {
      invariant(references.length === 2, 500, 'EDUCATION_COMPASS_MATRIX_REFERENCE_INVALID', '区间矩阵必须有学科和区间两个引用')
      matrixSubjectOptions = resolveReference(references[0] ?? '', system, registry)
      matrixRangeOptions = resolveReference(references[1] ?? '', system, registry)
    } else {
      invariant(references.length === 1, 500, 'EDUCATION_COMPASS_OPTION_REFERENCE_INVALID', '冻结题目选项引用无效')
      options = resolveReference(references[0] ?? '', system, registry)
    }
  } else if (raw.options_ref_by_system !== undefined) {
    invariant(system, 500, 'EDUCATION_COMPASS_DYNAMIC_OPTIONS_SYSTEM_REQUIRED', '动态选项必须指定教育体系')
    const references = object(raw.options_ref_by_system, 'EDUCATION_COMPASS_QUESTION_INVALID')
    options = resolveReference(string(references[system], 'EDUCATION_COMPASS_QUESTION_INVALID'), system, registry)
  }
  invariant(type === 'YEAR_SELECT' || type === 'SUBJECT_RANGE_MATRIX' || options.length > 0, 500,
    'EDUCATION_COMPASS_QUESTION_OPTIONS_MISSING', '冻结题目选项缺失', { questionId: id })
  const question: FrozenQuestion = {
    id,
    key: string(raw.key, 'EDUCATION_COMPASS_QUESTION_INVALID'),
    label: string(raw.label, 'EDUCATION_COMPASS_QUESTION_INVALID'),
    type,
    required: raw.required,
    options: Object.freeze([...options]),
    validation: parseValidation(raw.validation),
    dimensions: Object.freeze(stringArray(raw.dimensions, 'EDUCATION_COMPASS_QUESTION_INVALID') as FrozenQuestion['dimensions']),
    signalCodes: Object.freeze(stringArray(raw.signal_codes, 'EDUCATION_COMPASS_QUESTION_INVALID')),
    scored: false,
    systemApplicability: Object.freeze([...systems]),
    ...(matrixSubjectOptions ? { matrixSubjectOptions: Object.freeze([...matrixSubjectOptions]) } : {}),
    ...(matrixRangeOptions ? { matrixRangeOptions: Object.freeze([...matrixRangeOptions]) } : {}),
    ...(typeof raw.exit_rule === 'string' ? { exitRule: raw.exit_rule } : {}),
    ...(typeof raw.privacy_note === 'string' ? { privacyNote: raw.privacy_note } : {})
  }
  return Object.freeze(question)
}

function buildBank(level: AssessmentLevel, educationSystem: EducationSystem | null): QuestionnaireBank {
  const registry = loadEducationCompassRegistry()
  if (level === 'LEVEL_1') {
    invariant(educationSystem === null, 400, 'EDUCATION_SYSTEM_NOT_APPLICABLE', '免费家长罗盘不使用体系分支题库')
    const questions = registry.level1.questions.map((question) => normalizeQuestion(question, ALL_EDUCATION_SYSTEMS, registry))
    const digestInput = { level, questionnaireVersion: registry.level1.bankVersion, questions }
    const presentation: QuestionnairePresentationMetaV1 = Object.freeze({
      version: 'education_compass_presentation_v1',
      estimatedMinutesMin: 3,
      estimatedMinutesMax: 5,
      totalQuestions: questions.length,
      requiredQuestions: registry.level1.requiredQuestionIds.length,
      progressMode: 'QUESTION_COUNT',
      scoringMode: 'NONE'
    })
    return Object.freeze({
      schemaVersion: registry.schemaVersion,
      assessmentKind: 'FREE_PARENT_COMPASS',
      assessmentLevel: level,
      questionnaireVersion: registry.level1.bankVersion,
      commonBankVersion: registry.level1.bankVersion,
      systemBankVersion: null,
      educationSystem: null,
      systemResultMarker: null,
      questions: Object.freeze(questions),
      commonQuestionIds: registry.level1.questionIds,
      systemQuestionIds: Object.freeze([]),
      requiredQuestionIds: registry.level1.requiredQuestionIds,
      optionalQuestionIds: registry.level1.optionalQuestionIds,
      schemaDigest: sha256Canonical(digestInput),
      scoringMode: 'NONE',
      presentation
    })
  }
  invariant(isEducationSystem(educationSystem), 400, 'EDUCATION_SYSTEM_INVALID', '学生成长发现必须使用冻结的教育体系 code')
  const commonQuestions = registry.level2Common.questions.map((question) => normalizeQuestion(question, [educationSystem], registry))
  const formal = (FORMAL_EDUCATION_SYSTEMS as readonly string[]).includes(educationSystem)
  const systemBank = formal ? registry.level2SystemBanks[educationSystem as FormalEducationSystem] : null
  const systemQuestions = systemBank?.questions.map((question) => normalizeQuestion(question, [educationSystem], registry)) ?? []
  const questions = [...commonQuestions, ...systemQuestions]
  const requiredQuestionIds = [...registry.level2Common.requiredQuestionIds, ...(systemBank?.requiredQuestionIds ?? [])]
  const optionalQuestionIds = [...registry.level2Common.optionalQuestionIds, ...(systemBank?.optionalQuestionIds ?? [])]
  const digestInput = {
    level,
    questionnaireVersion: registry.level2Common.bankVersion,
    educationSystem,
    systemBankVersion: systemBank?.bankVersion ?? null,
    questions
  }
  const presentation: QuestionnairePresentationMetaV1 = Object.freeze({
    version: 'education_compass_presentation_v1',
    estimatedMinutesMin: 15,
    estimatedMinutesMax: 20,
    totalQuestions: questions.length,
    requiredQuestions: requiredQuestionIds.length,
    progressMode: 'QUESTION_COUNT',
    scoringMode: 'NONE'
  })
  return Object.freeze({
    schemaVersion: registry.schemaVersion,
    assessmentKind: 'STUDENT_GROWTH_DISCOVERY',
    assessmentLevel: level,
    questionnaireVersion: registry.level2Common.bankVersion,
    commonBankVersion: registry.level2Common.bankVersion,
    systemBankVersion: systemBank?.bankVersion ?? null,
    educationSystem,
    systemResultMarker: formal ? 'FULL_SYSTEM_BANK' : 'SYSTEM_BANK_PENDING',
    questions: Object.freeze(questions),
    commonQuestionIds: registry.level2Common.questionIds,
    systemQuestionIds: systemBank?.questionIds ?? Object.freeze([]),
    requiredQuestionIds: Object.freeze(requiredQuestionIds),
    optionalQuestionIds: Object.freeze(optionalQuestionIds),
    schemaDigest: sha256Canonical(digestInput),
    scoringMode: 'NONE',
    presentation
  })
}

export function getEducationCompassQuestionnaireBank(
  level: AssessmentLevel,
  educationSystem: EducationSystem | null = null
): QuestionnaireBank {
  const key = `${level}:${educationSystem ?? 'NONE'}`
  const existing = bankCache.get(key)
  if (existing) return existing
  const bank = buildBank(level, educationSystem)
  bankCache.set(key, bank)
  return bank
}

export function getFrozenQuestion(
  level: AssessmentLevel,
  questionId: string,
  educationSystem: EducationSystem | null = null
): FrozenQuestion | null {
  return getEducationCompassQuestionnaireBank(level, educationSystem).questions.find((question) => question.id === questionId) ?? null
}
