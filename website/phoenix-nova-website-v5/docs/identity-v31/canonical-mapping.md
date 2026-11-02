# Identity V3.1 Canonical PostgreSQL mapping and database handoff

Status: DRAFT / HOLD / APPROVAL_MISSING. This is a conceptual engineering handoff, not an executed migration or an effective storage/API contract.

## Verified boundary

- Website main baseline: `259753248ff54b07fd9c52f270e45ae1c877bc09`.
- The website currently uses a D1 authentication adapter. No PostgreSQL connection, production migration, real-data import or deployment was performed for this task.
- The existing public [Canonical snapshot](https://github.com/yvettfang-netizen/phoenix/tree/6176621a79d6493dcb21da4901f0294b5c7c5929/database/canonical) is an unmerged V1 reference, not evidence of an effective V2 runtime contract.
- Separate V2 source evidence was reviewed read-only. Its private branch inventory, unpublished SQL details and internal workspace locations are intentionally excluded from this public repository. V2 evidence exists; approved effective contract and integration evidence remain missing.
- No approved Country/Jurisdiction catalogue or Identity policy publication API was established by this review. Jimson and Founder must select the effective version, approved objects and permission contract before implementation.

## Proposed reuse and field mapping

| Authority / domain | Mapping decision | Remaining contract |
|---|---|---|
| Country / Jurisdiction | Reuse an approved master if supplied; otherwise propose a domain catalogue for approval | Identity key, ownership, approved country allowlist |
| Person | Reference existing Canonical authority only | Approved resolver/API and key type |
| Client | Reference existing Canonical authority only | Approved Client DTO and access scope |
| Family | Reference existing Canonical authority only | Family membership, consent and scope |
| Partner | Reuse approved relationship authority; do not create a second master | Relationship API and source ownership |
| Service Project | Link through approved service API only | Booking handoff, assignment and subject authorisation |
| Document / Consent / Audit | Reuse approved authorities | Retention, consent vocabulary, append-only audit |
| Country/programme names, IDs, programme type | Jurisdiction + Programme candidate revision | No repeated country entity for each programme |
| Legal basis and three independent statuses | Versioned policy revision | Status transitions and supporting source |
| Investment options, nullable amount/currency/fees | Versioned policy attributes | No inferred amount or automatic quote |
| Family, residence, interview, source-of-funds, nationality/passport conditions | Nullable, source-bound policy attributes | No automatic eligibility or passport guarantee |
| source_type / source / official_url | Policy Source | OFFICIAL separated from INTERNAL_EXPERIENCE and MODEL_INFERENCE |
| verified_at / effective_scope / effective_status / owner | Policy Source + review event | Stale or unverified policy fails closed |
| import_batch_id / source_file / file_hash / imported_at / imported_by / source_document / data_version / verification_status / approval_status | Immutable Import Batch + Candidate Revision | Retain original file and all versions; no silent overwrite |
| content_status and release pointer | Publication pointer + approval/audit event | Only approved PUBLISHED revisions may be public |

## Conceptual ERD

```text
Existing Canonical authorities (approved API/resolver only)
Person / Family / Client / Partner relationship / Service Project
                               |
                   optional authorised case reference
                               |
Jurisdiction --< Programme --< Policy Revision >--< Policy Source
                                  ^
Import Batch --< Candidate Revision|
                                  |
Founder Approval -- Audit Event -- Publication Pointer
```

These are domain relationships, not approved SQL table names. Public country information is independent of a family's sensitive case records. No second Person, Client or Family master is created.

## Non-executable migration draft and sequencing

1. Jimson/Founder select the effective V2 contract and confirm merge status, keys, APIs, roles and RLS inventory.
2. Approve a domain difference package: this conceptual ERD, field dictionary, candidate/version/source lifecycle, publication pointer and retention rules.
3. Draft additive domain DDL and a reverse migration only after that contract is approved. Do not alter existing Canonical migrations. No SQL is included or authorised for execution here.
4. Implement immutable import batches and raw-file retention; parse CSV/XLSX/JSON into IMPORT_REVIEW, preserving errors, conflicts and lineage.
5. Implement server identity, assigned review permissions, official-source verification, explicit Founder/delegated release approval, transactional version append and publication-pointer update.
6. Implement the website adapter against approved server APIs. Browsers never connect directly to PostgreSQL.
7. Run synthetic disposable-database tests for RLS, unauthorised access, duplicates, cross-batch conflicts, stale policy, transaction failure, history and recovery.
8. Obtain Jimson technical approval and Founder release approval before any production migration, real-data import or publication.

## Proposed RLS and recovery

- Public users read only sanitised fields from the approved PUBLISHED pointer; no raw files or review/rejected/expired versions.
- Importers create candidate batches and validation issues only; they cannot approve, publish, create contracts/payments or write Canonical masters.
- Reviewers access explicitly assigned batches. Founder or a designated reviewer must have server-verified publication authority; a browser role string proves nothing.
- Family/client/service references require actor identity, Family scope, consent and purpose through an approved resolver/API.
- Import, review, approval, publication, supersession and rollback append audit events with actor, reason, source, version and time.
- A failed import/transaction leaves the last approved version untouched. Rollback moves the publication pointer and appends an event; it does not delete historical versions.
- Current repository interfaces and mock tests are not proof of deployed RLS, durable history, transaction atomicity or successful recovery.

## Exact Gate 7 gaps

Effective V2 commit and approved DTOs; domain DDL; data-owner approval; current role grants/RLS; immutable raw-file and audit storage; website server adapter; Advisor Booking linkage; synthetic integration/recovery evidence; production migration approval. All remain HOLD. No production connection or migration is attempted.
