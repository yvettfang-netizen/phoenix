import { createHash, timingSafeEqual } from 'node:crypto'
import { lstat, readFile } from 'node:fs/promises'
import { isAbsolute } from 'node:path'
import { execFileSync } from 'node:child_process'
import { Pool } from 'pg'
import { AppError } from '../domain/errors'

export interface CourseCatalogItem {
  courseRef: string
  versionRef: string
  courseCode: string
  title: string
  versionNo: number
}
export interface LearningCatalog {
  authorize(authorization: string | undefined): void
  list(): Promise<{ schemaVersion: 'learning-catalog.v1'; items: CourseCatalogItem[] }>
  close(): Promise<void>
}
const unavailable = () => new AppError(503, 'CATALOG_UNAVAILABLE', '课程目录暂不可用')
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** A dedicated local synthetic preview. Never resolves a customer or family identity. */
export async function loadLearningCatalog(env: NodeJS.ProcessEnv = process.env): Promise<LearningCatalog | undefined> {
  if (env.CANONICAL_LEARNING_CATALOG_ENABLED !== 'true') return undefined
  if (!['development', 'test'].includes(env.NODE_ENV ?? 'development') ||
      (env.LISTEN_HOST ?? '127.0.0.1') !== '127.0.0.1') throw unavailable()
  const file = env.CANONICAL_CATALOG_CONFIG_FILE ?? ''
  if (!isAbsolute(file)) throw unavailable()
  if (process.platform === 'win32') {
    const aclCheck = '$a=Get-Acl -LiteralPath $env:CATALOG_CHECK_FILE; $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value; $ok=@($sid,"S-1-5-18","S-1-5-32-544"); $bad=@($a.Access | Where-Object {$_.AccessControlType -eq "Allow" -and $_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin $ok}); if($bad.Count -gt 0){exit 1}'
    try { execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', aclCheck], {
      env: { ...process.env, CATALOG_CHECK_FILE: file }, stdio: 'ignore', windowsHide: true, timeout: 5000
    }) } catch { throw unavailable() }
  }
  const info = await lstat(file)
  if (!info.isFile() || info.isSymbolicLink() || info.size > 8192 ||
      (process.platform !== 'win32' && (info.mode & 0o077) !== 0)) throw unavailable()
  const config = JSON.parse(await readFile(file, 'utf8')) as Record<string, unknown>
  if (Object.keys(config).sort().join(',') !== 'database,host,password,port,serviceToken,user' ||
      config.host !== '127.0.0.1' || config.database !== 'phoenix_canonical_dev' ||
      !Number.isInteger(config.port) || Number(config.port) < 1 || Number(config.port) > 65535 ||
      typeof config.user !== 'string' || !/^[a-z][a-z0-9_]{0,62}$/.test(config.user) ||
      typeof config.password !== 'string' || config.password.length < 32 ||
      typeof config.serviceToken !== 'string' || !/^[a-f0-9]{64}$/.test(config.serviceToken)) throw unavailable()
  const tokenHash = createHash('sha256').update(config.serviceToken).digest()
  const pool = new Pool({ host: config.host, port: Number(config.port), database: config.database,
    user: config.user, password: config.password, max: 2, connectionTimeoutMillis: 1500,
    idleTimeoutMillis: 3000, statement_timeout: 2000, application_name: 'canonical_catalog_preview' })
  pool.on('error', () => { /* Request failures are returned without logging connection details. */ })
  return {
    authorize(authorization) {
      const token = authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1] ?? ''
      if (!timingSafeEqual(createHash('sha256').update(token).digest(), tokenHash)) {
        throw new AppError(401, 'CATALOG_ACCESS_REQUIRED', '课程目录访问未授权')
      }
    },
    async list() {
      const client = await pool.connect().catch(() => { throw unavailable() })
      let reusable = false
      try {
        await client.query('BEGIN READ ONLY')
        // Reject privileged/application logins instead of silently reusing their credentials.
        const check = await client.query(`SELECT NOT (r.rolsuper OR r.rolcreaterole OR r.rolcreatedb
          OR r.rolreplication OR r.rolbypassrls OR r.rolinherit)
          AND NOT EXISTS (SELECT FROM pg_auth_members WHERE member=r.oid)
          AND has_schema_privilege(current_user,'learning','USAGE')
          AND has_function_privilege(current_user,'learning.list_published_courses()','EXECUTE')
          AND NOT EXISTS (SELECT FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace
            WHERE n.nspname IN ('auth','core','consent','audit','integration','docs','casework',
              'learning','crm','service','education','identity','operations_ref')
            AND t.relkind IN ('r','p','v','m','f')
            AND has_table_privilege(current_user,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) AS allowed
          FROM pg_roles r WHERE r.rolname=current_user`)
        if (check.rows[0]?.allowed !== true) throw unavailable()
        const result = await client.query(`SELECT course_id,course_version_id,course_code,title,version_no
          FROM learning.list_published_courses() ORDER BY course_code,version_no LIMIT 201`)
        if (result.rows.length > 200) throw unavailable()
        const items = result.rows.map((row): CourseCatalogItem => {
          if (!uuid.test(row.course_id) || !uuid.test(row.course_version_id) ||
              typeof row.course_code !== 'string' || row.course_code.length > 60 ||
              typeof row.title !== 'string' || row.title.length > 300 ||
              !Number.isInteger(row.version_no) || row.version_no < 1) throw unavailable()
          return { courseRef: row.course_id, versionRef: row.course_version_id,
            courseCode: row.course_code, title: row.title, versionNo: row.version_no }
        })
        await client.query('COMMIT')
        await client.query('DISCARD ALL')
        reusable = true
        return { schemaVersion: 'learning-catalog.v1', items }
      } catch {
        throw unavailable()
      } finally {
        client.release(!reusable)
      }
    },
    close: () => pool.end()
  }
}
