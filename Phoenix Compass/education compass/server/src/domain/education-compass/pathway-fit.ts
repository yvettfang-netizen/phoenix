import {
  CanonicalAnswerMap,
  EDUCATION_COMPASS_DISCLAIMER,
  EDUCATION_COMPASS_DISCLAIMER_VERSION,
  EducationPathwaySignalV12,
  EducationSystem,
  GROWTH_DISCOVERY_REPORT_V12_VERSION,
  PATHWAY_FIT_FREE_QUESTIONNAIRE_VERSION,
  PATHWAY_FIT_RULESET_VERSION,
  PathwayFitSignalV12,
  ResultBuildIdentity,
  StudentGrowthDiscoveryReportV1,
  StudentGrowthDiscoveryReportV12
} from './contracts'

export const PATHWAY_FIT_FREE_BANK_V12 = Object.freeze({
  schema_version: 'phoenix_question_bank_schema_v1',
  candidate_version: PATHWAY_FIT_FREE_QUESTIONNAIRE_VERSION,
  level_1: {
    bank_version: PATHWAY_FIT_FREE_QUESTIONNAIRE_VERSION,
    questions: [
      {
        id: 'PF01', key: 'stage', label: '孩子现在处于哪个学习阶段？', type: 'SINGLE_CHOICE', required: true,
        options: [
          { code: 'LOWER_SECONDARY', label: '初一–初三' }, { code: 'GRADE_10', label: '高一' },
          { code: 'GRADE_11', label: '高二' }, { code: 'GRADE_12', label: '高三' },
          { code: 'INTERNATIONAL_SECONDARY', label: '国际课程阶段' }, { code: 'UNIVERSITY', label: '大学阶段' },
          { code: 'OTHER', label: '其他' }
        ], validation: {}, dimensions: ['CONTEXT'], signal_codes: ['STAGE_CONTEXT'], scored: false
      },
      {
        id: 'PF02', key: 'education_system', label: '目前主要学习 / 升学体系是什么？', type: 'SINGLE_CHOICE', required: true,
        options: [
          { code: 'GAOKAO', label: '内地高考' }, { code: 'HKDSE', label: 'HKDSE' }, { code: 'A_LEVEL', label: 'A-Level' },
          { code: 'IB', label: 'IB' }, { code: 'AP_US', label: 'AP / 美高' }, { code: 'OTHER', label: '其他' }, { code: 'UNSURE', label: '尚未确定' }
        ], validation: {}, dimensions: ['CONTEXT'], signal_codes: ['EDUCATION_SYSTEM_CONTEXT'], scored: false
      },
      {
        id: 'PF03', key: 'learning_state', label: '孩子目前整体学习状态更接近哪一种？', type: 'SINGLE_CHOICE', required: true,
        options: [
          { code: 'STRONG_AND_STABLE', label: '学得比较轻松，成绩也稳定' },
          { code: 'UNDERSTANDS_BUT_UNSTABLE', label: '理解不慢，但成绩波动比较大' },
          { code: 'HARDWORK_LOW_RETURN', label: '很努力，但成绩提升不明显' },
          { code: 'SUBJECT_IMBALANCE', label: '明显偏科' },
          { code: 'LOW_MOTIVATION_EXECUTION', label: '学习动力 / 执行力比较弱' },
          { code: 'UNCLEAR', label: '目前还看不清' }
        ], validation: {}, dimensions: ['LEARNING_PROCESS'], signal_codes: ['LEARNING_STATE_CONTEXT'], scored: false
      },
      {
        id: 'PF04', key: 'independence_adaptation', label: '如果未来离开熟悉环境，孩子的适应情况更接近哪种？', type: 'SINGLE_CHOICE', required: true,
        options: [
          { code: 'HIGHLY_READY', label: '很期待，也比较独立' }, { code: 'WILLING_WITH_SUPPORT', label: '愿意尝试，但需要支持' },
          { code: 'UNCERTAIN', label: '不确定' }, { code: 'FAMILY_DEPENDENT', label: '比较依赖家庭' }, { code: 'RESISTANT', label: '明显抗拒离开当前环境' }
        ], validation: {}, dimensions: ['CONTEXT'], signal_codes: ['ADAPTATION_CONTEXT'], scored: false
      },
      {
        id: 'PF05', key: 'target_region', label: '家庭目前更倾向哪种升学路径？', type: 'SINGLE_CHOICE', required: true,
        options: [
          { code: 'HONG_KONG', label: '香港' }, { code: 'UK', label: '英国' }, { code: 'US', label: '美国' },
          { code: 'AU_NZ', label: '澳洲 / 新西兰' }, { code: 'SINGAPORE', label: '新加坡' },
          { code: 'MULTI_REGION', label: '多地区一起比较' }, { code: 'UNSURE_ABROAD', label: '还没想好要不要出国' }
        ], validation: {}, dimensions: ['FAMILY_GOAL'], signal_codes: ['PATHWAY_CONTEXT'], scored: false
      },
      {
        id: 'PF05A', key: 'hk_status', label: '目前香港身份情况？', type: 'SINGLE_CHOICE', required: true,
        options: [
          { code: 'HK_PR', label: '香港永久居民' }, { code: 'HK_NON_PR_DEPENDANT', label: '香港非永久居民 / 受养人' },
          { code: 'APPLYING', label: '正在规划 / 申请' }, { code: 'NONE', label: '暂无香港身份' }, { code: 'UNSURE', label: '不确定' }
        ], validation: {}, dimensions: ['CONTEXT'], signal_codes: ['HK_IDENTITY_CONTEXT'], scored: false,
        visibility: { question_id: 'PF05', question_key: 'target_region', allowed_values: ['HONG_KONG', 'MULTI_REGION'] }
      },
      {
        id: 'PF06', key: 'primary_question', label: '你现在最想先得到哪个答案？', type: 'SINGLE_CHOICE', required: true,
        options: [
          { code: 'FIT_HONG_KONG', label: '孩子适不适合去香港' }, { code: 'FIT_ABROAD', label: '孩子适不适合出国' },
          { code: 'HK_VS_ABROAD', label: '香港和海外哪个更适合' }, { code: 'ACADEMIC_CHANCE', label: '现在的成绩基础是否支持继续探索' },
          { code: 'PATH_CHOICE', label: '应该先关注什么课程 / 路径' }, { code: 'LEARNING_GAP', label: '孩子现在最需要补什么' }
        ], validation: {}, dimensions: ['NEXT_STEP'], signal_codes: ['PRIMARY_PATHWAY_QUESTION'], scored: false
      }
    ],
    question_ids: ['PF01', 'PF02', 'PF03', 'PF04', 'PF05', 'PF05A', 'PF06'],
    required_question_ids: ['PF01', 'PF02', 'PF03', 'PF04', 'PF05', 'PF05A', 'PF06'],
    optional_question_ids: []
  },
  presentation: {
    experienceTitle: '30—45 秒，先看见孩子当前值得继续探索的路径。',
    experienceEyebrow: 'FREE · 30—45 秒',
    experienceSummary: '由家长根据近期真实情况点击选择，快速判断香港与海外路径是否值得继续探索。',
    respondentHint: '由家长／监护人填写；这不是录取预测，也不对孩子能力评分。',
    completionOutcome: '完成后可查看香港路径信号、海外路径信号与当前关键变量。',
    primaryActionHint: '开始免费路径适配快速判断'
  }
} as const)

const stringAnswer = (answers: CanonicalAnswerMap, id: string): string => String(answers[id] || '')
const fit = (status: PathwayFitSignalV12['status'], refs: string[]): PathwayFitSignalV12 => Object.freeze({
  status, evidence_refs: Object.freeze(refs)
})

export function educationSystemFromPathwayFit(value: unknown): EducationSystem | null {
  const code = String(value || '')
  if (code === 'HKDSE') return 'DSE'
  if (['GAOKAO', 'A_LEVEL', 'IB', 'AP_US', 'OTHER'].includes(code)) return code as EducationSystem
  return null
}

export function buildEducationPathwaySignalV12(identity: ResultBuildIdentity, answers: CanonicalAnswerMap): EducationPathwaySignalV12 {
  const learningState = stringAnswer(answers, 'PF03')
  const adaptation = stringAnswer(answers, 'PF04')
  const target = stringAnswer(answers, 'PF05')
  const primaryQuestion = stringAnswer(answers, 'PF06')
  const isHongKongTarget = target === 'HONG_KONG' || target === 'MULTI_REGION'
  const isOverseasTarget = ['UK', 'US', 'AU_NZ', 'SINGAPORE', 'MULTI_REGION'].includes(target)
  const resistance = adaptation === 'RESISTANT'
  const dependent = adaptation === 'FAMILY_DEPENDENT'
  const learningConstraint = ['HARDWORK_LOW_RETURN', 'LOW_MOTIVATION_EXECUTION'].includes(learningState)
  const uncertainLearning = learningState === 'UNCLEAR'
  const ready = ['HIGHLY_READY', 'WILLING_WITH_SUPPORT'].includes(adaptation)

  const hongKong = !isHongKongTarget
    ? fit(primaryQuestion === 'FIT_HONG_KONG' || primaryQuestion === 'HK_VS_ABROAD' ? 'CONTINUE_EVALUATING' : 'NOT_PRIORITY_NOW', ['PF05', 'PF06'])
    : resistance
      ? fit('NOT_PRIORITY_NOW', ['PF04', 'PF05'])
      : learningConstraint
        ? fit('CONTINUE_EVALUATING', ['PF03', 'PF05'])
        : uncertainLearning
          ? fit('CONDITIONS_INSUFFICIENT', ['PF03', 'PF05'])
          : fit(ready ? 'PRIORITY_EXPLORE' : 'CONTINUE_EVALUATING', ['PF03', 'PF04', 'PF05'])
  const overseas = !isOverseasTarget
    ? fit(primaryQuestion === 'FIT_ABROAD' || primaryQuestion === 'HK_VS_ABROAD' ? 'CONTINUE_EVALUATING' : 'NOT_PRIORITY_NOW', ['PF05', 'PF06'])
    : resistance || dependent
      ? fit('NOT_PRIORITY_NOW', ['PF04', 'PF05'])
      : learningConstraint
        ? fit('CONTINUE_EVALUATING', ['PF03', 'PF05'])
        : uncertainLearning
          ? fit('CONDITIONS_INSUFFICIENT', ['PF03', 'PF05'])
          : fit(ready ? 'PRIORITY_EXPLORE' : 'CONTINUE_EVALUATING', ['PF03', 'PF04', 'PF05'])

  const variables: string[] = []
  if (learningState === 'UNDERSTANDS_BUT_UNSTABLE' || learningState === 'STRONG_AND_STABLE' || learningState === 'SUBJECT_IMBALANCE') variables.push('ACADEMIC_STABILITY')
  if (learningConstraint) variables.push('LEARNING_EXECUTION')
  if (['HIGHLY_READY', 'WILLING_WITH_SUPPORT', 'FAMILY_DEPENDENT', 'RESISTANT'].includes(adaptation)) variables.push('INDEPENDENCE')
  if (adaptation === 'UNCERTAIN') variables.push('ADAPTATION')
  if (isHongKongTarget) variables.push('HK_IDENTITY_CONTEXT')
  if (target === 'MULTI_REGION' || target === 'UNSURE_ABROAD') variables.push('FAMILY_PATH_CLARITY')
  if (!variables.length) variables.push('EDUCATION_SYSTEM')

  return Object.freeze({
    result_kind: 'EDUCATION_PATHWAY_SIGNAL', result_version: 'education_pathway_signal_v1.2.0',
    family_id: identity.familyId, student_id: identity.studentId, assessment_id: identity.assessmentId,
    education_system: stringAnswer(answers, 'PF02'), grade_stage: stringAnswer(answers, 'PF01'),
    hong_kong_fit_signal: hongKong, overseas_fit_signal: overseas,
    key_variables: Object.freeze([...new Set(variables)].slice(0, 3)),
    next_insight: '我们已经能判断香港与海外路径是否值得继续探索，但仍不知道哪些学习与成长因素正在影响这条路径。',
    next_step_status: 'AVAILABLE', next_step_reason_codes: ['PATHWAY_SIGNAL_READY_FOR_GROWTH_DISCOVERY'] as const,
    questionnaire_version: PATHWAY_FIT_FREE_QUESTIONNAIRE_VERSION, ruleset_version: PATHWAY_FIT_RULESET_VERSION,
    disclaimer_version: EDUCATION_COMPASS_DISCLAIMER_VERSION, disclaimer: EDUCATION_COMPASS_DISCLAIMER, scoring_mode: 'NONE'
  })
}

export function isEducationPathwaySignalV12(value: unknown): value is EducationPathwaySignalV12 {
  return Boolean(value && typeof value === 'object' && (value as { result_kind?: unknown }).result_kind === 'EDUCATION_PATHWAY_SIGNAL' &&
    (value as { result_version?: unknown }).result_version === 'education_pathway_signal_v1.2.0')
}

export function buildStudentGrowthDiscoveryReportV12(
  base: StudentGrowthDiscoveryReportV1,
  source: EducationPathwaySignalV12,
  sourceAssessmentId: string
): StudentGrowthDiscoveryReportV12 {
  const evidenceRefs = Object.freeze([...new Set([
    ...source.hong_kong_fit_signal.evidence_refs, ...source.overseas_fit_signal.evidence_refs
  ])])
  return Object.freeze({
    ...base,
    result_version: GROWTH_DISCOVERY_REPORT_V12_VERSION,
    pathway_fit: Object.freeze({
      hong_kong_fit_signal: source.hong_kong_fit_signal,
      overseas_fit_signal: source.overseas_fit_signal,
      key_variables: source.key_variables,
      next_insight: source.next_insight,
      evidence_refs: evidenceRefs,
      source_assessment_id: sourceAssessmentId,
      source_questionnaire_version: PATHWAY_FIT_FREE_QUESTIONNAIRE_VERSION,
      ruleset_version: PATHWAY_FIT_RULESET_VERSION
    }),
    questionnaire_versions: Object.freeze([source.questionnaire_version, ...base.questionnaire_versions])
  })
}
