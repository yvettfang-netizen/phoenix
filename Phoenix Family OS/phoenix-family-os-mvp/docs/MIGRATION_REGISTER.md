# Phoenix Family OS™ Documentation Migration Register

- Canonicalization date: 2026-08-27
- Source: read-only `D:\CODEX\PhoenixNova\Phoenix Family OS\phoenix-family-os-mvp`
- Target: clean clone branch `codex/family-os-doc-baseline-and-ux-v0.2`
- Rule: historical names and plans do not reactivate superseded product scope

## 21 important documents

Summary: **ACTIVE 12 / MERGED 4 / ARCHIVE 5 / DELETE CANDIDATE 0**.

| Source file | Classification | Canonical destination / reason |
|---|---|---|
| `AGENTS.md` | ACTIVE | concise project-local rules; merged workflow controls |
| `README.md` | ACTIVE | current runbook and Demo boundary |
| `backend/README.md` | ACTIVE | controlled loopback backend boundary |
| `docs/ARCHITECTURE.md` | ACTIVE | current architecture, roles, IDs and production gaps |
| `docs/DATA_SCHEMA.md` | ACTIVE | current data/persistence boundary |
| `docs/MVP_ACCEPTANCE.md` | ACTIVE | current automated/platform acceptance state |
| `docs/architecture/ADR-001-CONTROLLED-QUESTIONNAIRE-BACKEND-PROXY.md` | ACTIVE | accepted Local Demo decision |
| `docs/engineering-memory/CHANGELOG.md` | ACTIVE | current and historical version summary |
| `docs/engineering-memory/ENGINEERING_DECISION_LOG.md` | ACTIVE | current confirmed decisions |
| `docs/engineering-memory/PROJECT_CONTEXT.md` | ACTIVE | current product scope/status |
| `docs/engineering-memory/RELEASE_PROCESS.md` | ACTIVE | release gates and authorization boundary |
| `docs/engineering-memory/TECHNICAL_DEBT_REGISTER.md` | ACTIVE | open blockers/debt |
| `docs/engineering-memory/ARCHITECTURE_MEMORY.md` | MERGED | merged into `docs/ARCHITECTURE.md`; duplicate removed |
| `docs/engineering-memory/CHANGE_MANAGEMENT_RULES.md` | MERGED | project-specific controls merged into `AGENTS.md` |
| `docs/engineering-memory/PHOENIX_SPRINT_EXECUTION_PROTOCOL_V1.0.md` | MERGED | necessary sprint/checkpoint/test controls merged into `AGENTS.md` |
| `docs/engineering-memory/PROJECT_MAINTENANCE_PLAN.md` | MERGED | current maintenance/release/debt controls merged into active files |
| `docs/engineering-memory/ENGINEERING_MEMORY_SETUP_REPORT_V1.0.md` | ARCHIVE | one-time setup report; no longer an execution baseline |
| `docs/engineering-memory/PHOENIX_ENGINEERING_MAINTENANCE_SYSTEM_REPORT_V1.0.md` | ARCHIVE | one-time setup evidence; facts merged into active baseline |
| `docs/engineering-memory/PHOENIX_ENGINEERING_COMMUNICATION_PROTOCOL_V1.0.md` | ARCHIVE | organization-wide protocol, not minimal Family OS execution baseline |
| `docs/engineering-memory/PHOENIX_MULTI_PROJECT_ENGINEERING_GOVERNANCE_V1.0.md` | ARCHIVE | superseded version and conflicts with confirmed monorepo structure |
| `docs/engineering-memory/PHOENIX_MULTI_PROJECT_ENGINEERING_GOVERNANCE_V1.1.md` | ARCHIVE | repository-isolation assumption superseded by confirmed canonical monorepo |

## 16 reports and preview evidence

| Source file | Classification | Treatment |
|---|---|---|
| `docs/codex-audit/ACCEPTANCE_TEST_PLAN_V1.0.md` | ACTIVE | retain current WeChat acceptance procedure |
| `docs/codex-audit/SPRINT_2_TASK_3_WECHAT_ACCEPTANCE_REPORT_V1.0.md` | ACTIVE | retain current WeChat BLOCKED evidence |
| `docs/codex-audit/CURRENT_BASELINE.md` | MERGED | superseded by current product baseline and V1.1 audit |
| `docs/codex-audit/QUESTIONNAIRE_BACKEND_ENGINEERING_REPORT_V1.0.md` | MERGED | durable facts merged into backend README, ADR and acceptance status |
| `docs/codex-audit/DEVELOPMENT_READINESS_REPORT_V1.0.md` | ARCHIVE | historical pre-Sprint decision |
| `docs/codex-audit/ENGINEERING_AUDIT_REPORT_V1.0.md` | ARCHIVE | older branch audit |
| `docs/codex-audit/ENGINEERING_HANDOVER_REPORT_V0.1.md` | ARCHIVE | historical handover |
| `docs/codex-audit/FAMILY_GROWTH_CORE_ENGINEERING_INSPECTION_V1.0.md` | ARCHIVE | future-scope inspection; not current execution baseline |
| `docs/codex-audit/Family_Growth_Core_Repo_Evidence_Audit_2026-08-17.md` | ARCHIVE | historical evidence; open gaps retained in debt register |
| `docs/codex-audit/SPRINT_1_ENGINEERING_REPORT_V1.0.md` | ARCHIVE | historical Sprint evidence |
| `docs/codex-audit/SPRINT_1_PLAN.md` | ARCHIVE | completed historical plan |
| `docs/codex-audit/SPRINT_2_READINESS_CONFIRMATION_V1.0.md` | ARCHIVE | historical readiness snapshot |
| `docs/codex-audit/SPRINT_2_TASK_1_ENGINEERING_REPORT_V1.0.md` | ARCHIVE | test result superseded by latest V1.1 audit/current run |
| `docs/codex-audit/SPRINT_2_TASK_2_ENGINEERING_REPORT_V1.0.md` | ARCHIVE | environment blocker superseded by Task 3 report |
| `docs/preview/partner-experience.html` | DELETE CANDIDATE | generated preview; not runtime or current P0 evidence |
| `docs/preview/partner-experience.png` | DELETE CANDIDATE | generated screenshot; no current acceptance value |

The latest retained baseline audit is `docs/codex-audit/FAMILY_OS_CLEAN_BASELINE_RECONCILIATION_AND_UX_REVIEW_V1.1.md`, created after the 37-file comparison. It is explicitly labeled as a historical pre-convergence gate snapshot; current status lives in the minimal active documents.

## Source cleanup rule

Source files remain untouched until the canonical branch is committed, pushed, and the remote ref is verified. After verification, only the 37 paths listed above may be removed from the read-only-source Family OS directory; no other `phoenix` project or ignored directory is in scope.

## Source cleanup execution

- Remote ref `refs/heads/codex/family-os-doc-baseline-and-ux-v0.2` was first verified at `31b3b7860cbd4d5a750ca009ed38eae698533f0f`.
- The 37 exact untracked source paths listed in this register were then deleted from the original Family OS directory on 2026-08-27.
- Post-delete verification found 0 remaining untracked files under the original `Phoenix Family OS/phoenix-family-os-mvp` path.
- No directory-recursive cleanup and no deletion outside the Family OS project path was performed.
- ACTIVE content is recoverable from the remote branch; MERGED content is recoverable in canonicalized form. ARCHIVE and DELETE CANDIDATE source bodies were intentionally not retained in Git, per the approved migration rule.
