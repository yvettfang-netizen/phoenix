# Security and branch protection report

**Gate 2: PASS for the current allowlisted candidate files; HOLD for release governance. Gate 4 branch controls: FAIL.** Audit date: 2026-11-02. No production environment was contacted.

| Check | Evidence | Result |
|---|---|---|
| Private source identity | Private default branch `codex/canonical-private-clean-baseline` HEAD [`3af6ba19…`](https://github.com/yvettfang-netizen/phoenix-canonical-db/commit/3af6ba19a96a458dc20cb0f4493bed10aee7028a); five-commit clean-baseline history. | PASS |
| Private source secret CI | [Canonical secret scan run 41386265299](https://github.com/yvettfang-netizen/phoenix-canonical-db/actions/runs/41386265299), completed success on exact source HEAD. An earlier run at `60b2fb5…` failed; later workflow scope was repaired and the exact HEAD reran successfully. | PASS for current clean baseline; historical mixed branches excluded |
| SQL byte integrity | 35 copied SQL files match private-source SHA-256 pairwise; manifest lists each digest. | PASS |
| Candidate secret scan | Pinned Gitleaks `dir` on `database/canonical/`, `docs/database/premerge-0035/` and the new workflow: zero findings, exit 0 locally. The same allowlisted paths passed [PR #36 CI scan](https://github.com/yvettfang-netizen/phoenix/actions/runs/41400628455) on commit `c2d755f6480999d00d35d8d4f1122682d78bdc40`. Re-run after any report edit. | PASS for that commit |
| Topology and personal data | Targeted candidate search for server IP, private-key marker, inline credential and URL userinfo found no actual value. The one `POSTGRES_PASSWORD=$secret` line writes a randomly generated synthetic password to an ephemeral env file; no literal secret is committed. | PASS for candidate text search, not a universal proof |
| Public Git history | Integration branch starts at public [`main@259753248ff54b07fd9c52f270e45ae1c877bc09`](https://github.com/yvettfang-netizen/phoenix/commit/259753248ff54b07fd9c52f270e45ae1c877bc09) and copies files; it does not merge the private five-commit history or the old private mixed branches. Existing public main history contains unrelated applications and was not certified by this candidate scan. | PASS for no private-history import; HOLD for any claim of full existing-history clearance |
| CI artifacts | New workflow runs isolated disposable tests and does not upload env files, backup dumps, pgpass, server logs or raw data. GitHub job logs contain only synthetic output and hashes. [Current verified workflow run](https://github.com/yvettfang-netizen/phoenix/actions/runs/41400628455) passed all eight jobs. | PASS on cited commit; rerun required for later edits |
| `phoenix/main` protection | `gh api repos/yvettfang-netizen/phoenix/branches/main/protection` returned HTTP 404 `Branch not protected`. | **FAIL** |
| `CODEOWNERS` | `.github/CODEOWNERS` absent on current main. No reviewer GitHub handles were invented. | **FAIL** |

Current open public PRs include Identity and Health work on or toward `main` (#35, #33, #34), plus older drafts. Rebase/merge conflict and app regression must be rechecked at the actual merge gate. The private M0–M5 PR #2–#7 chain is not merged into the public repository.

Before merge, a repository owner must set main branch protection or an equivalent ruleset (required pull request review, required Canonical PG16/PG17 CI, no force push, no bypass for integration) and add verified GitHub reviewer identities to CODEOWNERS for `database/canonical/` and these gate docs. This report records the missing controls; it does not treat their absence as an approval to merge.

No source Migration was changed to pass scanning. Any new finding is handled by the process in [`PUBLIC_RELEASE_ALLOWLIST.md`](PUBLIC_RELEASE_ALLOWLIST.md).
