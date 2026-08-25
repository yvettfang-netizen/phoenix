# Python Engine Mapping to ASKWISE TypeScript Engine (V1.0 Web MVP)

Date: 2026-08-22

This document maps the historical Python learning rules as a behavioral baseline to the new TypeScript engine modules.

## Scope and baseline

Python historical files are treated as the baseline for behavior and do not get rewritten.

- `student_model.py`
- `diagnosis_engine.py`
- `learning_engine.py`
- `agent_policy.py`
- `session_log.py`
- `demo.py`

## Mapping

### student_model.py

- `TopicKnowledge` (attempt counters, correctness counters, first-step times)
  - → `src/lib/engine/learning.ts`
    - `TopicKnowledge`
    - `StudentProfile`
    - `recordAttempt()`, `isUnknown()`, `isForgotten()`, `knowledgeLabel()`
    - `getHintDependencies()`, `addHintDependency()`

- `StudentProfile.update_after_interaction()` and mastery formulas
  - → `StudentProfile.recordAttempt()`

- `first_step_time_history`
  - → `StudentProfile.recordAttempt()` with optional `firstStepTime`

### diagnosis_engine.py

- `POLITICS_TAXONOMY` (P1-P5)
  - → `src/lib/engine/diagnosis.ts` constant `POLITICS_TAXONOMY`

- `MATH_TAXONOMY` (K1-K7)
  - → `src/lib/engine/diagnosis.ts` constant `MATH_TAXONOMY`

- `diagnose()` rule dispatcher
  - → `src/lib/engine/diagnosis.ts`
    - `diagnose(subject, topic, studentInput)`
    - `politics` heuristic branch
    - `math` heuristic branch

### learning_engine.py

- `LearningMode` class constants
  - → `src/lib/engine/learning-mode.ts` constants `LearningMode`

- `choose_learning_mode()`
  - → `chooseLearningMode(profile, subject, topic, diagnosis)`

- mode precedence (`unknown -> Teaching`, `forgotten -> Recall`, correct -> Transfer, execution error -> Debug, no method -> Thinking, correct reasoning -> Transfer, fallback Recall)
  - → preserved verbatim in `chooseLearningMode`

### agent_policy.py

- `next_hint_level()`
  - → `src/lib/engine/hint-policy.ts` function `nextHintLevel()`

- `HINT_LEVELS` 0-5
  - → `src/lib/engine/hint-policy.ts` constant `HINT_LEVELS`

- `build_hint()` behavior and taxonomy-specific prompts
  - → `src/lib/engine/hint-policy.ts`:
    - `POLITICS_HINTS`
    - `MATH_HINTS`
    - `buildHint(subject, topic, hintLevel, learningMode)`

- `build_hint(level=0) -> no hint`
  - → explicit `""` return when `hintLevel <= 0`

### session_log.py

- Logging schema requirement
  - timestamp, subject, topic, student_input, diagnosis, error_type, learning_mode, hint_level, first_step_time, outcome
  - → `src/lib/engine/session.ts`
    - `SessionLogger`
    - `createSessionLogEntry()`

### demo.py

- Scripted interaction loop and state progression logic (`first attempt`, diagnosis -> mode -> escalation -> hint -> retry)
  - → `src/app/task/[taskId]/page.tsx` server action `submitAttempt` and DB-backed attempt persistence

## No behavior-change policy

No intentional behavior changes were made in this phase.

### Behavioral parity vs Python runtime

- Current TypeScript behavior was implemented to match the historical logic path from:
  - P1-P5
  - K1-K7
  - 5 learning mode selection
  - Hint 0-5 escalation
  - no early answer leak policy
  - repeated failure hint progression
  - execution error branch (`K6` path)

### Behavior Change

- `Behavior Change` entries: `None` in this pass.

