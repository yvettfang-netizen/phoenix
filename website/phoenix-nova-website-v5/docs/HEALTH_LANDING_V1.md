# Phoenix Nova Health landing V1

Task: PHOENIX-HEALTH-WEB-20261029. Founder Gate 1: frontend GO on main `2e00b2c83bf54d5699fa3326d159448fda8afc0c`. Branch: `feature/phoenix-health-landing-v1`.

## Scope

`/zh/health` and `/en/health` are standalone service pages using the existing SiteHeader, SiteFooter and official brand files. Shared changes add home/footer and fourth-Compass service links only. Existing account, authentication and Family Center logic is not changed. PRs #6, #12 and #13 remain separate and untouched.

The landing is available without the questionnaire preview switch. Its assessment link uses the existing server-only `healthPreviewEnabled()` gate. Default-off shows an unavailable notice, without a questionnaire URL. The existing questionnaire routes retain their own server gate. Hero assessment CTA scrolls to this controlled section. Enabling a local test binding does not authorise an online/production switch change. Gate `1` is not authentication; any future hosted questionnaire preview needs approved access control.

Consultation is an explicit browser-only preparation demo: a service selector reveals a checklist and states that no enquiry has been sent. No names, contact details, medical text or files are requested. No submission, booking, API, storage or CRM call is implemented. Page reload resets the selection. English and Chinese FAQs explain non-clinical scope, appointment confirmation, fees, privacy and insurer responsibility. Regions are coordination directions, not institutional partnerships. Illustrative stock imagery is not evidence of real patients, staff, facilities or partners.

## Metadata and release

Both languages have page titles, descriptions, language alternates and Open Graph/Twitter metadata. Existing candidate noindex/nofollow remains in force. No production hostname is invented; absolute canonical/share URLs must be bound to the approved deployment origin at release. No formal consultation endpoint is configured. Founder visual acceptance and Xuanwu technical review remain separate release gates.

## Future Phoenix Core boundary — design only

Target flow: landing → existing questionnaire → separate, explicit consultation request → Phoenix Core Lead → CRM follow-up → contract/service instance → Family OS → Founder OS aggregates.

The approved current contracts remain authoritative:

- `Phoenix Family OS/phoenix-family-os-mvp/docs/contracts/FAMILY_CONTEXT_CONTRACT_V1.md`
- `Phoenix Family OS/phoenix-family-os-mvp/docs/contracts/COMPASS_HANDOFF_CONTRACT_V1.md`

HEALTH remains RESERVED and denied by the current Family OS ingestion contract. This frontend does not expand that enum, activate ingestion, migrate schemas or assign any canonical IDs.

Proposed future consultation request (not implemented, no endpoint promised):

| Field | Proposed purpose |
| --- | --- |
| request_id / idempotency_key | Server-issued tracing and duplicate-request protection |
| source_service / source_version | Health landing release identifier |
| entry_path / locale / service_interest | Allowlisted route, language and generic coordination interest |
| campaign_source / medium / campaign | Optional sanitised allowlisted attribution; no freeform medical content |
| consent_id / policy_version | Separate explicit consultation/contact consent, validated server-side |
| actor_user_id / primary_family_id / subject_id | Resolved from existing Core authority when applicable; never inferred from names or browser input |
| lead reference / service reference | Allocated by existing canonical Core contracts only after their schemas and authority are verified |

The eventual request must not include questionnaire answers, clinical free text, diagnoses, reports, patient documents or insurer policy documents. A consultation request is separate from permission to share questionnaire content. No automatic answer-to-lead transfer or answer telemetry. For anonymous prospects, Core must own deduplication and later identity reconciliation; this website must not create another customer/family/member registry or mint substitute IDs. Missing Core lead/service schema is `EVIDENCE_MISSING`, not grounds to invent a second database.

On future implementation, keep attribution separate from sensitive health information, strip query strings/referrers unless allowlisted, prohibit health text in analytics/logs and define retention/deletion before collection. This version collects no attribution.

Medical-document handling requires a separate approved patient-level consent model, server-side resource authorisation, PostgreSQL RLS, audited access/export, controlled storage and retention. Raw records must not enter ordinary CRM or Family Timeline. Adult medical subjects must not be forced into an education Student identity. Family OS and Founder OS should receive only explicitly authorised minimal service state and suitable aggregates, after HEALTH contracts are approved.

## Rollback

Before merge, close the new draft or leave it unmerged. After an independently approved merge, revert this landing change through review. No database rollback is needed. Disable the existing questionnaire switch using the target environment's normal reviewed restart/rebuild process if needed; verify both entry removal and direct-route 404. No production action is authorised by this document.

## Validation evidence

See the accompanying delivery report for executed checks and known limits. Test source presence or historical CI is not a PASS for this branch. Browser viewport checks do not certify physical iOS, Android or WeChat devices.
