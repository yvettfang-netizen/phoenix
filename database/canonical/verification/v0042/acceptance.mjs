import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createCluster, candidate, id } from './cluster.mjs'
import { asWorkspaceAdmin, fixtureIds, seedWorkspaceAuthorization } from './fixtures.mjs'
import { startWorkspaceApi } from './runtime.mjs'

const version = process.argv[2] ?? '16'
assert(['16','17'].includes(version),'PostgreSQL version must be 16 or 17')
const output = path.resolve(process.env.WORKSPACE_AUTH_EVIDENCE_DIR ?? `out/enterprise-v3-workspace-auth-p1/pg${version}`)
mkdirSync(output,{recursive:true})
const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const git = (...args) => execFileSync('git',args,{encoding:'utf8'}).trim()
const record = {
  schemaVersion: 'phoenix-enterprise-v3-workspace-auth-p1.v1',
  startedAt: new Date().toISOString(),
  sourceCommit: git('rev-parse','HEAD'),
  sourceState: git('status','--porcelain') ? 'WORKING_TREE' : 'COMMITTED',
  postgres: { version },
  migration: { number: '0042', sha256: sha256(readFileSync(candidate)) },
  checks: [], requests: [], status: 'NOT_RUN'
}
const check = (name,details={}) => {
  record.checks.push({name,status:'PASS',at:new Date().toISOString(),...details})
  console.log(`PASS ${name}`)
}
const expectStatus = (result,status) => {
  assert.equal(result.response.status,status,JSON.stringify(result.value))
  return result.value
}
const projectCodes = (value) => value.items.map((item) => item.projectCode).sort()
const cookieToken = (setCookie) => {
  assert.match(setCookie ?? '',/^phoenix_workspace_context=[A-Za-z0-9_-]{43};/)
  return setCookie.split(';',1)[0]
}
let db
let runtime

async function expectDatabaseReject(action,pattern) {
  await assert.rejects(action,(error) => pattern.test(String(error?.message ?? error)))
}

async function run() {
  db = await createCluster(version)
  record.postgres.serverVersion = db.sql("SHOW server_version")
  record.postgres.ledger = Number(db.sql('SELECT count(*) FROM canonical_migrations.applied'))
  record.postgres.tables = Number(db.sql("SELECT count(*) FROM pg_tables WHERE schemaname IN ('auth','core','consent','audit','integration','docs','casework','education','identity','operations_ref','learning','crm','service')"))
  record.postgres.policies = Number(db.sql("SELECT count(*) FROM pg_policies WHERE schemaname IN ('auth','core','consent','audit','integration','docs','casework','education','identity','operations_ref','learning','crm','service')"))
  assert.equal(record.postgres.ledger,38)
  assert.equal(record.postgres.tables,100)
  assert.equal(record.postgres.policies,90)
  check('fresh migration 0001-0037 plus isolated 0042 and repeat safety',{ledger:38,tables:100,policies:90})

  const passwords = seedWorkspaceAuthorization(db)
  assert.equal(db.sql("SELECT string_agg(workspace_organization_kind,',' ORDER BY workspace_organization_kind) FROM core.organization_workspace_profiles"),
    'CHANNEL_AGENT,FRANCHISEE,HEADQUARTERS,REGIONAL_PARTNER,REGIONAL_PARTNER,SUB_PARTNER')
  assert.equal(db.sql("SELECT count(*) FROM core.organization_memberships WHERE status='ACTIVE'"),'6')
  assert.equal(db.sql("SELECT count(*) FROM auth.workspace_role_bindings WHERE status='ACTIVE'"),'11')
  check('organization kinds, invitation acceptance and role bindings use Canonical people and organizations')
  const finiteRole = asWorkspaceAdmin(db,`SELECT auth.assign_workspace_role(
    '${id(1699)}','${fixtureIds.principals.multi}','${fixtureIds.memberships.hq}',NULL,
    'STAFF','STAFF_VIEWER',clock_timestamp()+interval '1 day');`)
  assert(finiteRole.split(/\s+/).includes('f'))
  assert.equal(db.sql(`SELECT count(*) FROM auth.workspace_role_bindings WHERE workspace_binding_id='${id(1699)}'`),'0')
  check('active workspace roles require explicit revocation and cannot become silently expired blockers')

  runtime = await startWorkspaceApi(db,passwords)
  const capture = async (...args) => {
    const result = await runtime.call(...args)
    record.requests.push(result.receipt)
    return result
  }

  let result = await capture('multi','/v1/me/workspaces')
  const multiList = expectStatus(result,200)
  assert.equal(multiList.contractVersion,'workspace-list.v1')
  assert.deepEqual([...new Set(multiList.workspaces.map((item) => item.workspaceKind))].sort(),
    ['FAMILY','FOUNDER','PARTNER','STAFF'])
  assert.equal(multiList.workspaces.length,5)
  assert.equal(JSON.stringify(multiList).includes('person_id'),false)
  check('one natural person receives only its Founder, Staff, Partner and Family bindings')

  result = await capture('partnerB','/v1/me/workspaces')
  const partnerBList = expectStatus(result,200)
  assert.deepEqual(partnerBList.workspaces.map((item) => item.workspaceBindingId).sort(),
    [fixtureIds.bindings.familyB,fixtureIds.bindings.partnerB,fixtureIds.bindings.partnerBStaff].sort())
  result = await capture('auxiliary','/v1/me/workspaces')
  assert.deepEqual(expectStatus(result,200).workspaces.map((item) => item.organizationCode).sort(),
    ['PHX_CHANNEL','PHX_FRANCHISE','PHX_SUBPARTNER'])
  check('two partner identities and all approved organization types remain independently scoped')

  assert.equal((await capture('multi','/v1/me/workspaces?role=FOUNDER')).response.status,400)
  assert.equal((await capture('multi','/v1/me/workspaces',{headers:{'x-role':'FOUNDER'}})).response.status,403)
  assert.equal((await capture('multi','/v1/me/workspaces',{headers:{'x-organization-id':fixtureIds.organizations.hq}})).response.status,403)
  const codeLogin = await fetch(runtime.origin+'/v1/me/workspaces',{headers:{authorization:'Bearer PHX_HQ'}})
  assert.equal(codeLogin.status,401)
  record.requests.push({alias:'organization-code',path:'/v1/me/workspaces',method:'GET',status:codeLogin.status})
  check('browser role, organization and organization-code authentication assertions are rejected')

  assert.equal((await capture('multi','/v1/workspace-contexts',{
    method:'POST',body:{workspaceBindingId:fixtureIds.bindings.hqStaff},csrf:false
  })).response.status,403)
  assert.equal((await capture('multi','/v1/workspace-contexts',{
    method:'POST',body:{workspaceBindingId:fixtureIds.bindings.hqStaff,role:'FOUNDER'}
  })).response.status,400)
  result = await capture('multi','/v1/workspace-contexts',{
    method:'POST',body:{workspaceBindingId:fixtureIds.bindings.hqStaff}
  })
  const hqCookie = cookieToken(result.setCookie)
  const hqContext = expectStatus(result,200)
  assert.equal(hqContext.workspace.workspaceKind,'STAFF')
  assert.equal(hqContext.workspace.workspaceRef,`org_${fixtureIds.organizations.hq.replaceAll('-','')}`)
  assert.doesNotMatch(JSON.stringify(hqContext),/ticket|contextToken|principalId|personId/i)
  assert.match(result.setCookie,/HttpOnly; Secure; SameSite=Strict/)
  result = await capture('multi','/v1/staff/projects',{cookie:hqCookie})
  assert.deepEqual(projectCodes(expectStatus(result,200)),['SYN_WS_HQ'])
  check('HQ Staff context exposes one authorized projection and no ticket or identity internals')

  result = await capture('multi','/v1/workspace-contexts',{
    method:'POST',body:{workspaceBindingId:fixtureIds.bindings.partnerAStaff}
  })
  const partnerACookie = cookieToken(result.setCookie)
  assert.equal((await capture('multi','/v1/staff/projects',{cookie:hqCookie})).response.status,403)
  result = await capture('multi','/v1/staff/projects',{cookie:partnerACookie})
  assert.deepEqual(projectCodes(expectStatus(result,200)),['SYN_WS_PARTNER_A'])
  assert.doesNotMatch(JSON.stringify(result.value),/SYN_WS_HQ|SYN_WS_PARTNER_B|family|person/i)
  check('workspace switch invalidates old context and same principal cannot cross organization scope')

  result = await capture('partnerB','/v1/workspace-contexts',{
    method:'POST',body:{workspaceBindingId:fixtureIds.bindings.partnerBStaff}
  })
  const partnerBCookie = cookieToken(result.setCookie)
  result = await capture('partnerB','/v1/staff/projects',{cookie:partnerBCookie})
  assert.deepEqual(projectCodes(expectStatus(result,200)),['SYN_WS_PARTNER_B'])
  assert.equal((await capture('multi','/v1/staff/projects',{cookie:partnerBCookie})).response.status,403)
  check('second partner staff projection and bearer-to-cookie binding reject cross-principal reuse')

  result = await capture('multi','/v1/workspace-contexts',{
    method:'POST',body:{workspaceBindingId:fixtureIds.bindings.partnerA}
  })
  assert.equal((await capture('multi','/v1/staff/projects',{cookie:cookieToken(result.setCookie)})).response.status,403)
  result = await capture('multi','/v1/workspace-contexts',{
    method:'POST',body:{workspaceBindingId:fixtureIds.bindings.familyA}
  })
  assert.equal((await capture('multi','/v1/staff/projects',{cookie:cookieToken(result.setCookie)})).response.status,403)
  check('Partner and Family roles cannot inherit the Staff projection')

  result = await capture('partnerB','/v1/workspace-contexts',{
    method:'POST',body:{workspaceBindingId:fixtureIds.bindings.partnerBStaff}
  })
  const ticketCookie = cookieToken(result.setCookie)
  const tokenValue = ticketCookie.slice(ticketCookie.indexOf('=')+1)
  const identitySession = runtime.sessions.get(runtime.tokens.partnerB)
  const binderClient = await runtime.binder.connect()
  const appClient = await runtime.app.connect()
  try {
    const issued = await binderClient.query(
      "SELECT * FROM auth.issue_workspace_context_ticket($1,$2,$3,clock_timestamp()+interval '30 seconds',$4,$1)",
      [fixtureIds.principals.partnerB,sha256(identitySession.sessionRef),sha256(tokenValue),id(7001)]
    )
    assert.equal(issued.rows.length,1)
    await appClient.query('SET ROLE phoenix_canonical_workspace_reader')
    await appClient.query('SELECT auth.redeem_workspace_context_ticket($1,$2)',
      [issued.rows[0].ticket_id,fixtureIds.principals.partnerB])
    const projection = (await appClient.query(
      'SELECT service.read_staff_workspace_projects() AS value'
    )).rows[0].value
    assert.equal(projection.status,'ALLOW')
    assert.deepEqual(projectCodes(projection.data),['SYN_WS_PARTNER_B'])
    await appClient.query('SELECT auth.clear_workspace_context()')
    await expectDatabaseReject(() => appClient.query('SELECT auth.redeem_workspace_context_ticket($1,$2)',
      [issued.rows[0].ticket_id,fixtureIds.principals.partnerB]),/WORKSPACE_TICKET_INVALID_OR_ALREADY_USED/)
    const expiring = await binderClient.query(
      "SELECT * FROM auth.issue_workspace_context_ticket($1,$2,$3,clock_timestamp()+interval '300 milliseconds',$4,$1)",
      [fixtureIds.principals.partnerB,sha256(identitySession.sessionRef),sha256(tokenValue),id(7002)]
    )
    await new Promise((resolve) => setTimeout(resolve,500))
    await expectDatabaseReject(() => appClient.query('SELECT auth.redeem_workspace_context_ticket($1,$2)',
      [expiring.rows[0].ticket_id,fixtureIds.principals.partnerB]),/WORKSPACE_TICKET_INVALID_OR_ALREADY_USED/)
    await appClient.query('RESET ROLE')
    await appClient.query('DISCARD ALL')
    await binderClient.query('DISCARD ALL')
  } finally {
    appClient.release(true)
    binderClient.release(true)
  }
  check('separate LOGIN credentials enforce one-use, expiring workspace tickets')

  const permissionApp = new runtime.Pool(runtime.connection('workspace_test_app',passwords.app))
  const permissionBinder = new runtime.Pool(runtime.connection('workspace_test_binder',passwords.binder))
  try {
    await expectDatabaseReject(() => permissionApp.query('SELECT * FROM auth.workspace_sessions'),/permission denied/)
    await expectDatabaseReject(() => permissionApp.query('SELECT auth.list_available_workspaces($1,$2)',
      [fixtureIds.principals.multi,id(7100)]),/permission denied/)
    await expectDatabaseReject(() => permissionBinder.query('SELECT * FROM auth.workspace_role_bindings'),/permission denied/)
    await expectDatabaseReject(() => permissionBinder.query('SET ROLE phoenix_canonical_workspace_reader'),/permission denied/)
    const client = await permissionApp.connect()
    try {
      await client.query('SET ROLE phoenix_canonical_workspace_reader')
      await expectDatabaseReject(() => client.query("INSERT INTO audit.access_events(action) VALUES('FORGED')"),/permission denied/)
      await expectDatabaseReject(() => client.query('SET ROLE phoenix_canonical_app'),/permission denied/)
      await client.query('RESET ROLE')
    } finally { client.release(true) }
  } finally {
    await permissionApp.end(); await permissionBinder.end()
  }
  check('app and binder LOGINs cannot read tables, forge audit, invoke binder API or escalate roles')

  result = await capture('multi','/v1/workspace-contexts',{
    method:'POST',body:{workspaceBindingId:fixtureIds.bindings.partnerAStaff}
  })
  const disabledCookie = cookieToken(result.setCookie)
  assert.equal((await capture('multi','/v1/staff/projects',{cookie:disabledCookie})).response.status,200)
  asWorkspaceAdmin(db,`SELECT core.transition_organization_membership('${fixtureIds.memberships.partnerA}','DISABLED');`)
  assert.equal((await capture('multi','/v1/staff/projects',{cookie:disabledCookie})).response.status,403)
  const afterDisable = expectStatus(await capture('multi','/v1/me/workspaces'),200)
  assert.equal(afterDisable.workspaces.some((item) => [fixtureIds.bindings.partnerA,fixtureIds.bindings.partnerAStaff].includes(item.workspaceBindingId)),false)
  check('member deactivation immediately removes workspaces and invalidates its old context')

  result = await capture('multi','/v1/workspace-contexts',{
    method:'POST',body:{workspaceBindingId:fixtureIds.bindings.hqStaff}
  })
  const revokedCookie = cookieToken(result.setCookie)
  asWorkspaceAdmin(db,`SELECT auth.revoke_workspace_role('${fixtureIds.bindings.hqStaff}');`)
  assert.equal((await capture('multi','/v1/staff/projects',{cookie:revokedCookie})).response.status,403)
  const afterRevoke = expectStatus(await capture('multi','/v1/me/workspaces'),200)
  assert.equal(afterRevoke.workspaces.some((item) => item.workspaceBindingId===fixtureIds.bindings.hqStaff),false)
  assert.equal(afterRevoke.workspaces.some((item) => item.workspaceBindingId===fixtureIds.bindings.founder),true)
  check('role revocation invalidates only the revoked workspace while preserving independent roles')

  result = await capture('multi','/v1/workspace-contexts',{
    method:'POST',body:{workspaceBindingId:fixtureIds.bindings.founder}
  })
  const logoutCookie = cookieToken(result.setCookie)
  assert.equal((await capture('multi','/v1/workspace-contexts',{
    method:'DELETE',cookie:logoutCookie
  })).response.status,204)
  assert.equal((await capture('multi','/v1/staff/projects',{cookie:logoutCookie})).response.status,403)
  check('logout revokes the server-owned workspace session and clears the cookie')

  result = await capture('partnerB','/v1/workspace-contexts',{
    method:'POST',body:{workspaceBindingId:fixtureIds.bindings.partnerBStaff}
  })
  const staleCookie = cookieToken(result.setCookie)
  runtime.setIdentityActive('partnerB',false)
  assert.equal((await capture('partnerB','/v1/staff/projects',{cookie:staleCookie})).response.status,401)
  runtime.setIdentityActive('partnerB',true)
  check('trusted login session revocation is rechecked before every database projection')

  const legacyBinder = new runtime.Pool(runtime.connection('workspace_legacy_binder',passwords.legacyBinder))
  const legacyApp = new runtime.Pool(runtime.connection('workspace_legacy_app',passwords.legacyApp))
  try {
    const binder = await legacyBinder.connect()
    const app = await legacyApp.connect()
    try {
      await binder.query('SET ROLE phoenix_canonical_context_binder')
      const ticket = await binder.query(
        "SELECT auth.issue_context_ticket($1,$2,$3,'FAMILY',clock_timestamp()+interval '30 seconds',$4,$1) AS value",
        [fixtureIds.principals.multi,fixtureIds.people.multi,fixtureIds.families.a,id(7200)]
      )
      await app.query('SET ROLE phoenix_canonical_app')
      await app.query('SELECT auth.redeem_context_ticket($1,$2)',
        [ticket.rows[0].value,fixtureIds.principals.multi])
      assert.equal((await app.query('SELECT auth.current_family_id() AS value')).rows[0].value,fixtureIds.families.a)
      await app.query('SELECT auth.clear_context()')
      await app.query('RESET ROLE'); await binder.query('RESET ROLE')
    } finally { app.release(true); binder.release(true) }
  } finally { await legacyApp.end(); await legacyBinder.end() }
  check('existing Family OS one-use context flow remains compatible and independently scoped')

  assert(Number(db.sql("SELECT count(*) FROM audit.access_events WHERE resource_kind IN ('WORKSPACE','WORKSPACE_SESSION','STAFF_PROJECT_PROJECTION','WORKSPACE_ROLE','ORGANIZATION_MEMBERSHIP')"))>=20)
  assert.equal(db.sql('SELECT count(*) FROM auth.workspace_session_contexts'),'0')
  assert.equal(db.sql('SELECT count(*) FROM auth.workspace_context_tickets'),'0')
  check('allow and deny decisions are audited and no backend context or ticket remains')

  let atomicFailed = false
  try { db.sql("BEGIN; CREATE TABLE public.workspace_atomic_probe(value integer); SELECT 1/0; COMMIT;") }
  catch { atomicFailed = true }
  assert.equal(atomicFailed,true)
  assert.equal(db.sql("SELECT to_regclass('public.workspace_atomic_probe') IS NULL"),'t')
  check('synthetic migration failure rolls back atomically')

  db.call(['exec',db.container,'bash','-c',
    "printf '\\n-- synthetic drift probe\\n' >> /opt/canonical-migrations/0042_organization_workspace_authorization.sql"])
  let driftRefused = false
  try { db.migrate() } catch (error) { driftRefused = /DRIFT_REFUSED/.test(String(error.message)) }
  assert.equal(driftRefused,true)
  assert.equal(db.sql('SELECT count(*) FROM canonical_migrations.applied'),'38')
  db.call(['cp',path.join(process.cwd(),candidate),`${db.container}:/opt/canonical-migrations/0042_organization_workspace_authorization.sql`])
  assert(db.migrate().includes('SKIP 0042_organization_workspace_authorization.sql'))
  check('0042 checksum drift is refused and exact source restores repeat safety')

  record.status = 'PASS'
}

try {
  await run()
} catch (error) {
  record.status = 'FAIL'
  record.failure = { name:error?.name ?? 'Error', message:String(error?.message ?? error).slice(0,1200) }
  throw error
} finally {
  record.finishedAt = new Date().toISOString()
  if (runtime) {
    record.auditCallbacks = runtime.audits
    await runtime.close()
  }
  writeFileSync(path.join(output,'WORKSPACE_AUTH_ACCEPTANCE.json'),JSON.stringify(record,null,2)+'\n','utf8')
  if (db) db.cleanup()
}

console.log(`PASS workspace authorization acceptance PG${version}`)
