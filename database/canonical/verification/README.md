# Verification index

Canonical acceptance evidence is produced by:

- `../tests/f10_local_acceptance.ps1` for full PG16/PG17 acceptance;
- `../tests/phase3_defect_regression.ps1` for split-login security regression;
- `../tests/phase3_fresh_cluster_restore.ps1` for disaster recovery;
- `../tests/run_v26_http_e2e.ps1` for synthetic HTTP → broker → binder → app
  pool → RLS testing;
- `../evidence/` and the versioned execution reports for raw results.

Only synthetic data is permitted in committed verification artifacts.
