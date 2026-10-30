# Schema index

Canonical schema is migration-derived. Do not maintain an independent copy of
table DDL in this directory.

The authoritative ordered DDL is:

- `../migrations/canonical/0001_foundation.sql` through the latest numbered
  migration;
- the checksum-locked migration ledger created by `0001`;
- the executed catalog assertions under `../tests/`.

This directory may later contain generated, read-only catalog documentation. It
must never be used as an alternative migration input.
