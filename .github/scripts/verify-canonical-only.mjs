import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const absent = [
  'Phoenix Compass/education compass/server/migrations',
  'Phoenix Compass/education compass/server/src/store/postgres-store.ts',
  'Phoenix Family OS/phoenix-family-os-mvp/backend/database.js',
  'Phoenix Family OS/phoenix-family-os-mvp/backend/migrations',
  'askwise/askwise-learning-engine/src/lib/db.ts',
  'website/phoenix-nova-website-v5/db/schema.ts',
  'website/phoenix-nova-website-v5/db/index.ts',
  'website/phoenix-nova-website-v5/drizzle.config.ts',
  'website/phoenix-nova-website-v5/drizzle/0000_daffy_thunderbolt_ross.sql',
  ...['phoenix-east','phoenix-digital-world'].flatMap(site => [
    'website/'+site+'/db/index.ts',
    'website/'+site+'/db/schema.ts',
    'website/'+site+'/drizzle.config.ts',
    'website/'+site+'/examples/d1/app/api/notes/route.ts',
    'website/'+site+'/examples/d1/db/schema.ts'
  ])
];
for (const path of absent) assert(!existsSync(join(root,path)), 'Retired parallel database source returned: '+path);

function walk(dir) {
  return readdirSync(dir,{withFileTypes:true}).flatMap(entry => {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') return [];
    const full = join(dir,entry.name);
    return entry.isDirectory() ? walk(full) : entry.isFile() ? [full] : [];
  });
}
const sql = walk(root).filter(f => f.endsWith('.sql')).map(f=>relative(root,f).replaceAll('\\','/'));
const unexpected = sql.filter(p => !p.startsWith('database/canonical/'));
assert.deepEqual(unexpected,[], 'Non-Canonical SQL must not be committed');
assert(sql.some(p=>p.endsWith('database/canonical/migrations/0037_scoped_public_id_projection_read_audit.sql')),'Canonical migration baseline missing');

const askPkg=JSON.parse(readFileSync(join(root,'askwise/askwise-learning-engine/package.json'),'utf8'));
assert(!askPkg.dependencies?.['better-sqlite3']&&!askPkg.devDependencies?.['@types/better-sqlite3'],'SQLite package was reintroduced');
const askLock=readFileSync(join(root,'askwise/askwise-learning-engine/pnpm-lock.yaml'),'utf8');
assert(!askLock.includes('better-sqlite3'),'ASKWISE SQLite remains pinned');
for (const site of ['phoenix-nova-website-v5','phoenix-east','phoenix-digital-world']) {
  const pkg=JSON.parse(readFileSync(join(root,'website',site,'package.json'),'utf8'));
  assert(!pkg.dependencies?.['drizzle-orm']&&!pkg.devDependencies?.['drizzle-kit'],'Retired D1 database dependencies returned: '+site);
}
const store=readFileSync(join(root,'Phoenix Family OS/phoenix-family-os-mvp/services/store.js'),'utf8');
assert(!store.includes('PFS_DB_V01')&&store.includes('CANONICAL_PROVIDER_REQUIRED'),'WeChat runtime still accepts legacy business storage');
const education=readFileSync(join(root,'Phoenix Compass/education compass/services/store.js'),'utf8');
assert(!education.includes('PFS_DB_V01')&&education.includes('CANONICAL_EDUCATION_PROVIDER_REQUIRED'),'Education client still accepts legacy business storage');
const extraLegacy = [
  'Phoenix Compass/education compass/ops/server/apply-migrations.sh',
  'Phoenix Compass/education compass/ops/server/backup-databases.sh',
  'Phoenix Compass/education compass/ops/server/set-cos-backup.sh',
  'Phoenix Compass/education compass/ops/server/sync-backups-to-cos.sh',
  'Phoenix Compass/education compass/ops/server/setup-postgres-tls.sh',
  'Phoenix Compass/education compass/server/src/store/file-store.ts',
  'Phoenix Compass/education compass/server/scripts/migrate.js'
];
for (const path of extraLegacy) assert(!existsSync(join(root,path)),'Retired Education database operation reappeared: '+path);
const site=JSON.parse(readFileSync(join(root,'website/phoenix-nova-website-v5/.openai/hosting.json'),'utf8'));
assert(site.d1===null,'V5 D1 binding is not retired');
console.log('PASS — Canonical-only database assets, non-Canonical SQL absent, D1/SQLite retired');
