# ASKWISE Auth and Data Isolation Test

Date: 2026-11-01. Anonymous accounts only; no real David access enabled.

## Mechanism

Existing students.id remains the only local student business key. Offline credentials map to that ID. Passwords use salted scrypt; opaque random 32-byte tokens are stored only as SHA-256 digests, expire after 8 hours and are revoked on logout, credential replacement or student deletion. The server issues HttpOnly/SameSite=Strict cookies for Web and opaque bearer tokens for the miniprogram. Secure cookies default on; HTTP is used only for loopback UAT with an explicit flag.

Task/session reads and writes join ownership to the authenticated student. Optional studentId selectors must equal that principal. Evidence, maps, reflection and dashboard are scoped. The advisor module is disabled in the student pilot because its existing case model has no student ownership relation. Authenticated export is no-store. There is no public account provisioning endpoint.

## Executed evidence

Final primary-source run: 8 files / 49 tests PASS, including two private-path boundary tests; TypeScript PASS. Archived test copies are excluded from discovery. See data/uat/final-tests.txt and the final readiness report. Earlier figures below are intermediate runs, not additional coverage.

- Initial new suite: 41/42 passed; isolated test identified an unguarded latest-hint read.
- After repair: 42/42 passed and TypeScript check passed.
- Following API/idempotency/date integration: 45/45 passed across 7 files and TypeScript check passed. Later final results are in ASKWISE_DAVID_PILOT_READINESS.md.
- Real local HTTP suite initially passed 13 checkpoints: login, unauthenticated denial, scoped Math and Politics flows, duplicate submit, payload conflict, A/B denial, upload rejection/private retrieval, export, logout/re-login, disposable-account deletion and explicit WeChat-not-configured failure. This was HTTP execution, not a WeChat emulator.

Tests use temporary databases for unit integration; live HTTP uses `data/uat/askwise-uat.db`. Neither uses legacy development records or the blank real Pilot file.

| Requirement | Status | Evidence |
| --- | --- | --- |
| Authentication / expired sessions | PASS, automated | forged/missing/expired token rejects read/write/export/delete |
| A/B isolation / unauthorized mutation | PASS, automated + HTTP | task/session/attempt/diagnosis/hint/evidence/maps and B task access denied |
| Logout/re-login persistence | PASS, automated + HTTP | old token rejected, new token sees same saved evidence |
| Student export | PASS, automated + HTTP | one student profile and owned rows; protected attachment references |
| Student deletion | PASS, automated + HTTP | credentials revoked, dependent rows removed, B retained, foreign_key_check empty |
| Browser Math and Politics | PASS within baseline rule scope | Math K2/Hint1/Retry1; Politics P2/Hint1/Retry1; saved reflection survives refresh |
| LLM semantic grading | NOT RUN / unavailable | output labeled rule-based; keyword rules are not general answer verification |
| Real WeChat login | BLOCKED | no approved provider configuration/mapping or client experience build |
| Remote HTTPS/host ACL/consent review | NOT VERIFIED | required before enabling a real student |

Single-process filesystem session storage is intentionally bounded to the independent pilot. No production multi-instance guarantee is made. A shared-device client must clear tokens and pending answer drafts when the user changes. Backup retention and deletion reconciliation remain operational gates; active-row deletion is not forensic erasure of old snapshots.
