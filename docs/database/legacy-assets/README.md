# Canonical-only legacy database cleanup — PR #68 (2026-11-10)

Founder direction: remove all obsolete parallel database assets from the Phoenix monorepo; no legacy data migration or legacy asset audit is requested because the legacy systems have no real customer records.

1. database/canonical/ is the only maintained SQL authority for identity, family, student, education, service, documents and project data. Historical SQL is immutable.
2. Retired SQL and standalone database loaders: Education independent PostgreSQL, Family OS SQLite, website V5 D1 account schema, unused East/Digital World D1 examples, and ASKWISE SQLite pilot.
3. Production/customer business paths must not revive a local SQLite, D1, WeChat PFS_DB_V01, independent Education migration or duplicate ID allocation. No fallbacks to fake success.
4. Incomplete trusted identity and Canonical read/write adapters remain disabled with explicit errors. This PR does not claim complete production integration.
5. Cloudflare asset/worker and test-only data fixtures are not an independent production database. Fixtures must not accept production mode.
6. No database DROP, production migration, real customer records, DNS change or deployment is included. Review CI, identity authorization, and API coverage before merging.
