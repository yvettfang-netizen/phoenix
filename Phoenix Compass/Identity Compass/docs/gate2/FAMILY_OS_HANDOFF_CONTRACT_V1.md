# Identity Compass → Family OS Handoff Contract V1

Status: GATE 2 DESIGN — NO REAL-FAMILY ONBOARDING

## Authority

Phoenix Core remains sole authority for `User`, `Family`, `Student`, `Guardian`, consent, role/permission, service entitlement, external identity mapping, and audit evidence. Identity Compass must not create a competing identity system.

## Handoff envelope

```text
handoff_id
assessment_id
source_service = IDENTITY_COMPASS
source_version
rule_version
evidence_registry_version
question_bank_version
result_schema_version
primary_family_id
actor_user_id
subject_type
subject_id
consent_id
assessment_created_at
result_payload_hash
journey_seed
audit_context
```

## Required Core references

Before a real handoff in Gate 3+:

- `primary_family_id` must resolve to one verified Core Family.
- Actor must resolve to a Core User with required family-scoped permission.
- Subject must resolve to an authorised Core User / Guardian / Student relationship as applicable.
- Exact assessment purpose consent must be active and referenced by `consent_id`.
- Cross-system mapping must use Core external identity mapping where legacy/module IDs exist.
- Every handoff appends immutable audit evidence.

## Journey seed

```text
journey_type = IDENTITY
current_scheme
current_status
recommended_path
alternative_paths[]
limit_of_stay_expiry
important_dates[]
required_evidence[]
risk_flags[]
next_actions[]
source_assessment_id
```

The journey seed creates planning state, not an immigration decision record.

## Timeline event candidates

- assessment completed
- document review required
- official list/quota re-check required
- application target date
- application submitted (future system event, not Gate 2)
- permission granted / refused (future verified evidence only)
- entry/activation event
- extension window opens
- six-week recommended extension checkpoint where source supports it
- limit of stay expiry
- ordinary-residence evidence review
- seven-year candidate milestone
- permanent-residence document review

## Data minimisation

Gate 2 contracts use synthetic IDs and controlled facts only. No production passport/HKID number, raw bank record, full criminal-history document, or unnecessary document binary is written by this sprint.

## Failure modes

Handoff must fail closed when:

- family assignment is absent or ambiguous;
- consent is missing/withdrawn/expired;
- actor lacks family-scoped permission;
- subject relationship is unverified;
- source assessment provenance is incomplete;
- rule/evidence versions are unknown;
- payload family does not match service `primary_family_id`.

## Gate 3 prerequisites

No real-family handoff until Consent, verified Family Assignment, RBAC, PostgreSQL RLS, append-only Audit Log, and approved production schema/migrations are all implemented and tested.