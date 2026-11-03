# Identity / Health Schema Backlog V1.0

2026-11-03 · **PASS: bounded difference audit; HOLD: domain persistence, publication and sensitive writes.** Exact current candidate inputs: [Identity PR #35](https://github.com/yvettfang-netizen/phoenix/pull/35), [Health PR #33](https://github.com/yvettfang-netizen/phoenix/pull/33), [Health GEO PR #34](https://github.com/yvettfang-netizen/phoenix/pull/34), with immutable file references in [source index](SOURCE_INDEX.json). Their pre-merge Canonical status descriptions are historical; the 0035 merge does not approve their runtime mappings.

## Identity — separate public policy and private case

Reuse `identity.cases`, casework collaboration, existing People/Family/Client/Partner, Docs/Consent/Audit and Service Project. A Country/Jurisdiction catalogue is not a customer, destination label is not identity proof, and an imported policy row is not a person's case decision.

| Candidate | Minimum versioned facts / next gate |
|---|---|
| Jurisdiction / Programme | Only **KN Saint Kitts and Nevis, AR Argentina, VU Vanuatu, ST São Tomé and Príncipe**. Language-neutral keys, reviewed bilingual labels and programme identity; no worldwide passport catalogue or inferred eligibility. |
| Policy Revision | Preserve **legal_status**, **operational_status**, **application_status**, **passport_issuance_status** independently. Source code has distinct enums for all four; the older mapping prose mentioning three must not collapse the fourth. Values, source period and uncertainty are separate. |
| Official Source | URL/publisher, retrieval/verification time, scope/effective status, digest and reviewer; OFFICIAL vs INTERNAL_EXPERIENCE vs MODEL_INFERENCE must remain explicit. This audit does not independently verify current immigration law or publish a country-policy claim. |
| Import Batch / Candidate Revision | Preserve original source reference/hash, batch/import actor/time, data version, parser errors, verification and approval independently. Never overwrite a published revision with an unchecked spreadsheet. No files imported in this task. |
| Review / Publication | Authorized reviewer, decision/time, approved revision pointer and retraction history. Candidate/noindex until approved; public content access must not grant family-case access. Retention and source storage need approval. |

Programme cost, fees, timing, residence, due-diligence and family eligibility are nullable source-bound attributes, not automatic quotes or passport guarantees. Public policy content may use existing Notion/source publishing authorities rather than a second CMS. A future catalogue Migration must be separate from minimal CRM 0036 and must define owner, revision uniqueness, publication ACL, lineage and rollback by forward correction.

## Health — non-sensitive preparation first

Global Health belongs to **HEALTH**, with Shenzhen as the first market. APEC is a brand/GEO content source, not evidence of a conference partnership, provider agreement or authorization.

| Proposed intake fact | Existing 0035 reuse / gap |
|---|---|
| Lead/source and referral | Existing source/Lead/partner-relationship authorities; trusted validation required. No commission or family access derives from referral. |
| Current region / destination / language | Distinct typed non-sensitive requirements are not present in a proven Health intake API. Do not put clinical reasons into a free-text CRM field or infer destination from source channel. |
| Contact authorization | Separate purpose, recipient, evidence/version, validity and withdrawal. A checked browser box is a claim, not a server-recorded grant. Existing general Consent cannot be assumed to encode this contract. |
| Consultation / service progress | Reuse CRM Consultation and Service Project. Family projection only under approved subject scope and minimal DTO. Source intake does not create a patient Case, appointment or clinical authority automatically. |
| Project subject authorization 0034 | `PATIENT_SELF`/`LEGAL_GUARDIAN`, HEALTH scope and evidence digest are project-governance references. They do not implement complete patient medical-record consent or prove legal capacity. |
| Medical case/files, patient consent, claims, real booking | Separate security/business gate; patient-specific scope, private object storage, file checks, retention/deletion and audit required. HOLD. |

Health's candidate `health-integration-contract.ts` explicitly separates contact, handoff and patient-record consent and keeps unconnected stores/projections HOLD. Keep that fail-closed behavior. No medical record, raw assessment answer, policy document or diagnosis in an ordinary CRM event or Family Timeline. Founder access is limited by approved non-sensitive aggregate contracts.

## Wealth / Finance cross-domain boundary

WEALTH already exists on Consultation, Deal, item and Service Project. No new Person/Client master is required. `crm.deals.estimated_amount` is estimated pipeline, not cash received, an invoice, booked revenue or commission payable. Finance authority, legal-entity/payment keys, reconciliation, insurance-contract access and operation approvals remain missing. Payment/refund/commission/insurance writes remain HOLD. No active payment route is invoked by these tests.

Next: approve minimal CRM provenance/need rules first. Identity content publication, Health intake/patient access and Finance each remain separately scoped backlogs; none is silently bundled into 0036.
