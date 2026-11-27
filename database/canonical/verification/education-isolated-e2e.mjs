import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { generateKeyPairSync, randomBytes, randomUUID, sign } from 'node:crypto'
import { once } from 'node:events'
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { connect } from 'node:net'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { createCluster, id, protect } from './v0038/cluster.mjs'

const version = process.argv[2]
assert(['16', '17'].includes(version), 'Run from repository root with 16 or 17')
const serverRoot = path.resolve('Phoenix Compass/education compass/server')
const { Client } = createRequire(path.join(serverRoot, 'package.json'))('pg')
const childEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  ['path', 'systemroot', 'windir', 'temp', 'tmp', 'comspec'].includes(key.toLowerCase())))
const issuer = 'https://family-projection.synthetic.invalid'
const audience = 'family-projection-synthetic'
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'synthetic-education', alg: 'ES256', use: 'sig' }
const familyKey = letter => 'fam_' + letter.repeat(32)
const ref = (kind, n) => kind + '_' + id(n).replaceAll('-', '')
const secret = () => randomBytes(32).toString('hex')
const serviceToken = secret()
const passwords = Object.fromEntries(['catalog', 'projection', 'binder', 'ops', 'ops_binder'].map(role => [role, secret()]))

function jwt(subject, letter, lifetime = 45) {
  const now = Math.floor(Date.now() / 1000)
  const claims = { iss: issuer, aud: audience, sub: 'usr_' + subject, application_family_id: familyKey(letter),
    iat: now - 2, nbf: now - 2, exp: now + lifetime, jti: randomUUID() }
  const input = [{ alg: 'ES256', typ: 'JWT', kid: jwk.kid }, claims]
    .map(value => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.')
  return input + '.' + sign('sha256', Buffer.from(input), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url')
}

function config(db, role) {
  return { host: '127.0.0.1', port: db.port, database: 'phoenix_canonical_dev',
    user: 'synthetic_edu_' + role, password: passwords[role] }
}

function save(db, name, value) {
  const file = path.join(db.work, name + '.json')
  writeFileSync(file, JSON.stringify(value), { mode: 0o600, flag: 'wx' })
  protect(file)
  return file
}

function seed(db) {
  for (const role of Object.keys(passwords)) {
    db.sql(`CREATE ROLE synthetic_edu_${role} LOGIN NOINHERIT PASSWORD '${passwords[role]}';
      GRANT CONNECT ON DATABASE phoenix_canonical_dev TO synthetic_edu_${role};`)
  }
  db.sql(`
    GRANT USAGE ON SCHEMA learning TO synthetic_edu_catalog;
    GRANT EXECUTE ON FUNCTION learning.list_published_courses() TO synthetic_edu_catalog;
    GRANT phoenix_canonical_projection_reader TO synthetic_edu_projection WITH INHERIT FALSE, SET TRUE;
    GRANT USAGE ON SCHEMA auth TO synthetic_edu_binder,synthetic_edu_ops_binder;
    GRANT EXECUTE ON FUNCTION auth.issue_application_family_context_ticket(text,text,text,timestamptz,uuid)
      TO synthetic_edu_binder;
    GRANT EXECUTE ON FUNCTION auth.issue_context_ticket(uuid,uuid,uuid,text,timestamptz,uuid,uuid)
      TO synthetic_edu_ops_binder;
    GRANT phoenix_canonical_app TO synthetic_edu_ops WITH INHERIT FALSE, SET TRUE;
    GRANT USAGE ON SCHEMA operations_ref TO phoenix_canonical_projection_reader;
    GRANT EXECUTE ON FUNCTION operations_ref.check_entitlement(uuid,uuid,text,uuid)
      TO phoenix_canonical_projection_reader;

    INSERT INTO core.families(family_id,display_name) VALUES
      ('${id(100)}','Synthetic Family A'),('${id(101)}','Synthetic Family B');
    INSERT INTO auth.principals(principal_id,principal_kind,status,service_label) VALUES
      ('${id(900)}','SERVICE','ACTIVE','synthetic_mapping_proposer'),
      ('${id(901)}','SERVICE','ACTIVE','synthetic_mapping_reviewer'),
      ('${id(902)}','SERVICE','ACTIVE','operations_entitlement_service');
  `)
  for (const [n, label, subject, family] of [[1, 'A', 'student_a', 100], [2, 'B', 'student_b', 101], [3, 'A2', 'student_a2', 100]]) {
    db.sql(`INSERT INTO core.people(person_id,display_name) VALUES ('${id(n)}','Synthetic Student ${label}');
      INSERT INTO core.student_profiles(person_id) VALUES ('${id(n)}');
      INSERT INTO core.family_memberships(membership_id,family_id,person_id,membership_role,valid_from)
        VALUES ('${id(300+n)}','${id(family)}','${id(n)}','MEMBER',now()-interval '1 day');
      INSERT INTO auth.principals(principal_id,person_id,principal_kind,status)
        VALUES ('${id(200+n)}','${id(n)}','FAMILY','ACTIVE');
      INSERT INTO auth.external_identities(external_identity_id,issuer,subject,principal_id,status)
        VALUES ('${id(400+n)}','${issuer}','usr_${subject}','${id(200+n)}','ACTIVE');`)
  }
  for (const [n, letter] of [[100, 'a'], [101, 'b']]) {
    db.sql(`INSERT INTO integration.legacy_id_mappings(
        mapping_id,source_system,entity_kind,legacy_id,canonical_id,mapping_status,evidence_ref,
        managed_lifecycle_version,proposed_by_principal_id,proposed_at,proposal_request_nonce,
        application_ownership_evidence_ref,application_ownership_evidence_sha256,
        canonical_membership_evidence_ref,canonical_membership_evidence_sha256,
        founder_approval_evidence_ref,founder_approval_evidence_sha256,
        decided_by_principal_id,decided_at,verification_request_nonce)
      VALUES ('${id(500+n)}','PHOENIX_FAMILY_OS','FAMILY','${familyKey(letter)}','${id(n)}','VERIFIED',
        'evidence://synthetic/edu-cutover','FM_V1','${id(900)}',now(),'${randomUUID()}',
        'evidence://synthetic/ownership','${'a'.repeat(64)}','evidence://synthetic/membership','${'b'.repeat(64)}',
        'evidence://synthetic/approval-not-real','${'c'.repeat(64)}','${id(901)}',now(),'${randomUUID()}');`)
  }
  db.sql(`INSERT INTO integration.public_ids(entity_kind,public_id,canonical_id)
      SELECT 'FAMILY','fam_'||replace(family_id::text,'-',''),family_id FROM core.families;
    INSERT INTO integration.public_ids(entity_kind,public_id,canonical_id)
      SELECT 'STUDENT_PROFILE','stu_'||replace(person_id::text,'-',''),person_id FROM core.student_profiles;
    INSERT INTO learning.course(course_id,course_code,title,status,created_by_principal_id)
      VALUES ('${id(31)}','SYNTH-EDU','Synthetic published course','PUBLISHED','${id(201)}'),
             ('${id(32)}','SYNTH-DRAFT','Synthetic draft course','DRAFT','${id(201)}');
    INSERT INTO learning.course_version(course_version_id,course_id,version_no,effective_from,status,created_by_principal_id)
      VALUES ('${id(41)}','${id(31)}',1,now()-interval '1 day','ACTIVE','${id(201)}');`)
}

async function withOps(db, family, action) {
  const writer = new Client(config(db, 'ops'))
  const binder = new Client(config(db, 'ops_binder'))
  try {
    await binder.connect()
    await writer.connect()
    const principal = id(902)
    const { rows: [row] } = await binder.query(
      `SELECT auth.issue_context_ticket($1,NULL,$2,'INTERNAL',now()+interval '30 seconds',$3,$1) AS ticket`,
      [principal, id(family), randomUUID()])
    await writer.query('SET ROLE phoenix_canonical_app')
    await writer.query('SELECT auth.redeem_context_ticket($1,$2)', [row.ticket, principal])
    await action(writer)
    await writer.query('SELECT auth.clear_context()')
  } finally {
    await Promise.allSettled([binder.end(), writer.end()])
  }
}

async function grant(db, family, subject, kind, grantId, window) {
  await withOps(db, family, async writer => {
    const { rows: [row] } = await writer.query(
      `SELECT operations_ref.register_entitlement($1,'phoenix_operations',$2,$3,1,$4,$5,$6,NULL,
         now()+$7::interval,now()+$8::interval,now()) AS allowed`,
      [id(grantId), 'synthetic-ref-' + grantId, 'synthetic-grant-' + grantId, id(family), id(subject), kind, ...window])
    assert.equal(row.allowed, true)
  })
}

const envFor = (db) => ({ ...childEnv, NODE_ENV: 'test', PORT: '0', LISTEN_HOST: '127.0.0.1',
  CANONICAL_EDUCATION_ISOLATED: 'true', CANONICAL_LEARNING_CATALOG_ENABLED: 'true',
  CANONICAL_FAMILY_PROJECTION_ENABLED: 'true', CANONICAL_FAMILY_PROJECTION_AUDITED_ENABLED: 'true',
  CANONICAL_CATALOG_CONFIG_FILE: save(db, 'catalog', { ...config(db, 'catalog'), serviceToken }),
  CANONICAL_FAMILY_APP_CONFIG_FILE: save(db, 'projection', config(db, 'projection')),
  CANONICAL_FAMILY_BINDER_CONFIG_FILE: save(db, 'binder', config(db, 'binder')),
  CANONICAL_FAMILY_IDENTITY_CONFIG_FILE: save(db, 'identity', { issuer, audience, jwk })
})

function run(entrypoint, env) {
  return spawnSync(process.execPath, [entrypoint], { cwd: serverRoot, env, encoding: 'utf8',
    windowsHide: true, timeout: 20000 })
}

function assertStartupRefused(env, label) {
  const result = run('dist/index.js', env)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Server startup failed/)
  assert.doesNotMatch(result.stdout, /listening on port/)
  console.log('PASS startup refused before listen', label, result.stderr.trim())
}

async function start(env) {
  const child = spawn(process.execPath, ['dist/index.js'], {
    cwd: serverRoot, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
  })
  const exited = once(child, 'exit')
  let stdout = '', stderr = ''
  child.stdout.on('data', part => { stdout += part.toString() })
  child.stderr.on('data', part => { stderr += part.toString() })
  const stop = async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill()
    await exited
  }
  try {
    for (let i = 0; i < 180; i++) {
      const line = stdout.match(/[^\r\n]+ listening on port (\d+)/)
      if (line) {
        console.log(line[0])
        return { origin: 'http://127.0.0.1:' + line[1], stop }
      }
      if (child.exitCode !== null || child.signalCode !== null) break
      await sleep(100)
    }
    throw Error('Test runtime never became ready: ' + stderr.replace(/[a-z0-9_=-]{32,}/gi, '[REDACTED]').trim())
  } catch (error) {
    await stop()
    throw error
  }
}

async function get(runtime, route, expected, { token, headers, method } = {}) {
  const response = await fetch(runtime.origin + route, { method, signal: AbortSignal.timeout(10000),
    headers: { ...(token ? { authorization: 'Bearer ' + token } : {}), ...headers } })
  const body = await response.json()
  console.log('HTTP', method ?? 'GET', route, response.status, body.error?.code ?? body.reasonCode ?? body.schemaVersion ?? '')
  assert.equal(response.status, expected)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  return [body, response.headers.get('x-request-id')]
}

async function closeLegacyConnection(legacy) {
  const databaseUrl = `postgresql://retired_fixture@127.0.0.1:${legacy.port}/phoenix_canonical_dev`
  const socket = connect({ host: '127.0.0.1', port: legacy.port })
  try { await once(socket, 'connect') }
  finally { socket.destroy() }
  const result = run('dist/index.js', { ...childEnv, NODE_ENV: 'test', DATABASE_URL: databaseUrl })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /LEGACY_EDUCATION_DATABASE_RETIRED/)
  assert.doesNotMatch(result.stdout, /listening on port/)
  assert.equal(legacy.sql("SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename='products'"), '0')
  legacy.call(['stop', legacy.container])
  assert.equal(legacy.call(['inspect','--format','{{.State.Running}}',legacy.container]), 'false')
  const client = connect({ host: '127.0.0.1', port: legacy.port })
  try { await assert.rejects(once(client, 'connect'), { code: 'ECONNREFUSED' }) }
  finally { client.destroy() }
  console.log('PASS retired database URL refused before listening; no legacy tables initialized; disposable endpoint stopped')
  return databaseUrl
}

const entitlementRoute = '/v1/canonical/projections/education-service-entitlement'
let database, legacy, runtime
try {
  legacy = await createCluster(version, { initialize: false })
  const legacyUrl = await closeLegacyConnection(legacy)
  database = await createCluster(version, { initialize: false })
  database.call(['exec', database.container, 'mv', '/opt/canonical-migrations/0038_service_project_workbench.sql', '/opt/verification/'])
  const migrate = () => database.call(['exec', '-e', 'CANONICAL_EXPECTED_MIGRATIONS=37', database.container,
    'bash', '/opt/verification/migrate.sh'])
  const fresh = migrate()
  console.log(fresh)
  assert.match(fresh, /APPLIED 0037_.+\nPASS ledger=37 files=37 expected=37/)
  const repeat = migrate()
  assert.equal(repeat.match(/^SKIP /gm)?.length, 37)
  console.log('PASS repeat checks all 37 migration digests')
  const serverVersion = database.sql('SHOW server_version')
  console.log('SELECT server_version          ', serverVersion)
  assert.match(serverVersion, new RegExp('^' + version + '\\.'))
  assert.equal(database.sql(`SELECT count(*) FROM pg_tables WHERE schemaname='public'
    AND tablename IN ('products','assessments','reports','orders','entitlements')`), '0')
  console.log('PASS Canonical baseline has no legacy product, assessment, report, order or entitlement tables')

  seed(database)
  await grant(database, 100, 1, 'EDUCATION_SERVICE', 701, ['-1 day', '1 day'])
  await grant(database, 101, 2, 'ASKWISE', 702, ['-1 day', '1 day'])
  const env = envFor(database)
  assertStartupRefused({ ...env, DATABASE_URL: legacyUrl }, 'legacy DSN present')
  assertStartupRefused({ ...env, NODE_ENV: 'production' }, 'production mode')
  assertStartupRefused({ ...env, LISTEN_HOST: '0.0.0.0' }, 'non-loopback listener')
  assertStartupRefused({ ...env, CANONICAL_BROKER_SESSION_BRIDGE_ENABLED: 'true' }, 'legacy session bridge')
  assertStartupRefused({ ...env, CANONICAL_FAMILY_PROJECTION_AUDITED_ENABLED: 'false' }, 'audited projection disabled')
  const wrongPortConfig = save(database, 'wrong-cluster', { ...config(database, 'catalog'), port: legacy.port, serviceToken })
  assertStartupRefused({ ...env, CANONICAL_CATALOG_CONFIG_FILE: wrongPortConfig }, 'catalogue points to a different PostgreSQL endpoint')
  database.sql(`GRANT EXECUTE ON FUNCTION operations_ref.revoke_entitlement(text,text,text,bigint,timestamptz)
    TO phoenix_canonical_projection_reader`)
  assertStartupRefused(env, 'Operations write permission present on the projection role')
  database.sql(`REVOKE EXECUTE ON FUNCTION operations_ref.revoke_entitlement(text,text,text,bigint,timestamptz)
    FROM phoenix_canonical_projection_reader`)

  runtime = await start(env)
  assert.deepEqual((await get(runtime, '/health', 200))[0], { ok: true })
  await get(runtime, '/v1/learning/catalog', 401)
  assert.deepEqual((await get(runtime, '/v1/learning/catalog', 200, { token: serviceToken }))[0],
    { schemaVersion: 'learning-catalog.v1', items: [{ courseRef: id(31), versionRef: id(41),
      courseCode: 'SYNTH-EDU', title: 'Synthetic published course', versionNo: 1 }] })
  const a = () => jwt('student_a', 'a')
  const b = () => jwt('student_b', 'b')
  const a2 = () => jwt('student_a2', 'a')
  for (const [token, n] of [[a, 100], [b, 101], [a, 100]]) {
    const [body] = await get(runtime, '/v1/canonical/projections/family', 200, { token: token() })
    assert.equal(body.family.familyRef, ref('fam', n))
  }
  const [students] = await get(runtime, '/v1/canonical/projections/students', 200, { token: a() })
  assert.deepEqual(students.items.map(item => item.studentRef), [ref('stu', 1)])
  await get(runtime, '/v1/canonical/projections/students/' + ref('stu', 1), 200, { token: a() })
  await get(runtime, '/v1/canonical/projections/students/' + ref('stu', 2), 404, { token: a() })
  await get(runtime, '/v1/canonical/projections/students/' + ref('stu', 3), 404, { token: a() })
  await get(runtime, '/v1/canonical/projections/family', 403, { token: jwt('student_a', 'b') })
  await get(runtime, entitlementRoute, 401)
  await get(runtime, entitlementRoute, 401, { token: jwt('student_a', 'a', -1) })
  await get(runtime, entitlementRoute, 403, { token: a(), headers: { 'x-family-id': id(101) } })
  await get(runtime, entitlementRoute + '?subject=other', 400, { token: a() })
  await get(runtime, entitlementRoute, 405, { token: a(), method: 'POST' })
  const [active] = await get(runtime, entitlementRoute, 200, { token: a() })
  assert.deepEqual(active, { allowed: true, reasonCode: 'ENTITLEMENT_ACTIVE' })
  for (const token of [b, a2]) {
    const [decision] = await get(runtime, entitlementRoute, 200, { token: token() })
    assert.deepEqual(decision, { allowed: false, reasonCode: 'ENTITLEMENT_MISSING' })
  }
  await grant(database, 101, 2, 'EDUCATION_SERVICE', 703, ['-2 days', '-1 day'])
  assert.deepEqual((await get(runtime, entitlementRoute, 200, { token: b() }))[0],
    { allowed: false, reasonCode: 'ENTITLEMENT_EXPIRED' })
  await grant(database, 100, 3, 'EDUCATION_SERVICE', 704, ['1 day', '2 days'])
  assert.deepEqual((await get(runtime, entitlementRoute, 200, { token: a2() }))[0],
    { allowed: false, reasonCode: 'ENTITLEMENT_NOT_YET_VALID' })
  await withOps(database, 100, async writer => {
    const { rows: [row] } = await writer.query(
      `SELECT operations_ref.revoke_entitlement('phoenix_operations','synthetic-ref-701',
        'synthetic-revoke-701',2,now()) AS allowed`)
    assert.equal(row.allowed, true)
  })
  assert.deepEqual((await get(runtime, entitlementRoute, 200, { token: a() }))[0],
    { allowed: false, reasonCode: 'ENTITLEMENT_REVOKED' })
  const audit = database.sql(`SELECT decision||' '||reason_code FROM audit.access_events
    WHERE resource_kind='OPERATIONS_ENTITLEMENT' AND action='CHECK' ORDER BY event_id`)
  assert.equal(audit, ['ALLOW ENTITLEMENT_ACTIVE', 'DENY ENTITLEMENT_MISSING', 'DENY ENTITLEMENT_MISSING',
    'DENY ENTITLEMENT_EXPIRED', 'DENY ENTITLEMENT_NOT_YET_VALID', 'DENY ENTITLEMENT_REVOKED'].join('\n'))
  console.log('SELECT audit.access_events\n' + audit)
  const previouslyValidToken = b()
  await get(runtime, '/v1/canonical/projections/family', 200, { token: previouslyValidToken })
  database.sql(`UPDATE auth.external_identities SET status='DISABLED',disabled_at=now()
    WHERE external_identity_id='${id(402)}'`)
  await get(runtime, '/v1/canonical/projections/family', 403, { token: previouslyValidToken })
  await get(runtime, entitlementRoute, 403, { token: previouslyValidToken })
  console.log('PASS disabled synthetic external identity loses projection and entitlement access with the same token')
  assert.equal(database.sql("SELECT count(*) FROM auth.session_contexts WHERE channel IN ('FAMILY','INTERNAL')"), '0')
  assert.equal(database.sql('SELECT count(*) FROM auth.context_exchange_tickets'), '0')
  console.log('PASS context and one-time tickets cleaned across A/B/A and Operations calls')

  const reader = new Client(config(database, 'projection'))
  try {
    await reader.connect()
    await reader.query('SET ROLE phoenix_canonical_projection_reader')
    for (const statement of ['SELECT * FROM operations_ref.entitlement_ref',
      "SELECT operations_ref.revoke_entitlement('phoenix_operations','synthetic-ref-701','synthetic-denied',3,now())",
      "INSERT INTO audit.access_events(action) VALUES('synthetic-denied')"]) {
      await assert.rejects(reader.query(statement), { code: '42501' })
    }
    console.log('PASS projection LOGIN cannot select raw entitlement rows, revoke or create audit rows (42501)')
  } finally { await reader.end() }

  for (const [route, method] of [
    ['/v1/auth/wechat/session', 'POST'], ['/v1/assessments/synthetic/questionnaire', 'GET'],
    ['/v1/assessments/synthetic/draft', 'PUT'], ['/v1/assessments/synthetic/submit', 'POST'],
    ['/v1/reports/synthetic', 'GET'], ['/v1/orders', 'POST']
  ]) {
    const [body] = await get(runtime, route, 503, { method, token: a() })
    assert.equal(body.error.code, 'CANONICAL_CONTRACT_HOLD')
  }
  await get(runtime, '/v1/canonical/session-projections/family', 404, { token: a() })
  await get(runtime, '/v1/service-workbench/dashboard', 404, { token: a() })
  database.call(['stop', database.container])
  await get(runtime, '/health', 503)
  await get(runtime, '/v1/learning/catalog', 503, { token: serviceToken })
  await get(runtime, entitlementRoute, 503, { token: a() })
  console.log(`PG${version} APPROVED_ISOLATED_CHAIN=PASS QUESTIONNAIRE_AND_REPORT=HOLD LEGACY_RETIREMENT=HOLD`)
} finally {
  try { await runtime?.stop() }
  finally {
    try { database?.cleanup() }
    finally { legacy?.cleanup() }
  }
}
