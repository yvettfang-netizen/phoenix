# Security and branch protection report

**Gate 2: PASS within the candidate scan scope; full repository-history clearance HOLD. Gate 4 branch protection and main CODEOWNERS activation: PASS. PR36 independent approval and final acceptance: HOLD.** Updated 2026-11-02. No production environment was contacted.

## Current governance state after PR37 merge

[PR37](https://github.com/yvettfang-netizen/phoenix/pull/37) was merged through the normal protected flow after Founder authorization and [Jimson614's formal APPROVED Review](https://github.com/yvettfang-netizen/phoenix/pull/37#pullrequestreview-5734741382), bound to exact HEAD `6d36f8bb21c0a7df4449078a35d2b728b2f19661`. Its [8/8 CI](https://github.com/yvettfang-netizen/phoenix/actions/runs/41415381028) passed. Main is now [`2be78cdb6435fc8a569db05531e5afbe4ab7328f`](https://github.com/yvettfang-netizen/phoenix/commit/2be78cdb6435fc8a569db05531e5afbe4ab7328f).

| Current gate | Actual evidence | Result |
|---|---|---|
| Main CODEOWNERS | [Base-branch file](https://github.com/yvettfang-netizen/phoenix/blob/2be78cdb6435fc8a569db05531e5afbe4ab7328f/.github/CODEOWNERS) present; validation has zero errors; owner/Admin and Jimson614/Write verified | PASS, active |
| Protection/required checks | Before/after protection JSON is unchanged: five exact app-bound contexts, strict/admin/review/code-owner/last-push/linear/conversation controls, no force push/deletion | PASS, unchanged |
| Actual independent GitHub approval | Jimson614 approved PR37 only; no PR36 approval is inferred | PR37 PASS; PR36 HOLD |
| Main database content | PR37 merged only three governance files, not Canonical SQL or a running database | No database integration or deployment claimed |
| Refreshed PR36 | Existing branch updated against the approved main; 0001–0035 unchanged; resulting exact HEAD must pass CI | Final SHA/CI retained in PR checks and execution evidence |

PR37 approval does not satisfy PR36's own formal Review, the remaining independent role signatures or Founder M0–M5/integration acceptance. The workflow is now on main without path filters. When neither base nor candidate contains Canonical it runs explicitly labelled real fixture tests; a complete candidate is tested from its own tree; deletion/partial-tree fallback is rejected. No skipped test is called PASS.

## Earlier evidence snapshots (historical states, superseded where updated above)

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
| `CODEOWNERS` | PR #36 proposes `yvettfang-netizen` and verified account `Jimson614` for Canonical files, reports and CI. Founder-authorized Write invitation `340997909` was accepted: the collaborator API now returns Jimson614/write and invitations are empty. CODEOWNERS validation returns zero errors. Base `main` still has no CODEOWNERS. No 玄武/白虎/麒麟 GitHub identity was invented. | **Candidate accounts PASS; HOLD until a separately approved governance merge places the file on main** |
| Independent approval availability | Both PR #36 and private PR #8 now successfully request Jimson614. The earlier PR36 HTTP422 was resolved by invitation acceptance; it was not bypassed. No submitted independent review exists; self-approval cannot satisfy the rules. | **Requests PASS; actual review HOLD** |

Current open public PRs include Identity and Health work on or toward `main` (#35, #33, #34), plus older drafts. Rebase/merge conflict and app regression must be rechecked at the actual merge gate. The private M0–M5 PR #2–#7 chain is not merged into the public repository.

The protection GET returned `strict=true`, checks bound to app ID `15368`, `enforce_admins=true`, `required_approving_review_count=1`, `require_code_owner_reviews=true`, `require_last_push_approval=true`, `dismiss_stale_reviews=true`, `required_linear_history=true`, `allow_force_pushes=false`, `allow_deletions=false`, and `required_conversation_resolution=true`. This is the actual remote rule state, not a design target. The branch rule currently fails closed for other PRs that lack the new workflow, because that workflow has not entered `main`; its PR trigger is now unfiltered to avoid future path-skipped required checks. Keep unrelated merges paused until the governance workflow is approved on main. [GitHub documents](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks) that path-filtered required workflows can leave checks pending.

Remote verification command: `gh api repos/yvettfang-netizen/phoenix/branches/main/protection` with a projection of status checks and review settings. The relevant original response values were:

```text
strict=true; app_id=15368 for all five required contexts
admin=true; reviews=1; codeowners=true; last_push=true; stale=true
linear=true; force=false; deletions=false; conversation=true
```

`gh pr view 36 --json reviews,reviewRequests` returned `reviews=[]` and `reviewRequests=[]`. `gh api repos/yvettfang-netizen/phoenix/collaborators --paginate` returned only `yvettfang-netizen` with admin/push permission. These reads establish the missing independent reviewer; they do not imply one has signed.

The verified owner login in CODEOWNERS is a GitHub account, not an independent 玄武/白虎/麒麟 signature. The file's proposed content is reviewable in [Draft PR #36](https://github.com/yvettfang-netizen/phoenix/pull/36); it is not yet effective on `main`. Pending reviewer access, actual independent reviews and base-branch CODEOWNERS prevent a truthful merge-ready conclusion.

Later handoff update: Founder explicitly authorized Jimson614's Write invitation, addition to the proposed CODEOWNERS and review requests. After acceptance, API readback returned Jimson614/write, no pending invitations and zero CODEOWNERS errors. PR36 review requests now contain Jimson614, as does private PR8. These are active access and requested-review facts, not submitted reviews or signatures. Both PRs remain Draft and unmerged.

The non-Jimson closeout instruction now has a concrete minimal activation candidate: [Governance Bootstrap Draft PR #37](https://github.com/yvettfang-netizen/phoenix/pull/37). It contains only CODEOWNERS, this required-check workflow and one governance explanation. It runs without path filters; absent Canonical on both base and candidate selects an explicitly labelled immutable 0035 rehearsal, not skipped tests. Candidate Canonical is tested from its own tree; removal/partial-tree fallback is rejected. Both source modes verify all 35 names/digests and the audited harness. PR36 uses identical governance files. CI results must be read against each final SHA; this proposal does not activate CODEOWNERS on main or authorize either merge. Jimson engineering review remains PENDING, and independent role signatures remain REVIEWER_IDENTITY_REQUIRED until actual reviewers are verified.

No source Migration was changed to pass scanning. Any new finding is handled by the process in [`PUBLIC_RELEASE_ALLOWLIST.md`](PUBLIC_RELEASE_ALLOWLIST.md).

The local command/output excerpts and remote protection/read results are preserved in [`GOVERNANCE_ADDENDUM_EVIDENCE.md`](GOVERNANCE_ADDENDUM_EVIDENCE.md). The new PR HEAD and its CI result are linked from the PR once the post-addendum run completes.

A subsequent goal-baseline read on 2026-11-02 found that the source repository was PUBLIC again. Founder explicitly authorized restoring it to Private; the mutation succeeded and REST plus GraphQL confirmed PRIVATE. The current source identity is private, but earlier public exposure and full-history/topology governance remain HOLD. Restoration does not erase prior copies or certify earlier disclosure. The sanitized status is recorded here; detailed operational evidence stays in the private candidate.
