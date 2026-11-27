const { REGISTRY } = require('./free-education-registry.js')

const questions = new Map(REGISTRY.map(question => [question.question_id, question.prompt]))
const evidenceLabels = {
  L1: '根据本次填写的信息',
  L2: '根据多项回答形成的观察',
  L3: '需要进一步资料或专业评估',
  L4: '依据已核验的适用官方规则'
}

const missingLabels = {
  primary_concern: '尚未了解家庭目前最想弄清的教育问题。',
  grade_level_raw: '尚未了解孩子目前就读的年级。',
  education_system: '尚未了解孩子目前就读的课程体系。',
  learning_state_self_reported: '尚未了解孩子近期的学习状态。',
  interest_domains: '尚未了解哪些事情容易让孩子投入时间。',
  preferred_regions: '尚未明确家庭考虑的升学地区。',
  academic_self_report: '尚未了解填答者对孩子目前学术表现的描述。',
  family_goal: '尚未明确家庭未来三年的教育目标。',
  pathway_uncertainty: '尚未了解家庭对升学路线最不确定的问题。',
  target_clarity: '尚未了解孩子目前的目标是否明确。',
  pathway_flexibility: '尚未了解家庭是否愿意比较不同课程和升学路线。',
  support_priority: '尚未了解家庭目前最希望获得哪方面的帮助。',
  curriculum_options: '尚未明确家庭正在考虑的课程。',
  curriculum_decision_factors: '尚未了解家庭选择课程时最看重的因素。',
  subject_interest_signals: '尚未了解填答者认为孩子在哪些科目表现较好。',
  curriculum_transition_status: '尚未了解孩子是否有转换课程体系的计划。',
  applicant_identity_category_self_reported: '尚未了解填答者所述的申请身份类别。',
  admission_route_preference: '尚未明确家庭主要考虑的申请方式。',
  major_target_clarity: '尚未了解孩子是否已有目标专业。',
  hk_admission_support_priority: '尚未了解家庭最希望先解决哪个香港升学问题。',
  engagement_behaviours: '尚未了解孩子做哪些事情时容易投入。',
  growth_evidence_types: '尚未了解孩子是否有持续投入的具体经历。',
  learning_preferences: '尚未了解孩子偏好的学习方式。',
  growth_exploration_priority: '尚未了解家庭最想进一步了解孩子成长的哪个方面。',
  region_priority: '尚未明确家庭最优先考虑的地区。',
  regional_decision_factors: '尚未了解家庭比较不同升学路线时最重视的因素。',
  family_planning_constraints: '尚未了解家庭规划时需要考虑的现实条件。',
  planning_start_window: '尚未明确家庭希望何时开始下一步规划。',
  academic_period: '尚未了解成绩所属学期或考试时间。',
  engagement_duration: '尚未了解孩子在相关活动中持续投入的时间。',
  engagement_evidence: '尚未了解能说明孩子如何投入的具体例子。',
  verified_results: '尚需核对原始成绩资料。',
  applicant_qualification_verification: '尚需核对申请人是否符合适用的申请条件。',
  applicable_rule_or_applicant_conditions: '尚需核对适用的官方招生规则或申请人的实际条件。'
}

const unique = values => [...new Set(values)]

function presentFinding(finding) {
  const verified = finding.official_verification_status === 'VERIFIED'
  const applicable = finding.evidence_level === 'L4' && verified &&
    finding.official_rule_refs?.length > 0 && finding.condition_evidence_ids?.length > 0
  const level = finding.evidence_level === 'L4' && !applicable ? 'L3' : finding.evidence_level
  return {
    id: finding.finding_id,
    title: finding.title,
    summary: finding.summary,
    actions: finding.recommended_next_actions,
    evidenceLabel: evidenceLabels[level],
    questionPrompts: unique(finding.evidence_refs.map(ref => questions.get(ref.question_id)).filter(Boolean)),
    officialSources: applicable ? unique(finding.official_rule_refs.map(ref => ref.source_url)) : [],
    officialNotice: (finding.official_verification_required || finding.evidence_level === 'L4') && !applicable
      ? verified ? '相关招生要求对本次申请是否适用，仍需核实。' : '相关招生要求有待官方核实。'
      : ''
  }
}

// Derive display text without changing the assessment snapshot or any answers.
function presentGrowthCards(snapshot) {
  return snapshot.cards.map(card => ({
    id: card.id,
    label: card.label,
    findings: card.findings.map(presentFinding),
    missingInformation: unique([
      ...card.missing_information,
      ...card.findings.flatMap(finding => finding.missing_information)
    ].map(key => Object.prototype.hasOwnProperty.call(missingLabels, key) ? missingLabels[key] : null).filter(Boolean))
  }))
}

module.exports = { presentGrowthCards }
