# Phoenix Academic Studio — C0 standardized assessments

**Status: Draft unnumbered candidate. No SQL merge, database installation, real reports or production release authorized.**

## Purpose and reuse
The existing `education.academic_record`, `education.score_record`, `education.language_test`, `docs.documents`, `core.student_profiles` and Learning stage reports remain the source authorities for their original domains. Existing Education Compass questionnaire/report artifacts in separate PR #74 are NOT a replacement for standardized assessment attempts and must not be copied here.

Six independent instruments: CAT4, DSE, A_LEVEL, IELTS, JLPT, CANTONESE. No cross-instrument conversion, universal score or average. Assessment attempts are **student-subject owned** with no mandatory family_id: a student's authorized family relationships can change.

## Proposed C0 objects
- `education.assessment_attempt`: one exam/sitting, instrument code/version, source kind, optional Docs evidence reference, student owner, append-only; source records distinguish official, teacher-assessed, self-reported and AI proposal.
- `education.assessment_result`: original dimension + exact instrument-specific scale; typed numeric/text field and original value. A strict trigger prevents borrowing CAT4 score scale for IELTS etc. IELTS half-band precision is constrained without altering other test systems.
- `education.assessment_attempt_event`: immutable lifecycle evidence envelope only; application writes and publication are not exposed. An AI proposal is never automatically accepted as a formal official result.
- All new tables have RLS and FORCE RLS, with no direct runtime app or reader table privileges.

## PG16/17 smoke
Independent synthetic disposable test from formal migrations 0001–0037; isolated flag refusal, formal ledger untouched, forced RLS/no direct app table access, six separate scales, DSE/IELTS mismatch negatives, immutable records and no invented publication event. SHA is printed by CI.

## Incomplete before production
- Approved qualified reviewer, verification, publication/retraction, correction/supersession lifecycle API and source permissions.
- Exact evidence document family/subject authorization and revoked-document propagation; third-party CAT4/IELTS/JLPT report copyrights, licensing and retention rules must be verified before real attachments.
- Student/Parent/Teacher/Founder trusted Canonical API and per-request Consent, guardian authority, live revocation, actual Family OS UI and timeline publishing.
- ASKWISE integration must pass source/evidence idempotency review; raw answers, model internals and proprietary raw reports are never inserted in the growth timeline.
- Whole-assessment scores and dimensions must reflect the official instrument edition, awarding body and scale; no general comparability claim.

**This C0 is strictly a data-model feasibility candidate, not a released assessment engine.** No duplicate assessment questionnaire store and no legacy data migration.
