# Pre-merge architecture gap report

**Gate 3: FOUNDER PRODUCT TAXONOMY CONFIRMED / DATABASE IMPLEMENTATION PENDING.** Audited private Canonical default commit `3af6ba19a96a458dc20cb0f4493bed10aee7028a` against the public `phoenix/main` base `259753248ff54b07fd9c52f270e45ae1c877bc09`.

| Boundary | Verified implementation | Gap / required action |
|---|---|---|
| Person, Family, Student, Principal | Existing `core` and `auth` masters remain unique; 0026 adds Organization and family-mapped `crm.clients`. | No duplicate master is proposed by this integration. Real cross-system identity mapping remains a separate controlled registration gate. |
| Client → Lead → Deal → Service Project | `crm.clients.family_id` references `core.families`; `crm.leads` uses a source and optional verified identity links; `crm.deals` requires Client/Family and may reference a Lead; `service.projects` requires the Client/Family pair and may reference a Deal. | Validate application DTO mapping before enabling writes. The SQL copy alone does not activate a website or Compass integration. |
| Partner and attribution | 0031 supports Person/Organization partner relationships and referral ownership; 0032 `lead_attributions` links Lead, source, optional partner relationship/campaign and `compass_kind`. | Attribution partner and code taxonomy need application tests; no real partner records are included. |
| Education / Identity / Wealth / Health | All four appear as service `business_domain` values. | Founder confirmed these as four professional domains. `CHILD_COMPASS` is an Education entry; `FAMILY_COMPASS` is cross-domain. Existing entry, need and final service are not fully separated with actor/source evidence. See [`FOUR_COMPASS_FIELD_CONTRACT_AUDIT.md`](FOUR_COMPASS_FIELD_CONTRACT_AUDIT.md); forward 0036+ design remains outside PR #36. |
| Health authorization | 0034 adds project subject authorization with patient-self/legal-guardian evidence and expiry. | This is project-subject authority, **not** a Health patient's treatment, sharing or medical-document Consent. The private [`HEALTH_DEPENDENCY_GATE_V2.0.md`](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/3af6ba19a96a458dc20cb0f4493bed10aee7028a/canonical-db/HEALTH_DEPENDENCY_GATE_V2.0.md) keeps patient semantics, Health Consent, document class/retention and approved questionnaire HOLD. |
| Operations vs Finance | 0021 `operations_ref` is a source-qualified, revocable entitlement reference. CRM Deal amount is pipeline intent; Service Project is delivery. | Neither creates order, payment, invoice, settlement or ledger authority. Private [`FINANCE_DATA_AUTHORITY_REPORT_V2.0.md`](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/3af6ba19a96a458dc20cb0f4493bed10aee7028a/canonical-db/FINANCE_DATA_AUTHORITY_REPORT_V2.0.md) keeps future Finance authority EVIDENCE_MISSING. |
| Migration authority transfer | Private default branch holds the complete 0035 sequence; public main had no `database/canonical/`. | Proposed branch is a copy, not a new database. The public path becomes the single future Migration authority only after formal approval and merge. Freeze dual writes/parallel Migration heads at that transition. |

No 0032/0033 change is included and historical First Touch must not be overwritten. Any later correction must be additive and forward-only. The private PR #2–#7 chain is historical engineering evidence, not proof of merge into the public main branch.

The additive need-event candidate is documented separately in private [Draft PR #8](https://github.com/yvettfang-netizen/phoenix-canonical-db/pull/8), alongside synthetic interface preparation. It contains no new executable Migration and does not enter public PR #36. The detailed audit prefers extending the existing immutable Lead event authority before proposing any new fact table.

## Key integrity edges verified in SQL

| Edge | Constraint |
|---|---|
| Client → Family | `crm.clients.family_id → core.families.family_id` (0026). |
| Client Party → Client/Family and master | `(client_id,family_id) → crm.clients`; exactly one `core.people` or `core.organizations` reference according to party kind (0031). |
| Partner → master/source | Exactly one Person or Organization reference; referral/channel relationships require `lead_source_id` (0031). Partner is a relationship, not a replacement Client master. |
| Lead attribution | `lead_id → crm.leads`, `lead_source_id → crm.lead_sources`, optional `partner_relationship_id → crm.partner_relationships` and `campaign_id → crm.campaigns` (0032). |
| Deal → Client/Family and Lead | `(client_id,family_id) → crm.clients`, optional primary Lead reference (0027). A Deal is commercial intent, not a payment record. |
| Service Project → Client/Family and Deal | `(client_id,family_id) → crm.clients`; optional `(deal_id,client_id,family_id) → crm.deals` prevents a cross-client Deal attachment (0028). |
