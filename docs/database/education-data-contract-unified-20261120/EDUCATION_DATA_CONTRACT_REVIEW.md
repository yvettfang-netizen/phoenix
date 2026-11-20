# Phoenix Education Data Contract V2 — DB-04 / DB-05 / Founder Gate

**Governance: FOUNDER DESIGN DECISIONS APPROVED; EXECUTION / MERGE / DEPLOYMENT HOLD.**
**Updated:** 2026-11-20.
**Source authority:** phoenix/main at 02ffcdcf2c80d3d63ef737b2b9ff176bd5c3d5ab (Canonical formal migrations 0001–0037).
**Status:** This is a reviewable policy, API and data-boundary contract, **not** a migration, runtime grant, tested service, approved production consent notice or independent security sign-off.

The Founder has approved the *design principles* of cross-company teaching-resource reuse, independently authorized cross-project private-document reuse, and least-privilege ASKWISE integration. The Founder has **not** approved candidate SQL installation, real data ingestion, AI provider activation, merge, release, or the held commercial rules.

Related evidence: [DB-04 PR #80](https://github.com/yvettfang-netizen/phoenix/pull/80), [DB-05 PR #81](https://github.com/yvettfang-netizen/phoenix/pull/81), [P0.1 PR #85](https://github.com/yvettfang-netizen/phoenix/pull/85), [S1 candidate PR #89](https://github.com/yvettfang-netizen/phoenix/pull/89), [legacy retirement PR #88](https://github.com/yvettfang-netizen/phoenix/pull/88).

## 1. Current-source baseline and stale claims removed

| Item | Checked position / resulting boundary |
|---|---|
| Canonical business-data authority | A single Canonical PostgreSQL authority. Formal 0001–0037 stay byte-exact; any changes must be separate, reviewed forward candidates. |
| Identity | core.people, core.student_profiles, core.families, core.family_memberships, guardian authorities, auth.principals, consent and existing context/ticket machinery remain authoritative. No second Person, Student, Family, login or session truth. |
| Existing private documents | Formal 0005 documents and immutable document_versions with family_id, subject_person_id and limited data_class; 0006/0007/0015 access hardening; submission manifests/items are for EDUCATION_APPLICATION or IDENTITY_CASE, not general teaching materials. |
| Academy | Formal 0022 learning.enrollment means **Academy course-version participation**, not university degree enrollment. after_class_card, publication and stage_report preserve human review/publication boundaries. |
| Project materials | Candidate 0038 service.workbench_materials uses version_id as PK and so cannot link one version to two projects. Candidate is not an installed formal migration; do not edit its bytes or assume it was installed. |
| ASKWISE runtime | Main commit 02ffcdcf retired the old SQLite access source and better-sqlite3 dependency, with no old-data import. ASKWISE pages currently show a Canonical-integration-pending state; they must not invent student, session or evidence data. Earlier PR #81 SQLite source inventory is **historical**, not the active runtime description. |
| Legacy physical estate | Code retirement is not a receipt that remote PostgreSQL, SQLite files, D1 or backups were physically deleted. PR #88 is still a separate Draft for remaining runtime/physical-retirement planning. Founder confirmed old business data is not to be migrated. |
| S1 | PR #89's candidate 0045 is an isolated forward repair to live guardian family-membership rechecking. Its dedicated PG16/17 source + synthetic jobs passed in the reviewed CI. It is still Draft, not merged or installed, and no independent review signature was found. |

Source evidence: [formal 0005](https://github.com/yvettfang-netizen/phoenix/blob/main/database/canonical/migrations/0005_documents_submissions.sql), [formal 0006](https://github.com/yvettfang-netizen/phoenix/blob/main/database/canonical/migrations/0006_access_decision_api.sql), [formal 0022](https://github.com/yvettfang-netizen/phoenix/blob/main/database/canonical/migrations/0022_learning_core.sql), [0038 candidate](https://github.com/yvettfang-netizen/phoenix/blob/main/database/canonical/forward-candidates/service-workbench/0038_service_project_workbench.sql), [ASKWISE pending page](https://github.com/yvettfang-netizen/phoenix/blob/main/askwise/askwise-learning-engine/src/components/canonical-pending.tsx).

## 2. Two separate resource/data domains — do not fake a Family ID

### 2.1 Globally shared teaching resources (approved design)

Examples: licensed curriculum resources, teaching outlines, course templates, generic practice materials, teacher guides, and approved instructional materials. They may be reused across Phoenix Hong Kong, Beijing and future authorized companies and courses.

- Govern shared resource identity and immutable versions; track owner/licensor, copyright/license, allowed company/course/teacher scope, expiry, published/retracted state, and provenance.
- A shared asset may be referenced by multiple courses without duplicating an object or giving instructors blanket access to private student evidence.
- Company-local customer relationships, contracts, prices, receipts, student records and teacher settlement remain isolated as applicable. Shared teacher identity is not shared commercial entitlement.
- The current docs.documents structure is **not** a global resource model: it requires a real family_id and subject_person_id. Never create a fake family or student to store public teaching materials. Propose an independent resource/catalog association inside the **same Canonical authority** after a complete source/numbering scan; do not assume a new table is already approved.
- Materials not demonstrably licensed for cross-company distribution remain HOLD, even if technically readable.

### 2.2 Private person/family documents (independent project authorization)

Examples: passports, identification documents, transcripts, student application materials, individualized essays, language test reports, family records, and financial records.

- Preserve docs.documents and immutable docs.document_versions as the single private document/version source. Only scoped project use records reference an existing version_id; no automatic re-upload or duplicate blob.
- Conceptual association fields: project_document_use_id, service_project_id, version_id, subject_person_id, family_id, purpose_code, data_class, consent/evidence reference, review_status, reviewer_principal_id, grant/expiry/revocation timestamps, revision, actor, and immutable event ID. These are **design fields**, not claims about existing columns.
- Cross-project use requires *new* project assignment, real same-subject/family validation, valid civil-capacity/guardian/assent and purpose-specific consent, document state/retention, and current actor capability. Explicit same-person authorized reuse may be allowed; no inference from filename, content hash, email, family surname or another project's approval.
- Project A's APPROVED cannot authorize Project B: each use begins PENDING_REVIEW and has independent review, history and publication. No cross-family discovery, including existence/timing side channels.
- IDENTITY_SENSITIVE and any highly sensitive material are **default denied** for routine Education/Academy sharing; the existence of a general document-read capability does not override project- and purpose-specific consent.
- Keep submissions in docs.submission_manifests/items for their allowed targets only; distinguish service delivery acceptance from underlying document read/download permission.
- Re-evaluate trusted principal, current family membership, subject, guardian/assent, consent, purpose, project role, current version, withdrawal, retention and legal hold before every read/download and before queued/retried worker execution. Revocation must stop later reads; signed URLs/cache must not extend access.
- Do not expose private object-store keys, raw content or long-lived public URLs in API results, audit logs or debugging traces. Storage/MIME/malware/size rules, processors and legal retention/deletion policy remain HOLD pending reviewed design.

## 3. ASKWISE and Academy source-of-truth separation

| Authority | Domain owner and rule |
|---|---|
| Phoenix Core | Canonical student/family/person identity, current guardian and family relation, consent, approved service-entitlement authority, trusted session and audit. |
| Phoenix Academy | Course/version, enrollment, teacher assignment, lesson/slot, student task assignment, attendance, reviewed after-class card, stage report, publication/retraction. |
| ASKWISE (鳌鱼) | Learning-engine semantics: Initial Attempt -> Diagnosis -> Hint -> Retry -> Evidence, reflection, mastery and revalidation. Logical learning truth stays in the ASKWISE domain; its eventual durable business persistence must use controlled Canonical interfaces, **not** its own SQLite, independent student master, or copied Academy raw-attempt tables. |
| Family OS | Current, approved, published and presently authorized student growth projection. No raw ASKWISE attempts/diagnoses by default. |

An Academy-origin task can invoke ASKWISE only with approved Canonical student mapping, assigned and eligible task scope, current enrollment or separately approved direct ASKWISE entitlement, valid consent/assent, trusted actor capability and a short expiry. Direct eligible ASKWISE-first use is not forced through Academy. A course teacher arranges the lesson modality/schedule; students cannot self-grant a different delivery mode.

Minimum assignment handoff **proposal**: contract_version, source_system, source_assignment_id, source_event_id/version, canonical_student_person_id, family_id (if applicable), course_version/enrollment or explicitly approved direct-entitlement reference, task_kind, allowed_subject, purpose_code, expiration, correlation_id, source digest. Never accept user-supplied identity as authoritative.

Minimum ASKWISE summary callback **proposal**: contract_version, source_system, source_event_id, source_version, source_assignment_id, approved canonical mapping reference, task/session reference, attempt/evidence_revision, status, approved summary digest, occurred_at and correlation_id.
- Same source system + event ID + version + digest is an idempotent replay.
- Same identity/version with a different digest is a conflict and must not overwrite reviewed content.
- New revisions append; previous reviewed history remains immutable.
- Raw answers, prompts, chain of interaction and private diagnoses stay within the approved least-privilege processing boundary. A minimal summary may be proposed for Academy review, never silently promoted to verified facts.
- Authorized teacher review and separate publication are mandatory before Family OS visibility. Retraction removes current visibility while retaining the security/audit event.

The old mock adapter is not a durable contract and the retired pilot SQLite is not an allowed fallback. Where the trusted Canonical adapter is missing, default to an explicit **INTEGRATION_PENDING / DENY** state rather than synthetic progress.

## 4. Exact role/capability decision matrix (design; not a current GRANT)

| Actor | Allowed when all live checks pass | Explicitly denied |
|---|---|---|
| Student | Own assigned or independently entitled ASKWISE task/session, own Evidence, own authorized private documents and published results. Default Student interface. | Other student/sibling/family, other project, unauthorized raw files. |
| Guardian / Parent | Explicit Parent switch, currently verified guardian + family membership + required consent/capacity; only authorized child and approved high-level published summary. | Raw private ASKWISE interactions/diagnoses by default, expired relationship, unrelated children. |
| Assigned teacher | Active class/student assignment, minimum necessary learning summary, next teaching action and valid lesson resources. | Blanket project/family docs, unrelated students, direct overwrite of Diagnosis/Evidence, unilateral publication bypass. |
| Academy scoped administrator | Govern authorized course/role grants, assignment failures, entitlement checks and audit under server-enforced scoped capability. | Silent academic fact changes, cross-company customer or payment access. |
| Assigned education advisor/reviewer | Explicit project- and purpose-scoped material review and permitted student application facts. | General Academy attempts or all families from advisor status alone. |
| ASKWISE engine service | One authorized assignment/session, bounded subject, permitted processing fields and valid expiry; emit versioned evidence event. | Creating identities, payments, entitlements, customer project rights or published school reports. |
| Extraction worker | One job, existing approved version, subject/purpose, limited fields and lifetime, recheck withdrawal and consent at dequeue and read. | Whole-family search, broader document listing, direct publication or verified academic writes. |
| Aoyu presentation agent | Read approved minimized event stream to show encouragement, milestones or progress. | Grant rights, approve completion, determine academic diagnosis, change evidence or edit reports. |
| Partner/channel | Default deny for Academy learning, student evidence, project documents and Family projections. | Any implicit access from referral/channel membership; any exception requires an independently reviewed explicit scope. |
| Database application login | Approved audited SECURITY DEFINER / service APIs under separated LOGIN; no blanket direct table read/write. | Direct unrestricted DML/SELECT, BYPASSRLS, unbounded SECURITY DEFINER execution. |

**Dual capability:** a Person has one Canonical identity/principal, not two people or two independent sessions. A person who is both Student and Parent enters Student by default and explicitly switches to Parent through a server-derived capability; client role/header/path cannot authorize access. A Teacher who is also a family member also keeps the same Person. No alternative workspace-session model may be copied merely to work around this. Any minimal capability extension is a separate reviewed forward proposal.

**Live membership:** formal 0022 alone was demonstrated to allow guardian card access after family membership ended on an already-bound backend. PR #89 candidate 0045 adds the live check for the guardian-to-child path and tests both cards and stage reports in synthetic PG16/17. Do not mark it as installed. Future ASKWISE/Family OS endpoints must also independently recheck session, family relation, guardian scope and consent at the next sensitive read, not only at ticket redemption.

## 5. Assessment instrument governance

Keep these six assessment families separate: **CAT4, DSE, A-Level, IELTS, JLPT, Cantonese**. A student's common timeline may link evidence across instruments but cannot average, convert, rank or treat their original scales as interchangeable without a separately approved crosswalk.

Proposed per-event minimum: canonical student; assessment family; instrument name/edition; administering body; date/time; original scoring scale, subscores, levels and units; examination/diagnostic context; source and version/digest; valid review authority; state (draft, pending, verified, published, retracted); who reviewed and when; student/guardian consent and eligible audience. Preserve the original score plus provenance without overwriting it with AI interpretation.

No AI result automatically becomes a student academic record, verified score, learning level or family-visible report. The existing generic education.score_record, education.language_test and learning.stage_report are not proof that these six instrument contracts have been implemented. Any future extraction starts PENDING_REVIEW.

## 6. Required negative acceptance matrix — NOT RUN for PR #86

| ID | Synthetic scenario | Required result |
|---|---|---|
| D01 | One private immutable version used in project A and project B for the same permitted subject | Both use links valid independently; no duplicated blob. |
| D02 | Project A review APPROVED; query project B | Project B still PENDING; no inherited decision. |
| D03 | Different family/subject tries to attach existing version or guess its ID/digest | DENY without revealing document existence. |
| D04 | Consent/guardian/assent withdrawn after an extraction job is queued | Worker re-checks, refuses work and new read; audit metadata retained. |
| D05 | Retention expired, withdrawal in effect or legal hold requires exceptional disposal handling | New unauthorized use denied; physical deletion only by separately approved retention/legal process. |
| D06 | Shared public curriculum requested by approved other-company instructor | ALLOW only within license/course scope, no fake family/student IDs. |
| D07 | License expired or material unpublished | DENY new instructor access and prevent stale-cache bypass. |
| D08 | Unassigned teacher, advisor from another project, partner or cross-company finance actor | DENY all unrelated records; no lateral access. |
| D09 | Student forges sibling ID or Parent mode/header | DENY; trusted server re-resolves capability. |
| D10 | Previously bound Parent loses family membership, guardian authority or consent | Next read DENY on the same connection; no stale session/cache bypass. |
| D11 | Explicit Student -> Parent switch with valid same-Person guardian authority | Only authorized child's published projection; self Student access preserved. |
| A01 | Assigned ASKWISE task, active entitlement and consent, authorized student | Exactly one bounded session; reconnect/resume is idempotent. |
| A02 | Draft task, expired entitlement, unsupported subject or invalid student mapping | No session or new identity/entitlement created. |
| A03 | ASKWISE callback duplicate event/version/same digest | Exact replay; no duplicate learning evidence. |
| A04 | Same event/version/different digest or newer revision | Conflict or immutable new revision, never silent overwrite. |
| A05 | Unreviewed AI summary arrives | PENDING_REVIEW only; no verified fact, publication or Family projection. |
| A06 | Teacher authorization removed or report retracted | Next review/read denied as applicable; no current Family projection, audit retained. |
| A07 | Aoyu tries to edit Diagnosis, Evidence or an entitlement | DENY with audit and no side effect. |
| A08 | CAT4 and IELTS results on same timeline | Both display original instrument/scales, no shared numeric average. |
| A09 | Pooled connection context cleared or service worker expired | Next cross-family/student read DENY; separated LOGIN/RLS verified. |

Before any execution approval: source and migration-number conflict scan (including reserved 0038/0039 and 0045, plus current forward candidates); exact SQL/ACL/RLS/security-definer drift review; PG16 and PG17 fresh/upgrade/repeat/rollback/restore and separated LOGIN checks; synthetic HTTP-to-DB negative integration tests; object/AI worker revocation and idempotency tests; independent security review; narrow named nonproduction read-only source receipt. Neither green source CI nor PR #89 0045 success constitutes tests of this V2 contract.

## 7. Engineering order and explicit HOLD gates

1. **V2 policy review first:** Founder-approved design decisions are documented here; validate concrete consent/assent wording, licensed resources, document data classes and roles with responsible reviewers. No real data for review.
2. **Minimal forward design:** existing document version -> project-use associations; separate global teaching-resource catalogue; ASKWISE assignment and immutable evidence ingestion; approved human-review/publication flow. Keep an explicit RLS/ACL/default-deny API boundary. No second database.
3. **Exact-source verification:** scan currently reserved migration numbers, inspect any parallel workspace candidates, and anchor to current main. No history rewrite of 0038, 0045 or 0001–0037.
4. **Synthetic implementation tests (separate future Gate):** acceptance matrix D01–A09 with PG16/17 and rollback; default-off APIs and independently reviewed security evidence.
5. **Founder release decision:** only after source, CI, nonproduction, legal/privacy and independent-review receipts. No merge, staging data import, production credentials, real student data, AI processor or public exposure is authorized by this document.

**Commercial HOLD remains:** lesson-hour debit/refund, payment, teacher settlement and accounting are not authorized by this review.

**Jimson manual-only exception:** The sole supplementary human task remains the named read-only canonical-nonprod evidence receipt in [PR #85](https://github.com/yvettfang-netizen/phoenix/pull/85), when its separately approved service binding exists. Codex/technical reviewers own code inventory, architecture review, regression and isolated PG tests. Do not reassign completed automated work to Jimson.

**Status summary:** Design boundaries APPROVED; physical/operational source inventory PARTIAL; implementable schema NOT APPROVED; PR #86 PG16/17 tests NOT RUN; independent review NOT SIGNED; shared-nonprod/merge/deploy/production/real data **HOLD**.
