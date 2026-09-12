const assert = require('node:assert/strict')

const memory = new Map()
const navigationCalls = []
global.wx = {
  getStorageSync: (key) => memory.get(key),
  setStorageSync: (key, value) => memory.set(key, value),
  removeStorageSync: (key) => memory.delete(key),
  reLaunch: (options) => navigationCalls.push({ method: 'reLaunch', ...options }),
  switchTab: (options) => navigationCalls.push({ method: 'switchTab', ...options }),
  navigateTo: (options) => navigationCalls.push({ method: 'navigateTo', ...options }),
  navigateBack: (options = {}) => navigationCalls.push({ method: 'navigateBack', ...options })
}

const repository = require('../services/repository')
const { buildGrowthBlueprint } = require('../services/growth-blueprint')
repository.resetDemoData()
const familyUser = repository.insert('users', {
  wechat_id: 'blueprint-page-test', name: 'Synthetic Parent', phone: '', role: 'family_user', created_at: '2026-09-03T00:00:00.000Z'
})
const family = repository.upsertFamily(familyUser.id, {
  family_name: 'Synthetic Family', parent_name: 'Synthetic Parent', phone: '', location: 'Demo', goal: 'Observe growth over time'
})
const student = repository.upsertStudent(family.id, { name: 'Synthetic Student' })
const assessment = repository.insert('assessments', { student_id: student.id, type: 'education', answers: {}, status: 'completed', created_at: '2026-09-03T00:01:00.000Z' })
const report = repository.insert('reports', {
  assessment_id: assessment.id,
  summary: { currentStage: '探索期', strength: '好奇心', potentialChallenge: '目标不清晰', narrative: 'Synthetic insight' },
  recommendation: { suggestedDirection: '观察', nextAction: '尝试', engine: 'phoenix_rule_engine_v0.1' },
  created_at: '2026-09-03T00:02:00.000Z'
})
const blueprint = repository.upsertGrowthBlueprint(buildGrowthBlueprint({ family, student, assessment, report, id: 'gbp_page_001', now: '2026-09-03T00:03:00.000Z' }))

let definition = null
global.Page = (value) => { definition = value }
global.getApp = () => ({ getCurrentUser: () => familyUser })
require('../pages/blueprint/index')

const page = {
  ...definition,
  data: JSON.parse(JSON.stringify(definition.data)),
  setData(changes) { Object.assign(this.data, changes) }
}
page.onLoad({ id: blueprint.id })
assert.equal(page.data.blueprint.id, blueprint.id)
assert.equal(page.data.family.id, family.id)
assert.equal(page.data.report.id, report.id)
page.viewReport()
assert(navigationCalls.some((call) => call.method === 'navigateTo' && call.url === `/pages/report/index?id=${report.id}`))

const missing = {
  ...definition,
  data: JSON.parse(JSON.stringify(definition.data)),
  setData(changes) { Object.assign(this.data, changes) }
}
missing.onLoad({ id: 'gbp_missing' })
assert(missing.data.errorMessage.includes('不存在'))

const otherUser = repository.insert('users', {
  wechat_id: 'blueprint-page-other-user', name: 'Other Parent', phone: '', role: 'family_user', created_at: '2026-09-03T00:04:00.000Z'
})
const otherFamily = repository.upsertFamily(otherUser.id, {
  family_name: 'Other Family', parent_name: 'Other Parent', phone: '', location: 'Demo', goal: 'Other goal'
})
const otherStudent = repository.upsertStudent(otherFamily.id, { name: 'Other Student' })
const otherAssessment = repository.insert('assessments', {
  student_id: otherStudent.id, type: 'education', answers: {}, status: 'completed', created_at: '2026-09-03T00:05:00.000Z'
})
const otherReport = repository.insert('reports', {
  assessment_id: otherAssessment.id,
  summary: { currentStage: '探索期', strength: '好奇心', potentialChallenge: '目标不清晰', narrative: 'Other synthetic insight' },
  recommendation: { suggestedDirection: '观察', nextAction: '尝试', engine: 'phoenix_rule_engine_v0.1' },
  created_at: '2026-09-03T00:06:00.000Z'
})
const foreignBlueprint = repository.upsertGrowthBlueprint(buildGrowthBlueprint({
  family: otherFamily, student: otherStudent, assessment: otherAssessment, report: otherReport, id: 'gbp_foreign_001', now: '2026-09-03T00:07:00.000Z'
}))
navigationCalls.length = 0
const unauthorized = {
  ...definition,
  data: JSON.parse(JSON.stringify(definition.data)),
  setData(changes) { Object.assign(this.data, changes) }
}
unauthorized.onLoad({ id: foreignBlueprint.id })
assert(navigationCalls.some((call) => call.method === 'reLaunch' && call.url === '/pages/home/index'))
assert.equal(unauthorized.data.blueprint, null)

console.log('✓ Growth Blueprint page: valid report-linked blueprint loads with family context')
console.log('✓ Growth Blueprint page: missing records render a recoverable error state')
console.log('✓ Growth Blueprint page: cross-family access is redirected to the safe home route')
