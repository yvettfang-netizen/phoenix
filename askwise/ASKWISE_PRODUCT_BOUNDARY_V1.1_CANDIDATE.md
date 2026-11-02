# ASKWISE Product Boundary V1.1 Candidate

Status: Candidate for founder approval  
Date: 2026-08-25

## Product relationship

- **Askwise / 问思:** Phoenix's internal education intelligence system for
  advisors, teachers, and the education team.
- **Education Compass:** the family- and student-facing assessment product.
- **Learning Support Module:** a retained Askwise module for structured
  subject-learning diagnosis; it is not the whole Askwise product.

## Askwise is responsible for

- Preserving education judgment methods, evidence, rule versions, and human
  confirmation records.
- Checking whether an advisor case contains enough information to proceed.
- Detecting material information gaps, conflicts, risks, and uncertainty.
- Producing the minimum next questions and work recommendations for internal
  advisors.
- Supporting internal consideration of identity context, education pathways,
  school choice, long-term education planning, and complex family cases.
- Calling the Learning Support Module when a case enters specific subject
  learning.
- Maintaining auditable case records and evidence-based preliminary outputs.

## Education Compass is responsible for

- Collecting parent/student-facing basic information and consent.
- Identifying broad direction, overall issues, and subject focus.
- Showing only approved, simplified results to families.
- Handing cases that require deeper internal judgment to Askwise.

## Hard boundaries

- Education Compass must not build a duplicate education judgment engine.
- Askwise must not be reduced to a general student chatbot or a pure subject
  tutoring interface.
- No rule may state or imply a certain admission, score improvement, identity,
  school-policy, or long-term development outcome without verified evidence and
  named human approval.
- Internal advisor analysis is not automatically a family-facing result.
- Existing Diagnosis, Hint Policy, Knowledge/Strategy Map, and learning loop
  remain unchanged.
- This candidate uses deterministic rules, report templates, and human
  confirmation only. It does not call OpenAI or another paid model API.

## Architecture boundary

```
Education Compass (front-stage assessment)
              |
              | approved handoff only
              v
Askwise Internal Education Intelligence System
  |- Advisor Case & Rule Card Module
  |- Learning Support Module
  |    |- Diagnose First. Answer Later.
  |    |- Knowledge / Strategy Map
  |    |- Error Analysis -> Method Optimization -> Re-verification
  |- Evidence and Human Confirmation Records
```

## Rule-source discipline

The initial Rule Cards may encode only procedural safeguards explicitly stated
in this boundary and the 2026-08-25 founder brief: completeness before
assessment, conflict escalation, no unverified definitive outcome, evidence
traceability, and human confirmation. They do not encode school, immigration,
identity, or success-rate policy claims.
