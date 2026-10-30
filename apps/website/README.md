# Website application boundary

The current website implementation remains at `/website`. This directory
reserves the normalized `apps/website` boundary and does not duplicate or move
the running source.

Database access must go through approved application services and the Canonical
database contract. Browser code must never connect directly to PostgreSQL.
