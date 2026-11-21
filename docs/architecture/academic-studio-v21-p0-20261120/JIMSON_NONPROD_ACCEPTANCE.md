# Jimson nonproduction acceptance manual

**This P0 branch is not a database deployment package.** The steps below are read-only or static-preview checks for a Jimson reviewer; they do not require credentials or a server.

1. Fix the source: `git fetch origin main refs/pull/76/head:refs/remotes/origin/pr-76-head refs/pull/77/head:refs/remotes/origin/pr-77-head`, then record `git rev-parse HEAD`, `git rev-parse origin/main`, and `gh pr view 76/77 --json headRefOid,statusCheckRollup`. Re-run if either PR head changes. Run `node docs/architecture/academic-studio-v21-p0-20261120/capture-source-evidence.mjs` from repository root to regenerate the manifest.
2. Confirm formal source: `rg --files database/canonical/migrations -g '00*.sql'`; count 37, and `rg -n 'CREATE TABLE education.study_enrollments' database/canonical/migrations -g '*.sql'` should return no match. Verify 0038/0039 and 0042 are under `forward-candidates`, not installed formal source.
3. Review [0042 findings](CANDIDATE_0042_REVIEW.md) against its exact candidate SHA. Do not execute it in an existing database. Record whether PR #77 is withdrawn, revised or retained for its separate Enterprise scope.
4. Open [preview index](../../../website/phoenix-nova-website-v5/docs/previews/academic-studio-v21/index.html) from a local file or a localhost static server. Inspect all six pages at desktop and 390 px mobile width. Confirm the approved logo is the existing PNG and the base palette is deepsea/celadon/champagne/ivory; no old Navy primary. All learner names/metrics are synthetic.
5. Check role flows on paper: student self, verified guardian, teacher assigned to class, teaching admin, one person with two capabilities, unassigned teacher, revoked guardian, Partner referral. Any absent real evidence remains HOLD.
6. For each later migration, use a fresh isolated PG16 and PG17 database with synthetic data; verify install/repeat/drift, concurrent booking, immutable event history, RLS/ACL negative cases, backup/restore and application rollback. Record exact command, version, output, migration hash and run ID. Do not substitute this P0 static validation for that gate.

Acceptance result for **this** branch: architecture and preview review only. No formal migration, live API, payment connection, identity-provider mapping, PG16/17 candidate test or runtime service binding is claimed.
