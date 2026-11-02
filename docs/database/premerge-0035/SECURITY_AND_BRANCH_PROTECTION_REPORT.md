# Security and branch protection report

**Gate 2: PASS for the current allowlisted candidate files; HOLD for full repository-history clearance. Gate 4 branch protection: PASS; CODEOWNERS activation and independent review: HOLD.** Audit date: 2026-11-02. No production environment was contacted.

| Check | Evidence | Result |
|---|---|---|
| Private source identity | Private default branch `codex/canonical-private-clean-baseline` HEAD [`3af6ba19…`](https://github.com/yvettfang-netizen/phoenix-canonical-db/commit/3af6ba19a96a458dc20cb0f4493bed10aee7028a); five-commit clean-baseline history. | PASS |
| Private source secret CI | [Canonical secret scan run 41386265299](https://github.com/yvettfang-netizen/phoenix-canonical-db/actions/runs/41386265299), completed success on exact source HEAD. An earlier run at `60b2fb5…` failed; later workflow scope was repaired and the exact HEAD reran successfully. | PASS for current clean baseline; historical mixed branches excluded |
| SQL byte integrity | 35 copied SQL files match private-source SHA-256 pairwise; manifest lists each digest. | PASS |
| Candidate secret scan | Pinned Gitleaks `dir` on allowlisted candidate paths: zero findings, exit 0 locally. [PR #36 run 41400972844](https://github.com/yvettfang-netizen/phoenix/actions/runs/41400972844) passed on the pre-addendum HEAD `54fd1eb415c5be7d98ffb27b4d30961d69b73c04`. The addendum includes CODEOWNERS in the scan; [live PR checks](https://github.com/yvettfang-netizen/phoenix/pull/36/checks) must pass on its resulting HEAD. | PASS for cited HEAD; new HEAD verification required |
| Topology and personal data | Targeted candidate search for server IP, private-key marker, inline credential and URL userinfo found no actual value. The one `POSTGRES_PASSWORD=$secret` line writes a randomly generated synthetic password to an ephemeral env file; no literal secret is committed. | PASS for candidate text search, not a universal proof |
| Public Git history | Integration branch starts at public [`main@259753248ff54b07fd9c52f270e45ae1c877bc09`](https://github.com/yvettfang-netizen/phoenix/commit/259753248ff54b07fd9c52f270e45ae1c877bc09) and copies files; it does not merge the private five-commit history or the old private mixed branches. Existing public main history contains unrelated applications and was not certified by this candidate scan. | PASS for no private-history import; HOLD for any claim of full existing-history clearance |
| Pre-existing public tracked env file | `git ls-tree origin/main -- ops/phoenix-core-staging/phoenix-core-staging.env` confirms a 344-byte `.env`-suffix file already on public main; it is absent from this PR diff. A redacted pinned Gitleaks scan of that file found zero findings (exit 0). Its operational meaning and full history were not manually certified here. | HOLD for owner review; no claim of a detected credential |
| CI artifacts | New workflow runs isolated disposable tests and does not upload env files, backup dumps, pgpass, server logs or raw data. GitHub job logs contain only synthetic output and hashes. [Pre-addendum workflow run](https://github.com/yvettfang-netizen/phoenix/actions/runs/41400972844) passed all eight jobs. | PASS on cited commit; rerun required for addendum |
| `phoenix/main` protection | Before the addendum, `GET /repos/yvettfang-netizen/phoenix/branches/main/protection` returned 404. The authenticated repository owner enabled protection on 2026-11-02; the subsequent GET returned the settings below. | **PASS, active** |
| Required checks | Five exact `github-actions` (app ID `15368`) contexts: `public-candidate-scan`, `isolated-postgres (16, fresh)`, `isolated-postgres (16, upgrade)`, `isolated-postgres (17, fresh)`, `isolated-postgres (17, upgrade)`; `strict=true`. | **PASS, active** |
| PR and history controls | `enforce_admins=true`; one approving review; stale approvals dismissed; code-owner review and last-push approval required; linear history and conversation resolution required; force push and deletion disabled. No bypass allowance was configured. | **PASS, active** |
| `CODEOWNERS` | The only verified collaborator and authenticated GitHub login is `yvettfang-netizen` (admin). PR #36 adds `.github/CODEOWNERS` for Canonical files, reports and CI. `GET /contents/.github/CODEOWNERS?ref=main` still returns 404: GitHub uses the base-branch file for PR code-owner requests. No 玄武/白虎/麒麟 GitHub identity was invented. | **HOLD until a separately approved governance merge places the file on main** |
| Independent approval availability | `gh pr view 36 --json reviews,reviewRequests` returned empty arrays. The only verified collaborator is also the PR author; the configured review/last-push rules cannot be satisfied by self-approval. | **HOLD until an eligible independent reviewer is granted access and actually reviews** |

Current open public PRs include Identity and Health work on or toward `main` (#35, #33, #34), plus older drafts. Rebase/merge conflict and app regression must be rechecked at the actual merge gate. The private M0–M5 PR #2–#7 chain is not merged into the public repository.

The protection GET returned `strict=true`, checks bound to app ID `15368`, `enforce_admins=true`, `required_approving_review_count=1`, `require_code_owner_reviews=true`, `require_last_push_approval=true`, `dismiss_stale_reviews=true`, `required_linear_history=true`, `allow_force_pushes=false`, `allow_deletions=false`, and `required_conversation_resolution=true`. This is the actual remote rule state, not a design target. The branch rule currently fails closed for other PRs that lack the new workflow, because that workflow has not entered `main`; its PR trigger is now unfiltered to avoid future path-skipped required checks. Keep unrelated merges paused until the governance workflow is approved on main. [GitHub documents](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks) that path-filtered required workflows can leave checks pending.

Remote verification command: `gh api repos/yvettfang-netizen/phoenix/branches/main/protection` with a projection of status checks and review settings. The relevant original response values were:

```text
strict=true; app_id=15368 for all five required contexts
admin=true; reviews=1; codeowners=true; last_push=true; stale=true
linear=true; force=false; deletions=false; conversation=true
```

`gh pr view 36 --json reviews,reviewRequests` returned `reviews=[]` and `reviewRequests=[]`. `gh api repos/yvettfang-netizen/phoenix/collaborators --paginate` returned only `yvettfang-netizen` with admin/push permission. These reads establish the missing independent reviewer; they do not imply one has signed.

The verified owner login in CODEOWNERS is a GitHub account, not an independent 玄武/白虎/麒麟 signature. The file's proposed content is reviewable in [Draft PR #36](https://github.com/yvettfang-netizen/phoenix/pull/36); it is not yet effective on `main`. The missing reviewer and base-branch CODEOWNERS prevent a truthful merge-ready conclusion.

No source Migration was changed to pass scanning. Any new finding is handled by the process in [`PUBLIC_RELEASE_ALLOWLIST.md`](PUBLIC_RELEASE_ALLOWLIST.md).

The local command/output excerpts and remote protection/read results are preserved in [`GOVERNANCE_ADDENDUM_EVIDENCE.md`](GOVERNANCE_ADDENDUM_EVIDENCE.md). The new PR HEAD and its CI result are linked from the PR once the post-addendum run completes.
