import { execFileSync } from 'node:child_process'
import { lstat, readFile } from 'node:fs/promises'
import { isAbsolute } from 'node:path'
import { Pool, PoolClient, PoolConfig } from 'pg'
import { AppError } from '../domain/errors'
import { createSyntheticFamilyVerifier } from '../auth/synthetic-family-identity'

export type ProjectionOperation = 'family' | 'students' | 'student'
export interface ProjectionAudit { requestId: string; operation: ProjectionOperation; decision: 'ALLOW' | 'DENY' | 'UNAVAILABLE' }
export interface FamilyProjection {
  read(authorization: string | undefined, operation: ProjectionOperation, studentRef: string | undefined, requestId: string): Promise<unknown>
  close(): Promise<void>
}
const unavailable = () => new AppError(503, 'FAMILY_PROJECTION_UNAVAILABLE', '家庭资料暂不可用')
const denied = () => new AppError(403, 'FAMILY_SCOPE_REQUIRED', '家庭资料访问未授权')
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-7[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const publicStudent = /^stu_[a-f0-9]{32}$/

function auditedDto(value: unknown, operation: ProjectionOperation, studentRef?: string): unknown {
  const v = value as Record<string, unknown>
  const name = (x: unknown) => typeof x === 'string' && x.length > 0 && x.length <= 200
  const student = (x: unknown) => { const s = x as Record<string, unknown>; return s && Object.keys(s).sort().join(',') === 'displayName,studentRef' && typeof s.studentRef === 'string' && publicStudent.test(s.studentRef) && name(s.displayName) }
  if (!v || typeof v !== 'object') throw unavailable()
  if (operation === 'family') {
    const f = v.family as Record<string, unknown>
    if (Object.keys(v).sort().join(',') !== 'family,schemaVersion' || v.schemaVersion !== 'family-summary.v2' || !f ||
        Object.keys(f).sort().join(',') !== 'displayName,familyRef' || typeof f.familyRef !== 'string' || !/^fam_[a-f0-9]{32}$/.test(f.familyRef) || !name(f.displayName)) throw unavailable()
  } else if (operation === 'student') {
    if (Object.keys(v).sort().join(',') !== 'item,schemaVersion' || v.schemaVersion !== 'student-summary.v2' || !student(v.item) || (v.item as Record<string,unknown>).studentRef !== studentRef) throw unavailable()
  } else if (Object.keys(v).sort().join(',') !== 'items,schemaVersion' || v.schemaVersion !== 'student-summary.v2' || !Array.isArray(v.items) || v.items.length > 100 || !v.items.every(student) ||
    new Set(v.items.map((x: {studentRef:string}) => x.studentRef)).size !== v.items.length) throw unavailable()
  return v
}

async function guardAuditedRole(client: PoolClient): Promise<void> {
  const role = 'phoenix_canonical_projection_reader'
  const r = await client.query(`SELECT NOT (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls OR rolinherit)
    AND pg_has_role(session_user,$1,'MEMBER')
    AND EXISTS(SELECT FROM pg_roles target WHERE target.rolname=$1 AND NOT(target.rolsuper OR target.rolcreaterole OR target.rolcreatedb OR target.rolreplication OR target.rolbypassrls OR target.rolcanlogin OR target.rolinherit))
    AND NOT EXISTS(SELECT FROM pg_auth_members m WHERE m.member=r.oid AND m.roleid<>$1::regrole)
    AND NOT EXISTS(SELECT FROM pg_auth_members m WHERE m.member=$1::regrole)
    AND NOT EXISTS(SELECT FROM pg_roles other WHERE other.rolname IN ('phoenix_canonical_reader','phoenix_canonical_app','phoenix_canonical_context_binder','phoenix_canonical_migrator')
      AND (pg_has_role(session_user,other.oid,'MEMBER') OR pg_has_role($1,other.oid,'MEMBER')))
    AND NOT EXISTS(SELECT FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%'
        AND t.relkind IN ('r','p','v','m','f') AND (has_table_privilege(session_user,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
          OR has_table_privilege($1,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')))
    AND NOT EXISTS(SELECT FROM pg_namespace n WHERE n.nspname IN ('auth','core','integration','audit','public') AND (has_schema_privilege(session_user,n.oid,'CREATE') OR has_schema_privilege($1,n.oid,'CREATE')))
    AND NOT EXISTS(SELECT FROM pg_class s WHERE s.relkind='S' AND s.relnamespace='audit'::regnamespace AND (has_sequence_privilege(session_user,s.oid,'USAGE,UPDATE') OR has_sequence_privilege($1,s.oid,'USAGE,UPDATE')))
    AND NOT EXISTS(SELECT FROM pg_proc f JOIN pg_namespace n ON n.oid=f.pronamespace
      WHERE n.nspname IN ('auth','audit','core','integration') AND f.proname IN ('issue_context_ticket','issue_application_family_context_ticket','record_access_event','record_write_decision','read_projection_summary','lookup_projection_public_id')
        AND (has_function_privilege(session_user,f.oid,'EXECUTE') OR has_function_privilege($1,f.oid,'EXECUTE'))) AS allowed
    FROM pg_roles r WHERE rolname=session_user`, [role])
  if (r.rows[0]?.allowed !== true) throw unavailable()
  await client.query('SET ROLE phoenix_canonical_projection_reader')
}

async function protectedJson(file: string): Promise<Record<string, unknown>> {
  if (!isAbsolute(file)) throw unavailable()
  const info = await lstat(file)
  if (!info.isFile() || info.isSymbolicLink() || info.size > 16000 || (process.platform !== 'win32' && (info.mode & 0o077) !== 0)) throw unavailable()
  if (process.platform === 'win32') {
    const check = '$a=Get-Acl -LiteralPath $env:FAMILY_CHECK_FILE; $s=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value; $ok=@($s,"S-1-5-18","S-1-5-32-544"); if(@($a.Access|Where-Object {$_.AccessControlType -eq "Allow" -and $_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin $ok}).Count){exit 1}'
    try { execFileSync('powershell.exe', ['-NoProfile','-NonInteractive','-Command',check], {
      env: { ...process.env, FAMILY_CHECK_FILE: file }, stdio: 'ignore', windowsHide: true, timeout: 5000
    }) } catch { throw unavailable() }
  }
  return JSON.parse(await readFile(file, 'utf8')) as Record<string, unknown>
}
function connection(value: Record<string, unknown>): PoolConfig {
  if (Object.keys(value).sort().join(',') !== 'database,host,password,port,user' || value.host !== '127.0.0.1' ||
      value.database !== 'phoenix_canonical_dev' || !Number.isInteger(value.port) || Number(value.port) < 1 || Number(value.port) > 65535 ||
      typeof value.user !== 'string' || !/^[a-z][a-z0-9_]{0,62}$/.test(value.user) ||
      typeof value.password !== 'string' || value.password.length < 32) throw unavailable()
  return { ...value, max: 1, connectionTimeoutMillis: 1500, query_timeout: 3000, statement_timeout: 2000, idleTimeoutMillis: 2000 } as PoolConfig
}
async function guardRole(client: PoolClient, binder: boolean): Promise<void> {
  const r = await client.query(`SELECT NOT (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls OR rolinherit)
    AND NOT EXISTS (SELECT FROM pg_auth_members m WHERE m.member=r.oid
      AND ($1::boolean OR m.roleid<>'phoenix_canonical_reader'::regrole))
    AND NOT pg_has_role(session_user,'phoenix_canonical_app','MEMBER')
    AND NOT pg_has_role(session_user,'phoenix_canonical_context_binder','MEMBER')
    AND ($1::boolean OR pg_has_role(session_user,'phoenix_canonical_reader','MEMBER'))
    AND has_function_privilege(session_user,
      CASE WHEN $1::boolean THEN 'auth.issue_application_family_context_ticket(text,text,text,timestamp with time zone,uuid)'
      ELSE 'auth.redeem_context_ticket(uuid,uuid)' END,'EXECUTE')
    AND NOT has_function_privilege(session_user,'auth.issue_context_ticket(uuid,uuid,uuid,text,timestamp with time zone,uuid,uuid)','EXECUTE')
    AND ($1::boolean OR NOT has_function_privilege(session_user,'auth.issue_application_family_context_ticket(text,text,text,timestamp with time zone,uuid)','EXECUTE'))
    AND NOT EXISTS (SELECT FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname IN ('auth','core','consent','audit','integration','docs','casework','learning','crm','service','education','identity','operations_ref')
        AND t.relkind IN ('r','p','v','m','f') AND has_table_privilege(session_user,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) AS allowed
    FROM pg_roles r WHERE rolname=session_user`, [binder])
  if (r.rows[0]?.allowed !== true) throw unavailable()
}

export async function loadFamilyProjection(env: NodeJS.ProcessEnv = process.env,
  audit: (event: ProjectionAudit) => void = event => console.info('canonical_family_projection', JSON.stringify(event))): Promise<FamilyProjection | undefined> {
  if (env.CANONICAL_FAMILY_PROJECTION_ENABLED !== 'true') return undefined
  const audited = env.CANONICAL_FAMILY_PROJECTION_AUDITED_ENABLED === 'true'
  if (!['development','test'].includes(env.NODE_ENV ?? 'development') || (env.LISTEN_HOST ?? '127.0.0.1') !== '127.0.0.1') throw unavailable()
  const appConfig = connection(await protectedJson(env.CANONICAL_FAMILY_APP_CONFIG_FILE ?? ''))
  const binderConfig = connection(await protectedJson(env.CANONICAL_FAMILY_BINDER_CONFIG_FILE ?? ''))
  if (appConfig.user === binderConfig.user || appConfig.password === binderConfig.password || appConfig.port !== binderConfig.port) throw unavailable()
  const verify = createSyntheticFamilyVerifier(await protectedJson(env.CANONICAL_FAMILY_IDENTITY_CONFIG_FILE ?? ''))
  const appPool = new Pool({ ...appConfig, application_name: 'synthetic_family_projection_reader' })
  const binderPool = new Pool({ ...binderConfig, application_name: 'synthetic_family_projection_binder' })
  appPool.on('error', () => {}); binderPool.on('error', () => {})
  // A backend can disappear while a client is checked out, between queries.
  // Query rejection/cleanup still fails the request closed; the event must not terminate Node.
  for (const pool of [appPool, binderPool]) pool.on('connect', client => client.on('error', () => {}))
  return {
    async read(authorization, operation, studentRef, requestId) {
      let app: PoolClient | undefined, binder: PoolClient | undefined
      let appClean = false, binderClean = false
      let result: unknown, error: unknown
      try {
        const identity = verify(authorization)
        if (!['family','students','student'].includes(operation) || (operation === 'student' && !(audited ? publicStudent : uuid).test(studentRef ?? ''))) throw denied()
        app = await appPool.connect()
        if (audited) await guardAuditedRole(app)
        else await guardRole(app, false)
        await app.query('SELECT auth.clear_context()')
        binder = await binderPool.connect()
        await guardRole(binder, true)
        const expires = new Date(Math.min(identity.exp * 1000, Date.now() + 15000))
        const resolution = await binder.query(`SELECT * FROM auth.issue_application_family_context_ticket($1,$2,$3,$4,$5)`,
          [identity.iss, identity.sub, identity.application_family_id, expires, requestId])
        if (resolution.rows.length !== 1) throw denied()
        const context = resolution.rows[0]
        await binder.query('DISCARD ALL'); binderClean = true
        await app.query('SELECT auth.redeem_context_ticket($1,$2)', [context.ticket_id, context.principal_id])
        const trace = await app.query('SELECT auth.current_request_nonce()=$1::uuid AS allowed', [requestId])
        if (trace.rows[0]?.allowed !== true) throw denied()
        if (audited) {
          await app.query('BEGIN')
          // DISCARD ALL resets startup GUCs; reapply the statement bound for every transaction.
          await app.query("SET LOCAL statement_timeout='2s'")
          const query = operation === 'family' ? 'SELECT core.read_family_summary() AS result'
            : operation === 'students' ? 'SELECT core.list_student_summaries() AS result' : 'SELECT core.read_student_summary($1) AS result'
          const response = await app.query(query, operation === 'student' ? [studentRef] : [])
          const envelope = response.rows[0]?.result
          if (!envelope || Object.keys(envelope).sort().join(',') !== 'data,status' || !['ALLOW','NOT_FOUND','DENY','UNAVAILABLE'].includes(envelope.status)) throw unavailable()
          if (envelope.status === 'ALLOW') result = auditedDto(envelope.data, operation, studentRef)
          else if (envelope.data !== null) throw unavailable()
          // Commit denial decisions as well; no HTTP response leaves this method before cleanup.
          await app.query('COMMIT')
          if (envelope.status === 'NOT_FOUND') throw new AppError(404, 'PROJECTION_NOT_FOUND', '资料不存在或不可访问')
          if (envelope.status === 'DENY') throw denied()
          if (envelope.status === 'UNAVAILABLE') throw unavailable()
        } else {
        await app.query('SET ROLE phoenix_canonical_reader')
        await app.query('BEGIN READ ONLY')
        const bound = await app.query(`SELECT auth.current_family_id()=$1::uuid AND auth.current_principal_id()=$2::uuid
          AND auth.current_actor_person_id()=$3::uuid AND auth.current_channel()='FAMILY'
          AND core.current_actor_is_family_member() AS allowed`,
          [context.family_id, context.principal_id, context.actor_person_id])
        if (bound.rows[0]?.allowed !== true) throw denied()
        const family = await app.query(`SELECT family_id,display_name FROM core.families WHERE family_id=auth.current_family_id()`)
        if (family.rows.length !== 1) throw denied()
        const row = family.rows[0]
        if (!uuid.test(row.family_id) || typeof row.display_name !== 'string' || row.display_name.length > 200) throw unavailable()
        if (operation === 'family') {
          result = { schemaVersion: 'family-summary.v1', family: { familyRef: row.family_id, displayName: row.display_name } }
        } else {
          const students = await app.query(`SELECT s.person_id,p.display_name FROM core.student_profiles s
            JOIN core.people p ON p.person_id=s.person_id
            JOIN core.family_memberships fm ON fm.person_id=s.person_id AND fm.family_id=auth.current_family_id()
            WHERE fm.valid_from<=clock_timestamp() AND (fm.valid_until IS NULL OR fm.valid_until>clock_timestamp())
              AND (s.person_id=auth.current_actor_person_id() OR core.has_verified_guardian_authority(s.person_id,'EDUCATION'))
              AND ($1::uuid IS NULL OR s.person_id=$1::uuid) ORDER BY s.person_id LIMIT 101`, [studentRef ?? null])
          if (students.rows.length > 100) throw unavailable()
          const items = students.rows.map(s => {
            if (!uuid.test(s.person_id) || typeof s.display_name !== 'string' || s.display_name.length > 200) throw unavailable()
            return { studentRef: s.person_id, displayName: s.display_name }
          })
          if (operation === 'student' && items.length !== 1) throw new AppError(404, 'PROJECTION_NOT_FOUND', '资料不存在或不可访问')
          result = operation === 'student' ? { schemaVersion: 'student-summary.v1', item: items[0] } : { schemaVersion: 'student-summary.v1', items }
        }
        await app.query('COMMIT')
        }
        if (Date.now() >= expires.getTime()) throw denied()
      } catch (caught) {
        error = caught instanceof AppError ? caught : unavailable()
      } finally {
        if (binder) binder.release(!binderClean)
        if (app) {
          try {
            await app.query('ROLLBACK'); await app.query('RESET ROLE')
            if (audited) await app.query('SET ROLE phoenix_canonical_projection_reader')
            await app.query('SELECT auth.clear_context()')
            if (!audited) await app.query('SET ROLE phoenix_canonical_reader')
            const clean = await app.query('SELECT auth.current_family_id() IS NULL AND auth.current_principal_id() IS NULL AS clean')
            if (clean.rows[0]?.clean !== true) throw unavailable()
            await app.query('RESET ROLE'); await app.query('DISCARD ALL'); appClean = true
          } catch { error = unavailable() }
          app.release(!appClean)
        }
      }
      try { audit({ requestId, operation, decision: error ? (error instanceof AppError && error.status < 500 ? 'DENY' : 'UNAVAILABLE') : 'ALLOW' }) }
      catch { throw unavailable() }
      if (error) throw error
      return result
    },
    close: async () => { await Promise.all([appPool.end(), binderPool.end()]) }
  }
}
