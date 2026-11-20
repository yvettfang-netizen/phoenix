-- P0.1 read-only receipt for a specifically approved nonproduction Canonical target.
-- No customer rows, secrets, mutation, SET ROLE, or superuser bypass.
BEGIN READ ONLY;
SELECT current_database() AS database_name, current_user AS login_role,
       current_setting('server_version_num') AS server_version_num,
       clock_timestamp() AT TIME ZONE 'UTC' AS observed_utc;
SELECT rolname, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb
  FROM pg_roles WHERE rolname=current_user;
SELECT migration_name, sha256
  FROM canonical_migrations.applied ORDER BY migration_name;
SELECT n.nspname, c.relname, c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN ('auth','core','consent','learning','education')
   AND c.relkind='r' ORDER BY n.nspname,c.relname;
SELECT rolname FROM pg_roles
 WHERE rolname IN ('phoenix_canonical_app','phoenix_canonical_context_binder',
   'phoenix_canonical_reader') ORDER BY rolname;
SELECT to_regclass('learning.course') AS course,
       to_regclass('learning.teacher') AS teacher,
       to_regclass('learning.schedule_slot') AS schedule_slot,
       to_regclass('education.study_enrollments') AS study_enrollments;
COMMIT;
