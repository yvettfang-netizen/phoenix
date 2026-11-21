import assert from 'node:assert/strict'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { createCluster, id } from '../v0038/cluster.mjs'

const version = process.argv[2]
assert(['16', '17'].includes(version), 'Run from the repository root with 16 or 17')
const require = createRequire(path.resolve('Phoenix Compass/education compass/server/package.json'))
const { Client } = require('pg')
const { consentCopySha256, CORE_ASSESSMENT_CONSENT_COPY, STUDENT_ASSESSMENT_ASSENT_COPY } =
  require('./dist/domain/education-compass/consent-policy')
const { getEducationCompassQuestionnaireBank } = require('./dist/domain/education-compass/registry')
const { validateQuestionnaireAnswers } = require('./dist/domain/education-compass/validator')
const { buildFamilyEducationSnapshotV1, buildStudentGrowthDiscoveryReportV1 } =
  require('./dist/domain/education-compass/result-builder')
const { GROWTH_DISCOVERY_PRODUCT_CODE: product } = require('./dist/domain/products')

const schema = 'synthetic_edu_contract'
const level1 = getEducationCompassQuestionnaireBank('LEVEL_1', null)
const level2 = getEducationCompassQuestionnaireBank('LEVEL_2', 'GAOKAO')
const coreHash = consentCopySha256(CORE_ASSESSMENT_CONSENT_COPY)
const assentHash = consentCopySha256(STUDENT_ASSESSMENT_ASSENT_COPY)
const rawFixture = readFileSync(new URL('./fixture.sql', import.meta.url), 'utf8').replaceAll('\r\n', '\n')
assert(rawFixture.includes(coreHash) && rawFixture.includes(assentHash), 'Product Consent copy must match the proof')
const digest = input => createHash('sha256').update(input).digest('hex')
const familyA = id(100)
const familyB = id(101)
const studentId = id(2)
const guardian = { principal: id(201), person: id(1), family: familyA }
const student = { principal: id(202), person: studentId, family: familyA }
const sibling = { principal: id(203), person: id(3), family: familyA }
const otherFamily = { principal: id(204), person: id(4), family: familyB }
const author = { principal: id(900), person: null, family: familyA }
const source = { principal: id(901), person: null, family: familyA }
const operations = { principal: id(902), person: null, family: familyA }
const roles = ['app', 'binder', 'author', 'source', 'operations']
const connections = new Map()
const login = role => 'synthetic_education_' + role

function setup(db) {
  assert.equal(db.call(['inspect', '--format', '{{index .Config.Labels "canonical.workbench.test"}}', db.container]), db.nonce)
  db.sql("SET phoenix.education_contract_fixture='isolated';\n" + rawFixture)
  db.sql(`
    INSERT INTO core.families(family_id,display_name)
      VALUES ('${familyA}','Synthetic family A'),('${familyB}','Synthetic family B');
    INSERT INTO auth.principals(principal_id,principal_kind,status,service_label) VALUES
      ('${author.principal}','SERVICE','ACTIVE','synthetic_education_report_author'),
      ('${source.principal}','SERVICE','ACTIVE','synthetic_education_order_source'),
      ('${operations.principal}','SERVICE','ACTIVE','operations_entitlement_service');
  `)
  for (const person of [guardian, student, sibling, otherFamily]) {
    db.sql(`INSERT INTO core.people(person_id,display_name) VALUES ('${person.person}','Synthetic education person');
      INSERT INTO auth.principals(principal_id,person_id,principal_kind,status)
        VALUES ('${person.principal}','${person.person}','FAMILY','ACTIVE');
      INSERT INTO core.family_memberships(membership_id,family_id,person_id,membership_role,valid_from)
        VALUES ('${person.principal}','${person.family}','${person.person}','MEMBER',now()-interval '1 day');`)
  }
  db.sql(`
    INSERT INTO core.student_profiles(person_id) VALUES ('${studentId}'),('${sibling.person}');
    INSERT INTO core.guardian_authorities(authority_id,family_id,guardian_person_id,subject_person_id,
        evidence_level,scope,valid_from,valid_until)
      VALUES ('${id(500)}','${familyA}','${guardian.person}','${studentId}',
        'VERIFIED','EDUCATION',now()-interval '1 day',now()+interval '1 day');
    INSERT INTO ${schema}.purpose_evidence VALUES
      ('${id(501)}','${familyA}','${studentId}','${guardian.person}','CORE_ASSESSMENT',
        'guardian_core_assessment_v1.0.0-rc1','${coreHash}',now()+interval '1 day',NULL),
      ('${id(502)}','${familyA}','${studentId}','${studentId}','STUDENT_ASSESSMENT_ASSENT',
        'student_assent_growth_discovery_v1.0.0-rc1','${assentHash}',now()+interval '1 day',NULL),
      ('${id(503)}','${familyA}','${studentId}','${studentId}','STUDENT_ASSESSMENT_ASSENT',
        'student_assent_growth_discovery_v1.0.0-rc1','${assentHash}',now()-interval '1 day',NULL);
  `)
}

async function connectRoles(db) {
  for (const role of roles) {
    const password = randomBytes(32).toString('hex')
    const user = login(role)
    db.sql(`CREATE ROLE ${user} LOGIN NOINHERIT PASSWORD '${password}';
      GRANT CONNECT ON DATABASE phoenix_canonical_dev TO ${user};
      GRANT USAGE ON SCHEMA auth TO ${user};`)
    const client = new Client({ host: '127.0.0.1', port: db.port, database: 'phoenix_canonical_dev',
      user, password, connectionTimeoutMillis: 2500, query_timeout: 6000, statement_timeout: 5000 })
    connections.set(role, client)
    await client.connect()
  }
  const app = login('app'), publisher = login('author'), sourceRole = login('source'), ops = login('operations')
  db.sql(`
    GRANT EXECUTE ON FUNCTION auth.issue_context_ticket(uuid,uuid,uuid,text,timestamptz,uuid,uuid) TO ${login('binder')};
    GRANT EXECUTE ON FUNCTION auth.redeem_context_ticket(uuid,uuid),auth.clear_context() TO ${app},${publisher},${sourceRole},${ops};
    GRANT USAGE ON SCHEMA ${schema} TO ${app},${publisher},${sourceRole};
    GRANT EXECUTE ON FUNCTION ${schema}.read_draft(uuid),${schema}.save_draft(uuid,integer,jsonb),
      ${schema}.submit(uuid,integer,uuid),${schema}.read_report(uuid) TO ${app};
    GRANT EXECUTE ON FUNCTION ${schema}.publish_report(uuid,uuid,jsonb,boolean) TO ${publisher};
    GRANT EXECUTE ON FUNCTION ${schema}.apply_verified_reference(uuid,uuid,uuid,text,text,integer,text) TO ${sourceRole};
    GRANT USAGE ON SCHEMA operations_ref TO ${app},${ops};
    GRANT EXECUTE ON FUNCTION operations_ref.check_entitlement(uuid,uuid,text,uuid) TO ${app};
    GRANT EXECUTE ON FUNCTION operations_ref.register_entitlement(uuid,text,text,text,bigint,uuid,uuid,text,uuid,timestamptz,timestamptz,timestamptz)
      TO ${ops};
  `)
}

async function bound(role, { principal, person, family }, work) {
  const binder = connections.get('binder')
  const caller = connections.get(role)
  const { rows: [row] } = await binder.query(
    "SELECT auth.issue_context_ticket($1,$2,$3,$4,clock_timestamp()+interval '30 seconds',$5,$1) AS id",
    [principal, person, family, person ? 'FAMILY' : 'INTERNAL', randomUUID()])
  try {
    await caller.query('SELECT auth.redeem_context_ticket($1,$2)', [row.id, principal])
    await work(caller)
  } finally {
    await caller.query('SELECT auth.clear_context()')
  }
}

async function call(client, name, ...values) {
  const args = values.map((_value, i) => '$' + (i + 1)).join(',')
  const { rows: [row] } = await client.query('SELECT ' + schema + '.' + name + '(' + args + ') AS result', values)
  return row.result
}

function insertDraft(db, assessment, bank, sourceAssessment = null, assent = null) {
  const actor = sourceAssessment ? student : guardian
  const required = bank.requiredQuestionIds.map(q => "'" + q + "'").join(',')
  db.sql(`INSERT INTO ${schema}.assessment(assessment_id,family_id,student_id,respondent_id,level,
    guardian_evidence_id,assent_evidence_id,source_assessment_id,
    questionnaire_version,schema_digest,required_ids,system_result_marker)
    VALUES ('${assessment}','${familyA}','${studentId}','${actor.person}','${sourceAssessment ? 'LEVEL_2' : 'LEVEL_1'}',
      '${id(501)}',${assent ? "'" + assent + "'" : 'NULL'},${sourceAssessment ? "'" + sourceAssessment + "'" : 'NULL'},
      '${bank.questionnaireVersion}','${bank.schemaDigest}',ARRAY[${required}],${sourceAssessment ? "'FULL_SYSTEM_BANK'" : 'NULL'});`)
}

function answersFor(bank, overrides) {
  const answers = Object.fromEntries(bank.requiredQuestionIds.map(key => {
    const q = bank.questions.find(question => question.id === key)
    assert(q)
    if (q.type === 'YEAR_SELECT') return [key, String(new Date().getUTCFullYear()+1)]
    if (q.type === 'MULTI_CHOICE' || q.type === 'MULTI_CHOICE_DYNAMIC') return [key, [q.options[0].code]]
    if (q.type === 'SUBJECT_RANGE_MATRIX') return [key, [{
      subject_code: q.matrixSubjectOptions[0].code, range_code: q.matrixRangeOptions[0].code
    }]]
    return [key, q.options[0].code]
  }))
  return { ...answers, ...overrides }
}

function validated(bank, level, answers) {
  return validateQuestionnaireAnswers({ level, educationSystem: level === 'LEVEL_1' ? null : 'GAOKAO',
    questionnaireVersion: bank.questionnaireVersion, answers, mode: 'SUBMIT' }).answers
}

function assertLocked(body, assessment) {
  assert.deepEqual(body, { assessment_id: assessment, result_state: 'LOCKED', product_code: product,
    amount_fen: 3990, currency: 'CNY', next_action: 'PURCHASE_TO_UNLOCK_REPORT', system_result_marker: 'FULL_SYSTEM_BANK' })
}

async function proof(db) {
  const l1 = id(601), l2 = id(602), second = id(603), expired = id(604)
  const l1Report = id(701), report = id(702), secondReport = id(703)
  const order = id(801), nextOrder = id(802), secondAssessmentOrder = id(803)
  const l1Key = randomUUID()
  const l1Answers = validated(level1, 'LEVEL_1', answersFor(level1, { FP02: 'GAOKAO', FP06: 'WILLING' }))
  const growthAnswers = validated(level2, 'LEVEL_2', answersFor(level2, { EGD01: 'CONFIRM_STUDENT_SELF' }))
  const identity = assessmentId => ({ familyId: familyA, studentId, assessmentId })
  const freeResult = buildFamilyEducationSnapshotV1(identity(l1), l1Answers)
  const paidResult = assessment => buildStudentGrowthDiscoveryReportV1(identity(assessment), 'GAOKAO', growthAnswers)
  const submit = (client, assessment, revision, key = randomUUID()) => call(client, 'submit', assessment, revision, key)
  const save = (client, assessment, revision, answers) => call(client, 'save_draft', assessment, revision, answers)
  const payment = (client, assessment, orderId, state = 'PAID', event = randomUUID(), sku = product, amount = 3990) =>
    call(client, 'apply_verified_reference', assessment, orderId, event, state, sku, amount, 'CNY')
  const read = (client, assessment) => call(client, 'read_report', assessment)
  const artifact = (assessment, result) => ({
    assessment_id: assessment, family_id: familyA, student_id: studentId,
    schema_digest: (assessment === l1 ? level1 : level2).schemaDigest, result
  })
  const publish = (client, assessment, reportId, data, passed = true) =>
    call(client, 'publish_report', assessment, reportId, data, passed)

  insertDraft(db, l1, level1)
  await bound('app', student, async app => {
    assert.equal(await save(app,l1,1,l1Answers), 'DENIED')
    assert.equal(await call(app, 'read_draft', l1), null)
  })
  await bound('app', guardian, async app => {
    assert.equal(await submit(app,l1,1), 'INCOMPLETE_OR_EXIT')
    assert.equal(await save(app,l1,1,l1Answers), 'SAVED')
    assert.equal(await save(app,l1,1,l1Answers), 'STALE')
    const draft = await call(app,'read_draft',l1)
    assert.deepEqual(draft, { revision: 2, answers: l1Answers,
      questionnaire_version: level1.questionnaireVersion, schema_digest: level1.schemaDigest })
    assert.equal(await submit(app,l1,2,l1Key), 'SUBMITTED')
    assert.equal(await submit(app,l1,2,l1Key), 'REPLAY')
    assert.equal(await submit(app,l1,2), 'SEALED')
    assert.equal(await save(app,l1,2,{}), 'SEALED')
    assert.equal(await call(app,'read_draft',l1), null)
  })
  await bound('author',author,async publisher => {
    assert.equal(await publish(publisher,l1,l1Report,artifact(l1,freeResult)),'READY')
    assert.equal(await publish(publisher,l1,l1Report,artifact(l1,freeResult)),'REPLAY')
  })
  await bound('app',guardian,async app => {
    assert.equal((await read(app,l1)).result.next_step_status,'AVAILABLE')
  })
  console.log('PASS L1 guardian/evidence, draft revision resume, incomplete denial, idempotent sealed submission and free snapshot')

  for (const [assessment, evidence] of [[l2,id(502)],[second,id(502)],[expired,id(503)]]) {
    insertDraft(db, assessment, level2, l1, evidence)
  }
  await bound('app',guardian,async app => {
    assert.equal(await save(app,l2,1,growthAnswers),'DENIED')
    assert.equal(await call(app,'read_draft',l2),null)
  })
  await bound('source',source,async verified => {
    assert.equal(await payment(verified,l2,order),'STATE_OR_PRODUCT_DENIED')
  })
  await bound('app',student,async app => {
    assert.equal(await save(app,expired,1,growthAnswers),'DENIED')
    assert.equal(await save(app,l2,1,{...growthAnswers,EGD01:'EXIT_NOT_STUDENT'}),'SAVED')
    assert.equal(await submit(app,l2,2),'INCOMPLETE_OR_EXIT')
    assert.equal(await save(app,l2,2,growthAnswers),'SAVED')
    assert.equal(await submit(app,l2,3),'SUBMITTED')
    assert.equal(await save(app,l2,3,{}),'SEALED')
    assert.equal(await save(app,second,1,growthAnswers),'SAVED')
    assert.equal(await submit(app,second,2),'SUBMITTED')
    assertLocked(await read(app,l2),l2)
  })
  for (const caller of [sibling,otherFamily]) await bound('app',caller,async app => {
    assert.equal(await read(app,l2),null)
    assert.equal(await save(app,l2,3,growthAnswers),'DENIED')
  })
  console.log('PASS L2 same-subject L1, student-only response, Assent expiry, refusal, immutable snapshot and family/subject isolation')

  await bound('operations',operations,async writer => {
    const { rows: [created] } = await writer.query(`SELECT operations_ref.register_entitlement($1,
       'phoenix_operations','synthetic-edu-service','synthetic-edu-event',1,$2,$3,'EDUCATION_SERVICE',
       NULL,now()-interval '1 day',now()+interval '1 day',now()) AS ok`,[id(550),familyA,studentId])
    assert.equal(created.ok,true)
  })
  await bound('app',student,async app => {
    const { rows: [decision] } = await app.query(
      "SELECT allowed FROM operations_ref.check_entitlement($1,$2,'EDUCATION_SERVICE',NULL)",[familyA,studentId])
    assert.equal(decision.allowed,true)
    assertLocked(await read(app,l2),l2)
    await assert.rejects(call(app,'apply_verified_reference',l2,order,randomUUID(),'PAID',product,3990,'CNY'),{code:'42501'})
    await assert.rejects(publish(app,l2,report,artifact(l2,paidResult(l2))),{code:'42501'})
    await assert.rejects(app.query('SELECT * FROM ' + schema + '.report_artifact'),{code:'42501'})
    await assert.rejects(app.query('UPDATE ' + schema + '.assessment SET answers=$1',[{}]),{code:'42501'})
  })
  await bound('author',author,async publisher => {
    assert.equal(await publish(publisher,l2,report,artifact(l2,paidResult(l2))),'LOCKED')
  })
  console.log('PASS existing Operations EDUCATION_SERVICE stays active while the report is locked; app cannot settle, publish or access raw rows')

  const paidEvent = randomUUID()
  await bound('source',source,async verified => {
    assert.equal(await payment(verified,l2,order,'UNKNOWN'),'STATE_OR_PRODUCT_DENIED')
    assert.equal(await payment(verified,l2,order,'PAID',randomUUID(),'COMPASS_REPORT_SINGLE_39_9'),'STATE_OR_PRODUCT_DENIED')
    assert.equal(await payment(verified,l2,order,'PAID',randomUUID(),product,3989),'STATE_OR_PRODUCT_DENIED')
    assert.equal(await payment(verified,l2,order,'PAID',paidEvent),'PAID')
    assert.equal(await payment(verified,l2,order,'PAID',paidEvent),'REPLAY')
    assert.equal(await payment(verified,second,order,'PAID',paidEvent),'SCOPE_DENIED')
    assert.equal(await payment(verified,l2,order,'REFUNDED',paidEvent),'CONFLICT')
  })
  await bound('app',student,async app => {
    assert.deepEqual(await read(app,l2),{assessment_id:l2,result_state:'PENDING'})
    assertLocked(await read(app,second),second)
  })
  await bound('author',author,async publisher => {
    const payload = artifact(l2,paidResult(l2))
    assert.equal(await publish(publisher,l2,report,payload,false),'QA_OR_SCOPE_DENIED')
    assert.equal(await publish(publisher,l2,report,artifact(second,paidResult(second))),'QA_OR_SCOPE_DENIED')
    assert.equal(await publish(publisher,l2,report,{...payload,schema_digest:'0'.repeat(64)}),'QA_OR_SCOPE_DENIED')
    assert.equal(await publish(publisher,l2,report,payload),'READY')
    assert.equal(await publish(publisher,l2,report,payload),'REPLAY')
    assert.equal(await publish(publisher,l2,id(710),payload),'CONFLICT')
  })
  await bound('app',student,async app => {
    assert.deepEqual(await read(app,l2),{report_id:report,result_state:'READY',result:paidResult(l2)})
    assertLocked(await read(app,second),second)
  })
  console.log('PASS verified exact purchase, conflicting replay denial, one report only, QA, versioned result and zero results before unlock')

  const refundEvent = randomUUID()
  await bound('source',source,async verified => {
    assert.equal(await payment(verified,l2,order,'REFUNDED',randomUUID(),product,100),'STATE_OR_PRODUCT_DENIED')
    assert.equal(await payment(verified,l2,order,'REFUNDING'),'REFUNDING')
  })
  await bound('app',student,async app => assertLocked(await read(app,l2),l2))
  await bound('source',source,async verified => {
    assert.equal(await payment(verified,l2,order,'REFUNDED',refundEvent),'REFUNDED')
    assert.equal(await payment(verified,l2,order,'REFUNDED',refundEvent),'REPLAY')
    assert.equal(await payment(verified,l2,order,'PAID',paidEvent),'REPLAY')
    assert.equal(await payment(verified,l2,order),'STALE')
    assert.equal(await payment(verified,l2,order,'REFUNDING'),'STALE')
  })
  await bound('app',student,async app => assertLocked(await read(app,l2),l2))
  await bound('source',source,async verified => assert.equal(await payment(verified,l2,nextOrder),'PAID'))
  await bound('app',student,async app => assert.equal((await read(app,l2)).report_id,report))
  await bound('source',source,async verified => {
    assert.equal(await payment(verified,l2,nextOrder,'REFUNDED'),'REFUNDED')
    assert.equal(await payment(verified,l2,id(804)),'REPURCHASE_LIMIT')
    assert.equal(await payment(verified,second,secondAssessmentOrder),'PAID')
  })
  await bound('app',student,async app => assertLocked(await read(app,l2),l2))
  console.log('PASS full refund locks access, old payment replay cannot restore it, one separate repurchase allowed, second refund ends purchase')

  await bound('author',author,async publisher => {
    assert.equal(await publish(publisher,second,secondReport,artifact(second,paidResult(second))),'READY')
  })
  await bound('app',student,async app => assert.equal((await read(app,second)).report_id,secondReport))
  db.sql(`UPDATE ${schema}.purpose_evidence SET withdrawn_at=clock_timestamp() WHERE evidence_id='${id(502)}'`)
  await bound('app',student,async app => {
    assert.equal(await read(app,second),null)
    assert.equal(await submit(app,second,2),'DENIED')
  })
  await bound('author',author,async publisher => {
    assert.equal(await publish(publisher,second,secondReport,artifact(second,paidResult(second))),'DENIED')
  })
  await bound('source',source,async verified => {
    assert.equal(await payment(verified,l2,id(804)),'CONSENT_REQUIRED')
    assert.equal(await payment(verified,second,secondAssessmentOrder,'REFUNDED'),'REFUNDED')
  })
  await bound('app',guardian,async app => assert.equal((await read(app,l1)).report_id,l1Report))
  db.sql(`UPDATE ${schema}.purpose_evidence SET withdrawn_at=clock_timestamp() WHERE evidence_id='${id(501)}'`)
  await bound('app',guardian,async app => assert.equal(await read(app,l1),null))
  assert.equal(db.sql(`SELECT count(*) FROM ${schema}.assessment WHERE submitted_at IS NOT NULL`),'3')
  assert.equal(db.sql(`SELECT count(*) FROM ${schema}.source_event`),'7')
  assert.equal(db.sql(`SELECT count(*) FROM ${schema}.report_artifact`),'3')
  assert.equal(db.sql("SELECT count(DISTINCT decision) FROM audit.access_events WHERE resource_kind='SYNTHETIC_EDUCATION_REPORT'"),'2')
  assert.equal(db.sql('SELECT count(*) FROM auth.session_contexts'),'0')
  assert.equal(db.sql('SELECT count(*) FROM auth.context_exchange_tickets'),'0')
  console.log('PASS Consent/Assent withdrawal fences result and publication; refunds still reconcile; snapshots, audit and ticket cleanup verified')
}

let db
try {
  db = await createCluster(version, { initialize: false })
  db.call(['exec',db.container,'mv','/opt/canonical-migrations/0038_service_project_workbench.sql','/opt/verification/'])
  const migrate = () => db.call(['exec','-e','CANONICAL_EXPECTED_MIGRATIONS=37',db.container,'bash','/opt/verification/migrate.sh'])
  const first = migrate()
  console.log(first)
  assert.match(first,/APPLIED 0037_.+\nPASS ledger=37 files=37 expected=37/)
  assert.equal(migrate().match(/^SKIP /gm)?.length,37)
  const serverVersion = db.sql('SHOW server_version')
  assert.match(serverVersion,new RegExp('^' + version + '\\.'))
  console.log('SELECT server_version',serverVersion)
  console.log('FIXTURE_SHA256 (LF)',digest(rawFixture))
  console.log('BANKS',level1.questionnaireVersion,level1.schemaDigest,level2.questionnaireVersion,level2.schemaDigest)
  setup(db)
  await connectRoles(db)
  await proof(db)
  assert.equal(db.sql('SELECT count(*) FROM canonical_migrations.applied'),'37')
  console.log(`PG${version} SYNTHETIC_CONTRACT=PASS INSTALLED_MIGRATION=HOLD LIVE_IDENTITY=HOLD`)
} finally {
  await Promise.allSettled([...connections.values()].map(client => client.end()))
  db?.cleanup()
}
