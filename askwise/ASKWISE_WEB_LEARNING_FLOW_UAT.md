# ASKWISE Web Learning Flow UAT

Date: 2026-11-01. Result: PASS for anonymous baseline rule scenarios; not semantic-grading approval.

Actual browser: http://127.0.0.1:3012, anonymous student A. Today -> task creation -> original attempt -> diagnosis/hint -> retry -> evidence -> reflection -> dashboard was exercised. Math task 1: K2, Hint1, Attempts1/Retry0; retry -> Attempts2/Retry1, assisted completion, saved evidence visible after reload. Politics task 5: structured signals plus original uncertainty -> P2, Hint1, retry, assisted completion. Three reflection answers were manually entered, saved and reloaded. Actual screenshots were emitted during the session.

Both flows used the existing rule engine. P/K code persistence and the retry counter were corrected in the delivery layer; engine taxonomy/hint semantics were not edited. Structured answers are retained as original JSON in the existing response TEXT field and rendered as labeled fields. No answer image is auto-graded or OCR-transcribed.

Additional real HTTP UAT against the production Web build: 14 checkpoints PASS, including duplicate task/retry/photo submissions, lost-response replay, A/B denial, upload/download, export, logout/re-login and disposable-account deletion. Output: askwise-learning-engine/data/uat/final-http-uat.txt (private, ignored).

The production build passed with ASKWISE_BUILD_MODE=server and started with next start. This result is distinct from development-mode browser testing and from any WeChat build. Physical network-disconnection/device UAT is NOT RUN; simulated response loss and client mock-network failure are separately identified.

Known limits: old keyword rules are permissive and restricted to two baseline topics. A rule-recognized response is not proof of a complete correct solution. No real student or real David account was used. See ASKWISE_DAVID_PILOT_READINESS.md for full gate status.
