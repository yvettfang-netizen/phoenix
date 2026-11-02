# Identity V3.1 — pre-change baseline

Task: PHOENIX-IDENTITY-V31-CBI-DATABASE-20261102

Verified on 2026-11-02. Repository: yvettfang-netizen/phoenix.

- Latest GitHub main and fetched origin/main: 259753248ff54b07fd9c52f270e45ae1c877bc09.
- PR #31: merged 2026-10-31T20:30:29Z; merge b00e4c241434876f20260fce3ed79643f6d14d90; head 3cbf1cb71c36ad074b18f736dbe1b9f325eb93ae.
- Main contains a later Education V3 change. Its shared navigation/footer and Identity regression-test changes are retained.
- Pre-existing uncommitted work was preserved. Development uses an independent candidate checkout based on the exact main SHA, branch codex/identity-v31-cbi-review.
- Existing Identity has bilingual routes, approved images/logo, four service cards, four values, five stages, five illustrative destinations, controlled Compass and memory-only consultation preparation.
- The destination array is not a country or CBI catalogue. Existing HK/UK/Canada/Australia/Singapore destinations do not enter the selected CBI allowlist.
- Existing Identity metadata is private-review/noindex with language alternates, OG and Twitter. No passport explorer, CBI import mechanism, country detail routes, JSON-LD or sitemap/robots implementation was present.
- Website database uses D1 for four authentication tables. Family demo data explicitly represents no real client. No production PostgreSQL connectivity or credentials were assumed.

## Protected scope

Identity Compass questions/rules, Education, Health, homepage, Auth/API, approved logos and existing database/migrations remain outside the feature diff. Founder release approval is required before publication, merging main or production migration.

## Evidence limits

PR and Git state are source evidence, not deployment evidence. Historical PR test results do not substitute for tests of this candidate SHA. Unknown legal/application/issuance facts remain unknown; the four-country seed is IMPORT_REVIEW only.
