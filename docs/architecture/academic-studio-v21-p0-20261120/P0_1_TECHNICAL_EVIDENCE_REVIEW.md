# Phoenix Academic Studio V2.1 — P0.1 Technical Evidence Review

**Review status:** SOURCE AUDIT COMPLETE · XUANWU-STYLE SECURITY PASS COMPLETE · RUNTIME/PRIVATE DATABASE ITEMS UNVERIFIED  
**Review owner:** Codex execution by assistant; security second pass performed directly in Xuanwu review role  
**Captured:** 2026-11-20 (Asia/Shanghai)  
**No migration / no production connection / no real student data used.**

## 1. Fixed evidence baseline

| Source | Exact HEAD / fingerprint | Current evidence |
|---|---|---|
| `main` | `9db147ac3a5d135d50b90bfea5a7316ce747d90b` | Formal migrations 0001–0037 |
| PR #76 | `78f3716f31403907b6ab254a86cf6df888e5ebfe` | Draft; 24/24 checks passed at captured HEAD |
| PR #77 | `380fec99da5151fd28b8a5d3a2acaaa7292d3c23` | Draft; current 0042 candidate reviewed; 19/21 checks passed, 2 failed |
| PR #83 | `80cbf0d98b346f12587568689196e07a8f6e481e` | Draft P0/P0.1 docs; 24/24 checks passed at captured HEAD |

A later HEAD invalidates the corresponding PR review and check result. PR #77's previous 21/21 result at an older SHA is not current evidence.

### Key source fingerprints (Git blob SHA)

| File | Blob SHA |
|---|---|
| `database/canonical/migrations/0003_core_consent_access.sql` | `910b2f658ffc9e6d01f2064dd836c38bc91d7e73` |
| `database/canonical/migrations/0007_security_boundary_fixes.sql` | `4d3fc1607aa2d5509aae32bde676fc22f9202dc3` |
| `database/canonical/migrations/0012_service_principal_and_context.sql` | `76c71a750b1964c6ab3e682fb51f4581d7bcefd4` |
| `database/canonical/migrations/0019_education_master_and_records.sql` | `6c4fa48bec57d02ae9766b3636fe6ba7999a3de4` |
| `database/canonical/migrations/0021_operations_entitlement_reference.sql` | `b3502ede5361a45ec92935ee51db15e671b67da4` |
| `database/canonical/migrations/0022_learning_core.sql` | `bc9ca7db0f23ffdd9d8887451e5e0e07eff11ac9` |
| `database/canonical/migrations/0023_application_family_context_resolver.sql` | `d1d474ad7104c78c497acacf633885d8ca8654e6` |
| `database/canonical/migrations/0037_scoped_public_id_projection_read_audit.sql` | `5eaeced372d75699d3b3322625f7fb9da31216a8` |
| `Phoenix Compass/education compass/server/src/auth/session-family-bridge.ts` | `bf0628be53b0bbd7b67e1866adfbf1d0d130f263` |
| `Phoenix Compass/education compass/server/src/services/auth-service.ts` | `f68dc1b7e790ab964d1813ecacc9bf6a4b8205db` |
| `Phoenix Compass/education compass/server/src/services/canonical-family-projection.ts` | `73e64f36df1a5a8a127379bbf1109de0ac038967` |
| `Phoenix Compass/education compass/server/src/services/canonical-learning-catalog.ts` | `e0326a3037fad2bd8b71a5a5b9034e0dfd22a8a1` |
| `Phoenix Compass/education compass/server/src/http/app.ts` | `f3e3fc7a6aa8e2303e49be18cff4da83b863a102` |
| `Phoenix Compass/education compass/server/src/index.ts` | `09b5bf355e44497fb70ce41189ae1f20bc7bf273` |
| `Phoenix Compass/education compass/server/migrations/001_initial_schema.sql` | `6f0bf23e67e9f788890d36acba82ffefd128dbce` |
| PR #77 current 0042 candidate | `de104ac742d9116cb3a1752651695854d871e75d` |
| PR #77 current workspace access service | `6ea747ffd40d5e192ffde536633f91a847db6387` |

Git blob SHAs above identify the exact fetched file versions; they are not represented as SHA-256 hashes.

## 2. Executive findings

| Domain | Result | Decision |
|---|---|---|
| Canonical person/student/family records | REUSE | Existing Canonical identity tables are the target authority |
| Guardian authority and Consent | REUSE | Reuse current live, scoped, revocable authorization checks |
| Single Principal and DB context/ticket lifecycle | REUSE WITH GAP | Keep one Principal/person and existing context/tickets; separate role/capability resolution is incomplete |
| Student-first / Parent-switch routing | GAP | Current app bridge does not resolve Student vs Parent capability or student-specific session operation |
| Teacher identity and class assignment | REUSE WITH GAP | Existing Teacher and assignment model is strong, but single-valued Principal kind blocks a person who is also FAMILY |
| Administrator / Founder capabilities | GAP | Current learning authorization has broad SUPERVISOR, not separate Administrator and Founder grants |
| Shared timetable | REUSE WITH GAP | Teacher conflict and group capacity protection exist; student booking, room resource, delivery mode and timezone semantics are missing |
| Assessment records | REUSE WITH GAP | Append-only academic/score/language records exist; instrument-specific scale/version/review contract is missing |
| Lesson-hour commercial rules | HOLD | No commercial policy or lesson-hour ledger implementation approved |
| Live runtime / installed schema | UNVERIFIED | This review used source and GitHub CI; no private/non-production database connection was available or attempted |

## 3. Identity audit

### 3.1 Canonical identity that can be reused

**REUSE — source verified**

- `core.people` is the natural-person identity.
- `core.student_profiles.person_id` is the student profile identity.
- `core.families` and `core.family_memberships` represent family and time-bounded membership.
- `core.guardian_authorities` records guardian → subject, evidence level, scope, validity and revocation.
- `consent.grants` records purpose/data-class-specific consent, expiry and withdrawal.
- `auth.principals.person_id` is UNIQUE, so the current model already prevents multiple Canonical Principals for one person.
- `integration.legacy_id_mappings` supports verified legacy identity mappings, including Student Profile as an entity kind.
- `auth.external_identities` binds an external issuer/subject to a Canonical Principal.

This is a sound base for one person / one Canonical Student ID / one login Principal.

### 3.2 Existing session and context mechanisms

**REUSE — source verified**

- Migration 0007 adds `backend_start` to `auth.session_contexts`, removes stale contexts, and keys context to backend PID plus backend start.
- `auth.context_exchange_tickets` is a one-use handoff between a separately authenticated binder and application connection.
- Migration 0012 validates principal/channel/assignment again when redeeming a ticket; the ticket expiry is capped at 60 seconds.
- `auth.clear_context()` clears the current backend context.
- The Family projection runtime clears context before binding, uses separate app/binder pools, discards binder state, and in cleanup rolls back, resets role, clears context, verifies empty context, and issues `DISCARD ALL`. Failed cleanup destroys the pooled connection rather than returning it as reusable.
- Canonical family projection also re-checks the source application session after the read through `assertCurrent()`.

**Security review:** backend PID + backend_start protects against PID reuse; ticket redemption revalidates the Principal and Family context; live guardian/Consent checks occur in the protected data-read functions. No source evidence justifies adding a second context-ticket table.

### 3.3 Proven identity/capability gaps

**GAP A — application session is not yet a Student/Parent capability resolver**

Evidence:
- Application `AuthService` defines `UserRole = family_user | admin`; WeChat login creates `family_user` accounts.
- `createSessionFamilyResolver()` only accepts `family_user`, requires exactly one application Family, and explicitly rejects operation `student`; it supports only `family` and `students`.
- The application bootstrap calls `loadApplicationSessionProjection(process.env, { auth, store })` without injecting a broker verifier/token adapter. The session bridge is default-off; enabling it without the trusted broker fails closed.
- The normal application server therefore does not currently provide a verified, production Student-vs-Parent capability resolver in source composition.
- Canonical migration 0023 resolves an application family mapping to a FAMILY Principal and issues a FAMILY context ticket. It does not decide whether the actor is a Student, Parent, or both.
- Canonical migration 0037 can return a student self-summary or guardian-authorized student summaries, but that is a data projection, not the login routing policy.

**Impact:** Founder’s Student-default / explicit Parent switch is a product decision, not an implemented runtime capability. The server must derive:
- Student capability from the actor's own `core.student_profiles` record.
- Parent capability from current verified `core.guardian_authorities`, appropriate scope and applicable Consent.
- Default Student when both capabilities exist.
- Parent-only default to Family OS.
- Deny/resolve if neither capability is valid.

The browser-selected view is never authorization.

**GAP B — one Principal has only one `principal_kind`**

Evidence:
- `auth.principals.person_id` is UNIQUE, but `principal_kind` is a single value.
- Formal allowed kinds after migration 0022 are FAMILY, ADVISOR, CHANNEL, SERVICE, TEACHER and SUPERVISOR.
- `auth.validate_context_request()` maps FAMILY to FAMILY channel and TEACHER/SUPERVISOR to STAFF channel.
- `learning.current_staff_kind()` returns the Principal's single `principal_kind`.
- `learning.teacher_has_class_access()` requires `current_staff_kind()='TEACHER'` plus an active class assignment and Learning Consent.

**Impact:** A person who is both a Parent/Student (FAMILY Principal) and Teacher cannot currently use the same Principal for both FAMILY and STAFF context. Creating a second Principal is blocked by the unique person constraint and would violate Founder’s one-person/one-account rule. PR #77's role binding does not solve this by itself because the existing context validator and `learning.current_staff_kind()` still depend on `principal_kind`.

**Required direction:** decouple human capabilities from the Principal's single kind. Derive Student and Parent from existing domain facts; derive Teacher from the existing `learning.teacher` identity plus active `teacher_assignment`; provide a separately revocable, auditable Administrator/Founder grant only where needed. Do not add a generic multi-tenant organization role system to solve this Academy requirement.

**GAP C — Administrator and Founder are not separate Academy capabilities**

Evidence:
- `learning.can_manage_learning()` permits the internal service or `current_staff_kind()='SUPERVISOR'`.
- Supervisor can manage course, class, teacher assignment and schedule, and publish/retract learning outputs.
- No distinct Administrator vs Founder capability is represented in the reviewed formal learning authorization model.

**Impact:** The requested role separation (Administrator manages teaching operations; Founder has global oversight) is not fully expressible without a narrow role/capability contract. Reuse Supervisor only if Founder explicitly accepts its current breadth; otherwise define minimal scoped grants.

### 3.4 Legacy application data boundary

**GAP / runtime UNVERIFIED**

The Education Compass application source still contains its own application-store tables for `users`, `families`, `students`, `assessments`, reports, orders and guardian consents. Its `PostgresStore` is separate from Canonical PostgreSQL, and the session bridge maps application Family identity but explicitly does not approve single-student translation from Family mapping alone.

Canonical migration 0023 maps the application Family ID; the current bridge does not resolve the application's local Student ID to the Canonical Student ID for student-specific operations. Although `integration.legacy_id_mappings` can represent a Student Profile mapping, this exact resolver path is not implemented in the reviewed application bridge.

**Decision:** Canonical remains the only future authority for Person/Student/Family identity. Do not build another Academy student master. Before P1 runtime wiring, define the verified mapping from existing application student references to Canonical Student IDs and decide which application-local records remain operational versus become read projections. The actual deployed database and current data state are UNVERIFIED; source presence does not prove a live database remains active.

## 4. PR #77 / 0042 current re-review

**Current disposition for Academic Studio: HOLD / DO NOT DEPEND ON 0042.**

Current PR #77 head: `380fec99da5151fd28b8a5d3a2acaaa7292d3c23`. Current candidate SQL blob: `de104ac742d9116cb3a1752651695854d871e75d`.

The current 0042:
- adds `core.organization_workspace_profiles` (HEADQUARTERS / CHANNEL);
- adds `core.organization_memberships`;
- adds `auth.workspace_role_bindings`;
- adds persistent `auth.workspace_sessions`;
- adds organization scope to service project assignments;
- adds workspace IDs to the existing context ticket and session-context rows;
- does **not** create a second context-ticket table or a second session-context table.

The persistent workspace session is therefore not literally a duplicate of `auth.session_contexts`; it is a second durable workspace-selection/revocation lifecycle linked to the existing ephemeral context. The existing Canonical context/ticket mechanism already handles backend-bound request context. For Academic Studio, no proven requirement currently justifies this extra persistent lifecycle; use the existing authenticated app session, a trusted capability resolver and existing context/ticket functions unless a concrete revocation/authorization test proves otherwise.

The organization membership and project-assignment organization scopes are outside the shared global teaching-resource model. They may be reviewed separately for Corporate OS channel/partner workflows, but they must not become teaching tenants or regional teacher partitions.

**Security finding:** 0042's workspace role codes alone do not fix the single-valued Principal-kind gap. Its workspace context eventually enters STAFF channel, while formal `auth.validate_context_request()` and `learning.current_staff_kind()` still rely on Principal kind TEACHER/SUPERVISOR. A FAMILY Principal with an added STAFF_TEACHER workspace binding is not thereby authorized as a Teacher by the existing learning functions.

**CI:** exact current PR #77 head has 21 checks: 19 success, 2 failures (`workspace-authorization (16)`, `workspace-authorization (17)`). The earlier 21/21 result belongs to a previous head and is not current. Failure root cause was not inferred from unavailable annotations/log detail.

## 5. Shared teaching resource audit

### 5.1 Reuse — existing Canonical learning model

| Object | Source-verified capability |
|---|---|
| `learning.course`, `course_version` | Published course and effective-dated versions |
| `learning.teacher` | Teacher keyed to `core.people` |
| `learning.class` | Course-version class, date range and capacity |
| `learning.enrollment` | Student course enrollment, separate from school/university study enrollment |
| `learning.teacher_assignment` | Class-scoped teacher, role, validity and revocation |
| `learning.enrollment_class` | Student enrollment placed into a class |
| `learning.schedule_slot` | Scheduled interval, teacher, optional room label and status |
| `learning.attendance_record`, `attendance_correction` | Per-enrollment attendance and append-only correction history |
| `learning.after_class_card`, `publication` | Teacher draft/submission and family publication/retraction history |
| `learning.stage_report` | Teacher-authored stage report with DRAFT/SUBMITTED/PUBLISHED/RETRACTED lifecycle |

### 5.2 Existing concurrency/security protections

**REUSE — source verified**
- `learning.schedule_slot` has a GiST exclusion constraint preventing overlapping non-cancelled slots for the same teacher.
- `learning.create_schedule_slot()` requires an active teacher assignment that covers the whole slot.
- `learning.place_enrollment_in_class()` locks the class row before counting active seats and inserting the class placement, serializing attempts for the last group seat.
- `learning.teacher_has_class_access()` checks active, unrevoked, time-valid teacher assignment, class state and Learning Consent.
- Learning tables are ENABLE ROW LEVEL SECURITY and FORCE ROW LEVEL SECURITY; direct table reads are denied and runtime access is through audited functions.

### 5.3 Proven resource gaps

**GAP A — student overlap across different classes**

No per-student slot reservation/booking object was found in formal migrations 0001–0037. Attendance is recorded after a class, not as a future reservation. Teacher exclusion does not prevent one student from being placed into two classes with overlapping schedule slots. A database-level concurrency-safe student reservation invariant is needed before booking is live.

**GAP B — physical room identity and collision**

`learning.schedule_slot.room_label` is free text. There is no stable room ID, room inventory, room location/capacity record or room-overlap constraint. Room collision cannot be reliably enforced from text labels.

**GAP C — delivery mode / online meeting contract**

The formal class/slot model has no explicit ONLINE / ONSITE / HYBRID mode, no private meeting-provider reference and no per-participant attendance mode for hybrid delivery. Founder has clarified the target authority: the assigned teacher sets the session mode; for a HYBRID session, the teacher assigns each enrolled student to Online or Onsite participation. Students/parents are read-only and cannot self-select or change the mode. Any teacher-directed change must be audited, notify affected participants and atomically re-check resource conflicts/capacity. The meeting-provider adapter remains a product/integration contract, not an existing verified feature.

**GAP D — timezone presentation policy**

Authoritative timestamps use `timestamptz`, which preserves instants, but the slot schema does not store the intended IANA timezone/local scheduling context. The user-facing timezone, DST fold/gap handling and any travel/setup buffers need an explicit contract before booking implementation.

**No migration yet:** reuse current course/class/teacher/enrollment/slot entities. Add only the minimum student booking and stable room references after Founder confirms hybrid, timezone and room inventory policy.

## 6. Assessment and growth record audit

### 6.1 Reuse

- `education.academic_record`: education history and evidence reference.
- `education.score_record`: append-only numeric subject score, exam date and source.
- `education.language_test`: append-only test kind, JSON score payload, test date and optional evidence document.
- `learning.stage_report`: teacher learning narrative with submit/publish/retract lifecycle.
- `learning.publication`: immutable publication/retraction events.
- `docs.documents`: existing evidence document authority.
- `audit`: existing access/write decision audit.

### 6.2 Gaps

- `education.score_record.score` has no score-scale identifier, instrument edition, dimension or evidence-document FK.
- `education.language_test.score_json` is only constrained to a non-empty JSON object; it does not validate CAT4/DSE/A-Level/IELTS/JLPT instrument-specific fields, scale or version.
- Neither formal score object has a teacher review/publication/supersession lifecycle equivalent to `learning.stage_report`.
- `academic_record` records school/level history, not a standardized assessment attempt.
- `learning.stage_report` is a teacher progress narrative, not a CAT4/DSE/A-Level/IELTS/JLPT score authority.
- The Education Compass application also has its own application-store `assessments` questionnaire/report model; this is not the Canonical standardized-test registry and is not proof of an instrument contract.

**Result:** preserve existing facts and documents; add instrument-specific scale/version/dimension/provenance and review metadata only after the six instrument contracts and evidence/licensing/retention rules are approved. The timeline is a read projection; no cross-scale conversion or average.

## 7. Commercial boundary

`operations_ref.entitlement_ref` and `entitlement_event` are immutable references to grants/revocations from `phoenix_operations`; `learning.create_enrollment()` checks for a valid COURSE entitlement. They are not a lesson-hour balance ledger, payment/refund ledger or teacher settlement ledger.

The Education Compass application store has order/payment/refund records for its existing report product; that does not establish a lesson-package commercial model.

**HOLD remains:** no package pricing, payment activation, hour debit, cancellation/no-show, make-up, expiry, refund calculation or teacher settlement implementation. The only safe next output is a Founder decision packet.

## 8. Direct Xuanwu-style security second pass

This is an assistant-performed security review, not a separate human attestation.

1. **Principal-kind conflict:** one Principal per person is good for identity uniqueness, but the single `principal_kind` value is being used as a role/channel discriminator. This blocks a person from holding FAMILY and TEACHER capabilities at once. This is the highest-priority identity architecture gap.
2. **Parent authorization:** Family membership alone must not imply child-record authority. Existing projection checks verified guardian authority; learning reads additionally require LEARNING scope and active Learning Consent. Keep these checks at protected reads/writes, not just navigation.
3. **Self access:** student self-read is distinct from parent access. Parent switching must be re-evaluated server-side on each protected request.
4. **Revocation:** Guardian authority and Consent are checked live by relevant Canonical functions; app-session revocation is checked by `AuthService.authenticate()` / `assertCurrent()` in the application bridge. This is only as strong as the unverified production composition and cache behavior.
5. **Connection pool:** backend_start, one-use ticket, clear_context, role reset and DISCARD ALL provide useful controls. The production pool configuration and real runtime wiring remain UNVERIFIED.
6. **0042:** workspace binding version checks and workspace-session revocation are additional controls, but add a durable lifecycle and organization model not yet justified for Academy. It does not by itself repair Principal-kind dual-role authorization.
7. **Teacher:** active teacher assignment and Learning Consent are checked by the protected learning functions. Student cross-course booking and room conflict are not enforced by current schema.
8. **Assessment privacy:** unreviewed AI proposals must not be placed in published formal score records. Existing stage-report publication is a reusable pattern, but formal exam results need instrument-specific provenance and visibility.
9. **Partner boundary:** CRM/channel attribution must never create Teacher or Parent capability. No Academy read authority should derive from partner referral.

## 9. P0.1 decision matrix

| Item | Result | Evidence / next action |
|---|---|---|
| One Canonical Person/Student/Family | REUSE | Formal 0003 |
| One Principal per Person | REUSE | Formal 0003; preserve unique person |
| Student + Parent capability resolver | GAP | App bridge only family/students; no Student default resolver |
| One Principal with multiple capabilities | GAP | principal_kind is single-valued; STAFF context tied to TEACHER/SUPERVISOR |
| Existing session/context/ticket | REUSE | 0007/0012/0023; no duplicate context tables |
| Production identity provider wiring | UNVERIFIED | broker seam not wired in normal bootstrap |
| Teacher identity and class assignment | REUSE | 0022 |
| Administrator/Founder capability separation | GAP | only broad SUPERVISOR/internal service management path found |
| Teacher schedule conflict | REUSE | 0022 exclusion constraint |
| Group seat capacity | REUSE | 0022 class-row lock in placement function |
| Student future booking conflict | GAP | no per-student slot booking |
| Room inventory/conflict | GAP | room_label text only |
| Online/offline/hybrid contract | GAP | no explicit mode/provider model |
| Timezone/DST presentation contract | GAP | timestamptz exists; IANA zone policy absent |
| Academic/score/language fact records | REUSE | 0019 append-only objects |
| Instrument-specific score contract | GAP | scale/version/dimension/review/provenance incomplete |
| Teacher stage-report publication | REUSE | 0022 |
| Lesson-hour ledger / commercial policy | HOLD | no implementation authorized |
| Actual non-production schema state | UNVERIFIED | source/CI only; no private DB connection |
| 0042 as Academy dependency | HOLD | current candidate includes org model + workspace_sessions; 19/21 CI only |

## 10. Minimum next technical proposal (not SQL approval)

After Founder approves the unresolved product contracts, Codex should draft one minimal forward-migration proposal with these boundaries:

1. **Identity/capability:** keep one Principal/person and existing context/tickets. Decouple capabilities from the single `principal_kind` discriminator. Derive Student, Parent and Teacher from existing Canonical records; introduce only the smallest auditable/revocable Founder/Administrator grant needed. No new identity, session or ticket subsystem.
2. **Student/room scheduling:** reuse `learning.schedule_slot`; add per-student reservation enforcement and stable room identity only after resource/timezone/hybrid policy is approved.
3. **Assessments:** extend existing `education.score_record` / `language_test` only if an instrument-specific normalized contract can be validated without losing backward compatibility; otherwise propose a minimal instrument/attempt/result object with explicit score scale and review/provenance. No single generic score.
4. **Application integration:** map legacy application student references to Canonical Student IDs via verified `integration.legacy_id_mappings` and replace the current family-only bridge with a trusted capability resolver. Do not keep the application Student table as a second authority.
5. **Commercial:** explicitly exclude all course-package payment, lesson-hour debit, refund and settlement structures while HOLD remains.

Every proposed object must have a source-backed GAP and exact RLS/ACL, idempotency, concurrency and rollback tests. No migration number allocated.

## 11. Remaining UNVERIFIED items — no Jimson assignment yet

These are not tasks to relay to Jimson automatically:
- actual installed migration ledger and live role grants in the designated non-production PG16/17 instances;
- actual deployed broker/JWKS adapter, secret configuration and production session resolver;
- actual application DATABASE_URL target and whether the legacy app-store schema is still deployed/used;
- real room inventory, provider account capability and local timezone policy;
- licensed CAT4/IELTS/JLPT/DSE result fields and retention rules.

Codex has completed the source and CI checks available through connected tools. No additional Jimson work is justified until an exact private-environment action is identified and Codex cannot access it.

## 12. Gate conclusion

**P0.1 source review: COMPLETE. P0.1 product/contract closure: NOT COMPLETE.**

The evidence supports a small number of real gaps, not a new education platform. The next step is Founder decisions on:
1. how a single person may hold FAMILY + TEACHER + ADMIN/FOUNDER capabilities while keeping one Principal;
2. whether `SUPERVISOR` may serve as Administrator or must be narrowed;
3. timezone/DST policy and online-provider capacity; teacher-controlled Hybrid participation authority is confirmed by Founder;
4. assessment evidence/licensing/review/retention requirements;
5. what the existing Education Compass local student data model should do during the Canonical-only integration.

**No migration number is reserved. No SQL is authorized, installed, merged or deployed.**
