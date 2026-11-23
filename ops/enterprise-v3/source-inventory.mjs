#!/usr/bin/env node
/** Read-only source receipt. This never connects to or migrates a database. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const baseline = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(baseline ?? '')) {
  throw new Error('Usage: node ops/enterprise-v3/source-inventory.mjs <verified-full-base-sha>');
}
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
git('cat-file', '-e', `${baseline}^{commit}`);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const migrationRoot = 'database/canonical/migrations';
const expected = git('ls-tree', '-r', '--name-only', baseline, '--', migrationRoot)
  .trim().split('\n').filter(name => name.endsWith('.sql')).sort();
const actual = readdirSync(path.join(root, migrationRoot), { withFileTypes: true })
  .filter(entry => entry.name.endsWith('.sql'))
  .map(entry => {
    if (!entry.isFile()) throw new Error(`NON_REGULAR_MIGRATION: ${entry.name}`);
    return `${migrationRoot}/${entry.name}`;
  }).sort();
if (JSON.stringify(actual) !== JSON.stringify(expected) || actual.length === 0) {
  throw new Error('FORMAL_MIGRATION_INVENTORY_DRIFT: review a forward proposal separately');
}
const migrations = actual.map((name, index) => {
  const number = String(index + 1).padStart(4, '0');
  if (!path.basename(name).startsWith(`${number}_`)) throw new Error(`MIGRATION_SEQUENCE_GAP: ${name}`);
  const bytes = readFileSync(path.join(root, name));
  const baseBytes = execFileSync('git', ['show', `${baseline}:${name}`], { cwd: root, maxBuffer: 8 * 1024 * 1024 });
  if (!bytes.equals(baseBytes)) throw new Error(`IMMUTABLE_MIGRATION_DRIFT: ${name}`);
  return { path: name, sha256: digest(bytes), baseline_bytes_match: true };
});
function sqlFiles(relative) {
  return readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap(entry => {
    const name = `${relative}/${entry.name}`;
    if (entry.isDirectory()) return sqlFiles(name);
    return entry.isFile() && entry.name.endsWith('.sql')
      ? [{ path: name, sha256: digest(readFileSync(path.join(root, name))), runtime_status: 'NOT_IN_FORMAL_MIGRATIONS' }]
      : [];
  }).sort((a, b) => a.path.localeCompare(b.path));
}
process.stdout.write(`${JSON.stringify({
  observed_at: new Date().toISOString(),
  evidence_kind: 'LOCAL_SOURCE_INVENTORY_ONLY',
  baseline_sha: baseline,
  checkout_head: git('rev-parse', 'HEAD').trim(),
  formal_migration_count: migrations.length,
  migrations,
  forward_candidates: sqlFiles('database/canonical/forward-candidates'),
  database_connection: 'NOT_ATTEMPTED',
  production_state: 'UNVERIFIED',
}, null, 2)}\n`);
