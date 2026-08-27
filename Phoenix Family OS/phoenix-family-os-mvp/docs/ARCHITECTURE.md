# Phoenix Family OS™ MVP Architecture

- Version: V0.1
- Runtime: native WeChat Mini Program
- Current environment: Local Demo
- Last reconciled: 2026-08-27

## Runtime structure

```text
Pages / Brand Component
→ Domain Services
→ Repository
→ wx Local Storage (PFS_DB_V01)

Education Compass completion
→ persistent local outbox
→ fixed loopback HTTP proxy
→ Local Demo session + validation + ownership
→ local SQLite questionnaire_submissions + metadata audit

Growth Insight request
→ ai-provider boundary
→ deterministic local rules (no external model)
```

Pages do not directly write storage. The loopback backend supplements questionnaire persistence only; it does not replace the local Family OS repository.

## Product surfaces

Family-facing:

- welcome, home, Family Profile, Child Profile
- Education Compass and questionnaire
- 成长洞察 report
- Family Timeline
- Advisor Service request
- Mine/settings

Internal Demo:

- Advisor family list
- Advisor family detail, request, note, follow-up state

Partner preview routes remain in source for isolated development evidence but are not part of normal family navigation or the current P0 loop.

## Role and permission reality

| Role | Current implementation | Trusted authorization? |
|---|---|---|
| Family User | fixed local Demo user; page-level ownership checks | No |
| Advisor | local seeded admin identity; reads all local families | No |
| Admin | represented by the same local `admin` role | No |

Family and internal entry points are visually isolated, but client-side guards are only Demo safeguards. Production requires server-side identity, family ownership, advisor assignment, consent scope/revocation, and auditable access.

## Shared identifiers

- `user_id` owns a Family in the local model.
- `family_id` joins Student, Timeline, Advisor Request/Note, and backend questionnaire ownership.
- current child records use `students.id`; future integration may map this stable value to the shared contract name `child_id`, but no schema change is authorized in this release.

## AI and professional boundary

`services/ai-provider.js` reports `PROVIDER_MODE = local_rules`. Output is deterministic rule-assisted `成长洞察`; there is no NOVA chat, external model, retrieval, prompt/model version ledger, autonomous write, or production Advisor Handoff.

## Production gaps

- production WeChat identity/session
- managed database and migrations for all Family OS entities
- service-side RBAC, consent, audit, export/deletion, and retention
- Growth Blueprint contract/versioning
- Reminder and full Timeline Item lifecycle
- real NOVA service controls
- WeChat compile, simulator/device matrix, and brand-source sign-off
