import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { lstatSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

export const candidate = 'database/canonical/forward-candidates/workspace-authorization/0042_organization_workspace_authorization.sql'
export const id = (value) => `01942000-0000-7000-8000-${Number(value).toString(16).padStart(12, '0')}`

function protect(file) {
  if (process.platform !== 'win32') return
  const sid = spawnSync('whoami', ['/user', '/fo', 'csv', '/nh'], {
    encoding: 'utf8', windowsHide: true
  }).stdout.match(/S-1-5-[0-9-]+/)?.[0]
  assert(sid)
  const rights = lstatSync(file).isDirectory() ? '(OI)(CI)F' : 'F'
  assert.equal(spawnSync('icacls.exe', [file, '/inheritance:r', '/grant:r', `*${sid}:${rights}`], {
    stdio: 'ignore', windowsHide: true
  }).status, 0)
}

export async function createCluster(version, { initialize = true, suffix = 'fresh' } = {}) {
  assert(['16', '17'].includes(version))
  const root = process.cwd()
  const nonce = randomBytes(8).toString('hex')
  const work = mkdtempSync(path.join(tmpdir(), 'canonical-workspace-auth-'))
  protect(work)
  const context = process.env.DOCKER_CONTEXT || (process.platform === 'win32' ? 'desktop-linux' : 'default')
  const redact = (value) => String(value).replace(/[A-Za-z0-9_=-]{32,}/g, '[REDACTED]')
  const call = (args, input) => {
    const result = spawnSync('docker', ['--context', context, ...args], {
      input, encoding: 'utf8', windowsHide: true, maxBuffer: 16e6
    })
    if (result.status !== 0) {
      throw new Error(`Owned Docker ${args[0]} failed: ${redact(result.stderr + result.stdout).slice(-2200)}`)
    }
    return result.stdout.trim()
  }
  const endpoint = call(['context', 'inspect', context, '--format', '{{.Endpoints.docker.Host}}'])
  assert(/^(npipe:|unix:)/.test(endpoint), 'Local Docker socket required')
  const password = randomBytes(32).toString('hex')
  const envFile = path.join(work, 'postgres.env')
  writeFileSync(envFile, [
    'POSTGRES_DB=phoenix_canonical_dev',
    'POSTGRES_USER=phoenix_bootstrap',
    `POSTGRES_PASSWORD=${password}`,
    'POSTGRES_INITDB_ARGS=--auth-local=scram-sha-256 --auth-host=scram-sha-256',
    ''
  ].join('\n'), { mode: 0o600, flag: 'wx' })
  protect(envFile)
  const images = {
    16: 'postgres:16@sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d',
    17: 'postgres:17@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3'
  }
  const name = `workspace-auth-${suffix}-pg${version}-${nonce}`
  const container = call([
    'run', '-d', '--name', name,
    '--label', `canonical.workspace-auth.test=${nonce}`,
    '-p', '127.0.0.1::5432', '--env-file', envFile, images[version]
  ])
  assert.match(container, /^[a-f0-9]{64}$/)
  const sql = (text) => call([
    'exec', '-i', '-e', 'PGPASSFILE=/tmp/canonical-workspace.pgpass', container,
    'psql', '-X', '-q', '-At', '-h', '127.0.0.1', '-U', 'phoenix_bootstrap',
    '-d', 'phoenix_canonical_dev', '-v', 'ON_ERROR_STOP=1'
  ], text)
  call(['exec', container, 'bash', '-c',
    'umask 077; printf \'127.0.0.1:5432:*:phoenix_bootstrap:%s\\n\' "$POSTGRES_PASSWORD" > /tmp/canonical-workspace.pgpass'])
  let ready = false
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if (sql('SELECT 1') === '1') { ready = true; break }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  assert(ready, 'Owned cluster readiness timed out')
  const port = Number(call(['port', container, '5432/tcp']).split(':').at(-1))
  const ownedWork = realpathSync(work)
  const cleanup = () => {
    assert.equal(call(['inspect', '--format', '{{index .Config.Labels "canonical.workspace-auth.test"}}', container]), nonce)
    assert.equal(realpathSync(work), ownedWork)
    assert.equal(path.dirname(ownedWork).toLowerCase(), realpathSync(tmpdir()).toLowerCase())
    assert(path.basename(ownedWork).startsWith('canonical-workspace-auth-'))
    call(['rm', '-f', '-v', container])
    rmSync(ownedWork, { recursive: true })
    console.log('PASS owned workspace-auth cluster and private fixture directory cleaned')
  }
  const migrate = () => call([
    'exec', '-e', 'CANONICAL_EXPECTED_MIGRATIONS=38', container,
    'bash', '/opt/verification/migrate.sh'
  ])
  try {
    call(['exec', container, 'mkdir', '-p', '/opt/canonical-migrations', '/opt/verification'])
    call(['cp', `${path.join(root, 'database/canonical/migrations')}/.`, `${container}:/opt/canonical-migrations`])
    call(['cp', path.join(root, candidate), `${container}:/opt/canonical-migrations/0042_organization_workspace_authorization.sql`])
    call(['cp', path.join(root, 'database/canonical/verification/migrate.sh'), `${container}:/opt/verification/migrate.sh`])
    if (initialize) {
      const initialized = migrate()
      assert(initialized.includes('APPLIED 0042_organization_workspace_authorization.sql'))
      assert(initialized.includes('PASS ledger=38 files=38 expected=38'))
      console.log(initialized)
      assert(migrate().includes('SKIP 0042_organization_workspace_authorization.sql'))
      console.log('PASS migration repeat and ledger=38 with reserved candidate gaps preserved')
    }
    return {
      container, port, nonce, work, call, sql, migrate, cleanup, version,
      candidateSha: createHash('sha256').update(readFileSync(candidate)).digest('hex')
    }
  } catch (error) {
    cleanup()
    throw error
  }
}
