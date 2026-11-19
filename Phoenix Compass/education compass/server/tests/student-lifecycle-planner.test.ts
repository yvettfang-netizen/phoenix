import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ExistingLifecycleOccurrence,
  LifecyclePlannerInput,
  LifecycleRule,
  STUDENT_LIFECYCLE_RUNTIME_STATUS,
  lifecycleNaturalKey,
  planStudentLifecycle
} from '../src/domain/student-lifecycle/planner'

const id = (value: number) => `01920000-0000-7000-8000-${value.toString(16).padStart(12, '0')}`
const rule: LifecycleRule = {
  key: 'MASTERS_INTENT', version: 1,
  anchor: { kind: 'EXPECTED_GRADUATION' }, offsetMonths: -13, offsetDays: 0
}

function fixture(): LifecyclePlannerInput {
  return {
    enrollment: {
      studyEnrollmentId: id(1), studentPersonId: id(2), familyId: id(3), crmClientId: id(4), journeyCycleId: id(5),
      revision: 1, actualEntryDate: '2027-09-01', expectedGraduationDate: '2031-06-30',
      countryCode: 'HK', academicCalendarKey: 'HK_SEMESTER', academicCalendarRevision: '2030.1',
      academicMilestones: { PRE_FINAL_SUMMER: '2030-06-10' }
    },
    rules: [{ ...rule }],
    contactPermission: {
      studentPersonId: id(2), familyId: id(3), purpose: 'EDUCATION_FOLLOW_UP',
      status: 'GRANTED', authorityRef: 'synthetic-consent:1',
      validFrom: '2027-01-01T00:00:00Z', validUntil: '2033-01-01T00:00:00Z',
      optedOut: false, permittedChannels: ['EMAIL']
    },
    existingOccurrences: [], evaluatedAt: '2030-05-01T00:00:00Z', planningTimeZone: 'Asia/Shanghai'
  }
}

function prior(input: LifecyclePlannerInput, overrides: Partial<ExistingLifecycleOccurrence> = {}): ExistingLifecycleOccurrence {
  return {
    occurrenceId: id(6), naturalKey: lifecycleNaturalKey(input.enrollment.studyEnrollmentId, input.enrollment.journeyCycleId, rule.key),
    revision: 4, status: 'PENDING', dueLocalDate: '2030-05-30',
    workItemKind: 'CRM_FOLLOW_UP', targetId: id(4),
    basis: { studyEnrollmentRevision: 1, ruleVersion: 1, academicCalendarRevision: '2030.1' },
    ...overrides
  }
}

test('four-year student creates only a headquarters CRM proposal before any new service contract', () => {
  const input = fixture()
  const before = JSON.stringify(input)
  const plan = planStudentLifecycle(input)
  assert.equal(plan.runtimeStatus, STUDENT_LIFECYCLE_RUNTIME_STATUS)
  assert.equal(plan.runtimeStatus, 'PLAN_ONLY_NOT_CONNECTED')
  assert.equal(plan.decisions[0].action, 'CREATE_PROPOSAL')
  assert.equal(plan.decisions[0].dueLocalDate, '2030-05-30')
  assert.equal(plan.decisions[0].dueState, 'FUTURE')
  assert.deepEqual(plan.decisions[0].routing, { queue: 'HQ_REVIEW', workItemKind: 'CRM_FOLLOW_UP', targetId: id(4) })
  assert.equal(plan.decisions[0].dispatchRequiresFreshAuthorization, true)
  assert.equal(JSON.stringify(input), before)
})

test('three-year, five-year and southern-calendar study use verified graduation dates, not a four-year constant', () => {
  const shorter = fixture()
  shorter.enrollment.expectedGraduationDate = '2030-06-30'
  assert.equal(planStudentLifecycle(shorter).decisions[0].dueLocalDate, '2029-05-30')
  const longer = fixture()
  longer.enrollment.expectedGraduationDate = '2032-06-30'
  assert.equal(planStudentLifecycle(longer).decisions[0].dueLocalDate, '2031-05-30')
  const southern = fixture()
  southern.enrollment.actualEntryDate = '2027-02-15'
  southern.enrollment.expectedGraduationDate = '2030-11-30'
  southern.enrollment.countryCode = 'AU'
  southern.enrollment.academicCalendarKey = 'AU_SEMESTER'
  assert.equal(planStudentLifecycle(southern).decisions[0].dueLocalDate, '2029-10-30')
})

test('actual-entry and explicit academic-milestone rules do not infer summer from a fixed hemisphere', () => {
  const input = fixture()
  input.rules = [
    { ...rule, key: 'ENTRY_CHECK', anchor: { kind: 'ACTUAL_ENTRY' }, offsetMonths: 1 },
    { ...rule, key: 'SUMMER_PREP', anchor: { kind: 'ACADEMIC_MILESTONE', milestoneKey: 'PRE_FINAL_SUMMER' }, offsetMonths: 0, offsetDays: -30 }
  ]
  assert.deepEqual(planStudentLifecycle(input).decisions.map(decision => decision.dueLocalDate), ['2027-10-01', '2030-05-11'])
})

test('month-end and leap-year arithmetic clamps calendar months before applying days', () => {
  const input = fixture()
  input.enrollment.actualEntryDate = '2027-01-01'
  input.enrollment.expectedGraduationDate = '2028-03-31'
  input.rules = [{ ...rule, offsetMonths: -1 }]
  assert.equal(planStudentLifecycle(input).decisions[0].dueLocalDate, '2028-02-29')
  input.enrollment.expectedGraduationDate = '2029-03-31'
  assert.equal(planStudentLifecycle(input).decisions[0].dueLocalDate, '2029-02-28')
  input.rules = [{ ...rule, offsetMonths: -1, offsetDays: 1 }]
  assert.equal(planStudentLifecycle(input).decisions[0].dueLocalDate, '2029-03-01')
})

test('graduation delay and rule revision reschedule the same pending journey occurrence', () => {
  const input = fixture()
  input.existingOccurrences = [prior(input)]
  const key = planStudentLifecycle(input).decisions[0].naturalKey
  input.enrollment.expectedGraduationDate = '2032-06-30'
  input.enrollment.revision = 2
  input.rules = [{ ...rule, version: 2 }]
  const decision = planStudentLifecycle(input).decisions[0]
  assert.equal(decision.action, 'RESCHEDULE_PROPOSAL')
  assert.equal(decision.dueLocalDate, '2031-05-30')
  assert.equal(decision.naturalKey, key)
  assert.equal(decision.existingOccurrenceId, id(6))
  assert.equal(decision.expectedOccurrenceRevision, 4)
  assert.equal(decision.basisRefreshRequired, true)
})

test('unchanged date keeps the task while exposing a changed source basis for audited metadata refresh', () => {
  const input = fixture()
  input.existingOccurrences = [prior(input)]
  input.enrollment.revision = 2
  input.enrollment.academicCalendarRevision = '2030.2'
  const decision = planStudentLifecycle(input).decisions[0]
  assert.equal(decision.action, 'KEEP')
  assert.equal(decision.reason, 'DUE_DATE_UNCHANGED')
  assert.equal(decision.basisRefreshRequired, true)
  assert.deepEqual(decision.basis, { studyEnrollmentRevision: 2, ruleVersion: 1, academicCalendarRevision: '2030.2' })
})

test('delayed source or rule snapshots cannot move pending work back to a superseded plan', () => {
  for (const changedDate of [false, true]) {
    const input = fixture()
    input.enrollment.revision = 4
    input.existingOccurrences = [prior(input, {
      basis: { studyEnrollmentRevision: 5, ruleVersion: 1, academicCalendarRevision: '2030.1' }
    })]
    if (changedDate) input.enrollment.expectedGraduationDate = '2032-06-30'
    const decision = planStudentLifecycle(input).decisions[0]
    assert.equal(decision.action, 'REVIEW')
    assert.equal(decision.reason, 'STALE_PLAN_BASIS')
    assert.equal(decision.basisRefreshRequired, false)
    assert.equal(decision.existingOccurrenceId, id(6))
    assert.equal(decision.routing, null)
  }
  const input = fixture()
  input.existingOccurrences = [prior(input, {
    basis: { studyEnrollmentRevision: 1, ruleVersion: 2, academicCalendarRevision: '2030.1' }
  })]
  assert.equal(planStudentLifecycle(input).decisions[0].reason, 'STALE_PLAN_BASIS')
})

test('completed and cancelled history never reopens after changed graduation; only an explicit new journey creates a new key', () => {
  for (const status of ['COMPLETED', 'CANCELLED'] as const) {
    const input = fixture()
    input.existingOccurrences = [prior(input, { status })]
    input.enrollment.expectedGraduationDate = '2032-06-30'
    input.enrollment.revision = 2
    const decision = planStudentLifecycle(input).decisions[0]
    assert.equal(decision.action, 'KEEP')
    assert.equal(decision.reason, 'TERMINAL_OCCURRENCE_PRESERVED')
    assert.equal(decision.dueLocalDate, '2030-05-30')
    assert.equal(decision.basisRefreshRequired, false)
    input.enrollment.journeyCycleId = id(8)
    const next = planStudentLifecycle(input).decisions[0]
    assert.equal(next.action, 'CREATE_PROPOSAL')
    assert.notEqual(next.naturalKey, decision.naturalKey)
  }
})

test('two workers produce identical plans; stable keys ignore mutable dates and do not prove database exactly-once execution', () => {
  const input = fixture()
  assert.deepEqual(planStudentLifecycle(input), planStudentLifecycle(structuredClone(input)))
  assert.equal(lifecycleNaturalKey(id(1).toUpperCase(), id(5).toUpperCase(), rule.key), lifecycleNaturalKey(id(1), id(5), rule.key))
  assert.throws(() => lifecycleNaturalKey('legacy_student_7', id(5), rule.key), /INVALID_LIFECYCLE/)
  input.existingOccurrences = [prior(input), prior(input, { occurrenceId: id(9) })]
  assert.equal(planStudentLifecycle(input).decisions[0].reason, 'DUPLICATE_EXISTING_OCCURRENCE')
  assert.equal(planStudentLifecycle(input).decisions[0].action, 'REVIEW')
})

test('contact opt-out, withdrawal, expiry and missing evidence suppress the pending occurrence without losing its identity', () => {
  const cases = [
    ['optout', 'CONTACT_OPTED_OUT'], ['withdrawn', 'CONTACT_NOT_GRANTED'],
    ['expired', 'CONTACT_EXPIRED'], ['notyet', 'CONTACT_NOT_YET_VALID'],
    ['unknown', 'CONTACT_PERMISSION_MISSING'], ['emptyref', 'CONTACT_PERMISSION_MISSING'],
    ['nochannel', 'CONTACT_CHANNEL_REQUIRED'], ['wrongsubject', 'CONTACT_SCOPE_INVALID']
  ] as const
  for (const [kind, reason] of cases) {
    const input = fixture()
    input.existingOccurrences = [prior(input)]
    const permission = input.contactPermission!
    if (kind === 'optout') permission.optedOut = true
    if (kind === 'withdrawn') permission.status = 'WITHDRAWN'
    if (kind === 'expired') permission.validUntil = input.evaluatedAt
    if (kind === 'notyet') permission.validFrom = '2030-06-01T00:00:00Z'
    if (kind === 'unknown') input.contactPermission = null
    if (kind === 'emptyref') permission.authorityRef = ''
    if (kind === 'nochannel') permission.permittedChannels = []
    if (kind === 'wrongsubject') permission.studentPersonId = id(999)
    const decision = planStudentLifecycle(input).decisions[0]
    assert.equal(decision.action, 'SUPPRESS', kind)
    assert.equal(decision.reason, reason, kind)
    assert.equal(decision.existingOccurrenceId, id(6), kind)
    assert.equal(decision.expectedOccurrenceRevision, 4, kind)
    assert.equal(decision.routing, null, kind)
  }
})

test('country/calendar rule changes suppress the known pending occurrence rather than silently abandoning it', () => {
  const input = fixture()
  input.existingOccurrences = [prior(input)]
  input.rules = [{ ...rule, applicableCountries: ['GB'] }]
  let decision = planStudentLifecycle(input).decisions[0]
  assert.equal(decision.reason, 'RULE_NOT_APPLICABLE')
  assert.equal(decision.action, 'SUPPRESS')
  assert.equal(decision.existingOccurrenceId, id(6))
  input.rules = [{ ...rule, academicCalendarKey: 'AU_SEMESTER' }]
  decision = planStudentLifecycle(input).decisions[0]
  assert.equal(decision.expectedOccurrenceRevision, 4)
  input.existingOccurrences = [prior(input, { status: 'COMPLETED' })]
  assert.equal(planStudentLifecycle(input).decisions[0].reason, 'TERMINAL_OCCURRENCE_PRESERVED')
})

test('invalid dates, impossible chronology, missing anchors and unsupported offsets require review', () => {
  const cases: Array<[string, (input: LifecyclePlannerInput) => void]> = [
    ['INVALID_CALENDAR_DATE', input => { input.enrollment.expectedGraduationDate = '2031-02-29' }],
    ['GRADUATION_BEFORE_ENTRY', input => { input.enrollment.expectedGraduationDate = '2026-01-01' }],
    ['ACTUAL_ENTRY_REQUIRED', input => { input.enrollment.actualEntryDate = null }],
    ['ANCHOR_DATE_REQUIRED', input => { input.enrollment.expectedGraduationDate = null }],
    ['FOLLOW_UP_BEFORE_ENTRY', input => { input.rules = [{ ...rule, offsetMonths: -60 }] }],
    ['OFFSET_OUT_OF_RANGE', input => { input.rules = [{ ...rule, offsetMonths: -1201 }] }],
    ['INVALID_RULE', input => { input.rules = [{ ...rule, offsetDays: 1.5 }] }],
    ['INVALID_CLOCK_OR_TIME_ZONE', input => { input.evaluatedAt = '2030-05-01T24:00:00Z' }],
    ['INVALID_CLOCK_OR_TIME_ZONE', input => { input.evaluatedAt = '2030-04-31T00:00:00Z' }],
    ['INVALID_CLOCK_OR_TIME_ZONE', input => { input.planningTimeZone = 'Not/A_Time_Zone' }],
    ['INVALID_CANONICAL_IDENTITY', input => { input.enrollment.studentPersonId = 'another_system_student' }]
  ]
  for (const [reason, change] of cases) {
    const input = fixture()
    change(input)
    const decision = planStudentLifecycle(input).decisions[0]
    assert.equal(decision.action, 'REVIEW', reason)
    assert.equal(decision.reason, reason)
    assert.equal(decision.routing, null)
  }
})

test('today is evaluated in the specified academic planning timezone', () => {
  const input = fixture()
  input.evaluatedAt = '2030-05-29T17:00:00Z'
  assert.equal(planStudentLifecycle(input).decisions[0].dueState, 'DUE_OR_OVERDUE')
  input.planningTimeZone = 'America/Los_Angeles'
  assert.equal(planStudentLifecycle(input).decisions[0].dueState, 'FUTURE')
})

test('successor service task requires a matching already active and opened project', () => {
  const input = fixture()
  input.successorProject = {
    serviceProjectId: id(7), studentPersonId: id(2), familyId: id(3), status: 'ACTIVE',
    verifiedContractRef: 'synthetic-contract:1', verifiedOpeningRef: 'synthetic-opening:1'
  }
  let decision = planStudentLifecycle(input).decisions[0]
  assert.equal(decision.action, 'CREATE_PROPOSAL')
  assert.deepEqual(decision.routing, { queue: 'HQ_REVIEW', workItemKind: 'SERVICE_TASK', targetId: id(7) })
  input.successorProject.familyId = id(999)
  assert.equal(planStudentLifecycle(input).decisions[0].reason, 'SUCCESSOR_PROJECT_SCOPE_INVALID')
  input.successorProject.familyId = id(3)
  input.successorProject.status = 'COMPLETED'
  decision = planStudentLifecycle(input).decisions[0]
  assert.equal(decision.action, 'REVIEW')
  assert.equal(decision.reason, 'SUCCESSOR_PROJECT_NOT_ACTIVE')
  input.successorProject.status = 'ACTIVE'
  input.successorProject.verifiedOpeningRef = ''
  assert.equal(planStudentLifecycle(input).decisions[0].reason, 'SUCCESSOR_PROJECT_SCOPE_INVALID')
})

test('existing CRM work plus new service project needs explicit reconciliation even when due date is unchanged', () => {
  const input = fixture()
  input.existingOccurrences = [prior(input)]
  input.successorProject = {
    serviceProjectId: id(7), studentPersonId: id(2), familyId: id(3), status: 'ACTIVE',
    verifiedContractRef: 'synthetic-contract:1', verifiedOpeningRef: 'synthetic-opening:1'
  }
  const decision = planStudentLifecycle(input).decisions[0]
  assert.equal(decision.action, 'REVIEW')
  assert.equal(decision.reason, 'WORK_ITEM_ROUTING_CHANGED')
  assert.equal(decision.existingOccurrenceId, id(6))
  assert.equal(decision.expectedOccurrenceRevision, 4)
  assert.equal(decision.dueLocalDate, '2030-05-30')
})

test('duplicate rule keys and missing canonical client links cannot create extra work or identities', () => {
  const input = fixture()
  input.rules = [{ ...rule }, { ...rule, version: 2 }]
  assert.ok(planStudentLifecycle(input).decisions.every(decision => decision.action === 'REVIEW' && decision.reason === 'DUPLICATE_RULE_KEY'))
  input.rules = [{ ...rule }]
  input.enrollment.crmClientId = null
  assert.equal(planStudentLifecycle(input).decisions[0].reason, 'CRM_CLIENT_LINK_REQUIRED')
})
