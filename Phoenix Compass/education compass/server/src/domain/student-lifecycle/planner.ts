/**
 * Development candidate: a pure planning contract, never a scheduler or access grant.
 * The caller must supply authorized Canonical snapshots. No route or worker imports
 * this module. An executor must recheck live consent, organization/resource scope,
 * row revisions and a database uniqueness constraint before writing or contacting.
 */
export const STUDENT_LIFECYCLE_RUNTIME_STATUS = 'PLAN_ONLY_NOT_CONNECTED' as const

type CalendarDate = string
type CanonicalId = string

export interface StudyEnrollmentSnapshot {
  studyEnrollmentId: CanonicalId
  studentPersonId: CanonicalId
  familyId: CanonicalId
  crmClientId: CanonicalId | null
  /** Immutable journey identity; never derive it from a changing graduation year. */
  journeyCycleId: CanonicalId
  revision: number
  actualEntryDate: CalendarDate | null
  expectedGraduationDate: CalendarDate | null
  countryCode: string
  academicCalendarKey: string
  academicCalendarRevision: string
  academicMilestones: Readonly<Record<string, CalendarDate | undefined>>
}

export interface LifecycleRule {
  key: string
  version: number
  anchor:
    | { kind: 'ACTUAL_ENTRY' }
    | { kind: 'EXPECTED_GRADUATION' }
    | { kind: 'ACADEMIC_MILESTONE'; milestoneKey: string }
  offsetMonths: number
  offsetDays: number
  applicableCountries?: readonly string[]
  academicCalendarKey?: string
}

/** A server-supplied snapshot, not proof that dispatch will remain authorized. */
export interface ContactPermissionSnapshot {
  studentPersonId: CanonicalId
  familyId: CanonicalId
  purpose: 'EDUCATION_FOLLOW_UP'
  status: 'GRANTED' | 'WITHDRAWN' | 'DECLINED' | 'UNKNOWN'
  authorityRef: string | null
  validFrom: string | null
  validUntil: string | null
  optedOut: boolean
  permittedChannels: readonly string[]
}

export interface ExistingLifecycleOccurrence {
  occurrenceId: CanonicalId
  naturalKey: string
  revision: number
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
  dueLocalDate: CalendarDate
  workItemKind: 'CRM_FOLLOW_UP' | 'SERVICE_TASK'
  targetId: CanonicalId
  basis: LifecyclePlanBasis
}

export interface ExistingSuccessorProject {
  serviceProjectId: CanonicalId
  studentPersonId: CanonicalId
  familyId: CanonicalId
  status: 'DRAFT' | 'PLANNED' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
  /** Reference to an already verified contract, not an AI prediction of a sale. */
  verifiedContractRef: string
  verifiedOpeningRef: string
}

export interface LifecyclePlannerInput {
  enrollment: StudyEnrollmentSnapshot
  rules: readonly LifecycleRule[]
  contactPermission: ContactPermissionSnapshot | null
  existingOccurrences: readonly ExistingLifecycleOccurrence[]
  successorProject?: ExistingSuccessorProject | null
  /** Explicit clock and timezone make replay deterministic. */
  evaluatedAt: string
  planningTimeZone: string
}

export type LifecyclePlanAction =
  | 'CREATE_PROPOSAL'
  | 'RESCHEDULE_PROPOSAL'
  | 'KEEP'
  | 'SUPPRESS'
  | 'REVIEW'

export type LifecyclePlanReason =
  | 'NEW_OCCURRENCE'
  | 'EXPECTED_DATE_CHANGED'
  | 'DUE_DATE_UNCHANGED'
  | 'TERMINAL_OCCURRENCE_PRESERVED'
  | 'INVALID_CANONICAL_IDENTITY'
  | 'INVALID_SOURCE_REVISION'
  | 'INVALID_RULE'
  | 'DUPLICATE_RULE_KEY'
  | 'INVALID_CLOCK_OR_TIME_ZONE'
  | 'INVALID_ACADEMIC_CONTEXT'
  | 'RULE_NOT_APPLICABLE'
  | 'ACTUAL_ENTRY_REQUIRED'
  | 'ANCHOR_DATE_REQUIRED'
  | 'INVALID_CALENDAR_DATE'
  | 'GRADUATION_BEFORE_ENTRY'
  | 'FOLLOW_UP_BEFORE_ENTRY'
  | 'OFFSET_OUT_OF_RANGE'
  | 'DUPLICATE_EXISTING_OCCURRENCE'
  | 'INVALID_EXISTING_OCCURRENCE'
  | 'STALE_PLAN_BASIS'
  | 'CONTACT_PERMISSION_MISSING'
  | 'CONTACT_OPTED_OUT'
  | 'CONTACT_NOT_GRANTED'
  | 'CONTACT_PERMISSION_INVALID'
  | 'CONTACT_SCOPE_INVALID'
  | 'CONTACT_NOT_YET_VALID'
  | 'CONTACT_EXPIRED'
  | 'CONTACT_CHANNEL_REQUIRED'
  | 'CRM_CLIENT_LINK_REQUIRED'
  | 'SUCCESSOR_PROJECT_SCOPE_INVALID'
  | 'SUCCESSOR_PROJECT_NOT_ACTIVE'
  | 'WORK_ITEM_ROUTING_CHANGED'

export interface LifecyclePlanBasis {
  studyEnrollmentRevision: number
  ruleVersion: number
  academicCalendarRevision: string
}

export interface LifecyclePlanDecision {
  ruleKey: string
  naturalKey: string | null
  action: LifecyclePlanAction
  reason: LifecyclePlanReason
  dueLocalDate: CalendarDate | null
  dueState: 'FUTURE' | 'DUE_OR_OVERDUE' | null
  existingOccurrenceId: CanonicalId | null
  expectedOccurrenceRevision: number | null
  /** Every proposal goes to headquarters. No original-channel access is inferred. */
  routing: {
    queue: 'HQ_REVIEW'
    workItemKind: 'CRM_FOLLOW_UP' | 'SERVICE_TASK'
    targetId: CanonicalId
  } | null
  basis: LifecyclePlanBasis
  /** Persist a new planning basis under revision check even when its due date is unchanged. */
  basisRefreshRequired: boolean
  dispatchRequiresFreshAuthorization: true
}

export interface LifecyclePlan {
  schemaVersion: 'student-lifecycle-plan.v1'
  runtimeStatus: typeof STUDENT_LIFECYCLE_RUNTIME_STATUS
  evaluatedAt: string
  planningTimeZone: string
  decisions: LifecyclePlanDecision[]
}

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const RULE_KEY = /^[A-Z][A-Z0-9_]{1,79}$/
const positiveInteger = (value: number): boolean => Number.isSafeInteger(value) && value > 0
const nonBlank = (value: string | null | undefined): boolean => typeof value === 'string' && value.trim().length > 0

function timestamp(value: string | null): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null
  if (!calendarDate(value.slice(0, 10))) return null
  if (Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59 || Number(value.slice(17, 19)) > 59) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function calendarDate(value: CalendarDate | null | undefined): value is CalendarDate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

/** Month arithmetic clamps to month-end, then applies days in the civil calendar. */
function offsetDate(anchor: CalendarDate, months: number, days: number): CalendarDate | null {
  const [year, month, day] = anchor.split('-').map(Number)
  const monthNumber = year * 12 + month - 1 + months
  const targetYear = Math.floor(monthNumber / 12)
  const targetMonth = ((monthNumber % 12) + 12) % 12 + 1
  if (targetYear < 1 || targetYear > 9999) return null
  const targetDay = Math.min(day, daysInMonth(targetYear, targetMonth))
  const date = `${String(targetYear).padStart(4, '0')}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
  const shifted = new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
  if (!Number.isFinite(shifted.getTime())) return null
  const result = shifted.toISOString().slice(0, 10)
  return calendarDate(result) ? result : null
}

function localDate(now: number, timeZone: string): CalendarDate | null {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit', calendar: 'gregory', numberingSystem: 'latn'
    }).formatToParts(now)
    const part = (kind: string) => parts.find(value => value.type === kind)?.value
    const result = `${part('year')?.padStart(4, '0')}-${part('month')}-${part('day')}`
    return calendarDate(result) ? result : null
  } catch {
    return null
  }
}

export function lifecycleNaturalKey(studyEnrollmentId: CanonicalId, journeyCycleId: CanonicalId, ruleKey: string): string {
  if (!UUID_V7.test(studyEnrollmentId) || !UUID_V7.test(journeyCycleId) || !RULE_KEY.test(ruleKey)) {
    throw new Error('INVALID_LIFECYCLE_NATURAL_KEY_INPUT')
  }
  return `lifecycle.v1:${studyEnrollmentId.toLowerCase()}:${journeyCycleId.toLowerCase()}:${ruleKey}`
}

function contactDenial(permission: ContactPermissionSnapshot | null, now: number, source: StudyEnrollmentSnapshot): LifecyclePlanReason | null {
  if (!permission) return 'CONTACT_PERMISSION_MISSING'
  if (permission.optedOut) return 'CONTACT_OPTED_OUT'
  if (permission.studentPersonId !== source.studentPersonId || permission.familyId !== source.familyId || permission.purpose !== 'EDUCATION_FOLLOW_UP') return 'CONTACT_SCOPE_INVALID'
  if (permission.status !== 'GRANTED') return 'CONTACT_NOT_GRANTED'
  if (!nonBlank(permission.authorityRef)) return 'CONTACT_PERMISSION_MISSING'
  const start = timestamp(permission.validFrom)
  const end = timestamp(permission.validUntil)
  if (start === null || end === null || end <= start) return 'CONTACT_PERMISSION_INVALID'
  if (now < start) return 'CONTACT_NOT_YET_VALID'
  if (now >= end) return 'CONTACT_EXPIRED'
  if (!permission.permittedChannels.length || permission.permittedChannels.some(channel => !nonBlank(channel))) return 'CONTACT_CHANNEL_REQUIRED'
  return null
}

export function planStudentLifecycle(input: LifecyclePlannerInput): LifecyclePlan {
  const source = input.enrollment
  const now = timestamp(input.evaluatedAt)
  const today = now === null ? null : localDate(now, input.planningTimeZone)
  const identityValid = [source.studyEnrollmentId, source.studentPersonId, source.familyId, source.journeyCycleId].every(id => UUID_V7.test(id))
  const decisions = input.rules.map((rule): LifecyclePlanDecision => {
    const validKey = RULE_KEY.test(rule.key)
    const key = identityValid && validKey ? lifecycleNaturalKey(source.studyEnrollmentId, source.journeyCycleId, rule.key) : null
    const decision: LifecyclePlanDecision = {
      ruleKey: rule.key, naturalKey: key, action: 'REVIEW', reason: 'INVALID_RULE',
      dueLocalDate: null, dueState: null, existingOccurrenceId: null, expectedOccurrenceRevision: null,
      routing: null,
      basis: { studyEnrollmentRevision: source.revision, ruleVersion: rule.version, academicCalendarRevision: source.academicCalendarRevision },
      basisRefreshRequired: false,
      dispatchRequiresFreshAuthorization: true
    }
    const end = (action: LifecyclePlanAction, reason: LifecyclePlanReason): LifecyclePlanDecision => ({ ...decision, action, reason })
    if (!identityValid) return end('REVIEW', 'INVALID_CANONICAL_IDENTITY')
    if (!positiveInteger(source.revision)) return end('REVIEW', 'INVALID_SOURCE_REVISION')
    if (!validKey || !positiveInteger(rule.version) || !Number.isSafeInteger(rule.offsetMonths) || !Number.isSafeInteger(rule.offsetDays)) return end('REVIEW', 'INVALID_RULE')
    if (input.rules.filter(candidate => candidate.key === rule.key).length !== 1) return end('REVIEW', 'DUPLICATE_RULE_KEY')
    if (Math.abs(rule.offsetMonths) > 1200 || Math.abs(rule.offsetDays) > 3660) return end('REVIEW', 'OFFSET_OUT_OF_RANGE')
    if (now === null || today === null) return end('REVIEW', 'INVALID_CLOCK_OR_TIME_ZONE')
    if (!/^[A-Z]{2}$/.test(source.countryCode) || !nonBlank(source.academicCalendarKey) || !nonBlank(source.academicCalendarRevision)) return end('REVIEW', 'INVALID_ACADEMIC_CONTEXT')
    const existing = input.existingOccurrences.filter(occurrence => occurrence.naturalKey === key)
    if (existing.length > 1) return end('REVIEW', 'DUPLICATE_EXISTING_OCCURRENCE')
    const previous = existing[0]
    if (previous) {
      if (!UUID_V7.test(previous.occurrenceId) || !positiveInteger(previous.revision) ||
        !calendarDate(previous.dueLocalDate) || !['PENDING', 'COMPLETED', 'CANCELLED'].includes(previous.status) ||
        !UUID_V7.test(previous.targetId) || !['CRM_FOLLOW_UP', 'SERVICE_TASK'].includes(previous.workItemKind) ||
        !positiveInteger(previous.basis.studyEnrollmentRevision) || !positiveInteger(previous.basis.ruleVersion) ||
        !nonBlank(previous.basis.academicCalendarRevision)) return end('REVIEW', 'INVALID_EXISTING_OCCURRENCE')
      decision.existingOccurrenceId = previous.occurrenceId
      decision.expectedOccurrenceRevision = previous.revision
      if (previous.status !== 'PENDING') {
        decision.dueLocalDate = previous.dueLocalDate
        return end('KEEP', 'TERMINAL_OCCURRENCE_PRESERVED')
      }
      if (source.revision < previous.basis.studyEnrollmentRevision || rule.version < previous.basis.ruleVersion) return end('REVIEW', 'STALE_PLAN_BASIS')
      decision.basisRefreshRequired = previous.basis.studyEnrollmentRevision !== source.revision ||
        previous.basis.ruleVersion !== rule.version || previous.basis.academicCalendarRevision !== source.academicCalendarRevision
    }
    if ((rule.applicableCountries && !rule.applicableCountries.includes(source.countryCode)) ||
      (rule.academicCalendarKey && rule.academicCalendarKey !== source.academicCalendarKey)) return end('SUPPRESS', 'RULE_NOT_APPLICABLE')
    const denied = contactDenial(input.contactPermission, now, source)
    if (denied) return end('SUPPRESS', denied)
    if (source.actualEntryDate === null) return end('REVIEW', 'ACTUAL_ENTRY_REQUIRED')
    if (!calendarDate(source.actualEntryDate) || (source.expectedGraduationDate !== null && !calendarDate(source.expectedGraduationDate))) return end('REVIEW', 'INVALID_CALENDAR_DATE')
    if (source.expectedGraduationDate !== null && source.expectedGraduationDate < source.actualEntryDate) return end('REVIEW', 'GRADUATION_BEFORE_ENTRY')
    let anchor: CalendarDate | null | undefined
    if (rule.anchor.kind === 'ACTUAL_ENTRY') anchor = source.actualEntryDate
    else if (rule.anchor.kind === 'EXPECTED_GRADUATION') anchor = source.expectedGraduationDate
    else if (rule.anchor.kind === 'ACADEMIC_MILESTONE' && nonBlank(rule.anchor.milestoneKey)) anchor = source.academicMilestones[rule.anchor.milestoneKey]
    else return end('REVIEW', 'INVALID_RULE')
    if (anchor === null || anchor === undefined) return end('REVIEW', 'ANCHOR_DATE_REQUIRED')
    if (!calendarDate(anchor)) return end('REVIEW', 'INVALID_CALENDAR_DATE')
    const due = offsetDate(anchor, rule.offsetMonths, rule.offsetDays)
    if (!due) return end('REVIEW', 'OFFSET_OUT_OF_RANGE')
    if (due < source.actualEntryDate) return end('REVIEW', 'FOLLOW_UP_BEFORE_ENTRY')
    decision.dueLocalDate = due
    decision.dueState = due <= today ? 'DUE_OR_OVERDUE' : 'FUTURE'
    const project = input.successorProject
    if (project) {
      if (!UUID_V7.test(project.serviceProjectId) || project.studentPersonId !== source.studentPersonId ||
        project.familyId !== source.familyId || !nonBlank(project.verifiedContractRef) || !nonBlank(project.verifiedOpeningRef)) return end('REVIEW', 'SUCCESSOR_PROJECT_SCOPE_INVALID')
      if (project.status !== 'ACTIVE') return end('REVIEW', 'SUCCESSOR_PROJECT_NOT_ACTIVE')
      decision.routing = { queue: 'HQ_REVIEW', workItemKind: 'SERVICE_TASK', targetId: project.serviceProjectId }
    } else {
      if (source.crmClientId === null || !UUID_V7.test(source.crmClientId)) return end('REVIEW', 'CRM_CLIENT_LINK_REQUIRED')
      decision.routing = { queue: 'HQ_REVIEW', workItemKind: 'CRM_FOLLOW_UP', targetId: source.crmClientId }
    }
    if (!previous) return end('CREATE_PROPOSAL', 'NEW_OCCURRENCE')
    if (previous.workItemKind !== decision.routing.workItemKind || previous.targetId !== decision.routing.targetId) return end('REVIEW', 'WORK_ITEM_ROUTING_CHANGED')
    if (previous.dueLocalDate === due) return end('KEEP', 'DUE_DATE_UNCHANGED')
    return end('RESCHEDULE_PROPOSAL', 'EXPECTED_DATE_CHANGED')
  })
  return { schemaVersion: 'student-lifecycle-plan.v1', runtimeStatus: STUDENT_LIFECYCLE_RUNTIME_STATUS, evaluatedAt: input.evaluatedAt, planningTimeZone: input.planningTimeZone, decisions }
}
