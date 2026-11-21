-- P0.1-S1 runtime evidence only. READ ONLY; no SET ROLE, DDL, DML or customer rows.
BEGIN READ ONLY;
SELECT current_database() AS database_name,
       current_user AS read_only_login,
       current_setting('server_version_num') AS server_version_num,
       current_setting('default_transaction_isolation') AS database_default_transaction_isolation,
       current_setting('transaction_isolation') AS receipt_transaction_isolation,
       current_setting('default_transaction_read_only') AS default_transaction_read_only,
       current_setting('transaction_read_only') AS receipt_transaction_read_only,
       clock_timestamp() AT TIME ZONE 'UTC' AS observed_utc;

-- Exact deployed function fingerprint; expected pre-install baseline on this receipt.
SELECT md5(pg_catalog.pg_get_functiondef(
         'learning.can_read_sensitive(uuid,uuid,uuid)'::regprocedure
       )) AS learning_can_read_sensitive_definition_md5,
       pg_catalog.pg_get_userbyid(p.proowner) AS function_owner,
       l.lanname AS language,p.provolatile AS volatility,
       p.prosecdef AS security_definer,p.proconfig AS function_settings
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_language l ON l.oid=p.prolang
 WHERE p.oid='learning.can_read_sensitive(uuid,uuid,uuid)'::regprocedure;

-- Role-level and database/role-level overrides only; no secret fields.
SELECT r.rolname,r.rolcanlogin,r.rolinherit,r.rolsuper,r.rolbypassrls
  FROM pg_catalog.pg_roles r
 WHERE r.rolname IN ('phoenix_canonical_app','phoenix_canonical_reader',
   'phoenix_canonical_projection_reader','phoenix_canonical_service_workbench',
   'phoenix_canonical_context_binder',current_user)
 ORDER BY r.rolname;

-- Return only transaction-related GUCs, never arbitrary custom role/database settings.
SELECT r.rolname,setting AS transaction_override
  FROM pg_catalog.pg_roles r
 CROSS JOIN LATERAL unnest(COALESCE(r.rolconfig,ARRAY[]::text[])) AS setting
 WHERE r.rolname IN ('phoenix_canonical_app','phoenix_canonical_reader',
   'phoenix_canonical_projection_reader','phoenix_canonical_service_workbench',
   'phoenix_canonical_context_binder',current_user)
   AND (setting LIKE 'default_transaction_isolation=%'
     OR setting LIKE 'default_transaction_read_only=%'
     OR setting LIKE 'transaction_isolation=%')
 ORDER BY r.rolname,transaction_override;

SELECT COALESCE(d.datname,'ALL_DATABASES') AS database_scope,
       COALESCE(r.rolname,'ALL_ROLES') AS role_scope,
       setting AS transaction_override
  FROM pg_catalog.pg_db_role_setting s
  LEFT JOIN pg_catalog.pg_database d ON d.oid=s.setdatabase
  LEFT JOIN pg_catalog.pg_roles r ON r.oid=s.setrole
 CROSS JOIN LATERAL unnest(s.setconfig) AS setting
 WHERE (s.setdatabase=0 OR s.setdatabase=(SELECT oid FROM pg_database WHERE datname=current_database()))
   AND (s.setrole=0 OR r.rolname IN ('phoenix_canonical_app','phoenix_canonical_reader',
     'phoenix_canonical_projection_reader','phoenix_canonical_service_workbench',
     'phoenix_canonical_context_binder',current_user))
   AND (setting LIKE 'default_transaction_isolation=%'
     OR setting LIKE 'default_transaction_read_only=%'
     OR setting LIKE 'transaction_isolation=%')
 ORDER BY database_scope,role_scope,transaction_override;

-- No SQL text or row-level application data is exposed.
SELECT usename,application_name,state,backend_type,xact_start,
       CASE WHEN xact_start IS NULL THEN NULL ELSE clock_timestamp()-xact_start END AS transaction_age
  FROM pg_catalog.pg_stat_activity
 WHERE datname=current_database() AND backend_type='client backend'
   AND usename IN ('phoenix_canonical_app','phoenix_canonical_reader',
     'phoenix_canonical_projection_reader','phoenix_canonical_service_workbench',
     'phoenix_canonical_context_binder')
 ORDER BY usename,application_name,state;

SELECT migration_name,sha256,applied_at AT TIME ZONE 'UTC' AS applied_utc
  FROM canonical_migrations.applied ORDER BY migration_name;

SELECT EXISTS(SELECT 1 FROM canonical_migrations.applied
  WHERE migration_name ILIKE '%0045%family%membership%') AS candidate_0045_recorded_in_formal_ledger;

SELECT n.nspname,c.relname,c.relrowsecurity AS rls_enabled,c.relforcerowsecurity AS rls_forced
  FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN ('auth','core','consent','learning') AND c.relkind IN ('r','p')
   AND c.relname IN ('family_memberships','guardian_authorities','grants',
                     'after_class_card','stage_report','publication')
 ORDER BY n.nspname,c.relname;
COMMIT;
