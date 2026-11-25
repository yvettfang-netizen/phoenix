export type Answer = string | string[] | null
export type Answers = Record<string, Answer>
export type RespondentRole = 'PARENT_GUARDIAN' | 'STUDENT' | 'UNDECLARED'
export type FreeQuestion = Readonly<{
  question_id: string
  question_slot: string
  field_key: string
  prompt: string
  answer_type: 'SINGLE_CHOICE' | 'MULTI_CHOICE'
  allowed_values: readonly { value: string; label: string }[]
  required: boolean
  max_selections: number
  exclusive_options: readonly string[]
  branch_condition: string | null
  skip_policy: 'REQUIRED' | 'OPTIONAL'
  analysis_rule_ids: readonly string[]
}>
export const REGISTRY: readonly FreeQuestion[]
export const REGISTRY_ID: string
export const SPEC_SHA: string
export const VERSIONS: Readonly<{ question_version: string; branch_version: string; rule_version: string }>
export const BRANCHES: Readonly<Record<string, string>>
export const AUTHORIZATION_PURPOSES: readonly string[]
export type Card = { id: string; title: string; label: string }
export type Finding = {
  finding_id: string; title: string; summary: string; evidence_level: string; rule_id: string; rule_version: string
  evidence_refs: { response_id: string; question_id: string; respondent_role: RespondentRole }[]
  missing_information: string[]; recommended_next_actions: string[]
  official_verification_status: 'VERIFIED' | 'EXPIRED' | 'UNVERIFIED' | 'CONFLICTED' | null
}
export type Snapshot = {
  cards: (Card & { findings: Finding[]; missing_information: string[] })[]
  versions: typeof VERSIONS; branch: string; respondent_role: RespondentRole
  authorizations: Record<string, string>; question_status: Record<string, string>; profile: Record<string, unknown>
}
export const CARDS: readonly Card[]
export class AssessmentInputError extends Error {}
export function isValidAnswer(question: FreeQuestion, value: unknown): value is Answer
export function assessmentPath(answers: Answers): { branch: string | null; questions: FreeQuestion[]; reuse: Record<string,string> }
export function reviseAnswer(answers: Answers, id: string, value: Answer): Answers
export function evaluateFreeAssessment(input: unknown): Snapshot
export function anonymousActionAllowed(action: string): boolean
