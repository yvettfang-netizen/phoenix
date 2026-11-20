import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createCluster } from '../v0042/cluster.mjs'

const version = process.argv[2] ?? '16'
assert(['16', '17'].includes(version))
const candidate = 'database/canonical/forward-candidates/task-handoff/0043_scoped_task_handoff.sql'
const output = path.resolve(process.env.TASK_HANDOFF_EVIDENCE_DIR ?? `out/enterprise-v31-db02/pg${version}`)
mkdirSync(output, { recursive: true })
let db
try {
  db = await createCluster(version, { initialize: false, suffix: 'db02-catalog' })
  db.call(['cp', path.resolve(candidate), `${db.container}:/opt/canonical-migrations/0043_scoped_task_handoff.sql`])
  const migrationOutput = db.call(['exec', '-e', 'CANONICAL_EXPECTED_MIGRATIONS=39',
    db.container, 'bash', '/opt/verification/migrate.sh'])
  assert(migrationOutput.includes('PASS ledger=39 files=39 expected=39'))
  const tables = JSON.parse(db.sql(`
    SELECT jsonb_agg(to_jsonb(t) ORDER BY t.schema_name,t.table_name)
    FROM (
      SELECT n.nspname AS schema_name,c.relname AS table_name,
        c.relrowsecurity AS rls_enabled,c.relforcerowsecurity AS rls_forced,
        has_table_privilege('phoenix_canonical_app',c.oid,'SELECT') AS app_direct_select,
        has_table_privilege('phoenix_canonical_workspace_reader',c.oid,'SELECT') AS workspace_direct_select,
        (SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',
          pg_catalog.format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull)
          ORDER BY a.attnum) FROM pg_catalog.pg_attribute a
          WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped) AS columns,
        (SELECT jsonb_agg(jsonb_build_object('name',x.conname,'type',x.contype,
          'definition',pg_catalog.pg_get_constraintdef(x.oid)) ORDER BY x.conname)
          FROM pg_catalog.pg_constraint x WHERE x.conrelid=c.oid) AS constraints,
        (SELECT jsonb_agg(i.indexname ORDER BY i.indexname)
          FROM pg_catalog.pg_indexes i WHERE i.schemaname=n.nspname
            AND i.tablename=c.relname) AS indexes,
        (SELECT jsonb_agg(p.policyname ORDER BY p.policyname)
          FROM pg_catalog.pg_policies p WHERE p.schemaname=n.nspname
            AND p.tablename=c.relname) AS policies,
        (SELECT jsonb_agg(g.tgname ORDER BY g.tgname)
          FROM pg_catalog.pg_trigger g WHERE g.tgrelid=c.oid AND NOT g.tgisinternal) AS triggers
      FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE c.relkind='r' AND n.nspname IN
        ('core','auth','consent','crm','service','education','learning','docs',
          'integration','audit','operations_ref','casework','identity')
    ) t;
  `))
  const functions = JSON.parse(db.sql(`
    SELECT jsonb_agg(to_jsonb(f) ORDER BY f.schema_name,f.function_name,f.arguments)
    FROM (
      SELECT n.nspname AS schema_name,p.proname AS function_name,
        pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments,
        p.prosecdef AS security_definer,
        pg_catalog.pg_get_userbyid(p.proowner) AS owner
      FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname IN
        ('core','auth','consent','crm','service','education','learning','docs',
          'integration','audit','operations_ref','casework','identity')
    ) f;
  `))
  const ledger = JSON.parse(db.sql(`
    SELECT jsonb_agg(jsonb_build_object('name',migration_name,'sha256',sha256)
      ORDER BY migration_name) FROM canonical_migrations.applied;
  `))
  assert.equal(tables.length, 102)
  assert.equal(ledger.length, 39)
  const result = {
    schemaVersion: 'canonical-enterprise-v31-source-catalog.v1',
    source: 'disposable-local-cluster-only',
    postgres: db.sql('SHOW server_version'),
    candidateSha256: createHash('sha256').update(readFileSync(candidate)).digest('hex'),
    counts: {
      tables: tables.length, functions: functions.length,
      rlsForced: tables.filter((table) => table.rls_forced).length,
      policies: tables.reduce((sum, table) => sum + (table.policies?.length ?? 0), 0),
      indexes: tables.reduce((sum, table) => sum + (table.indexes?.length ?? 0), 0),
      constraints: tables.reduce((sum, table) => sum + (table.constraints?.length ?? 0), 0),
      triggers: tables.reduce((sum, table) => sum + (table.triggers?.length ?? 0), 0)
    },
    ledger, tables, functions
  }
  writeFileSync(path.join(output, 'catalog.json'), JSON.stringify(result, null, 2) + '\n')
  console.log(`PASS PG${version} catalog tables=${result.counts.tables} functions=${result.counts.functions} policies=${result.counts.policies} ledger=${ledger.length}`)
} finally {
  if (db) db.cleanup()
}
