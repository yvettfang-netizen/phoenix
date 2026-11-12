# Canonical-only database retirement (2026-11-10)
Founder decision: no real legacy customer data to migrate. No legacy-data migration or audit is requested.

## Source of truth
`database/canonical/migrations` is the only approved master schema/migration lineage. Existing 0001-0037 must remain byte-identical, and forward candidates 0038/0039 are not to be applied automatically.

## Changes in this cleanup candidate
- Remove ten independent Education PostgreSQL migrations (users/families/students/assessments/orders/refunds and associated legacy schema).
- Retire the independent Education PostgresStore. The old Education server can run isolated in-memory development tests only; it fails closed if started with a database URL or in production.
- Retain domain behavior and test fixtures; do not interpret them as an authorized second production source of truth.

## Integration boundary
Education production writes must use a reviewed Canonical API and the authoritative principal/family/subject/consent context, not direct table copies. This branch does not enable production customer intake, payment or refund flows. No database DROP, production migration, data import or deployment is performed.
