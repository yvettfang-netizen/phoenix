# Phoenix Nova — Unified Engineering Audit and Package A Gate

**Audit timestamp:** 2026-11-21 (UTC+08)  
**Decision authority:** Founder unified engineering instruction  
**Primary engineering window:** 架构审查与产品设计  
**Evidence rule:** GitHub exact SHA, CI logs and merged state; past chat/Notion status alone is not acceptance evidence.  
**Repo accessible:** `yvettfang-netizen/phoenix` at `f1d8af3f9338b4cb8a1afca48c6d85f1396d9da3`.  
**Second repo:** `phoenix-canonical-db` was not visible to the connected GitHub account. Its latest PR, SHA, CI and applied-migration state are **UNVERIFIED**, not assumed to match the monorepo.

## 1. PR #85–#93 inventory (at audit capture)

| PR | State | HEAD | Exact-head CI snapshot before local fixes | Disposition |
|---|---|---|---|---|
| #85 | DRAFT | `162c2ae4ca50827f250f5b0d4a256174c6fb8834` | 0 checks returned for current head; old evidence is not transferable | Historical PG16/17 review; S1 defect source; no install |
| #86 | DRAFT | `7053a932972d70eef59a91c0937443b174c7ca95` | 8/8 success | Document/ASKWISE design gate HOLD; no target SQL |
| #87 | DRAFT | `9f6b5cfbd2d7dfdadff16492a62e2bac6feebf08` | 8/8 success | S1 design predecessor, not a separate implementation |
| #88 | MERGED | `37e9d0518b9c9d001417fd7cd79b1c40e4b59afb` | 20/20 success | Old Education runtime code retirement; physical deletion separate |
| #89 | DRAFT | `4f0cf980a87ff064cca54fad3ecf9e779a97ada4` | 19/19 success | `0045` S1 candidate; **DO NOT INSTALL** with #91/#92 |
| #90 | MERGED | `dabf09db53c66ac7c52002e1ee717dc42d34a48f` | 8/8 success | Founder-approved P0.1 minimal design baseline |
| #91 | DRAFT | `f81a1fcb4d61aa48c3e10484a48d01a4a8a6fda3` | 19/19 success | A0 duplicate of #89; **DO NOT INSTALL** with #89/#92 |
| #92 | DRAFT | Current branch `codex/academic-studio-v21-p0-1-sql-candidate-20261121` | Original 18/18 success; new exact head must be checked separately | **PRIMARY Package A integration candidate; NOT approved for SQL merge/install** |
| #93 | DRAFT | `52bd4bb8d8395dea43fb8fc3642713513c00d1bf` | 19/19 success | `academy_staff_grants` duplicate table vs #92; **DO NOT INSTALL** with #92 |

The table is a historical snapshot at audit capture. Re-read GitHub for the exact current-head checks before any gate.

## 2. Overlap / collision gate

### #89 ↔ #91 ↔ #92

- #89 and #91 implement the same protected `learning.can_read_sensitive(uuid,uuid,uuid)` live guardian-membership rule. #89 uses candidate number `0045`; #91 uses unnumbered A0. Both remain unmerged.
- #92 also replaces `learning.can_read_sensitive` and includes the live guardian membership guard while adding Student and Staff predicates.
- **Apply at most one implementation** of that function in a Founder-approved forward migration. Never install #89 and #91 and #92 sequentially. Copying all three would be duplicate security work and may undo later authorization semantics.

### #93 ↔ #92

- Both define `learning.academy_staff_grants` and grant/revoke functions.
- Status and lifecycle details differ. These candidates must be reconciled, not combined, and only one grant authority can be installed.
- #92's precondition intentionally refuses installation if the table already exists. This refusal is a protection, not a request to delete #93's table or bypass the guard.

### Other candidates

- #77/0042 organization workspace session subsystem is outside Academy authorization. Never create a second workspace-session/ticket system for Academy.
- #74/0041 Education Compass questionnaire/report flow remains distinct from six standardized assessment score systems.
- Formal Canonical 0001–0037 are immutable. The newest official migration number in `main` is 0037; unmerged candidate identifiers do not confer permission to install or reserve a number.

## 3. Package A source-level audit and correction

**Selected candidate:** Draft PR #92, unnumbered `database/canonical/forward-candidates/academic-studio/001_identity_context.sql`.

### Verified architecture in the candidate

- One existing `auth.principals` row per Person; Student capability from `core.student_profiles`; Parent authority from family/guardian + Consent; Teacher capability from current `learning.teacher` and class assignment.
- Reuses the existing `auth.context_exchange_tickets` and `auth.session_contexts` with `STUDENT` self-only and global `STAFF` contexts. No new login/session/ticket tables.
- Adds one revocable `learning.academy_staff_grants` for Academy Admin/Founder only, forced RLS and private governance functions.
- Keeps the existing Family guardian-to-child branch live-membership guard, Teacher assignment and exact subject-scoped `LEARNING_RECORD/LEARNING` Consent checks.
- Preserves student public ID mapping, no internal Person UUID exposure in self-summary, and audited protected Learning reads.

### Audited fixes and extra test coverage

1. `auth.can_open_parent_view(uuid)` had its PUBLIC EXECUTE revoked but lacked an explicit `phoenix_canonical_app` grant. This made the authorised Parent view inaccessible to the application. Added a narrow app-only EXECUTE; reader and binder remain denied.
2. Added PG16/17 app LOGIN positive/negative checks: Family member without verified Guardian Authority cannot enter Parent view; current verified guardian can.
3. Added fixture proving **one Principal** can lawfully use Parent, Student self-only and Teacher STAFF contexts without creating extra Principals or sessions.
4. Added live teacher-assignment revocation/reassignment checks, distinct from a separate Learning Consent withdrawal check.
5. Added same bound app LOGIN next-read verification: after committed current guardian Family Membership end, Parent view is denied and published Learning card is denied.
6. Existing source/role checks retain owner-controlled bootstrap, no self-grant to Founder, Admin/Founder grant restrictions, direct table/DML denial and full audit.
7. No data migration or production database access. Only disposable synthetic PG16/17 clusters are authorized.

### Xuanwu-style review limitations

This is a model-assisted source/security second pass, **not** an independent signed human audit. Do not infer a deployed app/session router from isolated SQL tests. Review current Parent UI routing and Family/Corporate OS broker integration separately. A bounded READ COMMITTED request can demonstrate next-request revocation; long-lived REPEATABLE READ snapshots or connection leaks can invalidate that guarantee. Those deployment-side transaction settings remain unverified.

## 4. Ordered work — no parallel duplicate delivery

| Gate | Work | Proof required | Disposition |
|---|---|---|---|
| A | Finalize PR #92 one-Principal Student/Parent/Teacher and global STAFF Consent | Exact-head PG16/17 positive/negative, revoke, separate LOGIN, role reset and audit | IN PROGRESS; no SQL merge/install |
| B | One global teacher/class/room timetable, teacher-controlled Online/Onsite/Hybrid, per-student collision/room capacity, append-only change events | Separate candidate and PG16/17 concurrent booking/race, teacher LEAD-only, notifications | NEXT; no second class/teacher DB |
| C | Student-subject-owned CAT4/DSE/A-Level/IELTS/JLPT/Cantonese attempt/result/event authority | Separate candidate; scale isolation, evidence/licensing, review, consent and retention | AFTER B; no data crosswalk |
| Integration | ASKWISE, Family OS, Service Project, Guanlan | Real subject/authorization flow, revocation, read source/timestamp, independent end-to-end test | NOT VERIFIED; no false deployment claim |
| Private operation | Shared DB install/legacy physical cleanup | Exact environment, sanitized receipt, Founder gate | JIMSON ONLY if Codex cannot access |

## 5. Founder decisions and HOLD

Already approved: unified architecture and candidate SQL authoring/disposable-cluster verification; teacher LEAD authority; Hybrid teacher-assigned participation; distinct assessment scales. No new approval needed merely for source review or CI repair.

**Still requires a separate explicit Founder decision:** merging/promoting a restricted SQL candidate, installing it on shared nonproduction/production, or any live deployment. Neither a green CI nor this audit authorizes those operations.

**Commercial HOLD:** package hours, purchase/debit, refunds, no-show, make-up, expiry and teacher settlement are excluded.

**Blocked:** second private `phoenix-canonical-db` repository's actual head and installation cannot be audited through the currently linked GitHub account. Do not conflate the monorepo's formal migration files with the private Canonical DB's applied ledger or remote environment state.

## 6. Definition of engineering closure

Closure is not separate modules showing green CI. A production-capable integrated business loop needs a single trusted Phoenix Core Principal, exact role/capability and Consent enforcement, typed Canonical APIs, Family/Corporate UI, ASKWISE permitted evidence scopes, Service Project state, Guanlan read source and timestamps, audit/rollback and real environment proof. Until each boundary is evidenced, label that stage candidate-only, not released.
