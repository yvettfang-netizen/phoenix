# ASKWISE local SQLite retired — 2026-11-10

The historical ASKWISE 13-day learning pilot no longer creates, reads or migrates a local `askwise.db` file. The `better-sqlite3` dependency and embedded SQL model were removed from the repository. Learning algorithms, Aoyu UI components, and non-database tests remain.

The eight pilot routes intentionally show an explicit Canonical Integration Pending message rather than fictional student progress or silently recreating a separate data store. This does not imply that the current Canonical schema already supports every learning task, reflection or evidence field.

Before enabling learning workflows: use authenticated server-owned principals, verified student/family relationships and consent, reviewed Canonical API contracts, and approved forward-only migrations as necessary. No real data was imported, accessed or dropped.
