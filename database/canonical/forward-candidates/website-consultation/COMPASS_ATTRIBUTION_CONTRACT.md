# Compass attribution and CRM candidate

This unnumbered candidate extends PR #116. Install `intake.sql` before `compass-events.sql` in disposable validation only. Formal migrations 0001–0037 retain their original bytes.

## Entry and source contract

| Website entry, zh or en | Canonical source_system | Versioned entry_ref |
| --- | --- | --- |
| Education | phoenix-nova-compass-education | /education |
| Identity | phoenix-nova-compass-identity | /identity |
| Health | phoenix-nova-compass-health | /health |
| Wealth | phoenix-nova-compass-wealth | /wealth |

Each landing page links to the contact-consent form. The BFF maps the explicit entry selector separately from the requested service area, and the receiver maps the source to its configured Canonical contract ID. PostgreSQL checks the source, approved entry and allowed LOGIN. A missing or mismatched contract denies intake. Generic website intake keeps its existing source. This is a declared website entry, not proof of an authenticated visit or a completed assessment. The browser sends no assessment, family or Client identifiers to the public form.

Configure `compassContractIds` with approved product source identifiers as keys and their individual acquisition contract UUIDs as values. Keep each expiry, contact retention approval and organization mapping under the existing candidate controls. The existing intake and publication flags continue to govern public exposure.

## Subsequent events and needs

After independent verification of a current Canonical Client link, a trusted publisher can call `crm.record_compass_event()` using the existing FAMILY context and a valid 0036 acquisition contract pinned to its LOGIN. The only assessment data accepted is the source's opaque UUID. The Lead ID and domain are recorded with it in the existing immutable `crm.lead_events` stream. The sender must own and resolve the assessment UUID. The candidate does not treat a CRM or browser claim as source-authoritative.

The verified family can record and read its own visit. Assessment references are self-only and require a live, exact-subject Education or Identity consent. The existing read authority for the professional assessment must still authorize any request for actual data. Health and Wealth assessment writes are denied until their consent and data authorities are approved. Withdrawn consent and cross-family contexts deny reads and writes. This candidate does not give staff an assessment reference or new permission.

`crm.assert_lead_need()` remains the existing write path for separate needs. No physical `crm.lead_need_facts` table exists. Linking events to a verified Lead changes neither the original First Touch nor the Client count. Exact retries replay the existing event. The same source assessment ID cannot be attached to another lead using a different event ID.

## Release gates

Production source contract registration, issuer/subject mappings, organization dispatch assignments and actual assessment publisher integration are still HOLD. The native product backends must validate their own source IDs and sharing eligibility before calling the private SQL function. Confirm approved Consent purpose for processing assessment references and the Health/Wealth policy. Public flags and shared environments require separate approvals.
