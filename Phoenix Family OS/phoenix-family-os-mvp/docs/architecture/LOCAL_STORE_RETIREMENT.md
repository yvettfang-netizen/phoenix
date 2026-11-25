# Family OS local-store retirement

Former `PFS_DB_V01` WeChat local business persistence has been disabled; the
`services/store.js` module works only under Node synthetic tests and refuses
production or real WeChat mini-program execution. Its new storage key is
`PHOENIX_SYNTHETIC_TEST_ONLY_V1`, not the old local business data store.

Real students, families, assessments, accounts, and consultations must be read
from Canonical PostgreSQL via the trusted server-side identity/context provider.
The old mini-program's pages and client demo repository remain for synthetic
UI regression only, not production onboarding or customer writes. There is
no working Canonical mini-program provider in this PR; the release gate remains
HOLD. The old SQLite HTTP backend/migration and demo sessions were removed
earlier in this PR.
