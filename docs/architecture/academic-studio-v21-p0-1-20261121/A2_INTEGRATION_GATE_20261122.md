# A2 integrated authorization and regression gate — 2026-11-22

**Decision: Draft / HOLD.** This is not a migration, install approval, merge decision or production deployment.

## Canonical ownership and collision resolution

PR #92 is the **single** Package A/A2 integrated SQL candidate. It already contains the Founder/Admin grant lifecycle, STUDENT/FAMILY/STAFF context validation and subject-scoped STAFF consent predicates. PR #93 is an independently tested **alternative A1 implementation**, not an additive migration or a prerequisite to installing #92. Both create `learning.academy_staff_grants` and overlap grant/revoke governance functions. Never concatenate their SQL or allocate separate migration numbers. PR #89/#91 S1 also overlap `learning.can_read_sensitive` with #92 and are **not** additive.

The Package A candidate fails closed if the grant table already exists or if the original formal S1 function does not match its pinned baseline. A2 adds an explicit disposable-DB negative test simulating a preinstalled A1 table. The test verifies rejection leaves the Canonical 37-row ledger, ledger digest and original S1 function unchanged, then deletes only the synthetic placeholder table before the independent Package A install. No real A1 installation, live database or production data is involved.

## Covered synthetic regression

- PG16 and PG17 isolated Canonical 0001–0037 installation and candidate smoke.
- Same Principal using FAMILY, STUDENT and global STAFF context through existing one-use tickets.
- Parent view requires live membership, verified authority, matching purpose and current Consent.
- Subject-specific STAFF Learning Consent, consent withdrawal and teacher assignment revocation/reassignment.
- Principal disabling denies subsequent protected reads with existing bound session.
- A1 table overlap refusal, repeat-forward refusal, FORCE RLS and restricted function privileges.
- Original Canonical migration ledger must remain untouched.

## Remaining release blockers

The new overlap regression only simulates A1's table existence. It does **not** prove byte-for-byte interoperability of the entire #93 SQL payload (which must not be installed in addition to #92). Before promotion, record independent security approval and verify full cross-family/cross-student negative matrices, backend pool and login separation, competing grant/revoke transactions, rollback and backup/restore evidence. An isolated CI success is not production acceptance.

**No merge, no numbered migration, no shared environment installation, no real learner records, no B0 #94 or C0 #95 incorporation without a separate Founder gate.**
