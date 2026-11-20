# P0 validation and unverified items

**Overall P0 design status: PASS for source audit and static preview; business implementation remains PROPOSED.** Captured 2026-11-20 (Asia/Shanghai). This branch changes no formal SQL, running database, service or production environment.

## Fixed source and PR evidence

| Check | Evidence | Result |
| --- | --- | --- |
| Remote main HEAD | `git ls-remote origin refs/heads/main`; [source audit](evidence/source-audit.json) | PASS: `9db147ac3a5d135d50b90bfea5a7316ce747d90b` |
| Formal migrations | `node capture-source-evidence.mjs` reads each file and compares bytes with `origin/main` | PASS: 37 files, 0001–0037 contiguous; per-file SHA-256 in [manifest](evidence/source-audit.json) |
| Candidate 0038/0039 | [source audit](evidence/source-audit.json) | PASS: in `forward-candidates/service-workbench`, not formal source |
| `education.study_enrollments` | Regex against all formal SQL | PASS: no CREATE TABLE; do not confuse with `learning.enrollment` |
| PR [#76](https://github.com/yvettfang-netizen/phoenix/pull/76) | Binary diff SHA-256 `ef79290aa6399725c5b6c4a5f2ab89f2485a5ff551792a4a52041817f75e2d03`; 18 changed paths in [source audit](evidence/source-audit.json) | Draft HEAD `78f3716f31403907b6ab254a86cf6df888e5ebfe`; 24/24 CI PASS at capture |
| PR [#77](https://github.com/yvettfang-netizen/phoenix/pull/77) | Binary diff SHA-256 `df0658b80e017e18683f0c0376a452011d562e2ec00a5d6eae3d23f0f200d4ea`; 20 changed paths in [source audit](evidence/source-audit.json) | Draft HEAD `7d1bc6bfea14348192ca549510fbc571fb978254`; [later 21/21 CI PASS](evidence/PR77_CI_FOLLOWUP.md); 0042 Academic fit HOLD |
| PR #77 0042 source | [candidate review](CANDIDATE_0042_REVIEW.md) | SHA-256 `bd319e3074e1b51862dfd14eeeb72531d400aff0f8277cde8e886f501cff58ea`; not installed |

The full PR patches were fetched from Git refs and SHA-256 hashed before the changed paths and relevant SQL/code were reviewed. [Source audit](evidence/source-audit.json) records the exact patch digests and CI check details. A newer PR HEAD requires a new capture and review.

PR #76's diff keeps the six Founder-approved primary navigation items in Chinese/English and leaves About in the footer; its Corporate OS preview and legacy `/company-os` redirect remain separate draft work. PR #77's latest candidate fixes earlier duplicate ephemeral context tables but retains `auth.workspace_sessions`, so its passing CI does not satisfy this P0's identity decision.

## Actual local checks

| Command | Actual output | Status |
| --- | --- | --- |
| `node --test tests/academic-studio-preview.test.mjs` from Website V5 | 2 tests, 2 PASS, 0 FAIL | PASS |
| `PLAYWRIGHT_MODULE_PATH=… node docs/architecture/academic-studio-v21-p0-20261120/capture-previews.mjs` | 6 pages × desktop/mobile = 12 captures; 0 overflow; 0 page errors; 12/12 official logos loaded. [Browser JSON](evidence/preview-browser-results.json) and [screenshots](evidence/) | PASS |
| `npm ci --no-audit --no-fund` from Website V5 | 638 packages installed; exit 0 | PASS |
| `npm run typecheck` | `tsc --noEmit`, exit 0 | PASS |
| `npm run lint` | Windows WSL wrapper cannot launch `/bin/bash` | NOT RUN by wrapper; equivalent below |
| `node node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next` | 0 errors, 2 pre-existing warnings in `customer-account.tsx` and `customer-center.tsx` | PASS with warnings |
| `npx vinext build` | `Build complete`, exit 0 | PASS |
| `node --import ./tests/register-typescript.mjs --test tests/*.test.mjs` | 156 tests: 152 PASS, 0 FAIL, 4 SKIP. [Raw output](evidence/website-tests.log) | PASS |

The Website's `npm test` shell wrapper also invokes the Linux-only build helper; direct equivalent build and exact existing Node test runner were used on Windows. No application route is changed by this P0 package.

Browser capture used the bundled Playwright 1.62.1 and local Microsoft Edge. The exact PowerShell invocation was:

```powershell
$env:PLAYWRIGHT_MODULE_PATH='C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1117-1425-0_26.1117.1425.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/playwright/index.mjs'
node docs/architecture/academic-studio-v21-p0-20261120/capture-previews.mjs
```

## Status boundary

| Capability | Status | Reason / next evidence |
| --- | --- | --- |
| Reuse of formal Canonical model | VERIFIED in source | Running cluster ledger was not queried in P0 |
| Six static UI previews | IMPLEMENTED and VERIFIED locally | All content synthetic; no API or database call |
| Lesson package, booking, confirmation, immutable ledger, refund, teacher settlement | PROPOSED | Commercial authority and business rules not approved for SQL |
| Student/guardian/teacher/admin trusted routing | PROPOSED | Real identity, Consent/Assent, teacher/admin grant and device handoff evidence HOLD |
| Assessment instruments and growth timeline | PROPOSED | Scales, licences, provenance, visibility and retention HOLD |
| New migration PG16/17 | NOT RUN | P0 has no new SQL; each later candidate needs independent PG16/17 |
| Real API/browser integration | NOT RUN | No authenticated runtime wiring in this P0 |
| 0042 merge, shared DB install, production/腾讯 deployment | NOT RUN | Explicitly outside this gate |

**Only next action:** Founder reviews the P0 architecture and six previews, then decides which narrow identity/commercial contracts enter the first independent forward-migration design gate.
