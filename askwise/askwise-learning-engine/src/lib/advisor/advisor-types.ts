export const ADVISOR_CASE_STATUSES = [
  "NEEDS_INFORMATION",
  "READY_FOR_PRELIMINARY_DIAGNOSIS",
  "CONFLICT_DETECTED",
  "HUMAN_REVIEW_REQUIRED",
  "READY_FOR_ADVISOR_CONFIRMATION",
] as const;

export type AdvisorCaseStatus = (typeof ADVISOR_CASE_STATUSES)[number];

export const ADVISOR_CASE_DOMAINS = [
  "general",
  "identity_pathway",
  "education_pathway",
  "school_selection",
  "long_term_planning",
  "family_complexity",
  "learning_support",
] as const;

export type AdvisorCaseDomain = (typeof ADVISOR_CASE_DOMAINS)[number];

export type AdvisorConfirmationStatus = "not_confirmed" | "confirmed" | "rejected";

export interface AdvisorEvidence {
  field: string;
  value: string;
  source: string;
  verified?: boolean;
}

export interface AdvisorCaseInput {
  caseId: string;
  studentStage: string;
  currentEducationBackground: string;
  identityOrRegionContext: string;
  academicEvidence: AdvisorEvidence[];
  familyGoal: string;
  constraints: string;
  knownRisks: string[];
  currentJudgementQuestion: string;
  informationSources: string[];
  advisorConfirmationStatus: AdvisorConfirmationStatus;
  domains?: AdvisorCaseDomain[];
  sourceSystem?: string;
  sourceVersion?: string;
}

export interface RuleCard {
  ruleId: string;
  domain: string;
  trigger: string;
  requiredEvidence: string[];
  decisionLogic: string;
  boundary: string;
  outputTemplate: string;
  source: string;
  version: string;
  reviewer: string;
  status: "ACTIVE" | "DRAFT";
}

export interface RuleTrace {
  ruleId: string;
  version: string;
  source: string;
  purpose: string;
}

export interface AdvisorAssessment {
  caseId: string;
  inputFingerprint: string;
  status: AdvisorCaseStatus;
  confirmedFacts: string[];
  missingInformation: string[];
  conflicts: string[];
  preliminaryJudgement: string | null;
  judgementBasis: string[];
  uncertainty: string[];
  nextQuestions: string[];
  possiblePaths: string[];
  riskAlerts: string[];
  requiresHumanConfirmation: boolean;
  ruleTrace: RuleTrace[];
  sourceSystem: string;
  sourceVersion: string;
}

export interface StoredAdvisorAssessment {
  id: number;
  caseId: string;
  inputFingerprint: string;
  status: AdvisorCaseStatus;
  sanitizedCase: AdvisorCaseInput;
  assessment: AdvisorAssessment;
  createdAt: string;
  updatedAt: string;
}
