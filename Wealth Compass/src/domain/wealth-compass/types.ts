export const workflowStates = [
  "DRAFT",
  "ASSESSMENT_COMPLETED",
  "CONSENT_RECORDED",
  "SCORED",
  "REPORT_GENERATED",
  "CRM_READY",
  "REFERRAL_READY",
] as const;

export type WorkflowState = (typeof workflowStates)[number];
export type SourceChannel = "DIRECT" | "ADVISOR" | "PARTNER" | "TEST";
export type RulesStatus = "RULES_NOT_LOADED" | "RULES_LOADED";

export interface RecordMeta {
  id: string;
  ruleVersion: string;
  createdAt: string;
  updatedAt: string;
  sourceChannel: SourceChannel;
  status: WorkflowState;
  idempotencyKey: string;
}

export interface AssessmentAnswer {
  questionId: string;
  optionId: string;
  answeredAt: string;
}

export interface AssessmentSession extends RecordMeta {
  answers: AssessmentAnswer[];
}

export interface ConsentRecord extends RecordMeta {
  sessionId: string;
  privacyNoticeVersion: string;
  accepted: boolean;
  acceptedAt: string | null;
}

export interface ScoreResult extends RecordMeta {
  sessionId: string;
  rulesStatus: RulesStatus;
  dimensions: Record<string, number>;
}

export interface PersonaResult extends RecordMeta {
  sessionId: string;
  rulesStatus: RulesStatus;
  personaId: string | null;
}

export interface ReportRecord extends RecordMeta {
  sessionId: string;
  scoreResultId: string | null;
  templateVersion: string;
  generatedAt: string | null;
}

export interface CRMLead extends RecordMeta {
  sessionId: string;
  consentRecordId: string;
  externalId: string | null;
}

export interface ReferralRecord extends RecordMeta {
  sessionId: string;
  crmLeadId: string;
  externalId: string | null;
}
