# Shared contracts

This is the target location for versioned, application-neutral API and event
contracts. It must not become a second database schema source.

Database DDL, RLS policies and migration checks remain authoritative only under
`database/canonical/`.
