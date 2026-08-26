'use strict'

const { spawnSync } = require('node:child_process')

const databaseUrl = process.env.EDUCATION_TEST_DATABASE_URL || ''
const mutationApproved = process.env.EDUCATION_TEST_DATABASE_ALLOW_MUTATION === 'YES'

function blocked(reason) {
  process.stdout.write(`${JSON.stringify({ status: 'BLOCKED_EXTERNAL', suite: 'education-postgres', reason })}\n`)
}

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { stdio: 'inherit', env, shell: false })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

if (!databaseUrl) {
  blocked('EDUCATION_TEST_DATABASE_URL is not configured; no database connection was attempted')
  process.exit(0)
}
if (!mutationApproved) {
  blocked('EDUCATION_TEST_DATABASE_ALLOW_MUTATION=YES is required because migrations modify the dedicated test database')
  process.exit(0)
}

let parsed
try {
  parsed = new URL(databaseUrl)
} catch {
  process.stderr.write('EDUCATION_TEST_DATABASE_URL is not a valid URL\n')
  process.exit(2)
}
if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
  process.stderr.write('EDUCATION_TEST_DATABASE_URL must use postgres:// or postgresql://\n')
  process.exit(2)
}
const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
if (!/(?:test|testing|ci|sandbox|phoenix_v05_verification)/i.test(databaseName)) {
  process.stderr.write('Refusing mutation: dedicated database name must contain test, testing, ci, sandbox, or phoenix_v05_verification\n')
  process.exit(2)
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
run(npmCommand, ['--prefix', 'server', 'run', 'build'])
run(npmCommand, ['--prefix', 'server', 'run', 'db:migrate'], { ...process.env, DATABASE_URL: databaseUrl })
run(process.execPath, ['scripts/verify-education-postgres-schema.js'], {
  ...process.env,
  DATABASE_URL: databaseUrl
})
