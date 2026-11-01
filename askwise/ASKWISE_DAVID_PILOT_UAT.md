# ASKWISE David Pilot UAT

Date: 2026-11-01
Status: NOT READY. No real David account enabled by this task.

| Test | Status | Actual evidence / remaining work |
| --- | --- | --- |
| A Math attempt -> K diagnosis -> hint -> retry -> evidence | NOT RUN | 11 engine unit tests pass, but no current authenticated client end-to-end submission. |
| B Politics -> P diagnosis -> map -> reflection | NOT RUN | Routes exist; no current full client trace. |
| C Aoyu responds to actual task events | NOT RUN | Component exists and default PNG HTTP 200; seven states defined, Safe Error absent. |
| D Logout/login preserves records | BLOCKED | Authenticated student login/logout not established. |
| E Student A cannot read student B | BLOCKED | No verified ownership boundary; do not use real student data. |
| F Compass mock handoff -> ASKWISE -> writeback | BLOCKED | Existing mock contract has 10 passing unit tests; actual learning writeback and permission checks absent. |
| G Upload/AI/network failure safely degrades | NOT RUN | No real upload or external AI flow verified; no network-failure test executed. |

Next test fixtures must be anonymous student A/B/C, without names, contacts or identity documents. Test records must be isolated from existing SQLite data. Capture attempt IDs, diagnosis code, hint level, retry count, evidence ID and reload result. Do not equate seeded questions, checked task status or mock results with student submissions.

Real-account activation requires consent, access checks, retention/deletion verification and Founder approval. No screenshots, preview code or device results are claimed.
