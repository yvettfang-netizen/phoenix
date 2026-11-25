# Identity Compass Gate 2 — Runtime Reconciliation & Acceptance

Date: 2026-09-03
Status: `GATE 2 DESIGN PASS / RUNTIME POLICY ACTIVATION HOLD`

## Finding

The current Identity Compass already contains a deterministic `path-engine.ts`, `policy.ts`, path registry, normalisation layer, dynamic questions and tests. This is useful architecture and should be reused rather than replaced.

However, the checked-in policy library predates this Gate 2 evidence review (`verified_at` baseline 2026-08-25) and includes route/rule inventory outside the Gate 2 frozen product scope. Existing `OFFICIAL + CURRENT` flags must therefore not be interpreted as current Founder-approved production rules.

## Reconciliation decision

### Reuse

- deterministic evaluator mechanics
- policy version check / fail-closed behavior
- manual-check handling
- missing-input gaps
- path registry pattern
- normalisation/test structure

### Replace or rebind before runtime activation

- policy evidence metadata and verification dates
- current official URLs where changed
- QMAS current 12-criteria framework
- TTPS 04/2026 guidebook semantics and live eligible-university/quota checks
- GEP employment vs entrepreneur applicability boundaries
- extension/journey outputs
- Right of Abode ordinary-residence review guardrails
- Gate 2 Result Schema outcomes / evidence refs

### Do not activate in Gate 2

- production database writes
- real-family handoff
- payment/CRM
- automatic legal/approval decision
- approval probability
- production deployment

## Gate 2 deliverables completed

- [x] Product Spec V0.1
- [x] Question Bank V1
- [x] Rule & Evidence Registry V0.2
- [x] Result Schema V1
- [x] Family OS Handoff Contract V1
- [x] Synthetic Personas & Boundary Tests V1
- [x] Existing runtime reconciliation
- [x] Official-source evidence review for TTPS, QMAS architecture, GEP boundaries, dependants, extension architecture and ROA guardrails

## Remaining live-reference items

These are intentionally not treated as eternal constants:

1. TTPS eligible-university aggregate list.
2. TTPS Category C current quota availability.
3. QMAS prevailing threshold and unresolved business-ownership criterion details.
4. Talent List / shortage occupation live content where used.
5. Operational fees / processing times / application UI details.

Their presence does not block Gate 2 design completion; it blocks definitive runtime evaluation on those subrules unless live/current evidence resolves.

## Acceptance status

### Product/architecture
`PASS`

### Evidence architecture
`PASS`

### Deterministic engine architecture
`PASS — existing engine reusable`

### Current policy library for production
`HOLD — must be rebound to Gate 2 registry and re-tested`

### Gate 3 database / real-family work
`NOT AUTHORIZED`

## Next authorised engineering unit after Founder review

A narrow runtime reconciliation PR/commit on this same feature branch should:

1. rebind `policy.ts` to Gate 2 evidence IDs and statuses;
2. update route inventory to the Founder-approved Identity product scope;
3. map engine output to Result Schema V1;
4. add the synthetic/boundary tests from this Gate;
5. run lint/typecheck/unit/build;
6. leave Family OS handoff synthetic only.

No merge to `main` is implied by this acceptance document.