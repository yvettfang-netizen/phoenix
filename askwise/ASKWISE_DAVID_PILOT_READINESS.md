# ASKWISE David Pilot Readiness

Date: 2026-11-01.
Tasks: ASKWISE-MINIPROGRAM-V1-20261101, David Independent Pilot Database V1.0, ASKWISE-CLIENT-IMPLEMENTATION-20261101.

Overall status: NOT DAVID PILOT READY. Anonymous Web/API acceptance passed; official WeChat experience-build gates remain blocked. No real David account or history imported.

## Actual code and repository

- Repository root: D:/CODEX/PhoenixNova; origin yvettfang-netizen/phoenix.
- ASKWISE: D:/CODEX/PhoenixNova/askwise.
- Web: askwise-learning-engine; new authorized client: miniprogram (same repo).
- Branch: codex/askwise-independent-pilot-db-20261101.
- Start/current committed baseline: e1e0b84a401f7430e0f448b8e25d4dc68e7ef3f6. Implementation remains uncommitted; existing dirty source was preserved. Do not mistake that SHA for the new implementation.
- No merge, main changes, production deployment or WeChat release submission.

## Explicit database and readiness states

| State | Result | Evidence |
| --- | --- | --- |
| CODE EXISTS | YES | Web auth, scoped DB access, transport API and native client source |
| DATABASE INITIALIZED | YES | private data/pilot/askwise-pilot.db; 13 existing business tables |
| SCHEMA REUSED | PASS | read-only sqlite_master comparison with legacy DB: identical business schema |
| READ/WRITE VERIFIED | PASS, anonymous UAT | persisted attempts, P/K diagnoses, hints, evidence, reflection and uploads |
| AUTH VERIFIED | PASS, local anonymous | password login, token hashing, expiry, logout, replacement and deletion revocation |
| DATA ISOLATION VERIFIED | PASS, tested paths | A/B task/session/map/evidence access and mutation denial; own export/delete |
| BACKUP/RESTORE VERIFIED | PASS for SQLite only | online WAL backup, integrity and every-table/schema equality after restore |
| FULL ATTACHMENT/DISASTER RECOVERY | NOT RUN | private uploads/receipts and deletion reconciliation need operator procedure |
| DAVID PILOT READY | NO | real account remains unprovisioned; see external gates |

Read-only Pilot counters after initialization: students=0, daily_tasks=0, attempts=0; integrity=ok, foreign_key_check=[]. Legacy DB has one seeded David row, two placeholder tasks and no completed learning submissions. Anonymous runtime data is in data/uat/askwise-uat.db, not in the empty real Pilot file. Tests use temporary databases.

## Actual executed commands and results

```powershell
cd D:\CODEX\PhoenixNova\askwise\askwise-learning-engine
pnpm.cmd run test
pnpm.cmd exec tsc --noEmit
$env:ASKWISE_BUILD_MODE = 'server'
pnpm.cmd run build
pnpm.cmd run start --hostname 127.0.0.1 --port 3012
node scripts/pilot-http-uat.cjs
```

Latest unit acceptance: 8 files / 49 tests PASS. TypeScript PASS after fixing a test-only union-narrowing error. Test files: Compass mock 10, Engine 11, Advisor 9, Pilot DB 8, Auth 6, Idempotency 2, Shanghai date 1, private storage paths 2. Initial new tests exposed a latest-hint ownership omission, which was repaired before the passing run. A diagnostic run accidentally discovered archived test copies; its 96 executions are not counted. Vitest now includes only src/**/*.test.ts and TypeScript excludes data/.

Web production build: PASS, exit 0, including dynamic routes for login/account/export and /api/pilot/v1. Windows standalone mode previously failed EPERM symlink; the explicit server build mode preserves SQLite and produces a standard next start deployment. Default standalone output remains unchanged. Web success is not WeChat compilation.

Production server started Ready in 448ms at http://127.0.0.1:3012. This is local-only anonymous UAT, not an HTTPS deployment or a real David endpoint.

Real HTTP acceptance: 14 checkpoints PASS. Includes anonymous login; unauthenticated denial; Math K2/Hint1/Retry0; response-loss replay; conflicting payload rejection; B read/write denial; solved retry replay; Politics P5/retry; reflection/dashboard; photo replay; invalid photo/private download isolation; export; logout/re-login; disposable-account deletion; explicit WECHAT_NOT_CONFIGURED. The initial response-loss check discards a response and resubmits; it does not claim an airplane-mode device test.

Complete terminal evidence is stored privately under data/uat/final-tests.txt, final-web-build.txt and final-http-uat.txt. No token/password/student answer is printed by the HTTP script. These generated private files are not Git deliverables.

Client source/config smoke and mock-wx behavior scripts were executed successfully. These are Node source/transport behavior checks, not a WXML compiler, developer-tool run or device test.

## Web Learning Flow UAT

Real browser on anonymous student A:

1. Unauthenticated Today redirects to login; password sign-in reaches Today.
2. Math task 1: original answer saved, Attempts=1, Retry=0, diagnosis=K2, Hint=1; Aoyu Guiding.
3. Independent retry using the recognized tool: Attempts=2, Retry=1, Solved With Hint 1, Aoyu Celebrating.
4. Evidence shows the original answer and actual hint/retry values; page reload retains them.
5. Politics task 5: structured material signal + original answer -> P2 -> Hint1 -> retry -> rule-recognized result and evidence.
6. Reflection fields were manually filled in the browser, saved and reloaded with the same values; Aoyu Reflecting.
7. Dashboard reads stored completed tasks. During UAT an old formula displayed completion rate as independence; fixed to count only sessions marked independent. A regression assertion checks assisted completion is not independent mastery.

Screenshots of the actual solved Math page and Dashboard were displayed during execution; they were not mockups. No WeChat screenshot or QR is claimed. Day 2 in the anonymous browser reflects an experiment provisioned before the Shanghai date-boundary fix; no real history was altered to make it look like Day 1.

## Shared API and client

GET: today, tasks/:id, evidence, maps, reflection, dashboard, export, uploads/:id.
POST: login, wechat-login, logout, tasks, tasks/:id/attempts, tasks/:id/uploads, reflection, delete.
Mock only: POST compass/handoff and GET compass/writeback/:id, protected by current student and approved private fixture mapping.

Both Web actions and the API use the same task-service and existing engine modules. The structured answer preserves conditions/method/work/conclusion in the existing raw response TEXT column. No new business schema, student primary key, Agent or diagnosis taxonomy is introduced. P1-P5, K1-K7 and Hint 0-5 remain in the existing engine.

Native client routes: login, today, task, evidence, reflection, dashboard. Taro was evaluated; native JS/WXML/WXSS was selected for the minimal client without a second bundler/runtime dependency stack. It uses shared transport declarations and no learning-engine code. This does not claim React code reuse or a Taro build.

Aoyu uses approved images only, driven by requests/errors/actual returned session state. Only the idle image is bundled; other poses are fetched from the configured same HTTPS origin, with idle fallback. Source copies of the other approved images are excluded from the package. No redraw or random animation-driven learning state.

## Limits and blocked gates

- Real WeChat AppID, server secret and an approved openid-to-existing-student mapping are missing. No auto-provision of a new student from WeChat login.
- HTTPS API hosting and legal-domain configuration are not available. Client config remains deliberately empty and rejects requests.
- WeChat Developer Tools was not located in checked common locations/PATH. Official compile, experience upload, QR preview and device compatibility: BLOCKED/NOT RUN.
- Real David consent, host filesystem ACL review and deletion/backup retention approval: NOT VERIFIED.
- Keyword-based historical rules only recognize the two baseline scenarios. Matching a keyword does not prove a semantically correct full solution or mastery. No LLM grading/OCR or paid AI API is claimed.
- Private photos have size/signature/quota/ownership checks and authenticated retrieval; no image decoding/antivirus/OCR validation is claimed.
- Idempotency persists request intent before mutation; uncertain interrupted intents fail closed and require reconciliation. No multi-process/distributed exactly-once guarantee.
- SQLite recovery is verified; full photo/receipt backup, off-host recovery, secure erasure and post-delete backup reconciliation remain operational gaps.
- Compass return remains an explicitly labeled fixture mock, not a real learning outcome or production writeback; formal Contract unchanged.
- No Canonical PostgreSQL, Phoenix Core Schema, Education Compass DB, Family OS or Notion records were modified/imported.

Next minimal action: configure approved test AppID + HTTPS API/domain and locate Developer Tools, then perform genuine client compile and anonymous device UAT. Enable real David only after the additional privacy, access, recovery and Founder gates pass.
