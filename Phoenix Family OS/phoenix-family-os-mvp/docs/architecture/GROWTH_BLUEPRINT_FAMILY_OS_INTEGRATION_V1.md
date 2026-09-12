# Growth Blueprint × Phoenix Family OS Integration V1

Status: `LOCAL DEMO CONTRACT PROOF — NOT PRODUCTION AUTHORITY`

## Purpose

This document freezes the smallest Gate 0–1 integration proof between the static Phoenix Growth Blueprint concept and the Phoenix Family OS MVP. It turns an existing, completed Education Compass report into a structured, family-scoped preview record that can be reopened from the Family OS home and report views.

The Blueprint is a domain output. It is not a User, Family, Student, Guardian, Core identity, entitlement, payment, or CRM record.

## Contract

`services/growth-blueprint.js` emits `growth_blueprint.v1` with these sections:

| Field | Meaning |
| --- | --- |
| `id` | Local demo domain record ID with the `gbp_` prefix; not a Phoenix Core ID |
| `family_id` / `student_id` | Existing Family OS local references, scoped to the same family |
| `source_report_id` | The completed local Education Compass report that produced this output |
| `profile` | Current family goal, student name and current-stage context |
| `growth_map` | Strength, interest, challenge and observation signals from the report input |
| `education_path` | Direction and planning principle derived from the deterministic report recommendation |
| `action_plan` | A 30-day next action and the selected support needs |
| `source` | Provenance and local rule-engine version; no external model call |

The contract is deterministic and validates its required sections before persistence. A report can produce at most one record: `source_report_id` is the idempotency key, and a replay retains the first Blueprint ID.

## Family and data boundary

1. A Blueprint is created only when `student.family_id`, `assessment.student_id`, and `report.assessment_id` form one valid local chain.
2. `repository.upsertGrowthBlueprint` rejects a mismatched family/student context.
3. Family pages resolve Blueprint records through the Family OS repository; no page trusts a client-supplied family ownership claim.
4. The preview page supports the existing local `family_user` and `admin` demo roles. This is not production RBAC.
5. The existing local `privacy_consent` boolean is not upgraded or copied into a Core consent record.

## Gate 0–1 non-actions

- No Core identity issuance, identity mapping, merge, or migration.
- No production database schema or PostgreSQL/RLS implementation.
- No real family, minor, health, OCR, payment, OpenAI API, or production database integration.
- No cross-family aggregation, recommendation, or export.
- No `HEALTH` implementation; Health remains reserved by the Core Gate 0–1 contract.
- No deployment, upload, push, or change to the public website preview.

## Verification

Run from `Phoenix Family OS/phoenix-family-os-mvp`:

```powershell
node tests/growth-blueprint.test.js
node tests/blueprint-page.test.js
node tests/validate-project.js
pnpm test
pnpm typecheck
```

The first three commands are focused local proof checks. `pnpm test` is the full MVP regression suite. `pnpm typecheck` validates TypeScript configuration only; the runtime implementation is JavaScript and does not imply production platform validation.
