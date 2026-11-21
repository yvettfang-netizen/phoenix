import assert from 'node:assert/strict'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { createCluster, id } from '../v0038/cluster.mjs'

const version = process.argv[2]
assert(['16', '17'].includes(version), 'Run at the repository root with 16 or 17')
const require = createRequire(path.resolve('Phoenix Compass/education compass/server/package.json'))
const { Client } = require('pg')
const { ALL_EDUCATION_SYSTEMS, getEducationCompassQuestionnaireBank } = require('./dist/domain/education-compass/registry')
const { validateQuestionnaireAnswers } = require('./dist/domain/education-compass/validator')
const { buildFamilyEducationSnapshotV1, buildStudentGrowthDiscoveryReportV1 } = require('./dist/domain/education-compass/result-builder')
const { consentCopySha256, CORE_ASSESSMENT_CONSENT_COPY, CORE_ASSESSMENT_CONSENT_VERSION,
  STUDENT_ASSESSMENT_ASSENT_COPY, STUDENT_ASSESSMENT_ASSENT_VERSION } = require('./dist/domain/education-compass/consent-policy')
const { GROWTH_DISCOVERY_PRODUCT_CODE: product } = require('./dist/domain/products')
const candidate = readFileSync('database/canonical/forward-candidates/education-assessment-report/education_assessment_report.sql','utf8').replaceAll('\r\n','\n')
const expires = new Date(Date.now()+60*60*1000)
const firstBank = getEducationCompassQuestionnaireBank('LEVEL_1',null)
const secondBank = getEducationCompassQuestionnaireBank('LEVEL_2','GAOKAO')
const familyA = id(100), familyB = id(101)
const guardian = { person:id(1), principal:id(201), family:familyA }
const student = { person:id(2), principal:id(202), family:familyA }
const otherGuardian = { person:id(3), principal:id(203), family:familyA }
const outsider = { person:id(4), principal:id(204), family:familyB }
const publisher = { person:null, principal:id(900), family:familyA }
const settlement = { person:null, principal:id(901), family:familyA }
const clients = new Map()

function seed(db) {
  db.sql(`INSERT INTO core.families(family_id,display_name) VALUES
    ('${familyA}','Synthetic family A'),('${familyB}','Synthetic family B');
    INSERT INTO auth.principals(principal_id,principal_kind,status,service_label) VALUES
      ('${publisher.principal}','SERVICE','ACTIVE','education_compass_report_service'),
      ('${settlement.principal}','SERVICE','ACTIVE','operations_entitlement_service');`)
  for (const actor of [guardian,student,otherGuardian,outsider]) {
    db.sql(`INSERT INTO core.people(person_id,display_name) VALUES('${actor.person}','Synthetic person');
      INSERT INTO auth.principals(principal_id,person_id,principal_kind,status)
        VALUES('${actor.principal}','${actor.person}','FAMILY','ACTIVE');
      INSERT INTO core.family_memberships(membership_id,family_id,person_id,membership_role,valid_from)
        VALUES('${actor.principal}','${actor.family}','${actor.person}','MEMBER',now()-interval '1 day');`)
  }
  db.sql(`INSERT INTO core.student_profiles(person_id) VALUES('${student.person}');
    INSERT INTO core.guardian_authorities(authority_id,family_id,guardian_person_id,subject_person_id,
      evidence_level,scope,valid_from,valid_until) VALUES
      ('${id(500)}','${familyA}','${guardian.person}','${student.person}','VERIFIED','EDUCATION',now()-interval '1 day',now()+interval '1 day'),
      ('${id(501)}','${familyA}','${otherGuardian.person}','${student.person}','VERIFIED','EDUCATION',now()-interval '1 day',now()+interval '1 day');`)
}

async function connect(db) {
  const roles = new Map([
    ['app','phoenix_education_compass_app'], ['publisher','phoenix_education_compass_publisher'],
    ['settlement','phoenix_education_compass_settlement'], ['binder',null]
  ])
  for (const [name,role] of roles) {
    const user = 'synthetic_compass_' + name
    const password = randomBytes(32).toString('hex')
    db.sql(`CREATE ROLE ${user} LOGIN NOINHERIT PASSWORD '${password}';
      GRANT CONNECT ON DATABASE phoenix_canonical_dev TO ${user};`)
    if (role) {
      db.sql(`GRANT ${role} TO ${user} WITH INHERIT FALSE, SET TRUE;`)
    } else {
      db.sql(`GRANT USAGE ON SCHEMA auth TO ${user};
        GRANT EXECUTE ON FUNCTION auth.issue_context_ticket(uuid,uuid,uuid,text,timestamptz,uuid,uuid) TO ${user};`)
    }
    const client = new Client({ host:'127.0.0.1',port:db.port,database:'phoenix_canonical_dev',
      user,password,connectionTimeoutMillis:2500,query_timeout:6000,statement_timeout:5000 })
    clients.set(name,client)
    await client.connect()
    if (role) await client.query('SET ROLE ' + role)
  }
}

async function bound(role,actor,callback) {
  const binder = clients.get('binder')
  const client = clients.get(role)
  const { rows:[ticket] } = await binder.query(
    "SELECT auth.issue_context_ticket($1,$2,$3,$4,clock_timestamp()+interval '30 seconds',$5,$1) AS id",
    [actor.principal,actor.person,actor.family,actor.person?'FAMILY':'INTERNAL',randomUUID()])
  try {
    await client.query('SELECT auth.redeem_context_ticket($1,$2)',[ticket.id,actor.principal])
    return await callback(client)
  } finally { await client.query('SELECT auth.clear_context()') }
}

async function call(client,routine,...args) {
  const placeholders = args.map((_,i)=>'$'+(i+1)).join(',')
  const { rows:[row] } = await client.query('SELECT education_compass.'+routine+'('+placeholders+') AS result',args)
  return row.result
}

function questionnaire(bank,overrides) {
  const answers = {}
  for (const questionId of bank.requiredQuestionIds) {
    const q = bank.questions.find(item=>item.id===questionId)
    assert(q)
    if (q.type==='YEAR_SELECT') answers[questionId]=String(new Date().getUTCFullYear()+1)
    else if (q.type==='MULTI_CHOICE'||q.type==='MULTI_CHOICE_DYNAMIC') answers[questionId]=[q.options[0].code]
    else if (q.type==='SUBJECT_RANGE_MATRIX') answers[questionId]=[
      {subject_code:q.matrixSubjectOptions[0].code,range_code:q.matrixRangeOptions[0].code}]
    else answers[questionId]=q.options[0].code
  }
  return validateQuestionnaireAnswers({
    level:bank.assessmentLevel,educationSystem:bank.educationSystem,
    questionnaireVersion:bank.questionnaireVersion,answers:{...answers,...overrides},mode:'SUBMIT'
  }).answers
}

function checkBanks(db) {
  const expected = [firstBank,...ALL_EDUCATION_SYSTEMS.map(system=>getEducationCompassQuestionnaireBank('LEVEL_2',system))]
    .map(bank=>[bank.assessmentLevel,bank.educationSystem,bank.questionnaireVersion,bank.schemaDigest,
      [...bank.requiredQuestionIds],bank.systemResultMarker])
    .sort((a,b)=>a[3].localeCompare(b[3]))
  const stored = JSON.parse(db.sql(`SELECT jsonb_agg(jsonb_build_array(level,education_system,questionnaire_version,
    schema_digest,required_ids,system_result_marker) ORDER BY schema_digest) FROM education_compass.questionnaire_bank`))
  assert.deepEqual(stored,expected)
  console.log('PASS all eight V1.1 questionnaire pins match the server registry')
}

async function verify(db) {
  const coreEvidence = id(510), assentEvidence = id(511)
  const signedCore = randomUUID(), signedAssent = randomUUID()
  const l1 = id(600), l2 = id(601), l2Other = id(602)
  const l1Report = id(700), l2Report = id(701), order = id(810), nextOrder = id(811)
  const coreCopy = consentCopySha256(CORE_ASSESSMENT_CONSENT_COPY)
  const assentCopy = consentCopySha256(STUDENT_ASSESSMENT_ASSENT_COPY)
  const purpose = (client,evidence,studentRef,kind,copy,sha,receipt,until=expires)=>
    call(client,'record_purpose',evidence,studentRef,kind,copy,sha,receipt,until)
  const grantCore = (client,hash=coreCopy)=>purpose(client,coreEvidence,student.person,
    'CORE_ASSESSMENT',CORE_ASSESSMENT_CONSENT_VERSION,hash,signedCore)
  const grantAssent = (client)=>purpose(client,assentEvidence,student.person,
    'STUDENT_ASSESSMENT_ASSENT',STUDENT_ASSESSMENT_ASSENT_VERSION,assentCopy,signedAssent)
  const open = (client,target,level,system,source=null,assent=null)=>
    call(client,'open_draft',target,student.person,level,system,source,coreEvidence,assent)
  const submit = (client,target,revision,key=randomUUID())=>call(client,'submit',target,revision,key)
  const read = (client,assessment)=>call(client,'read_report',assessment)
  const invoice = (client,target,ref,state,event=randomUUID(),sku=product,amount=3990,until=expires)=>
    call(client,'apply_verified_reference',target,ref,event,state,sku,amount,'CNY',until)
  const l1Answers = questionnaire(firstBank,{FP02:'GAOKAO',FP06:'WILLING'})
  const l2Answers = questionnaire(secondBank,{EGD01:'CONFIRM_STUDENT_SELF'})

  assert.equal(await read(clients.get('app'),l1),null)
  await bound('app',outsider,async client=>assert.equal(await grantCore(client),'DENIED'))
  await bound('app',guardian,async client=>{
    assert.equal(await grantAssent(client),'DENIED')
    assert.equal(await grantCore(client,'0'.repeat(64)),'DENIED')
    assert.equal(await grantCore(client),'RECORDED')
    assert.equal(await grantCore(client),'REPLAY')
    assert.equal(await open(client,l1,'LEVEL_1',null),'OPENED')
    assert.equal(await open(client,l1,'LEVEL_1',null),'REPLAY')
    assert.equal(await submit(client,l1,1),'INCOMPLETE_OR_EXIT')
    assert.equal(await call(client,'save_draft',l1,1,l1Answers),'SAVED')
    assert.equal(await call(client,'save_draft',l1,1,l1Answers),'STALE')
    const key = randomUUID()
    assert.equal(await submit(client,l1,2,key),'SUBMITTED')
    assert.equal(await submit(client,l1,2,key),'REPLAY')
    assert.equal(await call(client,'save_draft',l1,2,l1Answers),'SEALED')
    await assert.rejects(client.query('SELECT * FROM education_compass.purpose_evidence'),{code:'42501'})
    await assert.rejects(call(client,'publish_report',l1,l1Report,{},true),{code:'42501'})
  })
  await bound('app',student,async client=>{
    assert.equal(await grantCore(client),'DENIED')
    assert.equal(await grantAssent(client),'RECORDED')
    assert.equal(await open(client,l2,'LEVEL_2','GAOKAO',l1,assentEvidence),'DENIED')
  })
  console.log('PASS actual Consent/Assent registration, signer/scope checks, version conflict and immutable submission')

  const reportArgs = async (client,assessment) => {
    const { answers,education_system,questionnaire_version,...scope } =
      await call(client,'read_submission_for_publication',assessment)
    const identity = { assessmentId:scope.assessment_id,familyId:scope.family_id,studentId:scope.student_id }
    const result = education_system
      ? buildStudentGrowthDiscoveryReportV1(identity,education_system,answers,{questionnaireVersion:questionnaire_version})
      : buildFamilyEducationSnapshotV1(identity,answers,{questionnaireVersion:questionnaire_version})
    return { ...scope,result }
  }
  await bound('publisher',publisher,async client=>{
    const artifact = await reportArgs(client,l1)
    assert.equal(await call(client,'publish_report',l1,l1Report,artifact,true),'READY')
  })
  await bound('app',student,async client=>{
    assert.equal(await open(client,l2,'LEVEL_2','GAOKAO',l1,assentEvidence),'OPENED')
    assert.equal(await open(client,l2Other,'LEVEL_2','GAOKAO',l1,assentEvidence),'OPENED')
    for (const assessment of [l2,l2Other]) {
      assert.equal(await call(client,'save_draft',assessment,1,l2Answers),'SAVED')
      assert.equal(await submit(client,assessment,2),'SUBMITTED')
    }
    const locked = await read(client,l2)
    assert.deepEqual(locked,{assessment_id:l2,result_state:'LOCKED',product_code:product,
      amount_fen:3990,currency:'CNY',next_action:'PURCHASE_TO_UNLOCK_REPORT',system_result_marker:'FULL_SYSTEM_BANK'})
    await assert.rejects(invoice(client,l2,order,'PAID'),{code:'42501'})
  })
  await bound('publisher',publisher,async client=>assert.equal(await call(client,'read_submission_for_publication',l2),null))
  await bound('settlement',publisher,async client=>assert.equal(await invoice(client,l2,order,'PAID'),'DENIED'))
  await bound('settlement',settlement,async client=>{
    assert.equal(await invoice(client,l2,order,'UNKNOWN'),'STATE_OR_PRODUCT_DENIED')
    assert.equal(await invoice(client,l2,order,'PAID',randomUUID(),'COMPASS_REPORT_SINGLE_39_9'),'STATE_OR_PRODUCT_DENIED')
    assert.equal(await invoice(client,l2,order,'PAID',randomUUID(),product,3989),'STATE_OR_PRODUCT_DENIED')
    assert.equal(await invoice(client,l2,order,'PAID',randomUUID(),product,3990,new Date(Date.now()-10000)),'EXPIRED')
  })
  const paidEvent=randomUUID(), refundEvent=randomUUID()
  await bound('settlement',settlement,async client=>{
    assert.equal(await invoice(client,l2,order,'PAID',paidEvent),'PAID')
    assert.equal(await invoice(client,l2,order,'PAID',paidEvent),'REPLAY')
    assert.equal(await invoice(client,l2Other,order,'PAID',paidEvent),'SCOPE_DENIED')
    assert.equal(await invoice(client,l2,order,'REFUNDED',paidEvent),'CONFLICT')
  })
  await bound('publisher',settlement,async client=>assert.equal(await call(client,'read_submission_for_publication',l2),null))
  await bound('publisher',publisher,async client=>{
    const artifact = await reportArgs(client,l2)
    assert.equal(await call(client,'publish_report',l2,l2Report,artifact,false),'QA_OR_SCOPE_DENIED')
    assert.equal(await call(client,'publish_report',l2,l2Report,{...artifact,submission_sha256:'0'.repeat(64)},true),'QA_OR_SCOPE_DENIED')
    assert.equal(await call(client,'publish_report',l2,l2Report,artifact,true),'READY')
    assert.equal(await call(client,'publish_report',l2,l2Report,artifact,true),'REPLAY')
    assert.equal(await call(client,'publish_report',l2,id(702),artifact,true),'CONFLICT')
  })
  await bound('app',guardian,async client=>{
    assert.equal((await read(client,l2)).report_id,l2Report)
    assert.equal(await call(client,'read_draft',l2),null)
    assert.equal(await call(client,'withdraw_purpose',assentEvidence),'DENIED')
    assert.equal((await read(client,l2Other)).result_state,'LOCKED')
  })
  for (const actor of [otherGuardian,outsider]) {
    await bound('app',actor,async client=>assert.equal(await read(client,l2),null))
  }
  await bound('app',student,async client=>assert.equal((await read(client,l2)).report_id,l2Report))
  console.log('PASS publisher and settlement separation, exact SKU and submission digest, single report, guardian signer scope')

  await bound('settlement',settlement,async client=>{
    assert.equal(await invoice(client,l2,order,'REFUNDING'),'REFUNDING')
  })
  await bound('app',guardian,async client=>assert.equal((await read(client,l2)).result_state,'LOCKED'))
  await bound('settlement',settlement,async client=>{
    assert.equal(await invoice(client,l2,order,'REFUNDED',randomUUID(),product,100),'STATE_OR_PRODUCT_DENIED')
    assert.equal(await invoice(client,l2,order,'REFUNDED',refundEvent),'REFUNDED')
    assert.equal(await invoice(client,l2,order,'REFUNDED',refundEvent),'REPLAY')
    assert.equal(await invoice(client,l2,order,'PAID',paidEvent),'REPLAY')
    assert.equal(await invoice(client,l2,order,'PAID'),'STALE')
    assert.equal(await invoice(client,l2,order,'REFUNDING'),'STALE')
  })
  await bound('app',student,async client=>assert.equal((await read(client,l2)).result_state,'LOCKED'))
  await bound('settlement',settlement,async client=>assert.equal(await invoice(client,l2,nextOrder,'PAID'),'PAID'))
  await bound('app',student,async client=>{
    assert.equal((await read(client,l2)).report_id,l2Report)
    assert.equal(await call(client,'withdraw_purpose',assentEvidence),'WITHDRAWN')
    assert.equal(await call(client,'withdraw_purpose',assentEvidence),'REPLAY')
    assert.equal(await grantAssent(client),'REPLAY')
    assert.equal(await read(client,l2),null)
  })
  await bound('app',guardian,async client=>{
    assert.equal(await read(client,l2),null)
    assert.equal((await read(client,l1)).report_id,l1Report)
    assert.equal(await call(client,'withdraw_purpose',coreEvidence),'WITHDRAWN')
    assert.equal(await read(client,l1),null)
  })
  await bound('settlement',settlement,async client=>{
    assert.equal(await invoice(client,l2,nextOrder,'REFUNDED'),'REFUNDED')
    assert.equal(await invoice(client,l2Other,id(812),'PAID'),'CONSENT_REQUIRED')
  })
  assert.equal(db.sql("SELECT count(*) FROM education_compass.report_artifact"),'2')
  assert.equal(db.sql("SELECT count(*) FROM education_compass.source_event"),'5')
  assert.equal(db.sql("SELECT count(*) FROM education_compass.purpose_evidence WHERE withdrawn_at IS NOT NULL"),'2')
  assert.equal(db.sql("SELECT count(*) FROM auth.session_contexts"),'0')
  assert.equal(db.sql("SELECT count(*) FROM auth.context_exchange_tickets"),'0')
  assert.equal(db.sql("SELECT count(DISTINCT decision) FROM audit.access_events WHERE resource_kind='EDUCATION_COMPASS_REPORT'"),'2')
  console.log('PASS refund terminal and replay rules, distinct repurchase, both purpose withdrawals, scoped audits and context cleanup')
}

let db
try {
  db=await createCluster(version,{initialize:false})
  db.call(['exec',db.container,'mv','/opt/canonical-migrations/0038_service_project_workbench.sql','/opt/verification/'])
  const migration = db.call(['exec','-e','CANONICAL_EXPECTED_MIGRATIONS=37',db.container,'bash','/opt/verification/migrate.sh'])
  console.log(migration)
  assert.match(migration,/APPLIED 0037_.+\nPASS ledger=37 files=37 expected=37/)
  const serverVersion=db.sql('SHOW server_version')
  assert.match(serverVersion,new RegExp('^'+version+'\\.'))
  console.log('SERVER_VERSION',serverVersion)
  console.log('CANDIDATE_SHA256_LF',createHash('sha256').update(candidate).digest('hex'))
  assert.throws(()=>db.sql(candidate),/education candidate requires isolation/)
  assert.equal(db.sql("SELECT count(*) FROM pg_namespace WHERE nspname='education_compass'"),'0')
  assert.equal(db.call(['inspect','--format','{{index .Config.Labels "canonical.workbench.test"}}',db.container]),db.nonce)
  db.sql("SET phoenix.education_compass_candidate='isolated';\n"+candidate)
  assert.equal(db.sql(`SELECT count(*) FROM pg_roles WHERE rolname IN (
    'phoenix_education_compass_owner','phoenix_education_compass_app',
    'phoenix_education_compass_publisher','phoenix_education_compass_settlement')
    AND NOT (rolcanlogin OR rolsuper OR rolcreaterole OR rolcreatedb OR rolbypassrls)`),'4')
  checkBanks(db)
  seed(db)
  await connect(db)
  await verify(db)
  assert.equal(db.sql('SELECT count(*) FROM canonical_migrations.applied'),'37')
  console.log(`PG${version} EDUCATION_FORWARD_CANDIDATE=PASS NUMBERED_LEDGER=37 LIVE_INTEGRATION=HOLD`)
} finally {
  await Promise.allSettled([...clients.values()].map(client=>client.end()))
  db?.cleanup()
}
