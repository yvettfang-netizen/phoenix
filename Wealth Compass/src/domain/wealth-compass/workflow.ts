import type { WorkflowState } from "./types";

const transitions: Record<WorkflowState, WorkflowState | null> = {
  DRAFT: "ASSESSMENT_COMPLETED",
  ASSESSMENT_COMPLETED: "CONSENT_RECORDED",
  CONSENT_RECORDED: "SCORED",
  SCORED: "REPORT_GENERATED",
  REPORT_GENERATED: "CRM_READY",
  CRM_READY: "REFERRAL_READY",
  REFERRAL_READY: null,
};

export function canTransition(from: WorkflowState, to: WorkflowState): boolean {
  return transitions[from] === to;
}
