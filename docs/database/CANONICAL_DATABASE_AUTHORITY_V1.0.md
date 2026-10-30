# Phoenix Canonical database authority V1.0

**Decision owner:** Founder

**Operating owner:** Jimson

**Effective decision date:** 2026-10-30

**Repository activation:** pending review and merge of
`codex/canonical-postgresql-mainline-copy`

## Authority statement

Phoenix Canonical PostgreSQL is the only approved system-of-record destination
for new Phoenix Nova business data. The target repository authority is:

```text
phoenix/database/canonical/
```

After this branch is reviewed and merged, all forward database changes must be
made there. The private `phoenix-canonical-db` repository becomes preserved
provenance and must not receive an independent competing migration line.

## What every new business must do

Every new domain—including Health Compass—must:

1. reuse Canonical person, family, membership, Consent, audit, document and
   integration boundaries rather than recreate master data;
2. introduce schema changes only through the next ordered, checksum-locked
   forward migration under `database/canonical/migrations/canonical/`;
3. use approved application APIs, separate binder/app credentials, one-use
   context tickets and RLS; browser or client code may not connect directly;
4. record subject/family scope, accountable principal, request correlation and
   access decision in the Canonical audit boundary;
5. pass PG16 and PG17 synthetic acceptance, split-login negative tests and
   fresh-cluster restore before deployment;
6. keep files in private object storage and store only approved metadata,
   versions, manifests and retention state in Canonical PostgreSQL;
7. remain fail-closed while identity-provider, mapping, Consent, retention or
   business-contract facts are missing.

## Health Compass rule

Health Compass must not create a standalone person, family, guardian, Consent or
document database. Its application source belongs under the Compass boundary;
its durable records must enter Canonical PostgreSQL through a separately
approved Health contract and forward migration.

No Health schema or health-record fields are authorized by this document.
Health data classification, minimum fields, Consent basis, professional access,
retention, deletion and emergency boundaries remain a Founder/privacy/security
gate. Until those are approved, Health Compass may use synthetic fixtures and
contract stubs only and must not persist real health data.

## Existing systems

- Phoenix Family OS is an application/source integration, not a competing
  family master database.
- Founder OS and Operations OS results are preserved; reuse requires explicit
  contracts and does not authorize duplicate master data.
- Legacy `phoenix_core`, Feishu tables and conflicting old migrations are not
  valid destinations for new development.
- Tencent currently hosts an isolated non-production database behind the local
  migration head. It is not the production authority.

## Change and release gate

A database capability is not “live” merely because a design or migration file
exists. Authority requires:

`approved contract → forward migration → PG16/PG17 evidence → restore evidence
→ application integration evidence → isolated deployment approval → production
cutover approval`.

Production use, real-data migration and destructive legacy cleanup each require
a separate explicit gate.
