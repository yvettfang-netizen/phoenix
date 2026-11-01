# ASKWISE Compass Handoff Test

Date: 2026-11-01

Executed command: `pnpm.cmd run test` in askwise-learning-engine.
Actual result: mock-adapter.test.ts, 10/10 PASS, as part of 30/30 passing tests.

Executed scenarios: valid input/mapping, default v1.0, missing required field, invalid education-system enum, repeated validation failure without sessions, idempotent session ID, missing student mapping, missing assessment mapping without automatic creation, version mismatch before mapping, unknown session EC_SESSION_NOT_FOUND.

Scope: in-memory mock only. No real Compass, Canonical PostgreSQL, Notion or production service connected.

Requested handoff uses recommended_learning_mode; existing Contract V1.1 uses recommended_learning_goal. Requested return uses session_id/highest_hint and learning_evidence_summary/next_action; existing mock uses askwise_session_id/hint_level_max and a different return schema. Do not silently rename or infer values in the frozen contract. A future wrapper requires explicit version semantics and validation.

Existing mock derives subject, diagnosis and learning mode from mock heuristics/defaults, not from persisted engine output. It has no verified authenticated caller/student scope or real learning writeback. Therefore end-to-end handoff/writeback acceptance is BLOCKED despite unit-test PASS.
