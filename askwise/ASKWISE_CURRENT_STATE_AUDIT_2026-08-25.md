# ASKWISE Current State Audit - 2026-08-25

## Scope and location

The active ASKWISE implementation is the existing project at
`askwise-learning-engine/`. The Python V0.1 baseline remains in this repository
root. No parallel repository is needed.

## Assets already present

- **Historical Python baseline:** `student_model.py`, `diagnosis_engine.py`,
  `learning_engine.py`, `agent_policy.py`, `session_log.py`, `demo.py`, and
  `tests/`. It defines the original P1-P5 / K1-K7 taxonomies, five learning
  modes, Hint 0-5, and JSON session-log contract.
- **Web MVP:** Next.js App Router routes for Today, Student Task, task flow,
  evidence, political knowledge map, math strategy map, reflection, and growth
  dashboard.
- **TypeScript Learning Support Module:** `src/lib/engine/` contains the
  migrated diagnosis, learning-mode, hint-policy, profile, and session-log
  rules. Learning decisions are outside React components.
- **SQLite persistence:** `src/lib/db.ts` persists the David 13-day pilot,
  tasks, sessions, attempts, diagnoses, hints, learning evidence, maps, and
  reflections.
- **Compass preparation:** `src/lib/compass/mock-adapter.ts` and its Vitest
  suite implement the V1.1 mock input/return contract, ID mapping,
  idempotency, version handling, and standard errors. The formal data contract
  and handoff documents are in the repository root.
- **Aoyu assets:** the source zip exists at repository root and the extracted
  assets/config are present in `askwise-learning-engine/public/assets/aoyu/`,
  `src/config/aoyu.ts`, and `docs/character/`.

## Implemented but not established as runtime-verified before this change

- The Web MVP, Aoyu asset wiring, Compass mock adapter, and their existing
  tests are implemented in source.
- Earlier work recorded environment and package-manager disruption. Source
  presence alone is not treated as a passing runtime verification.
- The historical Python files are a behavioral baseline; they are not the Web
  runtime and no Python-runtime parity is claimed by this audit.

## Alignment with the updated Askwise positioning

Already aligned and reusable:

- `Diagnose First. Answer Later.` is embodied by the Learning Support Module.
- Learning evidence, knowledge maps, strategy maps, error analysis, reflection,
  and re-verification are already distinct persisted concepts.
- The Compass contract keeps Compass at an intake/handoff boundary instead of
  duplicating the learning diagnosis engine.
- SQLite and the module-oriented `src/lib/` structure support an internal,
  traceable rules layer without a service rewrite.

Still limited to a single-student learning tool:

- `src/lib/db.ts` seeds and uses the single pilot student `David`.
- UI copy, metadata, and routes describe ASKWISE as a 13-day learning engine.
- The existing Compass adapter only initializes a learning-support session; it
  has no internal advisor case intake, evidence completeness check, or
  advisor-confirmation record.
- There is no Rule Card schema, advisor judgment trace, or rule-backed case
  record yet.

## Reuse for today's scope

- Keep `src/lib/engine/` unchanged as the Learning Support Module.
- Keep `src/lib/compass/mock-adapter.ts` unchanged as the Compass V1.1 mock
  contract.
- Extend the existing SQLite layer only with separate advisor-case tables.
- Reuse the existing server-rendered Next.js style for a minimal internal
  advisor intake route; no redesign is required.

## Changes genuinely needed today

1. Establish the updated internal-system product boundary in documentation.
2. Add a deterministic advisor Rule Card schema and the minimum rule set whose
   sources are the approved product boundary and founder brief only.
3. Add an advisor case evaluator that returns completeness, conflict,
   preliminary-assessment, uncertainty, traceability, and human-review data.
4. Add anonymized, redacted advisor-case persistence and an internal submission
   route.
5. Add tests for the advisor closure while retaining the Learning Support and
   Compass test suites.

## Explicit non-scope

No Education Compass production connection, external model/API call, new
subject logic, learning-engine rewrite, parent UI, payment, CRM, or admission/
score/identity outcome prediction is part of this change.
