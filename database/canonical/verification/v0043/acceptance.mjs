import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createCluster, id } from '../v0042/cluster.mjs'
import { asWorkspaceAdmin, fixtureIds, seedWorkspaceAuthorization } from '../v0042/fixtures.mjs'
import { startWorkspaceApi } from '../v0042/runtime.mjs'

const version = process.argv[2] ?? '16'
assert(['16', '17'].includes(version))
const candidate = 'database/canonical/forward-candidates/task-handoff/0043_scoped_task_handoff.sql'
const output = path.resolve(process.env.TASK_HANDOFF_EVIDENCE_DIR ?? `out/enterprise-v31-db02/pg${version}`)
mkdirSync(output, { recursive: true })
const require = createRequire(path.resolve('Phoenix Compass/education compass/server/package.json'))
const { Pool } = require('pg')
const digest = (value) => createHash('sha256').update(value).digest('hex')
const receipt = {
  schemaVersion: 'enterprise-v31-db02-task-handoff.v1',
  postgres: version,
  migration: { number: '0043', sha256: digest(readFileSync(candidate)) },
  startedAt: new Date().toISOString(), checks: [], status: 'NOT_RUN'
}
const check = (name) => {
  receipt.checks.push({ name, status: 'PASS', at: new Date().toISOString() })
  console.log(`PASS ${name}`)
}
const q = (value) => `'${String(value).replaceAll("'", "''")}'`
let db
let runtime

function migrate39(cluster) {
  cluster.call(['cp', path.resolve(candidate), `${cluster.container}:/opt/canonical-migrations/0043_scoped_task_handoff.sql`])
  return cluster.call(['exec', '-e', 'CANONICAL_EXPECTED_MIGRATIONS=39',
    cluster.container, 'bash', '/opt/verification/migrate.sh'])
}

async function inWorkspace(alias, binding, action) {
  const selected = await runtime.call(alias, '/v1/workspace-contexts', {
    method: 'POST', body: { workspaceBindingId: binding }
  })
  assert.equal(selected.response.status, 200)
  const cookie = selected.setCookie.split(';', 1)[0]
  const contextToken = cookie.slice(cookie.indexOf('=') + 1)
  const session = runtime.sessions.get(runtime.tokens[alias])
  const principal = alias === 'multi'
    ? fixtureIds.principals.multi : fixtureIds.principals.partnerB
  const binder = await runtime.binder.connect()
  const app = await runtime.app.connect()
  try {
    const issued = await binder.query(
      "SELECT * FROM auth.issue_workspace_context_ticket($1,$2,$3,clock_timestamp()+interval '30 seconds',$4,$1)",
      [principal, digest(session.sessionRef), digest(contextToken), id(8100 + receipt.checks.length)]
    )
    assert.equal(issued.rows.length, 1)
    await app.query('SET ROLE phoenix_canonical_workspace_reader')
    await app.query('SELECT auth.redeem_workspace_context_ticket($1,$2)',
      [issued.rows[0].ticket_id, principal])
    return await action(app)
  } finally {
    try { await app.query('SELECT auth.clear_workspace_context()') } catch {}
    try { await app.query('RESET ROLE') } catch {}
    try { await app.query('DISCARD ALL') } catch {}
    try { await binder.query('DISCARD ALL') } catch {}
    app.release(true)
    binder.release(true)
  }
}

async function bool(alias, binding, statement, params) {
  return inWorkspace(alias, binding, async (client) => {
    const result = await client.query(statement, params)
    return Object.values(result.rows[0])[0]
  })
}

async function run() {
  db = await createCluster(version, { initialize: false, suffix: 'db02-fresh' })
  const applied = migrate39(db)
  assert(applied.includes('APPLIED 0043_scoped_task_handoff.sql'))
  assert(applied.includes('PASS ledger=39 files=39 expected=39'))
  assert(migrate39(db).includes('SKIP 0043_scoped_task_handoff.sql'))
  assert.equal(db.sql('SELECT count(*) FROM canonical_migrations.applied'), '39')
  assert.equal(db.sql("SELECT count(*) FROM pg_tables WHERE schemaname IN ('auth','core','consent','audit','integration','docs','casework','education','identity','operations_ref','learning','crm','service')"), '102')
  check('PG fresh 0001-0037 plus isolated 0042/0043, ledger and repeat')

  const passwords = seedWorkspaceAuthorization(db)
  db.sql(`
    INSERT INTO service.project_assignments(
      project_assignment_id,service_project_id,principal_id,assignment_role,status,
      valid_from,assigned_by_principal_id
    ) VALUES('${id(1910)}','${fixtureIds.projects.partnerB}',
      '${fixtureIds.principals.multi}','COORDINATOR','ACTIVE',
      clock_timestamp()-interval '1 day','${fixtureIds.admin}');
    INSERT INTO service.tasks(
      task_id,service_project_id,task_type,task_title,task_status,priority,
      assigned_principal_id,created_by_principal_id,updated_by_principal_id
    ) VALUES
      ('${id(2000)}','${fixtureIds.projects.partnerB}','HANDOFF_TEST',
       'Synthetic scoped task','PENDING','MEDIUM','${fixtureIds.principals.partnerB}',
       '${fixtureIds.admin}','${fixtureIds.admin}'),
      ('${id(2001)}','${fixtureIds.projects.partnerB}','HANDOFF_TEST',
       'Synthetic expired task','PENDING','MEDIUM','${fixtureIds.principals.partnerB}',
       '${fixtureIds.admin}','${fixtureIds.admin}'),
      ('${id(2002)}','${fixtureIds.projects.partnerB}','HANDOFF_TEST',
       'Synthetic concurrent task','PENDING','MEDIUM','${fixtureIds.principals.partnerB}',
       '${fixtureIds.admin}','${fixtureIds.admin}'),
      ('${id(2003)}','${fixtureIds.projects.partnerB}','HANDOFF_TEST',
       'Synthetic atomic task','PENDING','MEDIUM','${fixtureIds.principals.partnerB}',
       '${fixtureIds.admin}','${fixtureIds.admin}');
  `)
  const setup = asWorkspaceAdmin(db, `
    SELECT core.invite_organization_member('${id(1506)}',
      '${fixtureIds.organizations.partnerB}','${fixtureIds.people.multi}',
      clock_timestamp()+interval '7 days');
    SELECT core.accept_organization_membership('${id(1506)}','${fixtureIds.people.multi}');
    SELECT auth.assign_workspace_role('${id(1611)}','${fixtureIds.principals.multi}',
      '${id(1506)}',NULL,'STAFF','STAFF_ADVISOR',NULL);
    SELECT service.scope_project_assignment_to_organization('${id(1910)}',
      '${fixtureIds.organizations.partnerB}');
  `)
  assert(setup.split(/\s+/).filter((value) => value === 't').length >= 4)
  check('recipient already holds same-project and same-organization authorization')

  runtime = await startWorkspaceApi(db, passwords)
  const propose = 'SELECT service.propose_task_handoff($1,$2,$3,$4,$5,$6) AS ok'
  const accept = 'SELECT service.accept_task_handoff($1,$2,$3,$4) AS ok'
  const decline = 'SELECT service.decline_task_handoff($1,$2,$3,$4) AS ok'
  const expires = new Date(Date.now() + 30 * 60_000)
  assert.equal(await bool('multi', fixtureIds.bindings.partnerAStaff, propose,
    [id(2100), id(2000), id(1910), 'STAFF_TRANSFER', expires, id(2200)]), false)
  assert.equal(await bool('partnerB', fixtureIds.bindings.partnerB, propose,
    [id(2100), id(2000), id(1910), 'STAFF_TRANSFER', expires, id(2200)]), false)
  assert.equal(db.sql('SELECT count(*) FROM service.task_handoff_requests'), '0')
  check('cross-organization and Partner workspace proposals denied')

  assert.equal(await bool('partnerB', fixtureIds.bindings.partnerBStaff, propose,
    [id(2100), id(2000), id(1910), 'STAFF_TRANSFER', expires, id(2200)]), false)
  asWorkspaceAdmin(db, `SELECT auth.revoke_workspace_role('${fixtureIds.bindings.partnerBStaff}');`)
  const rebound = asWorkspaceAdmin(db, `SELECT auth.assign_workspace_role('${id(1612)}',
    '${fixtureIds.principals.partnerB}','${fixtureIds.memberships.partnerB}',NULL,
    'STAFF','STAFF_ADVISOR',NULL);`)
  assert(rebound.split(/\s+/).includes('t'))
  assert.equal(await bool('partnerB', id(1612), propose,
    [id(2100), id(2000), id(1910), 'STAFF_TRANSFER', expires, id(2200)]), true)
  assert.equal(await bool('partnerB', id(1612), propose,
    [id(2100), id(2000), id(1910), 'STAFF_TRANSFER', expires, id(2201)]), true)
  assert.equal(db.sql('SELECT count(*) FROM service.task_handoff_requests'), '1')
  check('eligible sender proposes one idempotent request; Staff Viewer denied')

  const inbox = async (alias, binding) => inWorkspace(alias, binding,
    async (client) => (await client.query('SELECT service.read_task_handoff_inbox() AS result')).rows[0].result)
  const recipientInbox = await inbox('multi', id(1611))
  assert.equal(recipientInbox.status, 'ALLOW')
  assert.equal(recipientInbox.data.items.length, 1)
  assert.equal(recipientInbox.data.items[0].direction, 'INCOMING')
  assert.equal(recipientInbox.data.items[0].handoffId, id(2100))
  assert.equal((await inbox('multi', fixtureIds.bindings.partnerAStaff)).data.items.length, 0)
  assert.equal((await inbox('partnerB', fixtureIds.bindings.partnerB)).status, 'DENY')
  check('restricted inbox reveals only current same-organization Staff proposals')

  assert.equal(await bool('partnerB', id(1612), accept,
    [id(2100), 1, id(2300), id(2301)]), false)
  assert.equal(await bool('multi', id(1611), accept,
    [id(2100), 9, id(2300), id(2301)]), false)
  assert.equal(await bool('multi', id(1611), accept,
    [id(2100), 1, id(2300), id(2301)]), true)
  assert.equal(await bool('multi', id(1611), accept,
    [id(2100), 1, id(2300), id(2301)]), true)
  assert.equal(db.sql(`SELECT assigned_principal_id FROM service.tasks WHERE task_id='${id(2000)}'`),
    fixtureIds.principals.multi)
  assert.equal(db.sql(`SELECT count(*) FROM service.task_events WHERE task_id='${id(2000)}'`), '1')
  assert.equal(db.sql(`SELECT count(*) FROM service.project_assignments WHERE service_project_id='${fixtureIds.projects.partnerB}'`), '3')
  check('recipient-only accept, revision guard, exactly one transfer event and no new project grant')

  const expiredAt = new Date(Date.now() + 350)
  assert.equal(await bool('partnerB', id(1612), propose,
    [id(2101), id(2001), id(1910), 'STAFF_TRANSFER', expiredAt, id(2202)]), true)
  await new Promise((resolve) => setTimeout(resolve, 500))
  assert.equal(await bool('multi', id(1611), accept,
    [id(2101), 1, id(2302), id(2303)]), false)
  assert.equal(await bool('partnerB', id(1612), propose,
    [id(2102), id(2001), id(1910), 'STAFF_TRANSFER', expires, id(2203)]), true)
  assert.equal(db.sql(`SELECT status FROM service.task_handoff_requests WHERE handoff_id='${id(2101)}'`), 'EXPIRED')
  assert.equal(await bool('multi', id(1611), decline,
    [id(2102), 'REJECTED', 1, id(2304)]), true)
  assert.equal(await bool('multi', id(1611), decline,
    [id(2102), 'REJECTED', 1, id(2304)]), true)
  assert.equal(await bool('multi', id(1611), decline,
    [id(2102), 'REJECTED', 1, id(2305)]), false)
  assert.equal(db.sql(`SELECT assigned_principal_id FROM service.tasks WHERE task_id='${id(2001)}'`),
    fixtureIds.principals.partnerB)
  assert.equal(db.sql(`SELECT count(*) FROM service.task_handoff_events WHERE handoff_id='${id(2102)}'`), '2')
  check('natural expiry releases open slot; rejection replay is idempotent and task unchanged')

  assert.equal(await bool('partnerB', id(1612), propose,
    [id(2103), id(2002), id(1910), 'STAFF_TRANSFER', expires, id(2204)]), true)
  const selected = await runtime.call('multi', '/v1/workspace-contexts', {
    method: 'POST', body: { workspaceBindingId: id(1611) }
  })
  assert.equal(selected.response.status, 200)
  const token = selected.setCookie.split(';', 1)[0].split('=')[1]
  const session = runtime.sessions.get(runtime.tokens.multi)
  const binder = await runtime.binder.connect()
  const workers = [await runtime.app.connect(), await runtime.app.connect()]
  try {
    const tickets = []
    for (let i = 0; i < 2; i += 1) {
      const issued = await binder.query(
        "SELECT * FROM auth.issue_workspace_context_ticket($1,$2,$3,clock_timestamp()+interval '30 seconds',$4,$1)",
        [fixtureIds.principals.multi, digest(session.sessionRef), digest(token), id(8401 + i)]
      )
      tickets.push(issued.rows[0].ticket_id)
      await workers[i].query('SET ROLE phoenix_canonical_workspace_reader')
      await workers[i].query('SELECT auth.redeem_workspace_context_ticket($1,$2)',
        [tickets[i], fixtureIds.principals.multi])
    }
    const outcomes = await Promise.all(workers.map((worker, i) => worker.query(accept,
      [id(2103), 1, id(2310 + i), id(2312 + i)])))
    assert.deepEqual(outcomes.map((result) => result.rows[0].ok).sort(), [false, true])
  } finally {
    for (const worker of workers) {
      try { await worker.query('SELECT auth.clear_workspace_context()') } catch {}
      try { await worker.query('RESET ROLE') } catch {}
      worker.release(true)
    }
    binder.release(true)
  }
  assert.equal(db.sql(`SELECT count(*) FROM service.task_events WHERE task_id='${id(2002)}'`), '1')
  check('two real restricted app connections accept concurrently; one transfer event wins')

  assert.equal(await bool('partnerB', id(1612), propose,
    [id(2104), id(2003), id(1910), 'STAFF_TRANSFER', expires, id(2205)]), true)
  await assert.rejects(() => bool('multi', id(1611), accept,
    [id(2104), 1, id(2300), id(2315)]), /duplicate key|unique constraint/i)
  assert.equal(db.sql(`SELECT status FROM service.task_handoff_requests WHERE handoff_id='${id(2104)}'`), 'PROPOSED')
  assert.equal(db.sql(`SELECT assigned_principal_id FROM service.tasks WHERE task_id='${id(2003)}'`),
    fixtureIds.principals.partnerB)
  assert.equal(await bool('partnerB', id(1612), decline,
    [id(2104), 'CANCELLED', 1, id(2316)]), true)
  asWorkspaceAdmin(db, `SELECT auth.revoke_workspace_role('${id(1611)}');`)
  assert.equal((await runtime.call('multi', '/v1/workspace-contexts', {
    method: 'POST', body: { workspaceBindingId: id(1611) }
  })).response.status, 403)
  check('failed transfer rolls back atomically; sender cancel and recipient role revocation deny reuse')

  const appClient = new Pool(runtime.connection('workspace_test_app', passwords.app))
  try {
    await assert.rejects(() => appClient.query('SELECT * FROM service.task_handoff_requests'), /permission denied/)
    await assert.rejects(() => appClient.query('UPDATE service.tasks SET task_status=$1 WHERE task_id=$2',
      ['CANCELLED', id(2001)]), /permission denied/)
  } finally { await appClient.end() }
  assert.equal(db.sql("SELECT count(*) FROM pg_policies WHERE schemaname='service' AND tablename IN ('task_handoff_requests','task_handoff_events')"), '2')
  assert.equal(db.sql("SELECT has_function_privilege('phoenix_canonical_workspace_reader','service.task_handoff_actor_ready()','EXECUTE')"), 'f')
  assert.equal(db.sql("SELECT has_function_privilege('phoenix_canonical_workspace_reader','service.propose_task_handoff(uuid,uuid,uuid,text,timestamptz,uuid)','EXECUTE')"), 't')
  assert.equal(db.sql("SELECT has_function_privilege('phoenix_canonical_workspace_reader','service.read_task_handoff_inbox()','EXECUTE')"), 't')
  assert.equal(db.sql("SELECT has_function_privilege('phoenix_canonical_app','service.propose_task_handoff(uuid,uuid,uuid,text,timestamptz,uuid)','EXECUTE')"), 'f')
  assert.equal(db.sql("SELECT count(*) FROM audit.access_events WHERE resource_kind='TASK_HANDOFF' AND decision='DENY'") !== '0', true)
  check('restricted LOGIN has no direct table write or read; narrow EXECUTE grants, FORCE RLS and audit denials')

  await runtime.close(); runtime = undefined
  db.cleanup(); db = undefined
  db = await createCluster(version, { initialize: true, suffix: 'db02-upgrade' })
  assert(migrate39(db).includes('APPLIED 0043_scoped_task_handoff.sql'))
  assert.equal(db.sql('SELECT count(*) FROM canonical_migrations.applied'), '39')
  check('existing 0037+0042 baseline upgrades to 0043 without changing prior bytes')

  db.call(['exec', db.container, 'bash', '-c',
    'printf "\\n-- synthetic drift probe\\n" >> /opt/canonical-migrations/0043_scoped_task_handoff.sql'])
  assert.throws(() => db.call(['exec', '-e', 'CANONICAL_EXPECTED_MIGRATIONS=39',
    db.container, 'bash', '/opt/verification/migrate.sh']), /drift|checksum|failed/i)
  db.call(['cp', path.resolve(candidate), `${db.container}:/opt/canonical-migrations/0043_scoped_task_handoff.sql`])
  assert(migrate39(db).includes('SKIP 0043_scoped_task_handoff.sql'))
  check('0043 drift rejected and original candidate remains repeat-safe')
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
  if (runtime) await runtime.close().catch(() => {})
  if (db) db.cleanup()
  receipt.finishedAt = new Date().toISOString()
  writeFileSync(path.join(output, 'acceptance.json'), JSON.stringify(receipt, null, 2) + '\n')
  console.log(`RESULT ${receipt.status} PG${version} checks=${receipt.checks.length}`)
}
