// Read-only source/decision verification. Never connects to a database or reads configuration secrets.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../../..');
const base = '97e47f2287483aeda63948c849ea5eed07f0153b';
const authority = '9355d28667ee9cf4761b4abcdaf959f0ad154820';
const archive = '7b0e42362e1a639c286835840133596a2e39861f';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const evidence = { recordedAt: new Date().toISOString(), scope: 'Source metadata and synthetic implementation code only. No database, SSH, credentials or real records.', authority, base, archive, commands: [], checks: [] };
function run(command, args, recordOutput = true) {
  const output = execFileSync(command, args, { cwd: root, maxBuffer: 4 * 1024 * 1024 });
  evidence.commands.push({ command: [command, ...args], exitCode: 0, ...(recordOutput ? { stdout: output.toString('utf8') } : { stdoutSha256: sha(output), note: 'Private decision bytes are hashed, not republished.' }) });
  return output;
}
function check(name, passed, details) {
  evidence.checks.push({ name, status: passed ? 'PASS' : 'HOLD', details });
  if (!passed) process.exitCode = 1;
}
run('git', ['status', '--short']);
run('git', ['branch', '--show-current']);
run('git', ['rev-parse', 'HEAD']);
const main = run('git', ['ls-remote', 'origin', 'refs/heads/main']).toString().split(/\s+/)[0];
check('Remote main matches inspected authority', main === authority, { actual: main, expected: authority });
const archiveRemote = run('git', ['ls-remote', 'canonical-private', 'refs/heads/codex/pr36-non-jimson-closeout-20261102']).toString().split(/\s+/)[0];
check('Private archive remains the inspected version', archiveRemote === archive, { actual: archiveRemote, expected: archive });
const privateMetadata = JSON.parse(run('gh', ['repo', 'view', 'yvettfang-netizen/phoenix-canonical-db', '--json', 'nameWithOwner,isPrivate']));
check('Decision source private', privateMetadata.isPrivate === true, privateMetadata);
const expectedPrs = { 41: '3de5c99fcc1974ca542db587fcb01494ffe3dc58', 45: '307ab74350eb5e9d745fe37c55e0a8033ed1dff0', 46: base };
for (const [number, expectedHead] of Object.entries(expectedPrs)) {
  const pr = JSON.parse(run('gh', ['pr', 'view', number, '--repo', 'yvettfang-netizen/phoenix', '--json', 'number,url,state,isDraft,headRefOid,headRefName,baseRefName']));
  check(`PR${number} inspected snapshot`, pr.state === 'OPEN' && pr.isDraft && pr.headRefOid === expectedHead, pr);
}
const manifest = readFileSync(resolve(root, 'docs/database/premerge-0035/CANONICAL_0035_SOURCE_MANIFEST.md'), 'utf8');
const migrationDir = resolve(root, 'database/canonical/migrations');
const migrations = readdirSync(migrationDir).filter(name => /^\d{4}_.*\.sql$/.test(name)).sort();
check('No new numbered migration written', migrations.length === 35 && migrations.every((name, i) => name.startsWith(String(i + 1).padStart(4, '0') + '_')), migrations);
for (const name of migrations) {
  const id = name.slice(0, 4);
  const match = manifest.match(new RegExp('\\| ' + id + ' \\| `([a-f0-9]{64})`'));
  const actual = sha(readFileSync(resolve(migrationDir, name)));
  const original = sha(run('git', ['show', `${authority}:database/canonical/migrations/${name}`], false));
  check(`Migration ${id} unchanged`, Boolean(match) && actual === match[1] && actual === original, { file: name, actual, manifest: match?.[1], mainBlob: original });
}
for (const [path, expected] of [
  ['canonical-db/phase2-gate/PRODUCTION_DATABASE_FOUNDER_DECISION_REGISTER_V1.0.md', 'ed1d5838ef54e45c1b99f2f18c4bf75fa88ceb10b792d003a247d7097e53d3a0'],
  ['canonical-db/phase2-gate/CANONICAL_BUSINESS_CONTRACT_V1.0_EFFECTIVE.md', 'f89a1bbe3cff78ed96e8e6620fce7d41837ae4d30de0b9fd91929f2f6bcf4c93'],
  ['canonical-db/phase2-gate/FOUNDER_DECISION_FAMILY_MAPPING_MANAGEMENT_API_V1.0.md', '41dc44d03dd9ba6cdd6b5812d0b050e07445ac5db129f2693d304b29f9501475'] // gitleaks:allow -- published decision SHA-256, independently recomputed; not a credential.
]) {
  const actual = sha(run('git', ['show', `${archive}:${path}`], false));
  check('Approved decision original bytes: ' + path, actual === expected, { actual, expected });
}
for (const name of ['README.md', 'ID_DECISION_TRACEABILITY.md', 'FORWARD_MIGRATION_PROPOSAL.md', 'REAL_IDENTITY_GAP_AUDIT.md', 'ACCEPTANCE_PLAN.md']) {
  const text = readFileSync(resolve(directory, name), 'utf8');
  check('Document LF: ' + name, !text.includes('\r'), { sha256: sha(Buffer.from(text)) });
  for (const [, link] of text.matchAll(/\]\(([^)]+)\)/g)) {
    if (/^https:/.test(link) || link === 'evidence/baseline-verification.json') continue;
    const target = resolve(directory, link);
    check('Local source link: ' + relative(root, target), !relative(root, target).startsWith('..') && readFileSync(target).length > 0, { from: name, link });
  }
}
const roleSource = readFileSync(resolve(root, 'Phoenix Compass/education compass/server/src/services/canonical-family-projection.ts'), 'utf8');
const identitySource = readFileSync(resolve(root, 'Phoenix Compass/education compass/server/src/auth/synthetic-family-identity.ts'), 'utf8');
check('Known preview gaps are source facts', roleSource.includes('BEGIN READ ONLY') && roleSource.includes('studentRef: s.person_id') && !roleSource.includes('audit.record_write_decision') && identitySource.includes('https://family-projection.synthetic.invalid'), { roleSourceSha256: sha(Buffer.from(roleSource)), identitySourceSha256: sha(Buffer.from(identitySource)), limitation: 'No public-ID translation or controlled persistent DB read audit in PR46; verifier is synthetic-only.' });
evidence.newSqlImplementation = 'NOT RUN';
evidence.newPg16Pg17Acceptance = 'NOT RUN';
evidence.realIdentityActivation = 'HOLD';
const passed = evidence.checks.filter(c => c.status === 'PASS').length;
evidence.summary = { passed, total: evidence.checks.length, status: process.exitCode ? 'HOLD' : 'PASS' };
mkdirSync(resolve(directory, 'evidence'), { recursive: true });
writeFileSync(resolve(directory, 'evidence/baseline-verification.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence.summary));
