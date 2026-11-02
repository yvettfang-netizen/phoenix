# ASKWISE™ CODEX PHASE 1 EXECUTION

**Status:** GO  
**PRD Baseline:** `ASKWISE_PRODUCT_PRD_V1.0.1.md`  
**Scope:** Core Learning Loop only  
**Core Principle:** Diagnose First. Answer Later.

---

## 1. Phase 1 Goal

Implement and verify the minimum ASKWISE learning loop:

> Today → Task → Initial Attempt → Diagnosis → Hint → Retry → Evidence

Do not expand scope until this loop is traceable end to end.

---

## 2. Frozen Boundaries

1. Do not redesign or rebuild ASKWISE.
2. Do not change existing Learning Engine diagnosis semantics.
3. Preserve current diagnosis taxonomy:
   - Politics: P1–P5
   - Mathematics: K1–K7
4. Preserve existing Hint Engine levels 0–5.
5. Product-level Signal / Direction / Method are presentation intents only; do not remap levels until a separate Hint Policy Audit.
6. Do not add new Agents.
7. Aoyu is Companion / Guidance Layer only.
8. Do not migrate or redesign the database in Phase 1.
9. Do not rebuild Reflection, Political Map, Math Strategy Map, or Growth Dashboard in Phase 1.
10. Education Compass integration remains behind the existing formal Data Contract and adapter boundary.

---

## 3. Existing Engineering Baseline to Reuse

Prefer incremental implementation using the existing project:

- `/` — Today
- `/student-task` — task creation / initial task entry
- `/task/[taskId]` — primary learning interaction route
- `/evidence` — learning evidence
- existing `src/lib/db.ts`
- existing `src/lib/engine/*`
- current diagnosis engine
- current hint / retry flow

Do not create duplicate flows when an existing path can be hardened.

---

## 4. Required Phase 1 States

Within `/task/[taskId]`, make the state transitions explicit:

1. `INITIAL`
2. `DIAGNOSED`
3. `HINTED`
4. `RETRYING`
5. `SOLVED`
6. `UNSOLVED` where required by current engine/session semantics

The implementation may use existing state/data rather than introducing a new persistence enum if that would require schema migration.

---

## 5. Required Components

Implement or extract only where useful:

- `task-state-shell`
- `confidence-selector`
- `diagnosis-card`
- `hint-card`
- `retry-input`
- `evidence-timeline`
- shared card/button primitives where necessary

Aoyu may be wired as a non-decision visual companion if official assets are ready; absence of Aoyu assets must not block the Core Loop.

---

## 6. Core Rules to Verify

### Rule A — Initial Attempt First
The default learning path must not reveal a complete solution before an initial student attempt.

### Rule B — Diagnosis Before Guidance
A Hint shown for a failed attempt must be associated with the current Diagnosis.

### Rule C — Preserve Diagnosis Taxonomy
Do not replace P1–P5 / K1–K7 with a new generic K1–K6 model.

### Rule D — Preserve Hint Levels
Keep current engine `0–5` Hint Levels.

### Rule E — Retry After Hint
After guidance, the student must be able to Try Again and the retry must be recorded.

### Rule F — Evidence Traceability
The system must support traceability:

> Attempt → Diagnosis → Hint → Retry → Outcome → Evidence

---

## 7. Data Handling

Treat PRD product objects as domain semantics, not authorization to change database schema.

Reuse current persistence wherever possible.

Do not change ASKWISE internal primary keys.

Do not bypass Education Compass external-ID mapping rules.

No database migration is authorized by this Phase 1 GO.

---

## 8. Acceptance Tests

### AC01
Open Today and enter an existing or valid task.

### AC02
Submit an initial incorrect attempt and confirm a structured diagnosis is generated.

### AC03
Confirm diagnosis code remains in the existing subject taxonomy.

### AC04
Confirm the student can receive progressive guidance through the existing Hint mechanism without premature full-answer leakage.

### AC05
Submit a retry and verify it is counted separately from the initial attempt.

### AC06
Solve after retry and confirm Evidence is generated / retrievable.

### AC07
Verify the full chain can be traced from the Evidence or session data:
Attempt → Diagnosis → Hint → Retry → Outcome.

### AC08
Verify a duplicate UI component or route has not created a parallel learning flow.

### AC09
Verify no Agent, schema migration, or core engine semantic change was introduced.

### AC10
Run existing tests plus focused tests for changed Phase 1 files. Report PASS / FAIL individually.

---

## 9. Required Codex Output

When finished, return:

### A. STATUS
`PASS`, `PASS_WITH_GAPS`, or `FAIL`

### B. BASELINE
- branch / worktree
- starting SHA
- ending SHA

### C. CHANGED FILES
Exact file list.

### D. CORE LOOP RESULT
For each state:
- Today
- Task
- Initial Attempt
- Diagnosis
- Hint
- Retry
- Evidence

state whether it is implemented, reused, modified, or still blocked.

### E. TAXONOMY CHECK
Explicitly confirm:
- Politics P1–P5 unchanged
- Mathematics K1–K7 unchanged

### F. HINT CHECK
Explicitly confirm current 0–5 Hint semantics unchanged.

### G. TRACEABILITY TEST
Provide one concrete test trace:
Attempt → Diagnosis → Hint → Retry → Outcome → Evidence.

### H. TEST RESULTS
List commands and results.

### I. GAPS / BLOCKERS
Only real remaining issues.

---

## 10. STOP CONDITIONS

Stop and report instead of changing semantics if any of the following is required:

- database migration;
- Learning Engine taxonomy change;
- Hint level redesign;
- new Agent;
- Education Compass Contract change;
- ASKWISE internal primary-key change;
- major route rebuild;
- replacement of existing learning flow.

These require a new Founder Gate.

---

## 11. GO Decision

**GO / CODEX PHASE 1**

Authorized:
- incremental frontend/state implementation;
- component extraction;
- Core Loop hardening;
- tests and traceability evidence.

Not authorized:
- database migration;
- new subject logic;
- new Agent;
- core Learning Engine semantic changes;
- production integration expansion.

**END**
