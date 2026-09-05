'use strict'

// Candidate-bound local evidence. Exit 0 from a skipped DB wrapper is NOT PASS.
const fs = require('node:fs')
const path = require('node:path')
const cp = require('node:child_process')
const crypto = require('node:crypto')
const root = path.resolve(__dirname, '..')
const jsonLines = text => text.split(/\r?\n/).flatMap(line => { try { return [JSON.parse(line)] } catch { return [] } })

function classifyResult(name, exitCode, output) {
  const entries = jsonLines(output)
  const skipped = /(?:^|\n)(?:ℹ |# )?skipped?\s+[1-9]\d*/i.test(output) || /#\s+SKIP\b/i.test(output)
  const blocked = entries.some(item => item.status === 'BLOCKED_EXTERNAL') || /BLOCKED_EXTERNAL/.test(output)
  if (exitCode !== 0 && !(name === 'environment' && blocked) || /(?:^|\n)(?:ℹ |# )?fail\s+[1-9]\d*/i.test(output)) return 'FAIL'
  if (blocked || skipped) return 'BLOCKED_EXTERNAL'
  if (name === 'masters-postgres') {
    return entries.some(item => item.suite === 'masters-postgres' && item.status === 'PASS' && item.databaseConnectionAttempted === true && item.httpFlow === 'PASS') ? 'PASS' : 'BLOCKED_EXTERNAL'
  }
  if (name === 'education-postgres') return entries.some(item => item.status === 'PASS') ? 'PASS' : 'BLOCKED_EXTERNAL'
  if (name === 'release-build') return /OFFLINE_TEST_ONLY/.test(output) ? 'OFFLINE_TEST_ONLY' : 'FAIL'
  if (name === 'environment') return 'CONFIGURATION_CHECK_ONLY'
  return 'PASS'
}

function sanitized(text, env) {
  let result = text
  for (const [key, value] of Object.entries(env)) {
    if (value && value.length >= 6 && /SECRET|TOKEN|PASSWORD|DATABASE_URL|PRIVATE_STORAGE_DIR|_KEY$|_FONT_PATH$/.test(key)) result = result.split(value).join('[REDACTED]')
  }
  return result
}

function npmCommand(args) {
  if (process.platform !== 'win32') return { executable: 'npm', args }
  return { executable: process.execPath, args: [path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'), ...args] }
}

async function main() {
  const git = (...args) => cp.execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
  const headSha = git('rev-parse', 'HEAD')
  if (git('status', '--porcelain')) throw new Error('COMMIT_REQUIRED: candidate evidence requires a clean committed worktree')
  const startedAt = new Date().toISOString()
  const packageBytes = fs.readFileSync(path.join(root, 'package.json'))
  const serverPackageBytes = fs.readFileSync(path.join(root, 'server/package.json'))
  const npmVersionCommand = npmCommand(['--version'])
  const npmVersion = cp.execFileSync(npmVersionCommand.executable, npmVersionCommand.args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim()
  const directory = path.join(root, 'outputs', 'masters-round2', headSha)
  fs.mkdirSync(directory, { recursive: true })
  const commands = [
    ['all-regression', npmCommand(['run', 'test:all'])],
    ['workbench-browser', { executable: process.execPath, args: ['scripts/test-masters-workbench.js'] }],
    ['release-contract', npmCommand(['run', 'test:release'])],
    ['secret-scan', npmCommand(['run', 'scan:release-secrets'])],
    ['education-postgres', npmCommand(['run', 'test:education-postgres'])],
    ['masters-postgres', npmCommand(['run', 'test:masters-postgres'])],
    ['release-build', npmCommand(['run', 'build:release'])],
    ['environment', { executable: process.execPath, args: ['scripts/check-masters-test-environment.js'] }]
  ]
  const results = []
  for (const [name, command] of commands) {
    process.stdout.write(JSON.stringify({ suite: name, state: 'RUNNING', headSha }) + '\n')
    const run = cp.spawnSync(command.executable, command.args, { cwd: root, env: process.env, encoding: 'utf8', windowsHide: true, shell: false, timeout: 180_000, maxBuffer: 8 * 1024 * 1024 })
    const output = sanitized((run.stdout || '') + (run.stderr || '') + (run.error ? '\nPROCESS_FAILED_OR_TIMED_OUT' : ''), process.env)
    const status = classifyResult(name, run.status ?? 1, output)
    const logPath = path.join(directory, name + '.log')
    fs.writeFileSync(logPath, output, { mode: 0o600 })
    const result = { suite: name, status, exitCode: run.status, command: command.args.join(' '), headSha, logSha256: crypto.createHash('sha256').update(output).digest('hex') }
    if (name === 'all-regression') {
      const count = [...output.matchAll(/(?:ℹ |# )?tests\s+(\d+)/g)].at(-1)
      result.serverTests = count ? Number(count[1]) : null
      result.sourcedAssistedPlan = /(?:[✔✓]|^ok \d+ -).*sourced assisted plan binds/m.test(output) ? 'PASS' : 'NOT_VERIFIED'
    }
    results.push(result)
    process.stdout.write(JSON.stringify({ suite: name, status, exitCode: run.status }) + '\n')
  }
  const unchanged = git('rev-parse', 'HEAD') === headSha && !git('status', '--porcelain')
  const summary = {
    schemaVersion: 1, requestHeadSha: '29df2358718232294dcda4af9f2410fd0b32aab6', headSha,
    treeSha: git('rev-parse', 'HEAD^{tree}'), startedAt, finishedAt: new Date().toISOString(), unchanged,
    runtime: { node: process.version, npm: npmVersion, platform: process.platform, arch: process.arch },
    packages: {
      client: { version: JSON.parse(packageBytes).version, sha256: crypto.createHash('sha256').update(packageBytes).digest('hex') },
      server: { version: JSON.parse(serverPackageBytes).version, sha256: crypto.createHash('sha256').update(serverPackageBytes).digest('hex') }
    },
    status: !unchanged || results.some(item => item.status === 'FAIL') ? 'NEEDS_FIX' : 'BLOCKED',
    results,
    externalAcceptance: {
      wechatDeveloperTools: 'BLOCKED_EXTERNAL', iosRealWechatSession: 'BLOCKED_EXTERNAL', androidRealWechatSession: 'BLOCKED_EXTERNAL',
      deploymentStorageAclEncryptionAndRestore: 'BLOCKED_EXTERNAL',
      note: 'These require Jimson-provided environment and individually reviewed real-device/host evidence; local tests cannot mark them PASS.'
    },
    autoSchoolMatching: 'NOT_IMPLEMENTED', ci: 'NOT_RUN', merged: false, productionDeployed: false, realStudentDataEnabled: false
  }
  const summaryPath = path.join(directory, 'summary.json')
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n', { mode: 0o600 })
  process.stdout.write(JSON.stringify({ status: summary.status, headSha, evidence: path.relative(root, summaryPath), founderUatReady: false }) + '\n')
  process.exitCode = 2 // This local-only run cannot clear the real-device/host P0 gates.
}

if (require.main === module) main().catch(error => { process.stderr.write(JSON.stringify({ status: 'NEEDS_FIX', reason: sanitized(error.message, process.env) }) + '\n'); process.exitCode = 1 })
module.exports = { classifyResult, sanitized }
