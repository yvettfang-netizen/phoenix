const { createId } = require('../utils/id')
const { isoNow } = require('../utils/date')

const CONTRACT_VERSION = 'growth_blueprint.v1'
const BLUEPRINT_STATUS = 'preview'
const SOURCE_TYPE = 'family_os_local_report'
const BLUEPRINT_ID_PATTERN = /^gbp_[A-Za-z0-9_-]{1,128}$/

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function text(value, fallback) {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim()
  return normalized || fallback
}

function list(value, fallback) {
  if (!Array.isArray(value)) return fallback
  const normalized = value.map((item) => text(item, '')).filter(Boolean)
  return normalized.length ? normalized : fallback
}

function requireContext(input) {
  const family = input && input.family
  const student = input && input.student
  const assessment = input && input.assessment
  const report = input && input.report
  if (!isRecord(family) || !family.id) throw new TypeError('Growth Blueprint requires a family')
  if (!isRecord(student) || !student.id) throw new TypeError('Growth Blueprint requires a student')
  if (!isRecord(assessment) || !assessment.id) throw new TypeError('Growth Blueprint requires an assessment')
  if (!isRecord(report) || !report.id) throw new TypeError('Growth Blueprint requires a report')
  if (student.family_id !== family.id) throw new TypeError('student does not belong to family')
  if (assessment.student_id !== student.id) throw new TypeError('assessment does not belong to student')
  if (report.assessment_id !== assessment.id) throw new TypeError('report does not belong to assessment')
  if (assessment.type !== 'education' || assessment.status !== 'completed') {
    throw new TypeError('Growth Blueprint requires a completed Education Compass assessment')
  }
  if (!isRecord(report.summary) || !isRecord(report.recommendation)) {
    throw new TypeError('report is missing summary or recommendation')
  }
  return { family, student, assessment, report }
}

function buildGrowthBlueprint(input = {}) {
  const { family, student, assessment, report } = requireContext(input)
  const answers = isRecord(assessment.answers) ? assessment.answers : {}
  const summary = report.summary
  const recommendation = report.recommendation
  const now = text(input.now, isoNow())
  const strengths = list(answers.strengths, ['待继续观察'])
  const challenges = list(answers.challenges, [text(summary.potentialChallenge, '方向仍在探索')])
  const supportNeeds = list(answers.support_need, ['阶段规划'])
  const interests = text(answers.interests, text(student.interest, '多元兴趣'))
  const futureGoal = text(answers.future_goal, text(student.goal, '逐步形成清晰方向'))

  const blueprint = {
    id: text(input.id, createId('gbp')),
    contract_version: CONTRACT_VERSION,
    status: BLUEPRINT_STATUS,
    family_id: family.id,
    student_id: student.id,
    source_report_id: report.id,
    profile: {
      family_name: text(family.family_name, '家庭成长档案'),
      student_name: text(student.name, '孩子'),
      current_stage: text(summary.currentStage, '个性化成长探索期'),
      family_goal: text(family.goal, '在每个重要阶段，做更适合家庭的选择。')
    },
    growth_map: {
      strengths,
      interests,
      challenges,
      observation: text(summary.narrative, '这是一份基于当前记录的成长线索，后续可随行动反馈更新。')
    },
    education_path: {
      future_goal: futureGoal,
      suggested_direction: text(recommendation.suggestedDirection, '先从小范围体验开始，再根据真实反馈调整方向。'),
      principle: '先用可验证的体验积累反馈，再逐步收敛教育路径。'
    },
    action_plan: {
      horizon: '30_days',
      next_action: text(recommendation.nextAction, '选择一项低成本行动并记录反馈。'),
      support_needs: supportNeeds
    },
    source: {
      type: SOURCE_TYPE,
      report_id: report.id,
      assessment_id: assessment.id,
      engine: text(recommendation.engine, 'phoenix_rule_engine_v0.1')
    },
    created_at: now,
    updated_at: now
  }

  assertValidGrowthBlueprint(blueprint)
  return blueprint
}

function validateGrowthBlueprint(value) {
  const errors = []
  if (!isRecord(value)) return { valid: false, errors: ['blueprint must be an object'] }
  if (typeof value.id !== 'string' || !BLUEPRINT_ID_PATTERN.test(value.id)) errors.push('id is invalid')
  if (value.contract_version !== CONTRACT_VERSION) errors.push('contract_version is unsupported')
  if (value.status !== BLUEPRINT_STATUS) errors.push('status is unsupported')
  for (const field of ['family_id', 'student_id', 'source_report_id', 'created_at', 'updated_at']) {
    if (typeof value[field] !== 'string' || !value[field]) errors.push(`${field} is required`)
  }
  if (!isRecord(value.profile)) errors.push('profile is required')
  if (!isRecord(value.growth_map)) errors.push('growth_map is required')
  if (!isRecord(value.education_path)) errors.push('education_path is required')
  if (!isRecord(value.action_plan)) errors.push('action_plan is required')
  if (!isRecord(value.source) || value.source.type !== SOURCE_TYPE) errors.push('source is invalid')
  if (isRecord(value.profile)) {
    for (const field of ['family_name', 'student_name', 'current_stage', 'family_goal']) {
      if (typeof value.profile[field] !== 'string' || !value.profile[field]) errors.push(`profile.${field} is required`)
    }
  }
  if (isRecord(value.growth_map)) {
    if (!Array.isArray(value.growth_map.strengths) || !value.growth_map.strengths.length) errors.push('growth_map.strengths is required')
    if (typeof value.growth_map.interests !== 'string' || !value.growth_map.interests) errors.push('growth_map.interests is required')
    if (!Array.isArray(value.growth_map.challenges) || !value.growth_map.challenges.length) errors.push('growth_map.challenges is required')
  }
  if (isRecord(value.education_path)) {
    for (const field of ['future_goal', 'suggested_direction', 'principle']) {
      if (typeof value.education_path[field] !== 'string' || !value.education_path[field]) errors.push(`education_path.${field} is required`)
    }
  }
  if (isRecord(value.action_plan)) {
    if (value.action_plan.horizon !== '30_days') errors.push('action_plan.horizon is unsupported')
    if (typeof value.action_plan.next_action !== 'string' || !value.action_plan.next_action) errors.push('action_plan.next_action is required')
    if (!Array.isArray(value.action_plan.support_needs) || !value.action_plan.support_needs.length) errors.push('action_plan.support_needs is required')
  }
  return { valid: errors.length === 0, errors }
}

function assertValidGrowthBlueprint(value) {
  const result = validateGrowthBlueprint(value)
  if (!result.valid) throw new TypeError(`Invalid Growth Blueprint: ${result.errors.join('; ')}`)
  return value
}

module.exports = {
  BLUEPRINT_STATUS,
  CONTRACT_VERSION,
  SOURCE_TYPE,
  assertValidGrowthBlueprint,
  buildGrowthBlueprint,
  validateGrowthBlueprint
}
