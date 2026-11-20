import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createCluster, id } from '../v0042/cluster.mjs'
import { asWorkspaceAdmin, fixtureIds, seedWorkspaceAuthorization } from '../v0042/fixtures.mjs'

const version = process.argv[2] ?? '16'
assert(['16', '17'].includes(version))
const candidate = 'database/canonical/forward-candidates/study-lifecycle/0044_study_review_foundation.sql'
const output = path.resolve(process.env.STUDY_REVIEW_EVIDENCE_DIR ?? `out/enterprise-v31-db03/pg${version}`)
mkdirSync(output, { recursive: true })
const require = createRequire(path.resolve('Phoenix Compass/education compass/server/package.json'))
const { Pool } = require('pg')
const digest = (value) => createHash('sha256').update(value).digest('hex')
const receipt = {
  schemaVersion: 'enterprise-v31-db03-study-review.v1',
  postgres: version,
  candidate: { number: '0044', sha256: digest(readFileSync(candidate)) },
  startedAt: new Date().toISOString(), checks: [], status: 'NOT_RUN'
}
const check = (name) => {
  receipt.checks.push({ name, status: 'PASS', at: new Date().toISOString() })
  console.log(`PASS ${name}`)
}
const q = (value) => `'${String(value).replaceAll("'", "''")}'`
let db

function migrate39(cluster) {
  cluster.call(['cp', path.resolve(candidate), `${cluster.container}:/opt/canonical-migrations/0044_study_review_foundation.sql`])
  return cluster.call(['exec', '-e', 'CANONICAL_EXPECTED_MIGRATIONS=39',
    cluster.container, 'bash', '/opt/verification/migrate.sh'])
}

async function expectDenied(pool, statement) {
  await assert.rejects(() => pool.query(statement), /permission denied/)
}

async function run() {
  db = await createCluster(version, { initialize: false, suffix: 'db03-fresh' })
  const applied = migrate39(db)
  assert(applied.includes('APPLIED 0044_study_review_foundation.sql'))
  assert(applied.includes('PASS ledger=39 files=39 expected=39'))
  assert(migrate39(db).includes('SKIP 0044_study_review_foundation.sql'))
  assert.equal(db.sql('SELECT count(*) FROM canonical_migrations.applied'), '39')
  assert.equal(db.sql("SELECT count(*) FROM pg_tables WHERE schemaname IN ('auth','core','consent','audit','integration','docs','casework','education','identity','operations_ref','learning','crm','service')"), '100')
  assert.equal(db.sql('SELECT count(*) FROM pg_policies'), '90')
  check('PG fresh 0001-0037 plus isolated 0042+0044, exact ledger and repeat')

  const passwords = seedWorkspaceAuthorization(db)
  db.sql(`
    INSERT INTO core.student_profiles(person_id) VALUES
      (${q(fixtureIds.people.multi)}),(${q(fixtureIds.people.partnerB)});
    INSERT INTO education.institution(institution_id,name,country_code,status,version,
      created_by_principal_id) VALUES
      (${q(id(3000))},'Synthetic University A','CN','ACTIVE',1,${q(fixtureIds.admin)}),
      (${q(id(3002))},'Synthetic University B','CN','ACTIVE',1,${q(fixtureIds.admin)});
    INSERT INTO education.program(program_id,institution_id,name,level,status,version,
      created_by_principal_id) VALUES
      (${q(id(3001))},${q(id(3000))},'Synthetic Course','BACHELOR',
        'ACTIVE',1,${q(fixtureIds.admin)});
    INSERT INTO education.study_enrollments(study_enrollment_id,family_id,
      student_person_id,institution_id,program_id,actual_entry_date,
      expected_graduation_date,source_system,source_review_ref,source_version,
      source_payload_sha256,recorded_by_principal_id)
    VALUES(${q(id(3100))},${q(fixtureIds.families.a)},
      ${q(fixtureIds.people.multi)},${q(id(3000))},${q(id(3001))},
      '2025-09-01','2029-06-30','synthetic_registry','SYNTHETIC_SOURCE_A',
      'v1',${q(digest('source-a'))},${q(fixtureIds.admin)});
    INSERT INTO education.study_enrollments(study_enrollment_id,family_id,
      student_person_id,source_system,source_review_ref,source_version,
      source_payload_sha256,recorded_by_principal_id)
    VALUES(${q(id(3101))},${q(fixtureIds.families.b)},
      ${q(fixtureIds.people.partnerB)},'synthetic_registry','SYNTHETIC_SOURCE_B',
      'v1',${q(digest('source-b'))},${q(fixtureIds.admin)});
  `)
  assert.equal(db.sql('SELECT count(*) FROM education.study_enrollments'), '2')
  assert.equal(db.sql("SELECT count(*) FROM education.study_enrollments WHERE review_state='SOURCE_REVIEW_REQUIRED'"), '2')
  check('reuses canonical student and family identities; source is review-required')
  const sourcePayloadHash = digest('synthetic registry record 1')
  const recordReview = (newId, version, payloadHash) => asWorkspaceAdmin(db, `
    SELECT * FROM education.record_study_enrollment_review(
      ${q(id(newId))},${q(fixtureIds.families.a)},${q(fixtureIds.people.multi)},
      ${q(id(3000))},${q(id(3001))},'2025-09-01','2029-06-30',
      'synthetic_registry','SYNTHETIC_REGISTRY_RECORD_1',
      ${q(version)},${q(payloadHash)}
    );
  `)
  const created = recordReview(3107,'v1',sourcePayloadHash)
  assert(created.includes('CREATED'))
  assert.equal(db.sql('SELECT count(*) FROM education.study_enrollments'),'3')
  const replay = recordReview(3108,'v1',sourcePayloadHash)
  assert(replay.includes('ALREADY_RECORDED'))
  assert(replay.includes(id(3107)))
  assert.equal(db.sql('SELECT count(*) FROM education.study_enrollments'),'3')
  const conflict = recordReview(3109,'v2',digest('changed source payload'))
  assert(conflict.includes('SOURCE_CONFLICT_REVIEW_REQUIRED'))
  assert(conflict.includes(id(3107)))
  assert.equal(db.sql('SELECT count(*) FROM education.study_enrollments'),'3')
  check('stable source identity is idempotent for identical replay and refuses changed version or payload')

  const insert = (key, family, person, institution = 'NULL', program = 'NULL',
    entry = "'2025-09-01'", expected = "'2029-06-30'") => `
    INSERT INTO education.study_enrollments(study_enrollment_id,family_id,
      student_person_id,institution_id,program_id,actual_entry_date,
      expected_graduation_date,source_system,source_review_ref,source_version,
      source_payload_sha256,recorded_by_principal_id)
    VALUES(${q(id(key))},${q(family)},${q(person)},${institution},${program},
      ${entry},${expected},'synthetic_registry',${q('SYNTHETIC_REVIEW_'+key)},
      'v1',${q(digest('synthetic-review-'+key))},${q(fixtureIds.admin)});`
  assert.throws(() => db.sql(insert(3102, fixtureIds.families.b, fixtureIds.people.multi)),
    /STUDY_MEMBER_NOT_CURRENT/)
  db.sql(`INSERT INTO core.people(person_id,display_name)
    VALUES(${q(id(3090))},'Synthetic Former Member');
    INSERT INTO core.student_profiles(person_id) VALUES(${q(id(3090))});
    INSERT INTO core.family_memberships(membership_id,family_id,person_id,
      membership_role,valid_from,valid_until)
    VALUES(${q(id(3091))},${q(fixtureIds.families.a)},${q(id(3090))},
      'MEMBER',clock_timestamp()-interval '2 days',clock_timestamp()-interval '1 day');`)
  assert.throws(() => db.sql(insert(3103, fixtureIds.families.a, id(3090))),
    /STUDY_MEMBER_NOT_CURRENT/)
  assert.throws(() => db.sql(insert(3104, fixtureIds.families.a,
    fixtureIds.people.multi, q(id(3002)), q(id(3001)))),
  /STUDY_PROGRAM_MISMATCH/)
  check('cross-family, expired membership and mismatched program rejected')

  assert.throws(() => db.sql(insert(3105, fixtureIds.families.a,
    fixtureIds.people.multi, 'NULL', 'NULL', "'2029-09-01'", "'2029-06-30'")),
  /violates check constraint/)
  assert.throws(() => db.sql(`UPDATE education.study_enrollments
    SET expected_graduation_date='2030-06-30'
    WHERE study_enrollment_id=${q(id(3100))}`), /STUDY_REVIEW_IMMUTABLE/)
  assert.throws(() => db.sql(`DELETE FROM education.study_enrollments
    WHERE study_enrollment_id=${q(id(3100))}`), /STUDY_REVIEW_IMMUTABLE/)
  check('date chronology and immutable unapproved source record')

  const occurrence = (key, enrollment, cycle, due = "clock_timestamp()+interval '1 year'") => `
    INSERT INTO education.lifecycle_review_occurrences(lifecycle_occurrence_id,
      study_enrollment_id,journey_cycle_id,rule_key,proposed_due_at,
      created_by_principal_id)
    VALUES(${q(id(key))},${q(id(enrollment))},${q(id(cycle))},
      'YEAR_TWO_REVIEW',${due},${q(fixtureIds.admin)});`
  db.sql(occurrence(3200, 3100, 3300))
  assert.throws(() => db.sql(occurrence(3201, 3100, 3300,
    "clock_timestamp()+interval '2 years'")), /duplicate key/)
  db.sql(occurrence(3202, 3100, 3301))
  assert.equal(db.sql('SELECT count(*) FROM education.lifecycle_review_occurrences'), '2')
  assert.equal(db.sql("SELECT count(*) FROM education.lifecycle_review_occurrences WHERE review_state='REVIEW_REQUIRED'"), '2')
  assert.throws(() => db.sql(`UPDATE education.lifecycle_review_occurrences
    SET proposed_due_at=clock_timestamp()+interval '2 years'
    WHERE lifecycle_occurrence_id=${q(id(3200))}`), /LIFECYCLE_REVIEW_IMMUTABLE/)
  check('stable enrollment-cycle-rule key rejects due-date duplication; review only')

  const recordOccurrence = (key, due) => asWorkspaceAdmin(db, `
    SELECT * FROM education.record_lifecycle_review_occurrence(
      ${q(id(key))},${q(id(3100))},${q(id(3302))},
      'YEAR_TWO_REVIEW',${q(due)}::timestamptz);
  `)
  const occurrenceDue = '2027-11-01T00:00:00Z'
  const occurrenceCreated = recordOccurrence(3204, occurrenceDue)
  assert(occurrenceCreated.includes('CREATED'))
  assert(occurrenceCreated.includes(id(3204)))
  const occurrenceReplay = recordOccurrence(3205, occurrenceDue)
  assert(occurrenceReplay.includes('ALREADY_RECORDED'))
  assert(occurrenceReplay.includes(id(3204)))
  const occurrenceConflict = recordOccurrence(3206, '2027-12-01T00:00:00Z')
  assert(occurrenceConflict.includes('SOURCE_CONFLICT_REVIEW_REQUIRED'))
  assert(occurrenceConflict.includes(id(3204)))
  assert.equal(db.sql('SELECT count(*) FROM education.lifecycle_review_occurrences'), '3')
  check('lifecycle occurrence identical replay is idempotent; changed due date is review conflict')

  assert.throws(() => db.sql(`BEGIN;
    ${occurrence(3203, 3101, 3300)}
    ${insert(3106, fixtureIds.families.b, fixtureIds.people.multi)}
    COMMIT;`), /STUDY_MEMBER_NOT_CURRENT/)
  assert.equal(db.sql(`SELECT count(*) FROM education.lifecycle_review_occurrences
    WHERE lifecycle_occurrence_id=${q(id(3203))}`), '0')
  check('failed transaction rolls back the candidate occurrence atomically')

  const app = new Pool({ host: '127.0.0.1', port: db.port,
    database: 'phoenix_canonical_dev', user: 'workspace_test_app',
    password: passwords.app, max: 1 })
  const legacyApp = new Pool({ host: '127.0.0.1', port: db.port,
    database: 'phoenix_canonical_dev', user: 'workspace_legacy_app',
    password: passwords.legacyApp, max: 1 })
  try {
    const client = await app.connect()
    try {
      await client.query('SET ROLE phoenix_canonical_workspace_reader')
      await expectDenied(client, 'SELECT * FROM education.study_enrollments')
    } finally { client.release(true) }
    const legacyClient = await legacyApp.connect()
    try {
      await legacyClient.query('SET ROLE phoenix_canonical_app')
      await expectDenied(legacyClient,
        'SELECT * FROM education.lifecycle_review_occurrences')
    } finally { legacyClient.release(true) }
  } finally { await app.end(); await legacyApp.end() }
  assert.equal(db.sql("SELECT count(*) FROM pg_policies WHERE schemaname='education' AND tablename IN ('study_enrollments','lifecycle_review_occurrences') AND permissive='RESTRICTIVE' AND qual='false' AND with_check='false'"), '2')
  assert.equal(db.sql("SELECT has_table_privilege('phoenix_canonical_app','education.study_enrollments','SELECT')"), 'f')
  assert.equal(db.sql("SELECT has_table_privilege('phoenix_canonical_workspace_reader','education.lifecycle_review_occurrences','SELECT')"), 'f')
  assert.equal(db.sql("SELECT has_function_privilege('phoenix_canonical_app','education.record_study_enrollment_review(uuid,uuid,uuid,uuid,uuid,date,date,text,text,text,text)','EXECUTE')"), 'f')
  assert.equal(db.sql("SELECT has_function_privilege('phoenix_canonical_workspace_reader','education.record_study_enrollment_review(uuid,uuid,uuid,uuid,uuid,date,date,text,text,text,text)','EXECUTE')"), 'f')
  assert.equal(db.sql("SELECT has_function_privilege('phoenix_canonical_app','education.record_lifecycle_review_occurrence(uuid,uuid,uuid,text,timestamptz)','EXECUTE')"), 'f')
  assert.equal(db.sql("SELECT has_function_privilege('phoenix_canonical_workspace_reader','education.record_lifecycle_review_occurrence(uuid,uuid,uuid,text,timestamptz)','EXECUTE')"), 'f')
  check('real restricted LOGIN cannot read; no runtime grants and explicit restrictive deny')

  const probePassword = randomBytes(32).toString('hex')
  db.sql(`CREATE ROLE study_rls_probe LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS
    PASSWORD ${q(probePassword)};
    GRANT CONNECT ON DATABASE phoenix_canonical_dev TO study_rls_probe;
    GRANT USAGE ON SCHEMA education TO study_rls_probe;
    GRANT SELECT ON education.study_enrollments,
      education.lifecycle_review_occurrences TO study_rls_probe;`)
  const probe = new Pool({ host: '127.0.0.1', port: db.port,
    database: 'phoenix_canonical_dev', user: 'study_rls_probe',
    password: probePassword, max: 1 })
  try {
    assert.equal((await probe.query('SELECT count(*)::integer AS n FROM education.study_enrollments')).rows[0].n, 0)
    assert.equal((await probe.query('SELECT count(*)::integer AS n FROM education.lifecycle_review_occurrences')).rows[0].n, 0)
  } finally { await probe.end() }
  assert.equal(db.sql('SELECT count(*) FROM crm.follow_ups'), '0')
  assert.equal(db.sql('SELECT count(*) FROM service.tasks'), '0')
  check('FORCE RLS remains default deny even with test-only SELECT; no followup or task dispatched')

  db.cleanup(); db = undefined
  db = await createCluster(version, { initialize: true, suffix: 'db03-upgrade' })
  const upgraded = migrate39(db)
  assert(upgraded.includes('APPLIED 0044_study_review_foundation.sql'))
  assert.equal(db.sql('SELECT count(*) FROM canonical_migrations.applied'), '39')
  check('existing 0037+0042 baseline upgrades directly through 0044')

  db.call(['exec', db.container, 'bash', '-c',
    'printf "\\n-- synthetic drift probe\\n" >> /opt/canonical-migrations/0044_study_review_foundation.sql'])
  assert.throws(() => db.call(['exec', '-e', 'CANONICAL_EXPECTED_MIGRATIONS=39',
    db.container, 'bash', '/opt/verification/migrate.sh']), /DRIFT_REFUSED/)
  db.call(['cp', path.resolve(candidate), `${db.container}:/opt/canonical-migrations/0044_study_review_foundation.sql`])
  assert(migrate39(db).includes('SKIP 0044_study_review_foundation.sql'))
  check('0044 checksum drift rejected and original repeat safe')
  receipt.status = 'PASS'
}

try { await run() }
catch (error) {
  receipt.status = 'FAIL'
  receipt.failure = String(error?.message ?? error).slice(0, 2000)
  console.error(receipt.failure)
  process.exitCode = 1
}
finally {
  if (db) db.cleanup()
  receipt.finishedAt = new Date().toISOString()
  writeFileSync(path.join(output, 'acceptance.json'), JSON.stringify(receipt, null, 2) + '\n')
  console.log(`RESULT ${receipt.status} PG${version} checks=${receipt.checks.length}`)
}
