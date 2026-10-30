# Policy index

Row-level security, function grants, role boundaries and immutable-history
controls are defined by the ordered SQL migrations in
`../migrations/canonical/`.

Verification is implemented by the security catalog, split-login and
fresh-restore suites under `../tests/`. Policy changes require a new forward
migration; applied migration bytes are immutable.
