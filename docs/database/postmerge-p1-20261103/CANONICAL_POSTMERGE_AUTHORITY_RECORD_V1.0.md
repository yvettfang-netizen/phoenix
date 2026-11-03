# Canonical Post-Merge Authority Record V1.0

Task: `PHOENIX-CANONICAL-POSTMERGE-P1-20261103`. Recorded by Codex for Jimson, 2026-11-03. **PASS: code provenance and Founder-directed engineering authority transfer.** Documentation changes are a new review candidate; this is not a retrospective signature or a runtime release.

## Sole engineering source

All future Canonical Schema and Migration releases originate from [`phoenix/database/canonical/`](https://github.com/yvettfang-netizen/phoenix/tree/9355d28667ee9cf4761b4abcdaf959f0ad154820/database/canonical). The private `phoenix-canonical-db` repository retains original provenance, historical PRs, internal proposals and access-controlled test evidence. It must not issue an independent Migration release. No private history or application master data is copied by this task.

The Founder post-merge instruction authorizes this handoff. The policy is recorded here; these documentation changes still require the normal protected PR process. There is one Canonical engineering authority, regardless of the number of disposable test clusters or archival copies.

## Verified anchors

| Evidence | Exact anchor | Result |
|---|---|---|
| Current main, verified at task start and before source audit | `9355d28667ee9cf4761b4abcdaf959f0ad154820` | PASS |
| [PR #36](https://github.com/yvettfang-netizen/phoenix/pull/36) | merged by Jimson614 at 2026-11-03 14:33:15 Asia/Shanghai | PASS |
| [Jimson formal Review](https://github.com/yvettfang-netizen/phoenix/pull/36#pullrequestreview-5748067303) | APPROVED 14:33:05, reviewed `568541ddc96b4842a508eb2c1989f57aa33747d6` | PASS; not repeated |
| Reviewed candidate [CI](https://github.com/yvettfang-netizen/phoenix/actions/runs/41425335127) | reviewed SHA above; 8/8 successful checks | PASS for that candidate |
| Candidate and merged root tree | `8f876efc187c590e35525d5020562c930a2f17e7` | PASS; same tree, different commit |
| Canonical subtree | `032ebba00cbeb08cbb24c767e55f5c2aa606f459` | PASS |
| [PR #37 governance bootstrap](https://github.com/yvettfang-netizen/phoenix/pull/37) | merge `2be78cdb6435fc8a569db05531e5afbe4ab7328f`; source `6d36f8bb21c0a7df4449078a35d2b728b2f19661` | PASS |
| Private historical source | `3af6ba19a96a458dc20cb0f4493bed10aee7028a` | 35 SQL digests match main and reviewed manifest |

Reproduce the immutable inventory with `pwsh -NoProfile -File database/canonical/verification/postmerge/verify-authority.ps1`. The [original source manifest](../premerge-0035/CANONICAL_0035_SOURCE_MANIFEST.md) remains unchanged. Original private M0–M5 PR #2–#7 are historical dependencies, not separate merges into this main branch.

## Status correction and retention

Canonical README and the governance bootstrap now distinguish current merged status from their historical pre-merge instructions. Pre-merge audit/decision documents retain their original results and dates. A merge does not complete missing historical M0–M5 named architecture/security/governance/business acceptance signatures: **HOLD / SIGNATURE EVIDENCE MISSING**. Codex does not sign for Jimson, Founder or independent reviewers.

No old repository, branch, backup, database or mixed history is deleted. No 0001–0035 byte is changed. Existing runtime cluster state is a separate fact; see [runtime gap report](CANONICAL_0035_RUNTIME_GAP_REPORT.md). Future 0036 design moves to this primary engineering branch; private [PR #8](https://github.com/yvettfang-netizen/phoenix-canonical-db/pull/8) remains historical design input, not a second implementation release.

## CI transition plan — implementation HOLD

The required workflow still pins exactly 35 reviewed names/digests and the two original verification files to `6951a9f275ec96098fd0e559804324ed68f93634`. This task only expands the security scan to the new post-merge documents. It does not relax the inventory, fallback, deletion or partial-tree guards.

For an approved 0036 release: introduce a separately reviewed, versioned manifest containing immutable 0001–0035 digests plus the new digest; bind the version to an approved commit; keep the old 0035 compatibility fixture; add fresh-through-new and 0035→new upgrade/restore assertions with explicit ledger/table/policy counts. Review harness changes independently. Keep required check names stable until a separately authorized ruleset update. An arbitrary new SQL file must fail the current gate. No `count >= 35` shortcut, unpinned reference or auto-accepting directory glob is proposed.

Next: review the [0036 contract decision](CANONICAL_0036_DESIGN_DECISION.md), then approve a versioned forward release separately. Runtime deployment remains HOLD.

## Current repository governance

The 2026-11-03 authenticated API read confirms the historical source remains **PRIVATE**, its default is `codex/canonical-private-clean-baseline`, and private design PR #8 is still Draft at the pinned input SHA. Its only observed workflow is a secret scan; no parallel automatic Migration publishing workflow was found. A new handoff note on the private evidence branch corrects the role without deleting old releases or rewriting the default's historical documents.

Main protection was read again: strict updates and admin enforcement; one approving review, code-owner review, last-push approval and stale-review dismissal; five exact required contexts from GitHub Actions app `15368` (`public-candidate-scan` plus PG16/17 Fresh/Upgrade); force push and deletion disabled. CODEOWNERS uses the existing verified `yvettfang-netizen` and `Jimson614` identities. This candidate only extends coverage to its new document path. No permission, reviewer identity or protection setting was changed.
