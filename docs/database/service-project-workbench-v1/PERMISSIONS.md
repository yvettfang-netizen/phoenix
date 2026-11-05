# Workbench permission matrix — candidate

Status: development/synthetic mechanisms; real identity registration and source authorization HOLD. No new business approval is implied.

| Operation | Client | Assigned adviser writer | Assigned manager | Operations SERVICE | Browser |
|---|---|---|---|---|---|
| Opened project projection | Own subject / verified minor guardian only | Project assignment + live family adviser context + subject Consent for Education | Same subject rules; no global bypass | No web session | Fixed authorized DTO only |
| Same-family adult sibling project | DENY | Only own project+Consent | Only own project+Consent | Not client access | Cannot assert family/member/role |
| Subject tasks/messages | Own CLIENT rows; own task advancement | Assigned subjects; CLIENT/STAFF | Same; portfolio limited to assignments | No web route | Same-origin authenticated command |
| Stage / applications / milestones | DENY | Controlled commands | Controlled commands | Future verified event bridge HOLD | Cannot infer status |
| Material upload/read | Education + frozen document authorization | Same document gate | Same document gate | No runtime purge | Private attachment only |
| Material review | DENY | Different submitter; scope/Consent | Same | No web route | Cannot set metadata/storageKey |
| Deliverable acceptance | DENY pending separate client acceptance contract | Must differ from submitter/reviewer | Same independent-actor gate | Existing service APIs unchanged | Controlled command only |
| Pause/resume/terminate/close | DENY | DENY | Prerequisites+reason; append history | No lifecycle shortcut | No state inference |
| Financial read | Contracting party/payer independently authorized | Project staff | Project staff | Source owns references | No edit UI |
| Financial reference ingest | DENY | DENY | DENY | Existing is_operations_service + current family/project + monotone evidence version | No endpoint |
| Health | Only explicit patient-authorizer project metadata | Project assignment + patient authorization | Same; no family admin override | No clinical ingest | Clinical uploads/messages unavailable |
| Historical event update/delete | DENY | DENY | DENY; append approved correction only | DENY | No endpoint |

Application LOGIN is NOINHERIT, member only of new NOLOGIN `phoenix_canonical_service_workbench`; runtime verifies no SUPERUSER/DDL/BYPASSRLS/raw table access. Binder LOGIN is separate and has only ticket issuer access, no application table grants or role membership. Only a binder can issue tickets, and app redeems a one-use≤30s ticket bound to exact principal/current backend. Neither client nor app may SET ROLE binder. Production staff/provider resolution is an injected trust boundary, not a synthetic alias.

The existing OBSERVER assignment is read-only, including operations also available to clients: SQL rejects every observer command, server upload preflight refuses before staging bytes, and the UI hides client-like upload/message controls. A separate synthetic observer principal has the same read Consent as a writer, proving that read authority does not imply a write grant. HK application/stage forms are shown only for the HK_MASTERS Education template; unavailable domain templates are explicitly labelled.

New extension tables have7 RLS policies. Runtime role has **no direct SELECT/INSERT/UPDATE/DELETE on them**; functions enforce narrower subject/document audiences. The permanent regression temporarily provisions an independent read-probe LOGIN with narrowly granted SELECT to prove RLS under real separate credentials, then removes those grants and disables that synthetic LOGIN. Tests do not substitute bootstrap SET ROLE for application authorization.

Dedicated backup LOGIN has pg_read_all_data+BYPASSRLS for complete authorized synthetic export, no SUPERUSER/DDL, and a0600 pgpass file. It is a sensitive backup role, **not a normal reader**. It has no web path and is disabled after restore. Restored application/binder/Operations credentials are regenerated. Health role design for future medical content is not supplied by this backup fixture.
