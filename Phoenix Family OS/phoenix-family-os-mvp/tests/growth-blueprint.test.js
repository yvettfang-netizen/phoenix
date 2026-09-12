const assert = require('node:assert/strict')

const memory = new Map()
global.wx = {
  getStorageSync: (key) => memory.get(key),
  setStorageSync: (key, value) => memory.set(key, value),
  removeStorageSync: (key) => memory.delete(key)
}

const repository = require('../services/repository')
const {
  CONTRACT_VERSION,
  SOURCE_TYPE,
  buildGrowthBlueprint,
  validateGrowthBlueprint
} = require('../services/growth-blueprint')

repository.resetDemoData()
const user = repository.insert('users', {
  wechat_id: 'growth-blueprint-test', name: 'Synthetic Parent', phone: '', role: 'family_user', created_at: '2026-09-03T00:00:00.000Z'
})
const family = repository.upsertFamily(user.id, {
  family_name: 'Synthetic Family', parent_name: 'Synthetic Parent', phone: '', location: 'Demo', goal: 'Observe growth over time'
})
const student = repository.upsertStudent(family.id, {
  name: 'Synthetic Student', age: '12', gender: '', school: 'Demo School', education_system: '', grade: '六年级', interest: '音乐与搭建', goal: '继续探索'
})
const assessment = repository.insert('assessments', {
  student_id: student.id,
  type: 'education',
  answers: {
    strengths: ['创造力', '逻辑力'],
    interests: '音乐与搭建',
    challenges: ['目标不清晰'],
    future_goal: '工程与创作',
    support_need: ['方向梳理', '项目体验']
  },
  status: 'completed',
  created_at: '2026-09-03T00:01:00.000Z'
})
const report = repository.insert('reports', {
  assessment_id: assessment.id,
  summary: {
    currentStage: '兴趣唤醒与学习习惯建立期',
    strength: '拥有较强的想象与创意倾向',
    potentialChallenge: '目标不清晰',
    narrative: '这是一段合成的成长观察。'
  },
  recommendation: {
    suggestedDirection: '先完成一个小型创作项目。',
    nextAction: '用一次低成本体验收集反馈。',
    engine: 'phoenix_rule_engine_v0.1'
  },
  created_at: '2026-09-03T00:02:00.000Z'
})

const blueprint = buildGrowthBlueprint({
  id: 'gbp_synthetic_001', family, student, assessment, report, now: '2026-09-03T00:03:00.000Z'
})
assert.equal(blueprint.contract_version, CONTRACT_VERSION)
assert.equal(blueprint.status, 'preview')
assert.equal(blueprint.source.type, SOURCE_TYPE)
assert.equal(blueprint.source_report_id, report.id)
assert.deepEqual(blueprint.growth_map.strengths, ['创造力', '逻辑力'])
assert.equal(validateGrowthBlueprint(blueprint).valid, true)

const stored = repository.upsertGrowthBlueprint(blueprint)
assert.equal(stored.id, blueprint.id)
assert.equal(repository.growthBlueprintsForFamily(family.id).length, 1)

const replay = repository.upsertGrowthBlueprint(buildGrowthBlueprint({
  id: 'gbp_should_not_replace_existing_id', family, student, assessment, report, now: '2026-09-03T00:04:00.000Z'
}))
assert.equal(replay.id, stored.id, 'same source report must be idempotent')
assert.equal(repository.growthBlueprintsForFamily(family.id).length, 1)
assert.equal(repository.familyOverview(family.id).growthBlueprints[0].source_report_id, report.id)

const invalid = validateGrowthBlueprint({ ...blueprint, status: 'published' })
assert.equal(invalid.valid, false)
assert(invalid.errors.includes('status is unsupported'))

const otherFamily = repository.insert('families', {
  user_id: user.id, family_name: 'Other Synthetic Family', created_at: '2026-09-03T00:05:00.000Z'
})
assert.throws(() => repository.upsertGrowthBlueprint({ ...blueprint, family_id: otherFamily.id }), /identity context/)

console.log('✓ Growth Blueprint contract: deterministic, report-linked, preview-only output is valid')
console.log('✓ Growth Blueprint persistence: family-scoped upsert is idempotent and preserves the first id')
console.log('✓ Growth Blueprint safety: mismatched family context is rejected')
