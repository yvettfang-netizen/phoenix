# Phoenix Nova Repository Inventory — 2026-08-29

**Scope:** `C:\Users\phoen`, `D:\CODEX`, and `D:\SHARED\PHOENIX_TEAM`, with GitHub state verified for `yvettfang-netizen`.

**Root rule:** `D:\CODEX` is a service-station directory, not a Git repository. No `git init` was run there.

## Executive map

| Project / source | Local path | Git / remote | Branch / HEAD at audit | Working state | Classification |
|---|---|---|---|---|---|
| Phoenix Nova canonical monorepo | `D:\CODEX\01_PHOENIX_NOVA\phoenix` | Git; `yvettfang-netizen/phoenix` | `codex/phoenix-main-post-merge-audit-2026-08-28`; `955a5cf` | Base equals `origin/main`; independent untracked `docs/` exists in this worktree | `NEEDS_REVIEW` |
| Weekend closeout worktree | `D:\CODEX\pwc` | Linked worktree of `phoenix` | `codex/weekend-engineering-closeout-2026-08-29`; base `955a5cf` | Education hardening and reports pending commit at audit time | `UNPUSHED` until final delivery |
| Education Compass | `D:\CODEX\pwc\Phoenix Compass\education compass` | Component of `phoenix`, not a separate repo | Same closeout branch | P0 passes locally; see E2E report | `NEEDS_REVIEW` pending PR |
| Identity Compass | `D:\CODEX\01_PHOENIX_NOVA\phoenix\Phoenix Compass\Identity Compass` | Component of `phoenix` | `origin/main` source | Runtime is canonical here; five Identity `.docx` files also live on website `main` | `DUPLICATE` documentation / `NEEDS_REVIEW` |
| Phoenix Family OS | `D:\CODEX\01_PHOENIX_NOVA\phoenix\Phoenix Family OS\phoenix-family-os-mvp` | Component of `phoenix` | `origin/main`; remote candidate branches listed below | Two unmerged remote branches have no PR | `NEEDS_REVIEW` |
| ASKWISE | `D:\CODEX\01_PHOENIX_NOVA\phoenix\askwise\askwise-learning-engine` | Component of `phoenix` | `origin/main` | Canonical source exists, but a different dirty shared copy contains unrecovered candidate work | `UNPUSHED` source found / `NEEDS_REVIEW` |
| Wealth Compass recovery | `D:\CODEX\01_PHOENIX_NOVA\wc-recovery` | Linked worktree of `phoenix` | `codex/wealth-compass-repository-recovery`; `955a5cf` | Clean; remote `migration/wealth-compass-v0.1-20260829` exists without PR | `DUPLICATE` worktree / `NEEDS_REVIEW` |
| Phoenix Academic Studio / 凤启学苑 | `D:\CODEX\01_PHOENIX_NOVA\phoenix-academic-studio` | Git; `yvettfang-netizen/phoenix-academic-studio` | `main`; `c32534f` | Clean, 0 ahead / 0 behind | `HEALTHY` repository, implementation `BLOCKED` |
| Academic hardening worktree | `D:\CODEX\01_PHOENIX_NOVA\_worktrees\academic-studio-hardening` | Linked worktree | `codex/academic-studio-hardening`; `af63369` | Clean and pushed; PR #2 open | `NEEDS_REVIEW` |
| Phoenix Nova Website GitHub checkout | `D:\CODEX\01_PHOENIX_NOVA\phoenix-nova-website` | Git; `yvettfang-netizen/phoenix-nova-website` | `main`; `7426c9d` | Clean, 0 ahead / 0 behind; `main` has documents but no runtime | `REMOTE_MISMATCH` |
| Website normalization worktree | `D:\CODEX\pweb` | Linked worktree | `codex/website-v4-stabilization-2026-08-29`; `d07042d` | Clean and pushed; PR #1 open | `NEEDS_REVIEW` |
| Website V7 reconstruction | `D:\CODEX\90_INBOX\PHOENIX_WEBSITE_STAGING_V7` | Git; origin is a local forensic bundle, not GitHub | `staging/website-v7-reconstruction`; `aa09d59` | Clean; HEAD is not contained by any bundle remote ref | `LOCAL_ONLY`, `UNPUSHED`, `DUPLICATE` |
| Website forensic intake | `D:\CODEX\90_INBOX\PHOENIX_WEBSITE_FORENSICS_20260828` | Not a repo | Bundle + patch + snapshots | Provenance evidence retained | `NEEDS_REVIEW` evidence, not canonical |
| Fengqi Research Institute / NOVA DIGITAL candidate | `D:\CODEX\01_PHOENIX_NOVA\phoenix east` | Not a repo; Sites project `appgprj_6a8ed46a2cdc8191aa6b40b88a9e551d` | No local branch | Source is archived on pushed Phoenix branch `codex/fengqi-east-source-baseline` | `LOCAL_ONLY`, `DUPLICATE`, `NEEDS_REVIEW` |
| Fengqi archival worktree | `C:\Users\phoen\AppData\Local\Temp\fq` | Linked worktree of `phoenix` | `codex/fengqi-east-source-baseline`; `9ec131a` | Clean and pushed; no PR | `DUPLICATE` worktree / `NEEDS_REVIEW` |
| Old shared PhoenixNova checkout | `D:\SHARED\PHOENIX_TEAM\PhoenixNova` | Git; same Phoenix GitHub remote | `main`; `c118d17` | 3 commits behind actual main; 219 deleted, 11 modified, 39 untracked files | `DUPLICATE`, `UNPUSHED`, `REMOTE_MISMATCH`, `NEEDS_REVIEW` |
| Empty old `phoenix east` repo | `C:\Users\phoen\Documents\ChatGPT\phoenix east` | Git; no remote; unborn `main` | No commit | Empty except `.git` | `ORPHAN`, `DELETE CANDIDATE` |
| Temporary V4 article extraction | `C:\Users\phoen\AppData\Local\Temp\phoenix-v4-recovery-inspect` | Not a repo | No branch | 10 files duplicated by recovered website source | `DUPLICATE`, `DELETE CANDIDATE` |
| Zhuque renderer legacy intake | `D:\CODEX\90_INBOX\zhuque-renderer-legacy-20260826` | Not a repo | No branch | 3 hash-recorded delivery artifacts | `ORPHAN`, `DELETE CANDIDATE`, `NEEDS_REVIEW` |
| `D:\CODEX\02_NOVA_DIGITAL` | Empty reserved zone | No repo | — | No project was invented to populate it | `LOCAL_ONLY` empty reservation |

No candidate or old source was deleted.

## GitHub actual state

GitHub contains exactly three source repositories owned by `yvettfang-netizen`:

| Repository | Visibility | Default branch / HEAD | Open PR | Merged PR | Closed-only PR |
|---|---|---|---|---|---|
| `yvettfang-netizen/phoenix` | Public | `main` / `955a5cf169125dc4d864969edc022e5a50ea3bc2` | Closeout PR recorded after push | #1 `jimson的拉取请求` | None |
| `yvettfang-netizen/phoenix-academic-studio` | Private | `main` / `c32534fc9eee795b6ea57c3d9ff9b2d891cd4db0` | #2 `Record Academic Studio acceptance blockers` | #1 bootstrap | None |
| `yvettfang-netizen/phoenix-nova-website` | Private | `main` / `7426c9d4e58d8d1a6351546172c2069229961b54` | #1 `Normalize recovered Phoenix Nova Website V4 candidate` | None | None |

### Phoenix remote branches requiring review

| Branch | HEAD | Upstream/PR state |
|---|---|---|
| `main` | `955a5cf` | Canonical; Jimson PR #1 merged |
| `codex/family-os-doc-baseline-and-ux-v0.2` | `c32f819` | Pushed, not merged, no open PR |
| `codex/fengqi-east-source-baseline` | `9ec131a` | Pushed, not merged, no open PR |
| `migration/family-os-sprint2-20260829` | `c859a12` | Pushed, not merged, no open PR |
| `migration/wealth-compass-v0.1-20260829` | `340cdac` | Pushed, not merged, no open PR |

These branches were not merged, deleted, or rewritten.

## Multiple-copy and orphan conclusions

### Shared PhoenixNova checkout

`D:\SHARED\PHOENIX_TEAM\PhoenixNova` is the most important unreconciled copy:

- Its local and cached `origin/main` are `c118d17`; GitHub actual `main` is `955a5cf`, three commits newer.
- There are no local commits ahead of actual GitHub main.
- It has 219 tracked deletions: 109 under `Phoenix Compass` and 110 under `Phoenix Family OS`.
- It has 11 modified ASKWISE tracked files.
- It has 39 untracked files, including 9 ASKWISE candidate files absent from canonical and 3 Identity Compass document files.
- The ASKWISE differences include advisor code, rule cards, product-boundary documents, evidence/task UI, DB, and learning-engine changes. They are not byte-identical to canonical.

This copy must not be reset or deleted until the ASKWISE candidate work and documents are reviewed and migrated on a dedicated branch. The mass deletions are not treated as an instruction to delete canonical code.

### Git worktrees are not extra repositories

`wc-recovery`, `pwc`, `pweb`, `academic-studio-hardening`, and `fq` are linked Git worktrees. They share object databases with their primary repositories. They are listed because they are separate local working states, but they are not new GitHub repos.

### Website source provenance

The forensic bundle proves V4 head `f4e8f9a` is an ancestor of V7 head `e841e6b`. The clean V7 reconstruction commit `aa09d59` contains the recovered Insights/GEO work. Its current runtime has been copied into the GitHub website normalization branch `d07042d` without caches or local configuration. GitHub `main` remains unchanged until PR review.

## Unpushed / untracked summary

| Location | Evidence | Safe disposition |
|---|---|---|
| `D:\SHARED\PHOENIX_TEAM\PhoenixNova` | 11 modified + 39 untracked + 219 deleted; no ahead commit | `BLOCKED_NEEDS_PROVENANCE_REVIEW`; preserve |
| `D:\CODEX\01_PHOENIX_NOVA\phoenix` | untracked `docs/` from a separate audit task | Preserve; do not absorb into this branch |
| Website staging `aa09d59` | one local commit beyond bundle refs | Content preserved on website PR #1; retain forensic repo |
| Closeout `pwc` | Education hardening + two reports before final commit | Commit/push/PR as this delivery |
| Empty Documents `phoenix east` | no commit, no files, no remote | `DELETE CANDIDATE`; do not delete unattended |
| Temp V4 extraction | 10 non-Git files | `DELETE CANDIDATE`; do not delete unattended |

## Monday decisions

1. Review the Phoenix closeout PR; do not merge automatically.
2. Review Academic PR #2 and Website PR #1.
3. Create a dedicated ASKWISE recovery review from the shared checkout before deleting or resetting anything there.
4. Open or explicitly retire the four unmerged Phoenix migration/candidate branches; no remote branch was deleted here.
5. After website PR disposition, decide whether staging/forensic/temporary copies can be archived or deleted.
6. Decide the official repository/zone for Fengqi Research Institute before moving it into `02_NOVA_DIGITAL`.

