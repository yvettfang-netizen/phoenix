# Founder Decision Record — Phoenix Academic Studio V2.1 P0

**Decision ID:** FOUNDER-P0-ACADEMIC-STUDIO-2026-11-20  
**Decision date:** 2026-11-20 (Asia/Shanghai)  
**Authority:** Founder  
**Applies to:** PR #83, commit `a6f1a6d353656c7293fb38eeeb5337e36c07e8f7` and subsequent Academic Studio V2.1 work  
**Status:** DECIDED — product direction frozen; implementation and migration remain gated

## 1. Founder decisions

| Topic | Founder decision | Binding interpretation |
|---|---|---|
| Dual student/parent capability | **student** | When one principal has both student and parent capabilities, successful login defaults to the student Learning Center. Parent/Family OS is an explicit, manual view switch and is available only after a fresh server-side check of current family membership, guardian authority and applicable Consent. The UI choice is not an authorization claim. A parent-only principal still defaults to Family OS; a student-only principal defaults to the Academy Learning Center. |
| Lesson-hour commercial rules | **HOLD** | No commercial policy is approved. Do not invent or freeze package pricing, purchase activation authority, cancellation windows, no-show charging, make-up eligibility, expiry, refunds, discount allocation, teacher rates, settlement approval or payment ownership. Do not implement these rules or create their production SQL objects until Founder approves a separate commercial ruleset. |
| Teaching resources | **shared** | Use one shared teaching resource model across regions: the same teacher identity and shared student/resource identity; no regional teacher accounts or per-region teaching tenants. Physical rooms remain individually identifiable resources with their own location and availability, and must participate in conflict checks when used. |
| Assessment and growth record | **separate** | Keep CAT4, DSE, A-Level, IELTS, JLPT and Cantonese assessment definitions, score scales, versions, dimensions and provenance separate. Present approved results on one longitudinal growth timeline, but do not convert, average or rank unlike scales without an independently reviewed and approved comparability model. |

## 2. Identity and navigation rules

1. One person retains one Canonical Person identity, one applicable Student ID and one login Principal; do not duplicate accounts for the two views.
2. Login routing is based on verified capabilities returned by the trusted server, not client-side role labels, URL parameters or user-supplied family/student IDs.
3. If the principal has a valid student capability, default to the student Learning Center.
4. The Parent / Family Center switch is a deliberate user action. Before displaying parent data, re-evaluate the current family relationship, guardian authority, Consent, scope and revocation/expiry.
5. A student-only principal cannot reveal parent controls. A parent-only principal defaults to Family OS. A principal with neither valid capability receives a safe resolution/denial path.
6. Switching views must not mint a new identity, create a second session system or bypass the existing authenticated session and Canonical context mechanism.
7. The student view never exposes family financial administration, siblings' private records, teacher internal notes or unreviewed AI inference.

## 3. Commercial HOLD boundary

The HOLD is deliberate and blocks commercial implementation. Until a Founder-approved commercial ruleset exists:

- Do not create a live course-package purchase/activation workflow.
- Do not calculate or debit lesson hours.
- Do not decide late-cancellation, no-show, make-up, expiry or refund entitlements.
- Do not calculate teacher payable amounts or mark settlements payable.
- Do not treat `operations_ref.entitlement_ref` as a payment/refund ledger.
- Static prototypes may show clearly labelled synthetic examples only; they must not imply an approved price, policy or live balance.

The next commercial decision packet must present explicit alternatives and consequences for each rule, identify the authoritative payment/refund system and responsible approvers, and return to Founder for approval. No default may be silently selected by engineering.

## 4. Shared teaching-resource boundary

- Teacher identity is global and reused across regions.
- Student enrollment, teacher assignment and schedule use the shared Canonical learning model.
- No Hong Kong/Beijing regional teaching organizations, tenant partitions or duplicate teacher principals.
- Physical room records are shared resources with a location attribute; a room is not a regional tenant.
- Booking allocation must eventually prevent teacher, student and applicable physical-room overlap under concurrency, not merely through a front-end preflight.
- Online meeting-provider details remain behind a replaceable integration boundary.

## 5. Assessment contract boundary

Each assessment record must retain, at minimum: instrument/system, edition/version, subject or capability dimension, original score and scale, assessment date, source/assessor, evidence reference, review state, publication visibility and supersession/retraction provenance.

The shared timeline is a presentation/projection layer, not a shared scoring system. Teacher-confirmed formal results must remain distinguishable from AI-proposed observations. Parent publication requires the applicable authority and Consent.

## 6. Next gate — P0.1 contract closure (no migration yet)

**Gate name:** Founder P0.1 — Identity, Shared Resources and Assessment Contracts  
**Owner:** Codex prepares the evidence-backed proposal; Jimson reviews Canonical compatibility and non-production testability; Founder approves the gate.  
**Entry baseline:** PR #83 at the decision-record commit; re-fetch current `main`, PR #76 and PR #77 heads before work.

### Required deliverables

1. **Identity contract:** server-trusted capability resolution, student-default routing, explicit parent switch, parent-only and student-only routing, dual-capability tests, revocation/expiry/Consent checks, and proof that existing auth session/context/ticket mechanisms suffice or a narrowly scoped additive gap is documented.
2. **Shared-resource contract:** canonical teacher/student/room identities, room location model, online/offline/hybrid semantics, timezone rules, and concurrency-safe teacher/student/room collision invariants. No tenant or regional identity model.
3. **Assessment contract:** instrument registry and versioning proposal for all six systems; original score representation, evidence/provenance, reviewer authority, family visibility, correction/retraction and retention requirements. No cross-scale conversion.
4. **Commercial decision packet (separate HOLD track):** present purchase authority, price/discount model, cancellation/no-show, make-up, package validity, refunds and teacher settlement as explicit Founder choices. This packet does not authorize implementation.
5. **Minimal migration impact map:** exact existing tables/functions reused, every proven gap, proposed additive objects/columns only where necessary, RLS/ACL impact, rollback strategy and no historical migration edits.
6. **Negative acceptance matrix:** student cannot read parent-only data; forged view/family/student identifiers denied; revoked guardian and stale teacher assignment denied; unassigned teacher denied; Partner referral grants no teaching access; room/student/teacher race collisions denied; unlike assessment scales remain incomparable.

### Exit criteria

- All three non-commercial contracts are internally consistent and mapped to existing Canonical objects.
- Commercial rules remain explicitly excluded from any migration until separately approved.
- Each proposed SQL object has a documented gap and owner.
- PG16/17 fresh, repeat, upgrade, RLS/ACL negative, concurrency and restore tests are specified before SQL authoring.
- Founder gives explicit approval to proceed to a separate **minimal Forward Migration proposal**.

**No migration number is allocated by this record. No SQL is authorized, installed, merged or deployed by this decision.**

## 7. Current implementation status

- P0 architecture and six static page previews: delivered in Draft PR #83; design evidence only.
- PR #77 / 0042: HOLD in its current form for Academic Studio; passing CI does not override product approval.
- PR #84: duplicate standalone preview candidate; PR #83 is the P0 source of truth pending Founder review.
- Formal Canonical migrations 0001–0037 remain unchanged; 0038/0039 remain candidates.
- Production identity, commercial ledger, room booking, assessment APIs and ASKWISE runtime integration remain unverified/not implemented.

---
**Founder decision recorded. Next gate is P0.1 contract closure, not database installation.**
