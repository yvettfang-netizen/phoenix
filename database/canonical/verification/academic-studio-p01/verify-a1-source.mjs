import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const file='database/canonical/forward-candidates/academic-studio/academy_staff_grants.sql';
const manifest=JSON.parse(readFileSync(path.join(root,'database/canonical/forward-candidates/academic-studio/manifest-a1.json'),'utf8'));
const bytes=readFileSync(path.join(root,file));
const blob=createHash('sha1').update(Buffer.concat([
  Buffer.from('blob '+bytes.length+'\0'),bytes
])).digest('hex');
assert.equal(manifest.candidate_git_blob_sha1,blob,'ACADEMY_A1_SQL_BLOB_CHANGED_WITHOUT_MANIFEST');
assert.equal(manifest.file,file);
assert.equal(manifest.formal_base.count,37);
const migrationPath=path.join(root,'database/canonical/migrations');
const existing=readdirSync(migrationPath).filter(x=>/^[0-9]{4}_.*\.sql$/.test(x)).sort();
assert.equal(existing.length,37,'FORMAL_COUNT_CHANGED');
assert.equal(existing.at(-1),manifest.formal_base.last);
const source=bytes.toString('utf8');
assert(source.startsWith('BEGIN;') && source.trim().endsWith('COMMIT;'));
assert.match(source,/CREATE TABLE learning\.academy_staff_grants/);
assert.match(source,/FORCE ROW LEVEL SECURITY/);
assert.match(source,/CREATE UNIQUE INDEX academy_staff_grants_one_active_uq/);
assert.match(source,/learning\.is_academy_bootstrap_service/);
assert.match(source,/learning\.has_academy_staff_grant/);
assert.match(source,/audit\.record_write_decision/);
assert.doesNotMatch(source,/CREATE TABLE (auth\.(principals|session_contexts|context_exchange_tickets)|core\.(people|student_profiles))/);
assert.doesNotMatch(source,/DROP (TABLE|DATABASE)|TRUNCATE|DELETE FROM core\.people/);
assert.equal(manifest.business_data_migrated,false);
assert.equal(manifest.context_tables_added,0);
assert.equal(manifest.existing_tables_modified.length,0);
console.log('PASS Academy A1 source exact Git blob, formal 0001–0037, narrow RLS/grant-only scope');
