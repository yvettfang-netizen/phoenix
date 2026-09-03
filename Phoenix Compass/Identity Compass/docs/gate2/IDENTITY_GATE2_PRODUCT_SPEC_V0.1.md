# Phoenix Identity Compass — Gate 2 Product Spec V0.2

Status: `DESIGN PASS — RUNTIME POLICY ACTIVATION HOLD`
Date: 2026-09-03
Branch: `feat/identity-compass-gate2-sprint`

## Goal

Advance Identity Compass from Sprint 1 free intent classification into a deterministic, evidence-linked Full Analysis architecture, while preserving the existing Free 6 flow.

Current Sprint 1 remains:

`/identity` → Free 6 → Family Intent Classification → Free Identity Snapshot → `/identity/full-analysis`

Gate 2 freezes what begins behind `/identity/full-analysis`:

`Full Analysis Questions → Normalized Identity Profile → Versioned deterministic rules → Evidence-linked Result → Explanation → Family OS Journey Seed`

## Non-negotiable architecture

- AI may explain; it may not determine or alter policy outcomes.
- Policy-sensitive conclusions require versioned official evidence.
- Live lists, quotas, ambiguous documentary standards and ordinary-residence questions fail closed to evidence/human review.
- No approval probabilities, guaranteed approval language or legal-advice framing.
- Phoenix Core remains authority for User, Family, Guardian, Student, Consent, permissions and audit evidence.

## Gate 2 route scope

Initial / coming to Hong Kong:
- TTPS A/B/C
- QMAS General Points Test and Achievement-based route architecture
- GEP professional route where applicable
- GEP entrepreneur route with Mainland-applicant routing guardrail
- dependant route architecture

Already in Hong Kong / maintenance:
- scheme-specific extension journey
- dependant sponsorship continuity
- Right of Abode / permanent-residence planning and evidence review

## Deliverables

- `QUESTION_BANK_V1.md`
- `RULE_EVIDENCE_REGISTRY_V0.1.md` (content advanced to V0.2)
- `RESULT_SCHEMA_V1.md`
- `FAMILY_OS_HANDOFF_CONTRACT_V1.md`
- `SYNTHETIC_PERSONAS_AND_BOUNDARY_TESTS_V1.md`
- `GATE2_RUNTIME_RECONCILIATION_AND_ACCEPTANCE.md`

## Runtime reconciliation

The repository already contains deterministic Identity `path-engine.ts`, `policy.ts`, normalisation, dynamic questions and tests. Gate 2 therefore does not create a competing second engine.

Reuse:
- deterministic evaluator mechanics
- fail-closed policy-version handling
- manual checks
- missing-input gap handling
- normalisation and test structure

Must be rebound before runtime policy activation:
- policy verification metadata and evidence IDs
- current official source bindings
- QMAS current framework
- TTPS 04/2026 semantics plus live eligible-university/quota checks
- GEP employment/entrepreneur applicability boundaries
- extension/ROA journey outputs
- Result Schema V1 mapping

## Gate result

- Product architecture: `PASS`
- Question Bank architecture: `PASS`
- Evidence architecture: `PASS`
- Result Schema: `PASS`
- Family OS contract: `PASS`
- Synthetic/boundary test design: `PASS`
- Existing deterministic engine architecture: `PASS — REUSE`
- Existing checked-in policy library for production: `HOLD — REBIND + RETEST REQUIRED`
- Production DB / real-family onboarding / deployment: `NOT AUTHORIZED`
- Gate 3: `NOT AUTHORIZED`

Founder review is the next formal gate. A subsequent engineering unit may reconcile the existing policy library to this Gate 2 registry and run lint/typecheck/unit/build without changing the product boundary or merging to `main`.