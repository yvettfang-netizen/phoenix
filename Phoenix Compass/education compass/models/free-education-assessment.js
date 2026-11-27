const { BRANCHES, REGISTRY, REGISTRY_ID, SPEC_SHA, VERSIONS } = require('./free-education-registry.js')

const BY_ID = new Map(REGISTRY.map(q => [q.question_id, q]))
const BASE = REGISTRY.filter(q => q.branch_condition === null)
const ROLES = ['PARENT_GUARDIAN', 'STUDENT', 'UNDECLARED']
const owns = (value, key) => Object.prototype.hasOwnProperty.call(value, key)
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const unknown = value => ['UNKNOWN', 'UNDECIDED', 'NO_CLEAR_TARGET', 'NONE_YET'].includes(value)
const known = value => value !== undefined && value !== null && !unknown(value)

const CARDS = Object.freeze([
  { id: 'EDUCATION_STAGE', title: 'Education Stage', label: '教育阶段' },
  { id: 'GROWTH_SIGNALS', title: 'Growth Signals', label: '成长线索' },
  { id: 'PATHWAY_EXPLORATION', title: 'Pathway Exploration', label: '路线探索' },
  { id: 'NEXT_BEST_STEP', title: 'Next Best Step', label: '下一步' }
].map(Object.freeze))

const AUTHORIZATION_PURPOSES = Object.freeze([
  'SAVE_RESULT', 'ADVISOR_CONTACT', 'CRM_ASSESSMENT_REFERENCE', 'STUDENT_PARTICIPATION'
])

class AssessmentInputError extends Error {
  constructor() { super('INVALID_FREE_ASSESSMENT'); this.name = 'AssessmentInputError' }
}

function isValidAnswer(question, value) {
  if (value === null) return !question.required
  const multi = question.answer_type === 'MULTI_CHOICE'
  if (multi ? !Array.isArray(value) : typeof value !== 'string') return false
  const values = multi ? value : [value]
  return values.length >= 1 && values.length <= question.max_selections &&
    new Set(values).size === values.length &&
    values.every(item => question.allowed_values.some(option => option.value === item)) &&
    (values.length === 1 || !values.some(item => question.exclusive_options.includes(item)))
}

function assessmentPath(answers) {
  const branch = Object.keys(BRANCHES).find(key => BRANCHES[key] === answers.Q1) ?? null
  // A single explicit region preference is a compatible answer for E9. Two
  // preferences are unordered, and an undecided answer supplies no priority.
  const regions = answers.Q6
  const reuse = branch === 'E' && Array.isArray(regions) && regions.length === 1 && known(regions[0]) &&
    isValidAnswer(BY_ID.get('Q6'), regions) ? { 'Q9.E': 'Q6' } : {}
  const dynamic = BRANCHES[branch] === undefined ? [] : REGISTRY.filter(q => q.branch_condition === BRANCHES[branch])
  return { branch, reuse, questions: [...BASE, ...dynamic.filter(q => !owns(reuse, q.question_id))] }
}

function reviseAnswer(answers, id, value) {
  const before = assessmentPath(answers)
  const question = before.questions.find(q => q.question_id === id)
  if (!question || !isValidAnswer(question, value)) throw new AssessmentInputError()
  const updated = { ...answers, [id]: value }
  return Object.fromEntries(assessmentPath(updated).questions
    .filter(q => owns(updated, q.question_id)).map(q => [q.question_id, updated[q.question_id]]))
}

function validate(input) {
  if (!isRecord(input) || Object.keys(input).sort().join(',') !== 'answers,respondent_role,versions' ||
    !isRecord(input.versions) || Object.keys(input.versions).length !== 3 ||
    !Object.keys(VERSIONS).every(key => input.versions[key] === VERSIONS[key]) ||
    !ROLES.includes(input.respondent_role) || !isRecord(input.answers)) throw new AssessmentInputError()
  const path = assessmentPath(input.answers)
  const active = new Map(path.questions.map(q => [q.question_id, q]))
  if (Object.entries(input.answers).some(([id, val]) => !active.has(id) || !isValidAnswer(active.get(id), val)) ||
    path.questions.some(q => q.required && !owns(input.answers, q.question_id))) throw new AssessmentInputError()
  const normalized = Object.fromEntries(path.questions.filter(q => owns(input.answers, q.question_id)).map(q => {
    const value = input.answers[q.question_id]
    return [q.question_id, Array.isArray(value) ? q.allowed_values.map(option => option.value).filter(code => value.includes(code)) : value]
  }))
  return { path, normalized, role: input.respondent_role }
}

const SCOPE = ['jurisdiction','institution','programme','admission_year','qualification_system','rule_category']
const instant = value => typeof value === 'string' ? Date.parse(value) : NaN

// Only a trusted backend can supply rows, requested scope and verified subject
// facts. The anonymous HTTP adapters never forward such fields from clients.
function verifyOfficialRule({ scope, records = [], asOf, applicant = {} } = {}) {
  const unavailable = verification_status => ({ verification_status, applicable: false, references: [] })
  const at = instant(asOf)
  if (!Number.isFinite(at) || !scope || !SCOPE.every(key => key === 'admission_year'
    ? Number.isSafeInteger(scope[key]) : typeof scope[key] === 'string' && scope[key].length > 0)) return unavailable('UNVERIFIED')
  const candidates = records.filter(row => SCOPE.every(key => row[key] === scope[key]))
  const eligible = candidates.filter(row => row.verification_status === 'VERIFIED' && row.reviewed_by && row.rule_id &&
    /^https:\/\/[^\s]+$/i.test(row.source_url) && row.source_version && /^[a-f0-9]{64}$/.test(row.source_sha256) &&
    instant(row.source_published_at) <= at && instant(row.verified_at) <= at &&
    instant(row.valid_from) <= at && at < instant(row.valid_until) && !row.revoked_at &&
    typeof row.clause_key === 'string' && row.clause_key &&
    Array.isArray(row.required_conditions) && row.required_conditions.length &&
    row.required_conditions.every(key => typeof key === 'string' && key.length > 0))
  if (candidates.some(row => row.verification_status === 'CONFLICTED' &&
    instant(row.valid_from) <= at && at < instant(row.valid_until)) ||
    new Set(eligible.map(row => JSON.stringify([row.clause_key, [...row.required_conditions].sort()]))).size > 1) {
    return unavailable('CONFLICTED')
  }
  if (!eligible.length) return unavailable(candidates.length && candidates.every(row => instant(row.valid_until) <= at)
    ? 'EXPIRED' : 'UNVERIFIED')
  const references = eligible.map(row => ({ rule_id: row.rule_id, source_url: row.source_url, source_version: row.source_version }))
    .sort((left, right) => left.rule_id.localeCompare(right.rule_id))
  const applicable = eligible[0].required_conditions.every(key => owns(applicant, key) &&
    applicant[key]?.status === 'VERIFIED' && applicant[key]?.satisfied === true && applicant[key]?.evidence_id)
  return { verification_status: 'VERIFIED', applicable, references,
    condition_evidence_ids: applicable ? eligible[0].required_conditions.map(key => applicant[key].evidence_id) : [] }
}

const GOAL_MATCH = {
  PATHWAY_UNCLEAR: ['UNIVERSITY_AND_MAJOR_FIT', 'HK_OR_OVERSEAS_PLANNING'],
  CURRICULUM_CHOICE: ['BETTER_CURRICULUM'],
  HK_ADMISSION_GOAL: ['HK_UNIVERSITY_GOAL'],
  GROWTH_EXPLORATION: ['DEVELOP_GROWTH_STRENGTHS', 'ACADEMIC_EFFICIENCY'],
  MULTI_REGION_PLANNING: ['HK_OR_OVERSEAS_PLANNING']
}

function evaluateFreeAssessment(input, officialContext) {
  const { path, normalized: a, role } = validate(input)
  const answer = id => owns(path.reuse, id) ? a[path.reuse[id]][0] : a[id]
  const status = id => owns(path.reuse, id) ? 'SKIPPED_DUPLICATE'
    : owns(a, id) ? a[id] === null ? 'USER_SKIPPED' : 'ANSWERED'
      : path.questions.some(q => q.question_id === id) ? 'MISSING' : 'NOT_PRESENTED'
  const refs = ids => [...new Set(ids.map(id => path.reuse[id] ?? id))]
    .filter(id => owns(a, id) && a[id] !== null)
    .map(id => ({ response_id: 'free:' + id, question_id: id, field_key: BY_ID.get(id).field_key,
      question_version: VERSIONS.question_version, respondent_role: role,
      respondent_role_basis: role === 'UNDECLARED' ? 'NOT_DECLARED' : 'SELF_DECLARED' }))
  const labels = id => {
    const q = BY_ID.get(path.reuse[id] ?? id)
    const selected = [].concat(answer(id) ?? [])
    return q.allowed_values.filter(o => selected.includes(o.value)).map(o => o.label).join('、')
  }
  const cards = CARDS.map(card => ({ ...card, findings: [], missing_information: [] }))
  function finding(card, rule, title, summary, ids, actions = [], { level = 'L1', missing = [], official = null } = {}) {
    const evidence = refs(ids)
    if (!evidence.length) {
      cards[card].missing_information.push(...missing)
      return
    }
    cards[card].findings.push({
      finding_id: 'EDU-R' + rule + ':' + ids.join('+'),
      finding_type: title, title, summary, evidence_refs: evidence, evidence_level: level,
      missing_information: missing, rule_id: 'EDU-R' + rule, rule_version: VERSIONS.rule_version,
      official_verification_required: official !== null, official_verification_status: official?.verification_status ?? null,
      official_rule_refs: level === 'L4' ? official?.references ?? [] : [],
      condition_evidence_ids: level === 'L4' ? official?.condition_evidence_ids ?? [] : [],
      recommended_next_actions: actions
    })
  }

  // R001–R003. Preserve composite grade/curriculum labels and the concern as stated.
  finding(0, '001', '当前教育阶段', labels('Q2'), ['Q2'])
  finding(0, '002', '当前课程体系', labels('Q3'), ['Q3'], known(a.Q3) ? [] : ['确认目前使用的课程体系。'])
  if (known(a['Q9.B'])) finding(2, '002', '考虑中的课程', labels('Q9.B'), ['Q9.B'])
  const concernDetail = ['Q9.A','Q10.C'].find(id => known(a[id]))
  finding(2, '003', '当前最想了解', [labels('Q1'), concernDetail ? labels(concernDetail) : ''].filter(Boolean).join(' · '),
    ['Q1', ...(concernDetail ? [concernDetail] : [])])

  if (known(a.Q4)) {
    const source = role === 'PARENT_GUARDIAN' ? '家长观察' : role === 'STUDENT' ? '学生自述' : '填答者观察'
    finding(1, '004', '报告的学习状态', source + '：' + labels('Q4'), ['Q4'])
  } else cards[1].missing_information.push('learning_state_self_reported')
  if (known(a['Q11.D'])) finding(1, '004', '偏好的学习方式', labels('Q11.D'), ['Q11.D'])
  const interests = Array.isArray(a.Q5) && !a.Q5.includes('UNKNOWN')
  const practice = Array.isArray(a['Q10.D']) && !a['Q10.D'].includes('NONE_YET')
  const signals = ['Q5','Q9.D','Q10.D','Q11.B','Q12.D'].filter(id =>
    id === 'Q5' ? interests : id === 'Q10.D' ? practice : known(a[id]))
  const overlapping = interests && practice && a.Q5.includes('PRACTICAL_PROBLEM_SOLVING') && a['Q10.D'].includes('PROJECT')
  if (signals.length) finding(1, '005', '兴趣与投入线索', signals.map(labels).join(' · '), signals,
    ['挑一个有代表性的具体例子，比较兴趣与持续投入。'],
    { level: overlapping ? 'L2' : 'L1', missing: practice ? ['engagement_duration'] : ['engagement_evidence'] })

  const missing = [...new Set([
    ...path.questions.filter(q => status(q.question_id) !== 'ANSWERED').map(q => q.field_key),
    ...path.questions.filter(q => unknown(a[q.question_id]) ||
      (Array.isArray(a[q.question_id]) && a[q.question_id].some(unknown))).map(q => q.field_key),
    ...(!owns(a, 'Q10.D') || a['Q10.D'] === null ? ['growth_evidence_types'] : []),
    ...(path.branch === 'C' ? ['applicant_qualification_verification'] : [])
  ])].sort()
  if (missing.length) finding(3, '006', '可补充的资料', '目前仍有信息未了解。可以在下一步有选择地补充。',
    ['Q1','Q2','Q10.A','Q9.C','Q11.C','Q7','Q10.D','Q11.E'], ['从当前最在意的问题开始核对。'],
    { level: 'L3', missing })

  if (Array.isArray(a.Q6) && !a.Q6.includes('UNDECIDED')) {
    finding(2, '007', '地区偏好', labels('Q6'), ['Q6'])
  }
  if (known(answer('Q9.E'))) finding(2, '007', '优先考虑地区', labels('Q9.E'), ['Q9.E'])
  const constraints = ['Q10.E','Q11.E'].filter(id => known(a[id]) && ![].concat(a[id]).some(unknown))
  if (constraints.length) finding(2, '007', '家庭比较条件', constraints.map(labels).join(' · '), constraints)
  if (known(a.Q7)) finding(1, '008', '学术表现自述', labels('Q7'), ['Q7'], [], { missing: ['academic_period'] })
  if (a['Q12.C'] === 'ACADEMIC_GAP') finding(1, '008', '待核实的成绩差距',
    '现有自报不足以比较申请要求。', ['Q12.C','Q7'], ['准备对应课程、时期和原始成绩。'],
    { level: 'L3', missing: ['academic_period','verified_results'] })

  const curriculum = ['Q9.B','Q10.B','Q11.B','Q12.B','Q11.A'].filter(id => known(a[id]))
  if (curriculum.length || a.Q8 === 'BETTER_CURRICULUM') finding(2, '009', '课程与目标比较',
    curriculum.length ? curriculum.map(labels).join(' · ') : '可先梳理当前体系和希望改善的方向。',
    ['Q3','Q8',...curriculum], ['整理课程、科目要求和孩子的学习需求后再比较。'])
  const priorities = ['Q12.A','Q12.C','Q12.D','Q10.E','Q12.E'].filter(id => known(a[id]))
  finding(3, '010', '规划下一步', priorities.length ? priorities.map(labels).join(' · ') : '先选择一个目前最想了解的教育问题。',
    ['Q1','Q8',...priorities], ['记录下一次讨论需要核对的信息。'],
    { missing: known(a['Q12.E']) ? [] : ['planning_start_window'] })
  if (known(a.Q8)) {
    const aligned = GOAL_MATCH[a.Q1].includes(a.Q8)
    finding(2, '011', '当前关注与家庭目标', aligned ? '两个回答指向同一方向。' : '可进一步梳理当下关注与三年目标的关系。',
      ['Q1','Q8'], ['与学生分别确认其本人的目标。'], { level: aligned ? 'L2' : 'L1' })
  }
  if (path.branch === 'C' || a['Q9.A'] === 'ELIGIBILITY') {
    const official = verifyOfficialRule(officialContext)
    const ids = ['Q1','Q9.A','Q9.C','Q10.C','Q12.C']
    finding(official.applicable ? 2 : 3, '012', official.applicable ? '已核验适用条款' : '申请资格待核验',
      official.applicable ? '有效官方条款与已核验的申请人条件相符。' : '先核对申请年度、官方规则与实际申请条件。',
      ids, ['对照适用条款与实际材料。'],
      { level: official.applicable ? 'L4' : 'L3', official,
        missing: official.applicable ? [] : ['applicable_rule_or_applicant_conditions'] })
  }

  return {
    versions: VERSIONS, branch: path.branch, respondent_role: role, cards,
    question_status: Object.fromEntries(REGISTRY.map(q => [q.question_id, status(q.question_id)])),
    profile: {
      primary_concern: a.Q1, education_stage: 'SECONDARY', grade_level_raw: a.Q2, grade_label: labels('Q2'), grade_system: null,
      education_system: a.Q3, curriculum_stage: null, curriculum_subjects: null, curriculum_transition_status: a['Q12.B'] ?? null,
      learning_state_self_reported: a.Q4 ?? null, interest_domains: a.Q5 ?? null, engagement_evidence: null, engagement_duration: null,
      growth_evidence_types: a['Q10.D'] ?? null, practice_evidence_status: Array.isArray(a['Q10.D'])
        ? a['Q10.D'].includes('NONE_YET') ? 'REPORTED_NONE' : 'REPORTED' : 'NOT_EXPLORED',
      preferred_regions: a.Q6 ?? null, primary_preferred_region: known(answer('Q9.E')) ? answer('Q9.E') : null,
      region_decision_status: a.Q6?.includes('UNDECIDED') ? 'UNDECIDED' : a.Q6 ? 'REPORTED_PREFERENCE' : null,
      academic_self_report: a.Q7 ?? null, academic_period: null, result_type: a.Q7 ? 'QUALITATIVE_SELF_REPORT' : null,
      result_source: a.Q7 ? role : null, verification_status: a.Q7 ? 'UNVERIFIED' : null,
      family_goal: a.Q8 ?? null, family_goal_priority: known(a.Q8) ? a.Q8 : null, family_goal_time_horizon: a.Q8 ? 3 : null,
      goal_alignment_status: known(a.Q8) ? GOAL_MATCH[a.Q1].includes(a.Q8) ? 'SAME_DIRECTION' : 'NEEDS_DISCUSSION' : null,
      branch_fields: Object.fromEntries(REGISTRY.filter(q => q.branch_condition && owns(a, q.question_id))
        .map(q => [q.field_key, a[q.question_id]])),
      missing_information: missing
    },
    authorizations: Object.fromEntries(AUTHORIZATION_PURPOSES.map(purpose => [purpose, 'NOT_GRANTED']))
  }
}

// Anonymous evaluation confers no permission. These actions require separate
// Canonical consent capabilities and approved purpose text, neither of which
// can be supplied via a questionnaire request.
function anonymousActionAllowed(action) {
  return action === 'EVALUATE'
}

module.exports = {
  BRANCHES, REGISTRY, REGISTRY_ID, SPEC_SHA, VERSIONS, CARDS, AUTHORIZATION_PURPOSES,
  AssessmentInputError, isValidAnswer, assessmentPath, reviseAnswer, verifyOfficialRule,
  evaluateFreeAssessment, anonymousActionAllowed
}
