# Canonical governance bootstrap candidate

Current status (2026-11-03): **PR #37 MERGED / PR #36 MERGED**. CODEOWNERS is present on main. The sole future engineering authority is `database/canonical/`; see the [post-merge authority record](../docs/database/postmerge-p1-20261103/CANONICAL_POSTMERGE_AUTHORITY_RECORD_V1.0.md). Neither code merge authorizes a runtime rollout. The following bootstrap explanation is preserved as the historical pre-merge procedure, not the current PR status.

Historical task: `PHOENIX-CANONICAL-PR36-NON-JIMSON-CLOSEOUT-20261102`.

This PR contains only CODEOWNERS, the required-check workflow and this governance explanation. It contains no Canonical Migration, database authority, app change or rollout. The existing Canonical integration remains [Draft PR #36](https://github.com/yvettfang-netizen/phoenix/pull/36). Neither PR is authorized to merge by this document.

## Why a separate bootstrap

GitHub reads CODEOWNERS from the target base branch. A file proposed only in PR36 cannot yet activate code-owner review on main. Main already requires one approving review, last-push approval, five exact Canonical/security checks, strict updates and admin enforcement. Force push and deletion are disabled. This candidate does not change those rules or grant a bypass.

## Required checks without a database copy

All pull requests run the workflow without path filters. It generates the existing five required contexts and the existing three application regression contexts.

| Candidate/base state | Actual PostgreSQL test source | Meaning of a successful PG job |
|---|---|---|
| Complete Canonical tree in the candidate | Candidate's `database/canonical/` | Real Fresh/Upgrade/Repeat/Drift/Atomicity tests against that candidate tree |
| No Canonical tree in candidate **and** base | Immutable public PR36 snapshot `6951a9f275ec96098fd0e559804324ed68f93634`, checked out temporarily with sparse checkout | Real tests against the explicitly pinned 0035 verification fixture; **not** a claim that main or this governance PR includes Canonical |
| Base has Canonical but candidate removes it; or candidate is partial | Rejected before tests | Failure; never fallback, skip or fabricated PASS |

The pinned snapshot is test-only. Its 35 Migration names/digests and verification harness bytes are checked before each matrix test. If the candidate has Canonical, its 0001–0035 bytes and harness must match the immutable reviewed reference. A future approved migration or harness change requires an independently reviewed gate update; silently widening the inventory is rejected.

Each of the four PG jobs runs the existing synthetic smoke: PG16/PG17, Fresh/0025-to-0035 Upgrade, repeat, checksum drift refusal and forced atomic rollback. The step summary prints `CANDIDATE_TREE` or `PINNED_0035_REHEARSAL` and the tested commit. Missing Canonical during bootstrap is never reported as a skipped database test. Full browser E2E remains `NOT RUN / APPLICATION INTEGRATION GATE`; these are code/database checks.

Only read-only GitHub permissions and public immutable source are used. Both checkouts disable persisted credentials. No private source evidence, remote server, production key or real record is needed. Databases and credentials are disposable and synthetic.

## Owner decision and merge order

1. Independently review this three-file governance PR and its actual eight checks. Founder approves any merge separately.
2. Merge the approved bootstrap first. Confirm CODEOWNERS and the unfiltered workflow exist on main and the unchanged branch rules remain effective.
3. Refresh PR36 against main and rerun all checks. PR36 carries the same governance blobs to avoid reverting this workflow. It still needs its own independent reviews, M0–M5 acceptance and Founder merge approval.
4. Until step 2, code-owner activation on main is HOLD. Until PR36 is approved and merged, main has no Canonical authority transfer. Production, Tencent, real data and 0036 execution remain HOLD throughout.

If no eligible independent reviewer is available for the bootstrap, review approval remains the concrete blocker. Do not disable protection, self-approve, force push or use admin bypass.
