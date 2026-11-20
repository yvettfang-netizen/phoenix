# P0.1 Security, Concurrency and PG16/17 Acceptance Plan

**Status:** TEST PLAN ONLY · tests have not been executed for these proposed objects  
**Execution rule:** Codex runs all available automated tests directly. Jimson is only used for a private non-production action that Codex cannot access. The assistant performs the Xuanwu-style security pass directly.

## 1. Identity and context tests

### Positive
- One active Principal maps to one Person even when the person has Student + Parent + Teacher capabilities.
- Student capability is derived from the actor's own Student Profile.
- Student channel creates a self-only context with no family_id.
- Parent channel is explicitly selected and uses a valid Family context.
- Parent can list only children with current verified Guardian Authority and applicable Consent.
- Teacher can enter STAFF global context using the existing Principal plus active Teacher identity.
- Administrator and Founder can enter STAFF global context only with their respective active Academy grant.
- Existing ADVISOR / PARTNER / INTERNAL context paths remain compatible.
- Existing one-use ticket, 60-second expiry, backend PID + backend_start binding and context cleanup continue to work.

### Negative
- Student attempts to read sibling or parent-only data → DENY.
- Student forges FAMILY context without a valid active family membership → DENY.
- Student/Parent attempts to read family finance from STUDENT context → DENY.
- Parent authority expired/revoked or Consent withdrawn → next protected read DENY.
- Teacher record inactive or assignment expired/revoked → next student/class read/write DENY.
- Teacher attempts to enumerate an unassigned student by changing an ID → DENY.
- Partner referral, CRM assignment or channel membership → no teaching capability.
- Staff account with no Teacher record or Admin/Founder grant → STAFF context DENY.
- Administrator cannot grant Founder to self; Administrator cannot change/revoke Founder grant.
- Revoked Admin/Founder grant invalidates next protected operation and stale context.
- Rebinding FAMILY → STUDENT or STAFF does not retain prior family context.
- Duplicate Principal creation for a person already having one → rejected; existing Principal reused.
- Direct table reads/writes by app/reader LOGIN → DENY; only approved audited functions are executable.

## 2. Scheduling tests

### Concurrency and invariants
- Two overlapping slots for the same teacher → exactly one succeeds (existing exclusion).
- Two overlapping slot reservations for the same student across different classes → exactly one succeeds (proposed exclusion).
- Two overlapping ONSITE/HYBRID slots for the same room → exactly one succeeds (proposed exclusion).
- Two students compete for the last room seat → exactly one succeeds (room lock + capacity check).
- Two students compete for the final class seat → existing class-row lock still permits only one.
- ONLINE slot has no room reservation.
- ONSITE slot requires a room and all participants are ONSITE.
- HYBRID is one slot and one roster; teacher assigns each participant ONLINE or ONSITE.
- Student/Parent attempts to change session mode or participation mode → DENY and no state change.
- Unassigned teacher attempts to change mode → DENY.
- Assigned teacher mode change records actor, timestamp, old/new values and reason.
- Mode/room/time change that creates a teacher/student/room conflict or capacity breach → DENY atomically; prior assignment remains unchanged.
- Rescheduling a slot updates participant conflict ranges atomically.
- Cancelling a slot releases active student/room reservations but retains immutable cancellation evidence.
- Assistant teacher cannot change mode if Founder approves LEAD-only authority.
- Hybrid finalization policy (at least one ONLINE and one ONSITE participant) is tested only if Founder approves that rule.

### Timezone
- Store UTC instants as `timestamptz`; timezone name is a valid IANA zone.
- Nonexistent DST local time → reject.
- Ambiguous DST local time → require explicit offset/selection.
- Display uses stored timezone, not the viewer device timezone unless explicitly selected for display.

## 3. Assessment tests

- CAT4 standard age score is labelled CAT4 and cannot display as IELTS.
- DSE grade cannot be rendered as A-Level grade.
- A-Level grade retains awarding body, syllabus and exam series.
- IELTS Overall and L/R/W/S bands preserve half-band precision and exact IELTS scale.
- JLPT N-level and section scores retain separate scales.
- Cantonese result retains rubric version, skill dimension and assessor.
- Result row requires exactly one numeric or text value and an explicit scale code.
- No cross-instrument average, conversion or ranking is computed.
- Self-reported result is visibly labelled and cannot appear as verified.
- AI_PROPOSAL cannot be PUBLISHED without a qualified human reviewer.
- Parent reads only PUBLISHED results for subjects backed by active Guardian Authority and Consent.
- Student reads only their own published results.
- Teacher reads/reviews only the assigned student's permitted result.
- Evidence document must match family, subject and EDUCATION data class and must not be withdrawn.
- Correction appends a superseding attempt; original remains unchanged.
- Retraction hides the result from future projections while retaining required audit/provenance.

## 4. Database security and migration tests

For each separately approved forward migration on both PostgreSQL 16 and 17:

1. Fresh install from exact formal 0001–0037 plus candidate migration.
2. Re-run candidate migration; idempotency/drift behavior matches the migration contract.
3. Historical 0001–0037 byte hashes remain unchanged.
4. Only approved LOGIN roles can connect; reader/app/binder/migrator remain separated.
5. RLS enabled and FORCE RLS on every new table; direct reads/writes denied.
6. SECURITY DEFINER functions use fixed safe search_path and narrow EXECUTE grants.
7. No public EXECUTE on private helpers.
8. Revoke/expiry/Consent changes are checked at operation time, not only login time.
9. Connection pool reuse proves clear_context, role reset and no stale backend context.
10. Concurrency tests exercise actual simultaneous transactions, not only sequential preflight checks.
11. Immutable event and assessment records reject UPDATE/DELETE; correction uses append/supersede.
12. Backup/restore and rollback rehearsal in disposable non-production clusters.
13. No production credentials, real student records or live database are used.

## 5. Evidence format

Every result must include exact commit SHA, migration SHA-256 (when SQL exists), PostgreSQL version, command, fixture type (synthetic), raw sanitized output, result and test artifact reference. A designed test or CI PASS at a different SHA is not evidence for the current candidate.

No test execution or migration installation is claimed by this design package.
