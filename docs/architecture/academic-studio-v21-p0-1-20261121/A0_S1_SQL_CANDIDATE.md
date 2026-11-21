# Academic Studio A0 — Unnumbered S1 Live Family Learning-Read Candidate

**Status:** DRAFT CANDIDATE; Founder-approved for SQL authoring and disposable PG16/17 tests only. **NOT AUTHORIZED** for merge, shared database installation or production use.

## Source and duplicate prevention

- Current Canonical `main`: `f1d8af3f9338b4cb8a1afca48c6d85f1396d9da3` (after PR #90 and candidate reconciliation).
- Formal PostgreSQL migration files: 0001–0037, unchanged.
- Prior work: PR #89 proposed candidate **0045** for the same one-function S1 revocation fix. It is unmerged and its number is not reused in this Draft. This PR takes that verified function logic into an **unnumbered A0** candidate on the approved current-main baseline. Never install A0 and 0045 as separate migrations.
- PR #74's questionnaire/report candidate, PR #77's 0042 workspace subsystem, PR #82's study candidate and PR #86's document/ASKWISE contracts remain distinct and unmerged. No dependencies are added here.
- The A0 SQL and rollback functions have only explanatory header comment changes from PR #89; the protected function behavior and drift fingerprints are retained.

## Exact SQL scope

**Forward file:** `database/canonical/forward-candidates/academic-studio/a0-live-family-access.sql`

Exactly one existing function, `learning.can_read_sensitive(uuid,uuid,uuid)`, is replaced through `CREATE OR REPLACE FUNCTION`. It adds a fresh, live `core.family_memberships` check to the FAMILY guardian-to-child branch before the existing verified LEARNING Guardian Authority and active Learning Consent checks. Student's own read and existing TEACHER/SUPERVISOR branches are left unchanged pending the broader approved capability work.

No table, schema, column, index, RLS policy, role, grant, new session, ticket, teacher, student, course, entitlement, payment or commercial object is introduced. No data migration or copy is involved.

**Manifest:** `a0-manifest.json`, pins exact SQL and rollback SHA-256. **Rollback:** `a0-live-family-access-rollback.sql`; restoring the prior function reopens the guardian-membership revocation gap and is an emergency-only choice requiring compensating denial of affected Learning reads.

## Proposed acceptance tests

The copied and path-adjusted test harness `database/canonical/verification/academic-studio-a0/acceptance.mjs` uses disposable PostgreSQL 16 and 17 containers and synthetic data. It:

1. Installs formal 0001–0037, not another candidate.
2. Applies A0, reapplies, rolls back and re-applies, proving no ledger drift and unchanged owner/ACL.
3. Uses separate real app/binder LOGINs with the same backend connection to test next-request family-member revocation and natural expiry.
4. Tests Student self-read and active Teacher assignment remain valid.
5. Tests withdrawn Learning Consent, Guardian Authority revocation, cross-family denial, Teacher assignment revoke, direct-table ACL and audit denial.
6. Destroys only its uniquely labelled disposable test containers and temporary credentials.

These expected checks are **not a PASS claim** until current-head GitHub Actions finish. A0 is not a replacement for comprehensive Package A, B or C implementation.

## Security limits

- The next-request revocation property is tested under bounded READ COMMITTED transactions. A long-lived REPEATABLE READ snapshot can retain prior MVCC facts; verify real runtime transaction settings before any shared install.
- Real after-class-card and stage-report HTTP endpoints were not found wired on the previously reviewed Education Compass main source. Do not infer browser feature release from DB-only tests.
- No duplicate Principal, student profile, identity broker or workspace session is introduced.
- Parent membership alone is not authority: verified Guardian Authority and Consent remain mandatory for child records.
- A0 includes no global STAFF consent helper, STUDENT context channel or new Academy Admin/Founder grant. Those are the separate follow-on **Package A1** candidate and must be tested on current main plus A0 or an approved equivalent single authority, not silently staged or merged.

## Gate

Founder already approved architecture and candidate authoring, **not installation or merging this SQL**. After exact SHA + PG16/17 pass and direct Xuanwu security review, return installation/merge gate to Founder. No Jimson assignment for source, code or CI work. Jimson only for later private non-production runtime evidence if necessary.

The existing PR #89 0045 candidate remains unmerged during this review; it must be retired/superseded rather than installed alongside A0.
