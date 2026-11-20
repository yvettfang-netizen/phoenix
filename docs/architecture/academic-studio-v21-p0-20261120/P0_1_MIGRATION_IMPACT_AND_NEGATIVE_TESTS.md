# P0.1 Canonical Migration Impact Map and Negative Acceptance Matrix

**Status:** REVIEW PLAN + P0.1 EVIDENCE DISPOSITION · no SQL authored or approved
**Purpose:** prepare an evidence-based minimal forward-migration proposal after contract review.

## 1. Reuse map

| Capability | Existing source | P0.1 disposition |
|---|---|---|
| Person and student identity | `core.people`, `core.student_profiles` | Reuse |
| Family membership and guardian authority | `core.families`, `core.family_memberships`, `core.guardian_authorities` | Reuse; verify live query semantics and authority evidence |
| Login Principal | `auth.principals` | Reuse; current Principal kind is not equivalent to all product capabilities |
| Session context and ticket | `auth.session_contexts`, `auth.context_exchange_tickets`, existing binder/redeemer/clear functions | Reuse; test pool hygiene and live revalidation |
| Consent | `consent.grants` | Reuse where purpose/data-class contract matches; identify missing purposes only after policy review |
| Teacher identity | `learning.teacher` → `core.people` | Reuse |
| Teacher-to-class assignment | `learning.teacher_assignment` | Reuse; assignment is class scoped |
| Enrollment | `learning.enrollment` | Reuse; distinct from academic study enrollment |
| Student-in-class | `learning.enrollment_class` | Reuse |
| Timetable | `learning.schedule_slot` | Reuse; teacher overlap protection exists in formal source |
| Room identity | `room_label` in `learning.schedule_slot` | Proven gap for stable room inventory and room overlap |
| Per-student slot reservation | No equivalent object found in reviewed formal migrations | Candidate gap; verify full source and runtime before adding |
| Assessment evidence | `education.score_record`, `education.language_test`, `education.academic_record`, `learning.stage_report`, docs | Reuse as historical facts and narrative; instrument-specific version/review/provenance remains a proven contract gap |
| Payment and lesson entitlement | `operations_ref.entitlement_ref` is reference/integration data | Not a payment/refund or immutable lesson-hour ledger |
| Commercial rules | Not established | HOLD; no migration |
| Teacher/admin capability | Existing teacher assignment covers teacher resources; no complete Academy admin grant proven in P0 | Review exact existing role/grant APIs; do not assume new role table |
| Partner referral | CRM/channel relationships | No teaching access; never infer capability |

## 2. Migration design rules

- Do not edit migrations 0001–0037.
- 0038/0039 remain Service Workbench candidates; do not allocate or repurpose their numbers.
- 0042 remains PR #77's separate held candidate; do not copy its organization/session design into Academy.
- Do not allocate a migration number before scanning all formal and candidate manifests.
- Every proposed object must state the exact uncovered invariant and why an existing table/function cannot enforce it.
- Prefer additive changes to existing objects only when backward compatibility and security impact are demonstrated.
- New tables need explicit RLS enable + FORCE where applicable, narrow grants, SECURITY DEFINER search_path hardening, immutable history where required, and separate reader/writer/binder roles.
- No runtime can write around approved domain functions to tables directly.
- Include install/repeat/drift, PG16/17 fresh/upgrade, RLS/ACL negative, concurrency, pool reuse, revoke/expiry, backup/restore and rollback evidence.

## 3. Negative acceptance matrix

| Actor / scenario | Expected result | Evidence required |
|---|---|---|
| Dual-capability student+parent logs in | Student Learning Center default | authenticated browser test and server capability trace |
| Same actor manually switches to Parent with valid authority | only authorized children/resources visible | API + DB scope trace |
| Student-only forges Parent route/header/body | DENY | HTTP 403/404 and DB RLS negative |
| Parent membership without verified guardian authority | DENY child record | DB-backed negative |
| Guardian authority expired/revoked | DENY on next read; stale cache cannot serve | revoke race and cache invalidation test |
| Consent withdrawn/expired | DENY affected purpose/data class | API and DB negative |
| Student supplies sibling Student ID | DENY | cross-subject negative |
| Teacher has no active `learning.teacher_assignment` | DENY student/course | DB/API negative |
| Teacher assignment expires after page load | next sensitive request DENY | live revalidation test |
| Partner referral to a family | no learning capability | CRM-to-learning boundary test |
| Teacher uses a different region account | no second identity should exist | identity uniqueness / account-link test |
| One teacher double-booked concurrently | one booking succeeds | concurrent PG test |
| One student double-booked across classes | one booking succeeds | concurrent PG test |
| One physical room double-booked | one booking succeeds | concurrent PG test |
| Last small-group seat claimed concurrently | one reservation succeeds | capacity race test |
| DST ambiguous/nonexistent local time | explicit rejection or selected offset | timezone boundary test |
| CAT4 and IELTS values shown together | original scale labels retained, no conversion | projection/UI test |
| AI proposal not reviewed | not published to parent | publication authorization test |
| Assessment retracted | absent from future projection; audit retained | read + audit test |
| Refund/payment duplicate event | no duplicate financial/entitlement event | deferred until commercial HOLD released |

## 4. Actual P0.1 evidence (Codex First)

The direct source, GitHub, SQL, RLS/ACL and isolated synthetic PG16/17 review is in
[`P0_1_TECHNICAL_REVIEW.md`](P0_1_TECHNICAL_REVIEW.md). The commands and raw outputs are in
[`p01-evidence/`](p01-evidence/). The security-focused second pass is
[`P0_1_SECURITY_SECOND_PASS.md`](P0_1_SECURITY_SECOND_PASS.md).
The installed test baseline is **0001–0037** only. PR #77's 0042 and 0038/0039 were not installed.

| Capability or invariant | Disposition | Evidence / limit |
| --- | --- | --- |
| Person, family, student master keys | **REUSE** | 0003 source and both disposable PG clusters accepted one shared synthetic family/student. This says nothing about a real identity provider. |
| One-use binder → app context and clear | **REUSE** | Separate LOGINs on PG16/17 issued/redeemed a ticket; `auth.clear_context()` removed the following read. |
| Parent learning read: verified guardian + active Consent | **REUSE with security GAP** | Published-card read = 1 while both active; Consent withdrawal yielded 0. Membership ending after context binding still yielded 1; see next row. |
| Family membership revocation/expiry on next read | **GAP** | PG16/17 `before_membership_revoke=1`, `after_membership_revoke=1` on the *same bound app backend*. No current membership check in `learning.can_read_sensitive()`. |
| Teacher assignment, Consent and revocation | **REUSE** | Assigned teacher read = 1; after assignment revocation = 0 on both versions. Full Academy teacher UI and pool behavior remain unverified. |
| Academy teaching-admin grant | **UNVERIFIED** | `SUPERVISOR` Principal kind and Learning management functions exist, but no Academy-specific scoped admin authorization or UI behavior was established. Do not infer it from a browser-selected role. |
| One FAMILY Principal with Student self + Parent guardian reads | **REUSE at database-read level** | The same synthetic FAMILY Principal read its own published card and a verified child card: `self_cards=1`, `authorized_cards=1` on both versions. The trusted default/switch route is absent. |
| One Person with FAMILY and TEACHER Principal kinds | **GAP** | Second principal insert rejected by `principals_person_id_key` on both versions. Do not create another Person or session system to work around it. |
| Student-default route and explicit Parent switch | **GAP** | No Academy capability resolver/route found in the reviewed server; six previews are static. Do not infer authority from browser role or route. |
| Learning table RLS and direct read ACL | **REUSE** | PG16/17: 14/14 Learning tables FORCE RLS; separate reader LOGIN direct table read denied; catalog function allowed, internal teacher helper denied. |
| Published course catalog | **REUSE for read-only catalog** | `learning.list_published_courses()` and `/v1/learning/catalog` exist. This does not establish course enrolment or student default navigation. |
| Teacher schedule overlap | **REUSE** | GiST exclusion rejects synthetic overlapping slots on both versions. |
| Stable room identity and overlap | **GAP** | `room_label` is text; two overlapping classes in `Synthetic Room 1` were accepted on both versions. |
| Per-student slot booking and overlap | **GAP** | One student was placed in two simultaneously scheduled classes; no per-slot booking object or student overlap constraint exists in formal 0001–0037. |
| Last-seat concurrency | **UNVERIFIED** | `learning.place_enrollment_in_class()` locks class and enrollment, but no concurrent two-client Academy acceptance test was found or run. |
| Education academic facts | **REUSE for existing generic facts only** | `education.score_record`, `education.language_test` and `learning.stage_report` install in both clusters. Their values were not accepted as formal six-instrument scores. |
| Six versioned assessment systems and governed timeline | **GAP** | No instrument/edition/scale/review/retraction authority or Academy timeline API in formal source. |
| `education.study_enrollments` | **GAP if required** | Absent in formal source and both disposable clusters; never substitute it for `learning.enrollment`. Its business need is not yet established. |
| Commercial package, debit, refund and settlement rules | **HOLD** | Founder deliberately withheld policy; no candidate SQL/API may be implemented from this packet. |
| Named nonproduction database and real provider | **UNVERIFIED** | No approved connection/service receipt for P0.1. Only the narrow Jimson [read-only ticket](P0_1_JIMSON_NONPROD_TICKET.md) needs manual environment access. |

## 5. Negative acceptance results

| Test | PG16 | PG17 | Meaning |
| --- | --- | --- | --- |
| Direct Learning table read by real reader LOGIN | DENIED | DENIED | PASS |
| Active guardian + Consent reads published card | 1 | 1 | PASS for the scoped read |
| Same FAMILY Principal reads own and verified child's card | 1 + 1 | 1 + 1 | PASS at DB-read level; navigation NOT RUN |
| Consent withdrawal, next read | 0 | 0 | PASS |
| Assigned teacher, then revoked assignment | 1 → 0 | 1 → 0 | PASS |
| Binder/app split and `clear_context()` | 1 → 0 | 1 → 0 | PASS |
| Family membership expiry on already-bound app backend | 1 → **1** | 1 → **1** | **FAIL / security GAP** |
| Second TEACHER Principal for same FAMILY Person | DENIED | DENIED | Constraint PASS, dual-kind product capability GAP |
| Same teacher overlapping slot | DENIED | DENIED | PASS |
| Same physical room, different teachers, overlapping slot | ACCEPTED | ACCEPTED | **FAIL / resource GAP** |
| Same student in two overlapping classes | ACCEPTED | ACCEPTED | **FAIL / resource GAP** |
| Student/Parent default, forged switch, sibling, Partner, DST, last-seat race, six-score projection | NOT RUN | NOT RUN | Missing Academy route/model or a dedicated concurrent test; never mark PASS from a design document. |

The bounded report records the proposed minimum forward-migration boundary. No existing
Migration was changed, no new Migration was allocated, and no production environment was accessed.
