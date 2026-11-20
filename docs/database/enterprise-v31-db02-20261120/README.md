# Phoenix Canonical Enterprise V3.1 — DB-02

**Status: isolated candidate; Draft PR; no merge, deployment, real identity, or real data.**

This package depends on DB-01 [PR #77](https://github.com/yvettfang-netizen/phoenix/pull/77) at `9f51b430164515d2aa5c92c2a2569a6fd6c549e4` and its 0042 candidate. The Founder confirmed **0043 as an isolated candidate number**, without authorizing a mainline migration or installation. The live main migration authority remains `database/canonical/migrations/` and formally ends at 0037 in the checked baseline. Reserved 0038–0041 are not copied or overwritten.

## Package boundary

DB-02 implements the smallest handoff that existing authorization can prove: transferring responsibility for one existing `service.tasks` row between two Staff principals who **already** have live assignments to the same project in the same organization. The recipient's project assignment and document access are never created by acceptance. The CRM client owner, commercial lead source, partner attribution, sales responsibility and full customer transfer stay separate. They are not silently inferred from a task handoff.

The broader CRM/customer handoff remains **HOLD** pending the exact owner, consent, transfer scope and notification contract. DB-03–05 remain separate follow-up packages.

## Deliverables

- [Database Architecture V3.1](DATABASE_ARCHITECTURE_V3_1.md)
- [Measured table reuse matrix](TABLE_REUSE_MATRIX.md) and [specific gap assessment](REUSE_GAP_MATRIX.md)
- [Corporate OS access model](CORPORATE_OS_ACCESS_MODEL.md)
- [Family OS / Corporate OS data contract](FAMILY_CORPORATE_DATA_CONTRACT.md)
- [Student lifecycle design](STUDENT_LIFECYCLE_DATA_MODEL.md)
- [Jimson nonproduction handover](JIMSON_NONPROD_HANDOVER.md)
- [DB-02 execution report](DB02_EXECUTION_REPORT.md)
- [0043 SQL candidate](../../../database/canonical/forward-candidates/task-handoff/0043_scoped_task_handoff.sql) and [hash manifest](../../../database/canonical/forward-candidates/task-handoff/manifest-0043-task-handoff.json)
- [PG16 evidence](evidence/pg16/acceptance.json), [PG17 evidence](evidence/pg17/acceptance.json), [PG16 catalog](evidence/pg16/catalog.json)

No backfill is needed for 0043 because its tables start empty. A runtime feature flag and trusted API for handoff are **not** included; callers cannot turn a candidate into production behavior by direct table access.
