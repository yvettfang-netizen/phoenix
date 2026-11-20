// P0.1 source and behavior probe. Creates only labelled, disposable synthetic clusters.
// Usage: node verify-pg.mjs 16|17
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const version = process.argv[2];
assert(['16', '17'].includes(version), 'Only PG16/17 disposable tests are supported');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const migrations = path.join(root, 'database/canonical/migrations');
const files = readdirSync(migrations).filter(x => /^\d{4}_.+\.sql$/.test(x)).sort();
assert.equal(files.length, 37, 'Formal baseline must remain 0001–0037');
const image = {
  16: 'postgres:16@sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d',
  17: 'postgres:17@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3',
}[version];
const nonce = randomBytes(6).toString('hex');
const name = `academic-p01-pg${version}-${nonce}`;
const work = mkdtempSync(path.join(tmpdir(), 'academic-p01-'));
const password = randomBytes(32).toString('hex');
const readerPassword = randomBytes(32).toString('hex');
const appPassword = randomBytes(32).toString('hex');
const binderPassword = randomBytes(32).toString('hex');
let container;

function call(args, input, expected = 0) {
  const result = spawnSync('docker', args, { input, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  if (expected === 0) assert.equal(result.status, 0, `docker ${args[0]} failed: ${result.stderr?.slice(-1200)}`);
  else assert.notEqual(result.status, 0, `docker ${args[0]} unexpectedly succeeded`);
  return result;
}
function protect(file) {
  if (process.platform !== 'win32') return;
  const identity = spawnSync('whoami', ['/user', '/fo', 'csv', '/nh'], { encoding: 'utf8', windowsHide: true });
  const sid = identity.stdout.match(/S-1-5-[0-9-]+/)?.[0];
  assert(sid);
  assert.equal(spawnSync('icacls.exe', [file, '/inheritance:r', '/grant:r', `*${sid}:F`], {
    stdio: 'ignore', windowsHide: true,
  }).status, 0);
}
function log(label, result) {
  console.log(`COMMAND ${label}`);
  console.log(`EXIT ${result.status}`);
  if (result.stdout?.trim()) console.log(`STDOUT\n${result.stdout.trim()}`);
  if (result.stderr?.trim()) console.log(`STDERR\n${result.stderr.trim()}`);
}
function sql(statement, { user = 'phoenix_bootstrap', passfile = '/tmp/canonical-premerge.pgpass', fail = false, label = 'SQL', hideOutput = false } = {}) {
  const result = call(['exec', '-i', '-e', `PGPASSFILE=${passfile}`, container, 'psql', '-X', '-A', '-t',
    '-h', '127.0.0.1', '-U', user, '-d', 'phoenix_canonical_dev', '-v', 'ON_ERROR_STOP=1'], statement,
  fail ? 1 : 0);
  if (hideOutput) console.log(`COMMAND ${label}\nEXIT ${result.status}\nSTDOUT <one-time synthetic ticket omitted>`);
  else log(label, result);
  return result.stdout.trim();
}
const id = n => `01910000-0000-7000-8000-${n.toString(16).padStart(12, '0')}`;

try {
  const envfile = path.join(work, 'postgres.env');
  writeFileSync(envfile,
    `POSTGRES_DB=phoenix_canonical_dev\nPOSTGRES_USER=phoenix_bootstrap\nPOSTGRES_PASSWORD=${password}\nPOSTGRES_INITDB_ARGS=--auth-local=scram-sha-256 --auth-host=scram-sha-256\n`,
    { mode: 0o600, flag: 'wx' });
  protect(envfile);
  const started = call(['run', '-d', '--rm', '--network', 'none', '--name', name,
    '--label', `academic.p01.synthetic=${nonce}`, '--env-file', envfile, image]);
  container = started.stdout.trim();
  assert.match(container, /^[a-f0-9]{64}$/);
  console.log(`COMMAND docker run --rm --network none --label academic.p01.synthetic=<nonce> ${image}`);
  console.log(`EXIT 0\nCONTAINER ${container}`);
  let ready = false;
  for (let i = 0; i < 80; i++) {
    const probe = spawnSync('docker', ['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'phoenix_bootstrap'],
      { encoding: 'utf8', windowsHide: true });
    if (probe.status === 0) { ready = true; break; }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }
  assert(ready, 'isolated cluster did not start');
  call(['exec', container, 'mkdir', '-p', '/opt/canonical-migrations', '/opt/verification']);
  call(['cp', `${migrations}${path.sep}.`, `${container}:/opt/canonical-migrations`]);
  call(['cp', path.join(root, 'database/canonical/verification/migrate.sh'), `${container}:/opt/verification/migrate.sh`]);
  const installed = call(['exec', '-e', 'CANONICAL_EXPECTED_MIGRATIONS=37', container, 'bash', '/opt/verification/migrate.sh']);
  log('docker exec <synthetic-container> bash /opt/verification/migrate.sh [fresh]', installed);
  assert.match(installed.stdout, /PASS ledger=37 files=37 expected=37/);
  const repeated = call(['exec', '-e', 'CANONICAL_EXPECTED_MIGRATIONS=37', container, 'bash', '/opt/verification/migrate.sh']);
  log('docker exec <synthetic-container> bash /opt/verification/migrate.sh [repeat]', repeated);
  assert.equal((repeated.stdout.match(/SKIP \d{4}/g) ?? []).length, 37);

  const ledger = sql('SELECT migration_name || \'|\' || sha256 FROM canonical_migrations.applied ORDER BY migration_name;',
    { label: 'ledger exact-hash query' });
  const expected = files.map(f => `${f}|${createHash('sha256').update(readFileSync(path.join(migrations, f))).digest('hex')}`);
  assert.deepEqual(ledger.split(/\r?\n/), expected);
  console.log(`PASS PG${version} fresh=37 repeat=37 ledger_sha256=37`);

  sql(`SELECT 'version='||current_setting('server_version_num');
    SELECT 'learning_force_rls='||count(*) FILTER(WHERE c.relrowsecurity AND c.relforcerowsecurity)||'/'||count(*)
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='learning' AND c.relkind='r';
    SELECT 'study_enrollments='||coalesce(to_regclass('education.study_enrollments')::text,'ABSENT');
    SELECT 'room='||coalesce(to_regclass('learning.room')::text,'ABSENT');
    SELECT 'lesson_package='||coalesce(to_regclass('learning.lesson_package')::text,'ABSENT');
    SELECT 'assessment_instrument='||coalesce(to_regclass('learning.assessment_instrument')::text,'ABSENT');`,
    { label: 'server/schema/RLS introspection' });

  // The random credential travels only through psql stdin and a protected container-local pgpass file.
  sql(`CREATE ROLE p01_reader LOGIN INHERIT PASSWORD '${readerPassword}';
    GRANT phoenix_canonical_reader TO p01_reader;
    CREATE ROLE p01_app LOGIN INHERIT PASSWORD '${appPassword}';
    GRANT phoenix_canonical_app TO p01_app;
    CREATE ROLE p01_binder LOGIN INHERIT PASSWORD '${binderPassword}';
    GRANT phoenix_canonical_context_binder TO p01_binder;`,
  { label: 'create three separate synthetic LOGINs (credentials redacted from log)' });
  const pgpass = `127.0.0.1:5432:phoenix_canonical_dev:p01_reader:${readerPassword}\n`;
  call(['exec', '-i', container, 'bash', '-c', 'umask 077; cat > /tmp/academic-p01-reader.pgpass'], pgpass);
  for (const [login, secret] of [['p01_app', appPassword], ['p01_binder', binderPassword]]) {
    call(['exec', '-i', container, 'bash', '-c', `umask 077; cat > /tmp/academic-${login}.pgpass`],
      `127.0.0.1:5432:phoenix_canonical_dev:${login}:${secret}\n`);
  }
  sql(readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'nonprod-readonly-preflight.sql'), 'utf8'),
    { user: 'p01_reader', passfile: '/tmp/academic-p01-reader.pgpass',
      label: 'Jimson read-only preflight SQL exercised under separate synthetic LOGIN' });
  sql(`SELECT 'role='||current_user;
    SELECT 'table_select='||has_table_privilege(current_user,'learning.teacher','SELECT');
    SELECT 'catalog_exec='||has_function_privilege(current_user,'learning.list_published_courses()','EXECUTE');
    SELECT 'internal_teacher_scope_exec='||has_function_privilege(current_user,'learning.teacher_has_class_access(uuid,uuid)','EXECUTE');`,
    { user: 'p01_reader', passfile: '/tmp/academic-p01-reader.pgpass', label: 'separate LOGIN ACL introspection' });
  sql('SELECT count(*) FROM learning.teacher;',
    { user: 'p01_reader', passfile: '/tmp/academic-p01-reader.pgpass', fail: true, label: 'separate LOGIN direct-table read denied' });

  sql(`INSERT INTO core.people(person_id,display_name) VALUES
    ('${id(1)}','Synthetic dual-role actor'),('${id(2)}','Synthetic teacher A'),
    ('${id(3)}','Synthetic teacher B'),('${id(4)}','Synthetic student');
    INSERT INTO core.families(family_id,display_name) VALUES('${id(10)}','Synthetic family');
    INSERT INTO core.student_profiles(person_id) VALUES('${id(1)}'),('${id(4)}');
    INSERT INTO core.family_memberships(membership_id,family_id,person_id,membership_role,valid_from) VALUES
      ('${id(20)}','${id(10)}','${id(1)}','PRIMARY',now()-interval '1 day'),
      ('${id(21)}','${id(10)}','${id(4)}','MEMBER',now()-interval '1 day');
    INSERT INTO auth.principals(principal_id,person_id,principal_kind,status) VALUES
      ('${id(100)}','${id(1)}','FAMILY','ACTIVE'),('${id(101)}',NULL,'SERVICE','ACTIVE');
    INSERT INTO learning.teacher(teacher_person_id,created_by_principal_id) VALUES
      ('${id(2)}','${id(101)}'),('${id(3)}','${id(101)}');`, { label: 'synthetic master and teacher seed' });
  sql(`INSERT INTO auth.principals(principal_id,person_id,principal_kind,status)
      VALUES('${id(102)}','${id(1)}','TEACHER','ACTIVE');`,
    { fail: true, label: 'same person second principal rejected' });

  sql(`INSERT INTO learning.course(course_id,course_code,title,status,created_by_principal_id) VALUES
      ('${id(201)}','P01-COURSE-A','Synthetic A','PUBLISHED','${id(101)}'),
      ('${id(202)}','P01-COURSE-B','Synthetic B','PUBLISHED','${id(101)}');
    INSERT INTO learning.course_version(course_version_id,course_id,version_no,effective_from,status,created_by_principal_id) VALUES
      ('${id(211)}','${id(201)}',1,now()-interval '1 day','ACTIVE','${id(101)}'),
      ('${id(212)}','${id(202)}',1,now()-interval '1 day','ACTIVE','${id(101)}');
    INSERT INTO learning.class(class_id,course_version_id,class_code,capacity,status,starts_on,ends_on,created_by_principal_id) VALUES
      ('${id(221)}','${id(211)}','P01-CLASS-A',5,'OPEN',current_date,current_date+7,'${id(101)}'),
      ('${id(222)}','${id(212)}','P01-CLASS-B',5,'OPEN',current_date,current_date+7,'${id(101)}');
    INSERT INTO learning.schedule_slot(slot_id,class_id,teacher_person_id,starts_at,ends_at,room_label,created_by_principal_id) VALUES
      ('${id(231)}','${id(221)}','${id(2)}',now()+interval '1 day',now()+interval '1 day 1 hour','Synthetic Room 1','${id(101)}'),
      ('${id(232)}','${id(222)}','${id(3)}',now()+interval '1 day',now()+interval '1 day 1 hour','Synthetic Room 1','${id(101)}');
    INSERT INTO learning.enrollment(enrollment_id,family_id,student_person_id,course_version_id,status,created_by_principal_id) VALUES
      ('${id(241)}','${id(10)}','${id(4)}','${id(211)}','ACTIVE','${id(101)}'),
      ('${id(242)}','${id(10)}','${id(4)}','${id(212)}','ACTIVE','${id(101)}');
    INSERT INTO learning.enrollment_class(enrollment_id,class_id,family_id,student_person_id,course_version_id) VALUES
      ('${id(241)}','${id(221)}','${id(10)}','${id(4)}','${id(211)}'),
      ('${id(242)}','${id(222)}','${id(10)}','${id(4)}','${id(212)}');`,
    { label: 'synthetic overlapping room and student schedule seed' });
  sql(`INSERT INTO learning.schedule_slot(slot_id,class_id,teacher_person_id,starts_at,ends_at,room_label,created_by_principal_id)
    VALUES('${id(233)}','${id(222)}','${id(2)}',now()+interval '1 day',now()+interval '1 day 1 hour','Synthetic Room 2','${id(101)}');`,
    { fail: true, label: 'same teacher overlapping slot rejected' });
  const conflicts = sql(`SELECT 'same_room_overlaps='||count(*) FROM learning.schedule_slot
      WHERE room_label='Synthetic Room 1' AND status='SCHEDULED';
    SELECT 'same_student_in_overlapping_classes='||count(*) FROM learning.enrollment_class
      WHERE student_person_id='${id(4)}' AND status='ACTIVE';`,
    { label: 'room/student accepted-overlap observation' });
  assert.match(conflicts, /same_room_overlaps=2/);
  assert.match(conflicts, /same_student_in_overlapping_classes=2/);
  console.log(`PASS PG${version} ACL-deny, principal-unique, teacher-exclusion, room/student-gap probes`);

  // Academic read authority is exercised through two distinct LOGINs and a one-use ticket.
  sql(`INSERT INTO auth.principals(principal_id,person_id,principal_kind,status)
      VALUES('${id(102)}','${id(2)}','TEACHER','ACTIVE');
    INSERT INTO core.guardian_authorities(authority_id,family_id,guardian_person_id,subject_person_id,
      evidence_level,scope,valid_from,valid_until)
      VALUES('${id(250)}','${id(10)}','${id(1)}','${id(4)}','VERIFIED','LEARNING',
      now()-interval '1 day',now()+interval '2 days');
    INSERT INTO consent.grants(consent_id,family_id,grantor_person_id,grantee_person_id,subject_person_id,
      purpose,data_class,status,granted_at,expires_at) VALUES
      ('${id(251)}','${id(10)}','${id(1)}','${id(1)}','${id(4)}','LEARNING_RECORD','LEARNING','ACTIVE',
       now()-interval '1 day',now()+interval '2 days'),
      ('${id(252)}','${id(10)}','${id(1)}','${id(2)}','${id(4)}','LEARNING_RECORD','LEARNING','ACTIVE',
       now()-interval '1 day',now()+interval '2 days');
    INSERT INTO learning.teacher_assignment(assignment_id,class_id,teacher_person_id,role,
      valid_from,valid_until,created_by_principal_id) VALUES
      ('${id(253)}','${id(221)}','${id(2)}','LEAD',now()-interval '1 day',now()+interval '2 days','${id(101)}');
    INSERT INTO learning.enrollment(enrollment_id,family_id,student_person_id,course_version_id,status,created_by_principal_id)
      VALUES('${id(243)}','${id(10)}','${id(1)}','${id(211)}','ACTIVE','${id(101)}');
    INSERT INTO learning.enrollment_class(enrollment_id,class_id,family_id,student_person_id,course_version_id)
      VALUES('${id(243)}','${id(221)}','${id(10)}','${id(1)}','${id(211)}');
    INSERT INTO learning.after_class_card(card_id,slot_id,class_id,enrollment_id,family_id,student_person_id,
      author_teacher_person_id,summary_text,status) VALUES
      ('${id(254)}','${id(231)}','${id(221)}','${id(241)}','${id(10)}','${id(4)}',
       '${id(2)}','Synthetic published learning card','PUBLISHED'),
      ('${id(257)}','${id(231)}','${id(221)}','${id(243)}','${id(10)}','${id(1)}',
       '${id(2)}','Synthetic dual-capability self card','PUBLISHED');
    INSERT INTO learning.publication(publication_id,card_id,family_id,event_kind,acted_by_principal_id)
      VALUES('${id(255)}','${id(254)}','${id(10)}','PUBLISHED','${id(101)}'),
        ('${id(258)}','${id(257)}','${id(10)}','PUBLISHED','${id(101)}');`,
    { label: 'synthetic guardian, consent, teacher assignment, publication seed' });

  function issueTicket(principal, actor, channel) {
    const result = sql(`SELECT auth.issue_context_ticket('${principal}','${actor}','${id(10)}','${channel}',
      clock_timestamp()+interval '30 seconds',gen_random_uuid(),'${principal}');`,
    { user: 'p01_binder', passfile: '/tmp/academic-p01_binder.pgpass',
      label: `binder separate LOGIN ${channel} ticket issue`, hideOutput: true });
    assert.match(result, /^[a-f0-9-]{36}$/);
    return result;
  }
  function readWithTicket(principal, ticket, label) {
    const out = sql(`SELECT auth.redeem_context_ticket('${ticket}','${principal}');
      SELECT 'authorized_cards='||count(*) FROM learning.read_published_card('${id(254)}');
      SELECT 'self_cards='||count(*) FROM learning.read_published_card('${id(257)}');
      SELECT auth.clear_context();
      SELECT 'after_clear='||(SELECT count(*) FROM learning.read_published_card('${id(254)}'))
        +(SELECT count(*) FROM learning.read_published_card('${id(257)}'));`,
    { user: 'p01_app', passfile: '/tmp/academic-p01_app.pgpass', label });
    assert.match(out, /after_clear=0/);
    return out;
  }
  const dual = readWithTicket(id(100), issueTicket(id(100), id(1), 'FAMILY'),
    'same FAMILY Principal student self+guardian read and context clear');
  assert.match(dual, /authorized_cards=1/);
  assert.match(dual, /self_cards=1/);
  sql(`UPDATE consent.grants SET status='WITHDRAWN',withdrawn_at=clock_timestamp()
    WHERE consent_id='${id(251)}';`, { label: 'withdraw synthetic parent Consent' });
  assert.match(readWithTicket(id(100), issueTicket(id(100), id(1), 'FAMILY'),
    'parent read after Consent withdrawal'), /authorized_cards=0/);
  assert.match(readWithTicket(id(102), issueTicket(id(102), id(2), 'STAFF'),
    'assigned teacher read with separate Consent'), /authorized_cards=1/);
  sql(`UPDATE learning.teacher_assignment SET status='REVOKED',revoked_at=clock_timestamp()
    WHERE assignment_id='${id(253)}';`, { label: 'revoke synthetic teacher assignment' });
  assert.match(readWithTicket(id(102), issueTicket(id(102), id(2), 'STAFF'),
    'teacher read after assignment revocation'), /authorized_cards=0/);
  console.log(`PASS PG${version} separate binder/app LOGIN, ticket, context clear, Consent and teacher revocation`);

  // Probe whether ending family membership invalidates an already-bound context on its next read.
  sql(`INSERT INTO consent.grants(consent_id,family_id,grantor_person_id,grantee_person_id,subject_person_id,
      purpose,data_class,status,granted_at,expires_at) VALUES
      ('${id(256)}','${id(10)}','${id(1)}','${id(1)}','${id(4)}','LEARNING_RECORD','LEARNING','ACTIVE',
       now()-interval '1 day',now()+interval '2 days');`, { label: 'new synthetic Consent after prior withdrawal' });
  const ticket = issueTicket(id(100), id(1), 'FAMILY');
  const args = ['exec', '-i', '-e', 'PGPASSFILE=/tmp/academic-p01_app.pgpass', container,
    'psql', '-X', '-A', '-t', '-h', '127.0.0.1', '-U', 'p01_app', '-d', 'phoenix_canonical_dev',
    '-v', 'ON_ERROR_STOP=1'];
  const app = spawn('docker', args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  let output = '', error = '', revoked = false;
  app.stdout.on('data', data => {
    output += data.toString();
    if (!revoked && output.includes('before_membership_revoke=1')) {
      revoked = true;
      sql(`UPDATE core.family_memberships SET valid_until=clock_timestamp()
        WHERE membership_id='${id(20)}';`, { label: 'expire family membership while app backend stays bound' });
    }
  });
  app.stderr.on('data', data => { error += data.toString(); });
  app.stdin.end(`SELECT auth.redeem_context_ticket('${ticket}','${id(100)}');
    SELECT 'before_membership_revoke='||count(*) FROM learning.read_published_card('${id(254)}');
    SELECT pg_sleep(2);
    SELECT 'after_membership_revoke='||count(*) FROM learning.read_published_card('${id(254)}');
    SELECT auth.clear_context();\n`);
  const exit = await new Promise((resolve, reject) => {
    app.once('error', reject);
    app.once('close', resolve);
  });
  console.log(`COMMAND app separate LOGIN: redeem, read, wait, read after membership expiry, clear`);
  console.log(`EXIT ${exit}\nSTDOUT\n${output.trim()}\nSTDERR\n${error.trim()}`);
  assert.equal(exit, 0);
  assert(revoked, 'membership expiry must happen between the two app reads');
  assert.match(output, /before_membership_revoke=1/);
  assert.match(output, /after_membership_revoke=[01]/);
  console.log(`OBSERVED PG${version} bound-context membership expiry next-read=${output.match(/after_membership_revoke=([01])/)[1]}`);
} finally {
  if (container) {
    const label = spawnSync('docker', ['inspect', '--format', '{{index .Config.Labels "academic.p01.synthetic"}}', container],
      { encoding: 'utf8', windowsHide: true });
    assert.equal(label.stdout.trim(), nonce, 'Refusing cleanup of a container not owned by this probe');
    const removed = spawnSync('docker', ['rm', '-f', '-v', container], { encoding: 'utf8', windowsHide: true });
    console.log(`CLEANUP container_exit=${removed.status}`);
  }
  const resolved = realpathSync(work);
  const temp = realpathSync(tmpdir());
  assert(resolved.startsWith(temp + path.sep + 'academic-p01-'), 'Refusing cleanup outside owned temp directory');
  rmSync(resolved, { recursive: true, force: false });
  console.log('CLEANUP protected temporary files removed');
}
