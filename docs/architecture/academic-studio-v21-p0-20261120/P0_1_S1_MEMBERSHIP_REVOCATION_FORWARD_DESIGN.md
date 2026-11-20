# P0.1-S1 — Family Membership Revocation Forward Design

**Status: APPROVED FOR DESIGN ONLY · NO SQL AUTHORED · NO MIGRATION NUMBER ALLOCATED**

**Decision authority:** Founder  
**Design baseline:** Canonical `main@9db147ac3a5d135d50b90bfea5a7316ce747d90b`; Academic Studio PR #83 current reviewed head `3582c468823ede68b093aaab46ea352febac38df`; P0.1 technical evidence PR #85.  
**Scope:** fix the proven case where an already-bound FAMILY context continues to read another family member's published Learning record after the acting guardian's family membership has ended.

This document is a design artifact only. It contains no executable migration, does not reserve a migration number, and does not authorize candidate installation, shared non-production execution, merge or deployment.

## 1. Evidence and exact source boundary

### 1.1 Proven defect

The P0.1 disposable PG16 and PG17 probes in PR #85 redeemed a one-use context ticket, read one published Learning card, ended the actor's family membership through a separate connection, and repeated the read on the same app backend.

Observed on both versions:

```text
before_membership_revoke=1
after_membership_revoke=1
```

The finding is specifically about the already-bound guardian reading a subject's Learning record. It is not evidence that every Family projection has the same defect.

### 1.2 Source call path

| Source | Existing behavior | Finding |
|---|---|---|
| Migration 0003 `core.family_memberships` | Stores family/person membership and `valid_from` / `valid_until` | Reuse; no new membership table |
| Migration 0003 `core.current_actor_is_family_member()` | Tests the current context actor's membership using `transaction_timestamp()` | Existing helper; do not change globally in this narrow fix |
| Migration 0007 / 0012 `auth.validate_context_request()` | Checks membership at ticket issuance/redemption using `clock_timestamp()` | Necessary entry check, but not a continuing grant |
| Migration 0009 `auth.write_context_is_live()` | Checks backend PID + backend start + context expiry using `clock_timestamp()` | Reuse; context liveness is not membership liveness |
| Migration 0022 `learning.can_read_sensitive()` | Checks live context, matching family, guardian authority and Learning Consent; does not recheck actor membership | **S1 defect location** |
| Migration 0022 `learning.read_published_card()` | Calls `learning.can_read_sensitive()` | Affected read |
| Migration 0022 `learning.read_published_stage_report()` | Calls `learning.can_read_sensitive()` | Affected read |
| Migration 0037 `core.read_projection_summary()` | Rechecks actor membership and student membership with `clock_timestamp()` | Existing Family projection guard; reuse unchanged |

A source scan of the six relevant formal migrations found only two Learning read wrappers calling `learning.can_read_sensitive()`: the published after-class card and published stage report. The two wrappers therefore share one narrow authorization fix.

### 1.3 Exact source fingerprints

These are Git blob SHAs, not SHA-256 file digests.

| Formal source | Git blob SHA |
|---|---|
| `0003_core_consent_access.sql` | `910b2f658ffc9e6d01f2064dd836c38bc91d7e73` |
| `0007_security_boundary_fixes.sql` | `4d3fc1607aa2d5509aae32bde676fc22f9202dc3` |
| `0009_application_write_api.sql` | `d0269eee89dc4978be8e5f30c8fe7bccf248502a` |
| `0012_service_principal_and_context.sql` | `76c71a750b1964c6ab3e682fb51f4581d7bcefd4` |
| `0022_learning_core.sql` | `bc9ca7db0f23ffdd9d8887451e5e0e07eff11ac9` |
| `0037_scoped_public_id_projection_read_audit.sql` | `5eaeced372d75699d3b3322625f7fb9da31216a8` |

## 2. Minimum proposed change

**One existing function only:** replace the body of `learning.can_read_sensitive(uuid,uuid,uuid)` in a new forward migration.

Keep unchanged:

- Function signature, return type, volatility, `SECURITY DEFINER` and hardened `search_path`.
- `auth.write_context_is_live()` and context-family equality.
- Existing student self-read branch.
- Existing verified guardian authority and Learning Consent requirements.
- Existing Teacher assignment and Supervisor branches.
- Existing RLS policies, direct table denial, function grants and audit wrappers.

### 2.1 Guardian branch

For the FAMILY-channel guardian branch, add a live membership predicate over the existing `core.family_memberships` row:

- `family_id = p_family_id`;
- `person_id = auth.current_actor_person_id()`;
- `valid_from <= clock_timestamp()`;
- `valid_until IS NULL OR valid_until > clock_timestamp()`.

This predicate is required **in addition to** the existing verified `LEARNING` guardian authority and active `LEARNING_RECORD / LEARNING` Consent.

Conceptual authorization shape (not a migration file):

```text
FAMILY channel AND (
  actor is the subject
  OR (
    actor has a currently valid membership in this family
    AND verified guardian authority for this subject
    AND active Learning Consent for this subject
  )
)
```

### 2.2 Why the membership check is local to this function

Do not globally redefine `core.current_actor_is_family_member()` in this change. It is also used by existing RLS and consent-grant paths. Its current `transaction_timestamp()` semantics may be intentional for those callers.

A narrowly scoped `EXISTS` against `core.family_memberships` using `clock_timestamp()` inside `learning.can_read_sensitive()` avoids changing unrelated policies and makes wall-clock expiry explicit.

### 2.3 Student self-read must remain separate

Do not place the new membership predicate around the entire FAMILY branch.

The existing `auth.current_actor_person_id() = p_subject_id` self-read branch remains unchanged. The defect is the guardian-to-child branch, not student self access. Ticket issuance/redeeming continues to use the existing 0012 membership check; this design does not introduce a new Student context or change that entry rule.

### 2.4 Staff behavior must remain unchanged

The STAFF branch continues to require the existing Supervisor or active class-scoped Teacher authorization and Learning Consent. A family-membership change must not grant or revoke Teacher access. Teacher assignment revocation remains governed by `learning.teacher_has_class_access()`.

## 3. Transaction and visibility requirements

The new predicate uses `clock_timestamp()` so an expiry that occurs after a transaction starts is not evaluated against the older transaction start time.

A committed membership update must be visible to the next protected read. Therefore:

1. Each protected HTTP read must run in its own short transaction.
2. The request transaction must use PostgreSQL `READ COMMITTED` semantics (the existing default), so a new statement/request sees a membership update committed by another connection.
3. The test must keep the same app backend connection, but commit/finish the first request transaction before the next request transaction begins.
4. If the application ever uses a long-lived `REPEATABLE READ` transaction across requests, the design must fail closed or correct the transaction lifecycle; `clock_timestamp()` alone cannot make a newer committed row version visible through an old repeatable-read snapshot.

The existing Canonical family projection service already begins and commits a bounded read transaction per request and performs pool cleanup. The exact production caller and transaction wrapper for the two Learning read functions must still be traced before implementation; do not infer production wiring from the projection service.

## 4. What is deliberately not changed

- No new table, column, schema, role, policy, trigger or generic authorization framework.
- No new Person, Student, Family, Guardian, Principal, Session, Ticket or Context object.
- No change to `auth.session_contexts`, `auth.context_exchange_tickets`, `auth.bind_context()`, `auth.redeem_context_ticket()` or `auth.clear_context()`.
- No change to 0037 Family projection; it already performs live membership checks.
- No change to course booking, room/student collision, assessment instruments, AI evidence, lesson-hour, payment, refund or settlement scope.
- No 0042 dependency.

## 5. Required negative acceptance — PG16 and PG17

Use synthetic fixtures only, separate binder/app LOGINs, and the same app backend for the before/after read.

| Scenario | Expected |
|---|---|
| Active member + verified guardian + active Learning Consent | Card read allowed |
| Same bound context; membership `valid_until` updated to current time and committed by a second connection | Next request denies |
| Same bound context; membership expires naturally while the backend remains connected | Next request denies |
| Membership row removed/revoked before next request | Next request denies |
| Guardian authority revoked/expired | Next request denies |
| Learning Consent withdrawn/expired | Next request denies |
| Student reads own record through existing self branch | Existing behavior preserved |
| Family A actor requests Family B subject | Deny |
| Teacher with active assignment and Consent | Existing behavior preserved |
| Teacher assignment revoked/expired | Existing denial preserved |
| Supervisor read | Existing behavior preserved |
| Published after-class card | Same guardian-membership guard |
| Published stage report | Same guardian-membership guard |
| Direct SELECT against Learning tables | Still denied by RLS/ACL |
| Same backend A → B → A reuse, rollback and context cleanup | No context/role leakage |
| Audit | Denied reads recorded; no protected DTO returned |

### 5.1 Critical same-backend regression sequence

1. App LOGIN redeems a one-use FAMILY context ticket.
2. In request transaction 1, read the guardian's published card: exactly one row.
3. Commit request transaction 1, retaining the same backend connection and bound context.
4. A second database connection expires/revokes the actor's membership and commits.
5. The same app backend begins request transaction 2 at READ COMMITTED.
6. Read the same card and stage report: zero rows / stable deny; no data payload.
7. Confirm student self-read remains as currently specified.
8. Confirm `auth.clear_context()`, role reset and `DISCARD ALL` still leave the pooled connection clean.

Repeat the sequence for PG16 and PG17. Add a separate wall-clock expiry test where the membership's fixed `valid_until` passes while the app backend remains connected.

## 6. Migration and rollback design

- **Migration number:** UNALLOCATED. Before SQL authoring, scan formal migrations, every forward-candidate manifest and open PR branches. Do not reuse 0038/0039 or any occupied candidate number.
- **Migration shape:** one atomic `CREATE OR REPLACE FUNCTION learning.can_read_sensitive(...)` preserving all existing function attributes and branches except the guardian-membership predicate.
- **Data impact:** none expected; no table data changes.
- **RLS/ACL:** no policy or grant changes expected. Verify owner, ACL, function attributes and effective grants before/after in PG16/17.
- **Rollback:** provide an explicit reviewed rollback script restoring the exact pre-change function body and attributes. Do not delete or rewrite a migration ledger entry; rollback is a controlled forward operational action.
- **Integrity:** migration manifest, exact SQL SHA-256, precondition checks, duplicate execution behavior and drift refusal are required in the implementation candidate.
- **Restore:** fresh 0001–0037 install, upgrade path, backup/restore and post-restore negative tests are required.

## 7. Separate current CI and review blockers

These do not change the narrow S1 design, but must be resolved before P0.1 can be called complete:

1. PR #85's report records its 8/8 run for commit `187c885d2613bbca3e80c22762ece2ab97db6973`; the current PR #85 branch head has advanced to `162c2ae4ca50827f250f5b0d4a256174c6fb8834`. Do not transfer the earlier run result to the new HEAD. Its base/mergeability also needs reconciliation with current PR #83.
2. Current PR #83 head `3582c468823ede68b093aaab46ea352febac38df` has a PG16 `family-projection-e2e` failure at browser assertion line 225 after the restore drill; PG17 passes. The log shows the test disabled the synthetic external identity before taking the backup and later expected a successful read after restoring that backup. Treat this as a separate test-state/restore assertion to investigate; do not mark PR #83 fully green until resolved.
3. The named private non-production runtime receipt remains a separate UNVERIFIED item. It is not required to draft this source-based design and does not authorize candidate installation.

## 8. Approval boundary and next gate

**Approved now:** this design, source review, test specification and preparation of a candidate implementation plan.

**Not approved now:** executable SQL, migration-number allocation, migration installation, shared non-production execution, merge, deployment, real learner data or changes to commercial rules.

After this design is independently checked against the exact current branch, return the proposed one-function SQL candidate, manifest, SHA-256, PG16/17 results and rollback script to Founder for a second explicit approval before any installation or merge.

**Founder gate: DESIGN APPROVED · IMPLEMENTATION NOT YET APPROVED.**
