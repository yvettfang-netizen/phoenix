# P0.1 Canonical Migration Impact Map and Negative Acceptance Matrix

**Status:** REVIEW PLAN ONLY · no SQL authored or approved  
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
| Teacher-to-class assignment | `learning.teacher_assignment` | Reuse; assignment is class scoped and must authorize mode changes |
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
| Student/parent attempts to self-select or change Online/Onsite mode | DENY; no state change | API + DB authorization negative |
| Unassigned teacher attempts to change session mode or Hybrid student participation | DENY | active-assignment authorization negative |
| Assigned teacher changes Hybrid student's Online/Onsite participation | ALLOW only after room/provider/student/teacher conflict checks; audit and notify | transactional update + audit/outbox test |
| Teacher-directed mode change would exceed room/provider capacity or create a time conflict | DENY atomically; prior assignment remains | concurrent PG rollback test |
| Last small-group seat claimed concurrently | one reservation succeeds | capacity race test |
| DST ambiguous/nonexistent local time | explicit rejection or selected offset | timezone boundary test |
| CAT4 and IELTS values shown together | original scale labels retained, no conversion | projection/UI test |
| AI proposal not reviewed | not published to parent | publication authorization test |
| Assessment retracted | absent from future projection; audit retained | read + audit test |
| Refund/payment duplicate event | no duplicate financial/entitlement event | deferred until commercial HOLD released |

## 4. Required review evidence

Jimson must attach:
- exact main and PR #77 HEADs;
- source-file paths and SHA-256 for all reused functions/tables;
- current schema introspection from a designated non-production PG16 and PG17, without production credentials;
- actual role grants, RLS policies and FORCE status;
- pool binder/app reset test;
- precise list of gaps and candidate SQL objects;
- migration dry-run and rollback/restore plan only after Founder authorizes SQL drafting.

No database credentials are requested in this document. Do not connect to production.
