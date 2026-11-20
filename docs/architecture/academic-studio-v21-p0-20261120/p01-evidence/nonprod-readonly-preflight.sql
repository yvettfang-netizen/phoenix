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
-- Role attributes and effective privileges, not merely role existence.
-- Missing optional candidate roles simply produce no rows; do not install them.
SELECT r.rolname, r.rolcanlogin, r.rolinherit, r.rolsuper,
       r.rolbypassrls, r.rolcreaterole, r.rolcreatedb, r.rolreplication
  FROM pg_roles r
 WHERE r.rolname IN (current_user,'phoenix_canonical_app',
   'phoenix_canonical_context_binder','phoenix_canonical_reader',
   'phoenix_canonical_migrator','phoenix_canonical_workspace_reader')
 ORDER BY r.rolname;
SELECT r.rolname, n.nspname AS schema_name, c.relname AS relation_name,
       has_table_privilege(r.oid,c.oid,'SELECT') AS can_select,
       has_table_privilege(r.oid,c.oid,'INSERT') AS can_insert,
       has_table_privilege(r.oid,c.oid,'UPDATE') AS can_update,
       has_table_privilege(r.oid,c.oid,'DELETE') AS can_delete
  FROM pg_roles r CROSS JOIN pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE r.rolname IN (current_user,'phoenix_canonical_app',
   'phoenix_canonical_context_binder','phoenix_canonical_reader',
   'phoenix_canonical_migrator','phoenix_canonical_workspace_reader')
   AND (n.nspname,c.relname) IN (
     ('auth','session_contexts'),('auth','context_exchange_tickets'),
     ('learning','teacher'),('learning','teacher_assignment'),
     ('learning','enrollment'),('learning','after_class_card'),
     ('learning','publication'),('learning','stage_report'))
   AND c.relkind IN ('r','p')
 ORDER BY r.rolname,n.nspname,c.relname;
SELECT r.rolname, p.oid::regprocedure AS function_signature,
       has_function_privilege(r.oid,p.oid,'EXECUTE') AS can_execute
  FROM pg_roles r CROSS JOIN pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE r.rolname IN (current_user,'phoenix_canonical_app',
   'phoenix_canonical_context_binder','phoenix_canonical_reader',
   'phoenix_canonical_migrator','phoenix_canonical_workspace_reader')
   AND (n.nspname,p.proname) IN (
     ('auth','bind_context'),('auth','issue_context_ticket'),
     ('auth','redeem_context_ticket'),('auth','clear_context'),
     ('learning','teacher_has_class_access'))
 ORDER BY r.rolname,p.oid::regprocedure::text;
SELECT to_regclass('learning.course') AS course,
       to_regclass('learning.teacher') AS teacher,
       to_regclass('learning.schedule_slot') AS schedule_slot,
       to_regclass('education.study_enrollments') AS study_enrollments;
COMMIT;
