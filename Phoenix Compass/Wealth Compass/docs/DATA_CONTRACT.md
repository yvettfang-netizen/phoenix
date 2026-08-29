# Data Contract

All persisted workflow records include a UUID, rule version, created/updated timestamps, source channel, workflow status, and idempotency key. Zod schemas are the runtime boundary.

Core records: `AssessmentSession`, `AssessmentAnswer`, `ConsentRecord`, `ScoreResult`, `PersonaResult`, `ReportRecord`, `CRMLead`, and `ReferralRecord`.

Workflow: `DRAFT → ASSESSMENT_COMPLETED → CONSENT_RECORDED → SCORED → REPORT_GENERATED → CRM_READY → REFERRAL_READY`.

Adapters must return an existing record for a repeated idempotency key rather than creating another record.
