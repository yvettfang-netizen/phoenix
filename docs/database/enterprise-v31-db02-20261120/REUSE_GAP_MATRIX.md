# Reuse and Gap Matrix

**Measured source:** `evidence/pg16/catalog.json` and `evidence/pg17/catalog.json`; both contain 102 actual tables after 0001–0037 plus isolated 0042/0043. [All table rows](TABLE_REUSE_MATRIX.md) are generated from catalog metadata, rather than inferred from the architecture report.

| Existing structure | Reuse | Extend / New | Deprecate | Finding |
|---|---|---|---|---|
| `core.people`, `core.families`, `core.student_profiles`, `auth.principals` | One canonical identity each | None in DB-02 | None | No duplicate master |
| `core.organizations`, `core.organization_relationships`, `core.organization_identifiers` | Stable organization and commercial relationship IDs | 0042 membership/profile and workspace binding candidates | None | Parent/child relationship is not a student-data grant |
| `consent.grants`, `core.guardian_authorities`, `audit.access_events` | Existing consent, guardian and audit boundaries | Future precise handoff purpose requires approved contract | None | Task handoff does not waive consent |
| `crm.leads`, `crm.referrals`, `crm.lead_attributions`, `crm.partner_relationships` | Preserve First Touch and referral history | Full client/channel handoff **HOLD** | None | Provenance must not be overwritten by operational reassignment |
| `crm.clients`, `crm.client_relationships`, `crm.sales_assignments`, `crm.follow_ups` | Existing client, relationship, sales owner and followup records | Long-term lifecycle occurrence design in DB-03 | None | Sales owner is not project deliverer |
| `service.projects`, `service.project_assignments`, `service.tasks`, `service.task_events` | Existing delivery authority and events | New `task_handoff_requests/events` in 0043 | None | Recipient must already have same-project assignment |
| `education.academic_record`, `education.applications` | Academic evidence and applications | `study_enrollments` candidate DB-03 **HOLD** | None | Academic record is not longitudinal actual enrollment |
| `learning.enrollment`, courses, classes, attendance and stage reports | Academy course participation | ASKWISE event/evidence mapping DB-05 **HOLD** | None | Course enrollment is not university enrollment |
| `docs.documents`, `docs.document_versions`, `docs.submission_manifests/items` | Original metadata, versions and manifests | Cross-project reference and AI review DB-04 **HOLD** | None | No automatic cross-project read from task assignment |
| `integration.public_ids`, `operations_ref.entitlement_ref/events` | Existing public ID and entitlement reference | No financial authority change | None | Payment/refund remains source authority elsewhere |

**Candidate number discipline:** 0038–0041 are reserved by concurrent work; 0042 is DB-01 Draft PR #77; Founder confirmed 0043 only for this isolated DB-02 candidate. No historical SQL was rewritten. No old database or SQLite source is marked for retirement because runtime disconnection, data reconciliation and restore have not been proven.
