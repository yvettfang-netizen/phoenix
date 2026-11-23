-- NON-PRODUCTION, READ-ONLY INVENTORY. Not a migration or authorization grant.
-- Run with psql and an already configured, least-privilege non-production service.
-- Output contains schema metadata and migration digests, never customer rows.
\set ON_ERROR_STOP on
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '2s';

SELECT current_setting('server_version') AS postgres_version,
       current_setting('transaction_read_only') AS read_only;

SELECT to_regclass('canonical_migrations.applied') IS NOT NULL AS has_ledger \gset
\if :has_ledger
SELECT migration_name, sha256
FROM canonical_migrations.applied
ORDER BY migration_name;
\else
\echo UNVERIFIED: canonical_migrations.applied not present; do not infer an empty or approved baseline.
\endif

SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p')
  AND n.nspname IN ('auth','core','consent','audit','integration','docs','casework',
                    'education','identity','operations_ref','learning','crm','service')
ORDER BY n.nspname, c.relname;

SELECT schemaname, tablename, policyname, roles, cmd, qual AS using_expression,
       with_check AS with_check_expression
FROM pg_policies
WHERE schemaname IN ('auth','core','consent','audit','integration','docs','casework',
                    'education','identity','operations_ref','learning','crm','service')
ORDER BY schemaname, tablename, policyname;

SELECT n.nspname AS schema_name, c.relname AS table_name, k.conname,
       pg_get_constraintdef(k.oid) AS constraint_definition
FROM pg_constraint k
JOIN pg_class c ON c.oid = k.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE (n.nspname = 'auth' AND c.relname IN ('principals','session_contexts','external_identities'))
   OR (n.nspname = 'service' AND c.relname = 'workbench_materials')
ORDER BY n.nspname, c.relname, k.conname;

SELECT rolname, rolcanlogin, rolsuper, rolbypassrls, rolinherit
FROM pg_roles WHERE rolname LIKE 'phoenix_%' ORDER BY rolname;

SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef AS security_definer, p.proconfig AS fixed_settings
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'auth'
  AND p.proname IN ('validate_context_request','register_external_identity',
                   'redeem_context_ticket','clear_context')
ORDER BY p.proname, arguments;

ROLLBACK;
