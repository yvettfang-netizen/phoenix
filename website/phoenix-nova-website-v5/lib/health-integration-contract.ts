/**
 * Health V3.1 integration boundary, candidate-only.
 *
 * This module is deliberately pure and side-effect free. It does not create
 * identities, grant permissions, persist consultations, publish events,
 * upload documents, charge money, or call a network service. A `CANDIDATE`
 * result is a design-time readiness signal only; `authorized` is always false
 * until a trusted server contract exists.
 */

export type HealthLocale = "zh" | "en";

export type HealthIntegrationOperation =
  | "consultation.request"
  | "contact.authorization"
  | "record.authorization"
  | "partner.source.validation"
  | "family.projection.read"
  | "founder.projection.read"
  | "partner.workbench.read"
  | "medical.document.upload"
  | "finance.write";

export type ReadinessDecision = "CANDIDATE" | "HOLD" | "DENY";

export type ContextDimensions = Readonly<{
  sourceChannel: string | null;
  referralPartnerRef: string | null;
  currentRegion: string | null;
  careDestination: string | null;
  insuranceChannel: string | null;
}>;

export type ClientSignals = Readonly<{
  requested: boolean;
  contactConsentClaimed?: boolean;
  handoffConsentClaimed?: boolean;
  recordConsentClaimed?: boolean;
  context: ContextDimensions;
  /** Locator only. It cannot confer partner status, commission or access. */
  urlPartnerId?: string | null;
  /** Never treat a browser role claim as authority. */
  frontendRole?: string | null;
}>;

export type TrustedSignals = Readonly<{
  actorVerified: boolean;
  canonicalIdentityResolved: boolean;
  canonicalFamilyIdVerified: boolean;
  canonicalClientIdVerified: boolean;
  canonicalPartnerRefVerified: boolean;
  patientScopeVerified: boolean;
  familyScopeApproved: boolean;
  founderRoleApproved: boolean;
  partnerScopeApproved: boolean;
  sourceChannelValidated: boolean;
  destinationValidated: boolean;
  insuranceChannelValidated: boolean;
  contactConsentRecorded: boolean;
  handoffConsentRecorded: boolean;
  recordConsentRecorded: boolean;
  consultationSourcePersisted: boolean;
  endpointEnabled: boolean;
  outboxEnabled: boolean;
}>;

export type HealthIntegrationInput = Readonly<{
  operation: HealthIntegrationOperation;
  client: ClientSignals;
  trusted: TrustedSignals;
}>;

export type ReadinessResult = Readonly<{
  operation: HealthIntegrationOperation;
  decision: ReadinessDecision;
  /** Always false in this frontend candidate. */
  authorized: false;
  /** Always false: this module never persists or emits. */
  canPersist: false;
  /** Always false: sensitive files require a separate approved service. */
  canUpload: false;
  /** Always false: finance execution is outside this website. */
  canPay: false;
  reasons: readonly string[];
}>;

export const HEALTH_RUNTIME_STATUS = Object.freeze({
  consultationEndpoint: "OFF",
  familyProjection: "HOLD",
  founderProjection: "HOLD",
  partnerWorkbench: "HOLD",
  patientScopes: "HOLD",
  eventOutbox: "HOLD",
  financeWrite: "OFF",
  medicalUpload: "OFF",
} as const);

export const CONTEXT_DIMENSION_NAMES = Object.freeze([
  "sourceChannel",
  "referralPartnerRef",
  "currentRegion",
  "careDestination",
  "insuranceChannel",
] as const);

/** Minimum Family OS summary fields; values are source references, not raw files. */
export const FAMILY_PROJECTION_FIELDS = Object.freeze([
  "family_id",
  "patient_person_id",
  "health_service_status",
  "confirmed_appointment_reference",
  "coordination_task_summary",
  "follow_up_status",
  "consent_reference",
] as const);

/** Minimum Founder OS operational fields; no patient documents or raw answers. */
export const FOUNDER_PROJECTION_FIELDS = Object.freeze([
  "lead_id",
  "source_channel",
  "referral_partner_reference",
  "business_domain",
  "consultation_status",
  "service_project_id",
  "contract_code",
  "payment_status",
  "delivery_status",
  "reconciliation_status",
] as const);

/** Partner workbench fields are scoped to the verified partner and assigned client. */
export const PARTNER_PROJECTION_FIELDS = Object.freeze([
  "verified_partner_id",
  "assigned_client_id",
  "consultation_reference",
  "appointment_coordination_status",
  "service_task_summary",
  "service_completion_status",
] as const);

/** Candidate event names only; browsers never publish these events. */
export const CANDIDATE_EVENT_TYPES = Object.freeze([
  "crm.consultation.requested",
  "crm.consultation.authorized_for_handoff",
  "compass.assessment.completed",
  "compass.report.generated",
  "service.project.created",
  "finance.payment.received",
  "finance.refund.paid",
] as const);

const nonBlank = (value: string | null | undefined): boolean => typeof value === "string" && value.trim().length > 0;

export function validateContextDimensions(context: ContextDimensions): Readonly<{
  valid: boolean;
  missing: readonly (keyof ContextDimensions)[];
  distinct: true;
}> {
  const missing = CONTEXT_DIMENSION_NAMES.filter(name => !nonBlank(context[name]));
  return Object.freeze({ valid: missing.length === 0, missing, distinct: true as const });
}

export function summarizeIndependentAuthorizations(trusted: Pick<TrustedSignals, "contactConsentRecorded" | "handoffConsentRecorded" | "recordConsentRecorded">) {
  return Object.freeze({
    contact: trusted.contactConsentRecorded,
    handoff: trusted.handoffConsentRecorded,
    patientRecords: trusted.recordConsentRecorded,
    distinctPurposes: true as const,
    authorizesAnyAction: false as const,
  });
}

function baseResult(operation: HealthIntegrationOperation, decision: ReadinessDecision, reasons: readonly string[]): ReadinessResult {
  return Object.freeze({
    operation,
    decision,
    authorized: false,
    canPersist: false,
    canUpload: false,
    canPay: false,
    reasons: Object.freeze([...reasons]),
  });
}

function rejectClientAuthority(input: HealthIntegrationInput): string[] {
  const reasons: string[] = [];
  if (nonBlank(input.client.frontendRole)) reasons.push("FRONTEND_ROLE_IS_NOT_AUTHORITY");
  if (nonBlank(input.client.urlPartnerId)) reasons.push("URL_PARTNER_ID_IS_NOT_AUTHORITY");
  return reasons;
}

/**
 * Return a candidate readiness/deny result without authorising anything.
 * Trusted flags represent future server evidence; client claims are never
 * promoted into those flags by this function.
 */
export function evaluateHealthIntegrationReadiness(input: HealthIntegrationInput): ReadinessResult {
  const authorityReasons = rejectClientAuthority(input);
  if (authorityReasons.length > 0) return baseResult(input.operation, "DENY", authorityReasons);

  const context = validateContextDimensions(input.client.context);
  const { trusted } = input;
  const common = [
    ...(trusted.actorVerified ? [] : ["TRUSTED_ACTOR_REQUIRED"]),
    ...(trusted.canonicalIdentityResolved ? [] : ["CANONICAL_IDENTITY_UNRESOLVED"]),
  ];

  switch (input.operation) {
    case "consultation.request": {
      if (!input.client.requested) return baseResult(input.operation, "DENY", ["EXPLICIT_USER_REQUEST_REQUIRED"]);
      if (!context.valid) return baseResult(input.operation, "HOLD", [...common, "CONTEXT_DIMENSIONS_MUST_BE_CONFIRMED", ...context.missing.map(name => `MISSING_${name.toUpperCase()}`)]);
      if (!trusted.contactConsentRecorded) return baseResult(input.operation, "HOLD", [...common, "CONTACT_CONSENT_NOT_SERVER_RECORDED"]);
      if (!trusted.consultationSourcePersisted || !trusted.endpointEnabled || !trusted.outboxEnabled) {
        return baseResult(input.operation, "HOLD", [...common, "CONSULTATION_RUNTIME_OFF", "SOURCE_AND_OUTBOX_NOT_AVAILABLE"]);
      }
      return baseResult(input.operation, "CANDIDATE", [...common, "SERVER_CONTRACT_REVIEW_REQUIRED"]);
    }
    case "contact.authorization":
      return baseResult(input.operation, trusted.contactConsentRecorded ? "HOLD" : "DENY", trusted.contactConsentRecorded ? ["CONTACT_GRANT_STORE_NOT_CONNECTED"] : ["CONTACT_CONSENT_NOT_SERVER_RECORDED"]);
    case "record.authorization":
      return baseResult(input.operation, trusted.patientScopeVerified && trusted.recordConsentRecorded ? "HOLD" : "DENY", trusted.patientScopeVerified && trusted.recordConsentRecorded ? ["PATIENT_GRANT_STORE_AND_RLS_NOT_CONNECTED"] : ["PATIENT_SCOPE_AND_EXPLICIT_RECORD_CONSENT_REQUIRED"]);
    case "partner.source.validation":
      if (!context.valid) return baseResult(input.operation, "HOLD", ["CONTEXT_DIMENSIONS_MUST_BE_CONFIRMED", ...context.missing.map(name => `MISSING_${name.toUpperCase()}`)]);
      return baseResult(input.operation, trusted.canonicalPartnerRefVerified && trusted.sourceChannelValidated ? "CANDIDATE" : "HOLD", trusted.canonicalPartnerRefVerified && trusted.sourceChannelValidated ? ["PARTNER_SOURCE_CANDIDATE_ONLY_NO_COMMISSION_AUTHORITY"] : ["PARTNER_SOURCE_SERVER_VALIDATION_REQUIRED"]);
    case "family.projection.read":
      return baseResult(input.operation, trusted.familyScopeApproved && trusted.canonicalFamilyIdVerified && trusted.patientScopeVerified ? "HOLD" : "DENY", trusted.familyScopeApproved && trusted.canonicalFamilyIdVerified && trusted.patientScopeVerified ? ["HEALTH_FAMILY_PROJECTION_NOT_CONNECTED"] : ["VERIFIED_FAMILY_AND_PATIENT_SCOPE_REQUIRED"]);
    case "founder.projection.read":
      return baseResult(input.operation, trusted.founderRoleApproved && trusted.actorVerified ? "HOLD" : "DENY", trusted.founderRoleApproved && trusted.actorVerified ? ["FOUNDER_OPERATIONAL_PROJECTION_NOT_CONNECTED"] : ["TRUSTED_FOUNDER_ROLE_REQUIRED"]);
    case "partner.workbench.read":
      return baseResult(input.operation, trusted.partnerScopeApproved && trusted.canonicalPartnerRefVerified ? "HOLD" : "DENY", trusted.partnerScopeApproved && trusted.canonicalPartnerRefVerified ? ["PARTNER_WORKBENCH_NOT_OPEN"] : ["VERIFIED_PARTNER_SCOPE_REQUIRED"]);
    case "medical.document.upload":
      return baseResult(input.operation, "DENY", ["MEDICAL_UPLOAD_OFF", "PATIENT_CONSENT_RLS_AND_CONTROLLED_STORAGE_REQUIRED"]);
    case "finance.write":
      return baseResult(input.operation, "DENY", ["FINANCE_WRITE_OFF", "CANONICAL_FINANCE_AUTHORITY_AND_APPROVAL_REQUIRED"]);
  }
}
