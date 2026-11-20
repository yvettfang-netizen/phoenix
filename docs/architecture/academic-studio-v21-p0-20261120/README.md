# Phoenix Academic Studio V2.1 — P0 review package

Status: **PROPOSED**. This package contains architecture and six synthetic page previews. No migration was installed, no database was changed, and no production system was contacted.

Baseline: `phoenix/main@9db147ac3a5d135d50b90bfea5a7316ce747d90b` (verified 2026-11-20); formal Canonical migrations `0001–0037`. PR #76 and PR #77 remain separate draft candidates.

## Deliverables

- [Founder Decision Record — approved P0 choices and P0.1 gate](FOUNDER_DECISIONS.md)
- [Founder Executive Decision Brief](EXECUTIVE_DECISION_BRIEF.md)
- [Target ERD](TARGET_ERD.md)
- [Database reuse and gaps](DATABASE_REUSE_AND_GAPS.md)
- [0042 re-review](CANDIDATE_0042_REVIEW.md)
- [Three business loops](BUSINESS_LOOPS.md)
- [Six page previews](../../../website/phoenix-nova-website-v5/docs/previews/academic-studio-v21/index.html)
- [Phased work packages](WORK_PACKAGES.md)
- [Jimson nonproduction acceptance](JIMSON_NONPROD_ACCEPTANCE.md)
- [Validation and open items](VALIDATION.md)

The page previews are static design artifacts. All people, dates, course codes and balances shown there are synthetic. Navigation between preview pages works; business actions remain labelled as unavailable.

| Six previews | Desktop proof | Mobile proof |
| --- | --- | --- |
| Student learning center | [PNG](evidence/student-center-desktop.png) | [PNG](evidence/student-center-mobile.png) |
| Course detail | [PNG](evidence/course-detail-desktop.png) | [PNG](evidence/course-detail-mobile.png) |
| Student timetable | [PNG](evidence/student-timetable-desktop.png) | [PNG](evidence/student-timetable-mobile.png) |
| Parent growth report | [PNG](evidence/parent-growth-desktop.png) | [PNG](evidence/parent-growth-mobile.png) |
| Teacher workbench | [PNG](evidence/teacher-workbench-desktop.png) | [PNG](evidence/teacher-workbench-mobile.png) |
| Teaching admin workbench | [PNG](evidence/admin-workbench-desktop.png) | [PNG](evidence/admin-workbench-mobile.png) |

## Founder P0.1 decisions and next gate

Founder approved the P0 choices on 2026-11-20. See [Founder Decision Record](FOUNDER_DECISIONS.md).

The follow-on contract package is prepared for Codex/Jimson review:
- [Identity contract — Student default, explicit Parent switch](P0_1_IDENTITY_CONTRACT.md)
- [Shared teaching resource contract](P0_1_SHARED_RESOURCE_CONTRACT.md)
- [Separate assessment and growth timeline contract](P0_1_ASSESSMENT_CONTRACT.md)
- [Commercial options — HOLD, discussion only](P0_1_COMMERCIAL_OPTIONS_HOLD.md)
- [Migration impact and negative acceptance matrix](P0_1_MIGRATION_IMPACT_AND_NEGATIVE_TESTS.md)
- [P0.1 gate plan](P0_1_GATE_PLAN.md)

P0.1 status: **Codex source and isolated PG16/17 technical review completed; security gate HOLD; no migration authorized**. See the [actual technical review](P0_1_TECHNICAL_REVIEW.md), [security second pass](P0_1_SECURITY_SECOND_PASS.md), [evidence matrix](P0_1_MIGRATION_IMPACT_AND_NEGATIVE_TESTS.md), and the [narrow Jimson nonproduction receipt ticket](P0_1_JIMSON_NONPROD_TICKET.md). The commercial rules remain HOLD.


## Engineering delegation rule

- [Codex First / Jimson Manual Only](../../engineering/CODEX_FIRST_JIMSON_MANUAL_ONLY.md)

P0.1 execution is Codex-led. Jimson is assigned only specific manual/non-production actions that Codex cannot perform with its authorized tools. See the updated [P0.1 Gate Plan](P0_1_GATE_PLAN.md).
