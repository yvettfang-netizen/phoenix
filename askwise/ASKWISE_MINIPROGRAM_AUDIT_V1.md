# ASKWISE Miniprogram Audit V1

Task: ASKWISE-MINIPROGRAM-V1-20261101
Date: 2026-11-01
Status: BLOCKED; existing Web prototype verified in part.

## Repository

- ASKWISE directory: D:/CODEX/PhoenixNova/askwise
- Git root: D:/CODEX/PhoenixNova
- Origin: https://github.com/yvettfang-netizen/phoenix.git
- Audited branch: codex/family-os-v7-core-alignment-20260912
- Audited HEAD: 65d7c02573c0e6844027e501bc86b4a376df38ba
- `git ls-remote --heads origin codex/family-os-v7-core-alignment-20260912` returned that same SHA.
- Worktree is dirty, including pre-existing ASKWISE engine, DB, configuration and contract changes and unrelated Phoenix files. Those uncommitted changes are NOT proved preserved remotely.
- Initial sandbox Git access failed; authorized read-only access outside the sandbox succeeded. No reset, clean, deletion, repository initialization or migration performed.

## Actual framework and routes

Only a Next.js 14.2.5 / React 18.3.1 project was found at askwise-learning-engine. Searches within ASKWISE found no app.json, project.config.json, Taro configuration or uni-app manifest. No native miniprogram project or experience-build record was established. Web routes are not WeChat pages.

Existing routes: /, /student-task, /task/[taskId], /evidence, /maps/political, /maps/math, /reflection, /dashboard, /advisor.

Learning rules reside in src/lib/engine. Politics P1-P5 and Math K1-K7 are present. HintLevel is 0-5; five learning modes are defined. No engine edits made for this audit.

## Runtime evidence

Actual versions: Node v24.19.0, npm 11.17.0, pnpm 11.25.0. Repository .nvmrc and .node-version specify 24.19.0; package engines requires Node >=24.19.0 <25 and npm >=12.0.2. Host npm does not meet that npm requirement. Python WindowsApps launcher failed to start; this does not prove there is no other Python installation.

pnpm is the existing package manager (pnpm-lock.yaml). The first sandbox invocation failed with EPERM registering a project symlink. Outside-sandbox `pnpm.cmd run test` automatically materialized 446 dependencies from the pnpm store, verified the lockfile against supply-chain policies and executed Vitest.

Real test output:

```text
RUN v2.1.9
src/lib/compass/mock-adapter.test.ts (10 tests) passed
src/lib/engine/engine.test.ts (11 tests) passed
src/lib/advisor/advisor-engine.test.ts (9 tests) passed
Test Files 3 passed (3)
Tests 30 passed (30)
Duration 1.77s
```

`pnpm.cmd run build`: FAIL, exit 1. Compilation, type checking and 11-page generation completed; standalone tracing failed creating symlinks with EPERM. Tailwind also warned about a missing/empty content configuration. Do not report successful production build.

`pnpm.cmd run dev -- --hostname ...` initially failed because pnpm forwarded the extra separator. Corrected command:

```powershell
cd D:\CODEX\PhoenixNova\askwise\askwise-learning-engine
pnpm.cmd run dev --hostname 127.0.0.1 --port 3011
```

Service reported Ready. Read-only HTTP probes returned:

| Path | Result |
| --- | --- |
| / | 200 text/html |
| /student-task | 200 text/html |
| /assets/aoyu/expressions/default.png | 200 image/png |

This is Web response evidence, not browser interaction, visual verification or miniprogram UAT. No real student form submissions performed.

## Data and assets

SQLite is opened through better-sqlite3 12.11.1 at data/askwise.db. Existing student and task tables are reused by the application; DB code seeds David and contains task/session/evidence/map/reflection operations. Presence of tables and functions is not proof of authenticated ownership enforcement.

No dedicated API route directory was found in the app inventory; existing forms use Next server actions. A WeChat login/session/upload API was not established. AppID, approved HTTPS API domain, developer-tool configuration and experience QR code remain unverified.

Actual asset inventory: 19 PNGs in public/assets/aoyu and 19 in askwise-learning-engine/public/assets/aoyu, total 38. Historical count 40 is not confirmed. No assets renamed or generated. Existing Aoyu component supports seven states; Safe Error is absent. Default PNG was served successfully, but visual display and event-state UAT are NOT RUN.

## Continuation boundary

No replacement project created. Locating the authoritative miniprogram source is the first blocker. Creating a new client under this repository would require explicitly resolving the instruction to preserve/reuse the existing project. Do not silently substitute Web for the miniprogram or enable real David data before authorization and access-control/deletion gates pass.
