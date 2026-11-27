import assert from 'node:assert/strict';
import test from 'node:test';
import {projectFamilyLearning, readFamilyLearning} from '../lib/family-learning.ts';
import {familyP1Enabled} from '../lib/family-p1-session.ts';

const origin = 'http://localhost:3000';
const student = id => ({ref: 'stu_' + id.repeat(32), name: `Synthetic ${id}`, courses: [{
  title: 'Interview practice', practiceTitle: 'Introduce yourself', status: 'SUBMITTED', answer: 'private answer',
}]});
const request = (path = '', options) => new Request(`${origin}/api/family-learning${path}`, options);
const session = (id = 'student-a', expiry = Date.now() + 60000) => ({id, username: id,
  token_hash: `synthetic-${id}`, created_at: Date.now(), valid_until: expiry});
const auth = verifySession => ({origin, verifySession, async recordAccess() {}});
const allow = (payload, assertCurrent = async () => {}) => ({readAssignedProgress: async () => payload, assertCurrent});

test('practice answer fields cannot enter the family summary; student projection is self only', () => {
  assert.deepEqual(projectFamilyLearning({role: 'PARENT', students: [student('a')]}).students[0].courses[0], {
    title: 'Interview practice', teacherArrangement: null, practiceTitle: 'Introduce yourself', status: 'SUBMITTED',
  });
  assert.equal(projectFamilyLearning({role: 'STUDENT', students: [student('a'), student('b')]}), null);
  assert.equal(projectFamilyLearning({role: 'PARENT', students: [student('a'), student('a')]}), null);
});


test('only published study plans and teacher arrangements enter the family view', () => {
  const child = student('a');
  child.plan = {publication: 'PUBLISHED', period: 'Term 1', goals: ['Prepare for the interview'], internalNotes: 'private'};
  const [course] = child.courses;
  const publicArrangement = {teacherName: 'Synthetic teacher', meeting: 'Monday 16:30', delivery: 'ONLINE'};
  course.teacherArrangement = {...publicArrangement, publication: 'DRAFT', phone: 'private'};
  const project = () => projectFamilyLearning({role: 'PARENT', students: [child]}).students[0];
  assert.deepEqual(project().plan, {period: 'Term 1', goals: ['Prepare for the interview']});
  assert.equal(project().courses[0].teacherArrangement, null);
  course.teacherArrangement.publication = 'PUBLISHED';
  assert.deepEqual(project().courses[0].teacherArrangement, publicArrangement);
  child.plan.publication = 'DRAFT';
  assert.equal(project().plan, null);
});

test('server scoping receives the verified identity and rejects direct subject overrides', async () => {
  const provider = {async resolve({customerId, sessionHash}) {
    assert.equal(sessionHash, `synthetic-${customerId}`);
    return customerId === 'parent-a' ? allow({role: 'PARENT', students: [student('a'), student('c')]}) : null;
  }};
  const parent = auth(async () => session('parent-a'));
  const result = await readFamilyLearning(request(), parent, provider);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual((await result.json()).students.map(item => item.name), ['Synthetic a', 'Synthetic c']);
  assert.equal((await readFamilyLearning(request('?student=b'), parent, provider)).status, 403);
  assert.equal((await readFamilyLearning(request('', {headers: {'x-role': 'PARENT'}}), parent, provider)).status, 401);
  assert.equal((await readFamilyLearning(request(), auth(async () => session('parent-b')), provider)).status, 403);
});

test('revoked scope, expired session and unreachable provider release no projection', async () => {
  let checks = 0;
  const provider = {resolve: async () => allow({role: 'STUDENT', students: [student('a')]}, async () => {
    if (++checks === 2) throw Error('Scope revoked');
  })};
  assert.equal((await readFamilyLearning(request(), auth(async () => session()), provider)).status, 503);
  assert.equal((await readFamilyLearning(request(), auth(async () => session('student-a', 1)), provider)).status, 401);
  assert.equal((await readFamilyLearning(request(), auth(async () => session()))).status, 503);
  assert.equal((await readFamilyLearning(request('', {method: 'POST'}), auth(async () => session()), provider)).status, 405);
  assert.equal(familyP1Enabled({FAMILY_P1_ENABLED: '1'}, 'production'), false);
});

test('customer task writes recheck assignment and reuse the request idempotency key', async context => {
  const {handleServiceWorkbench} = await import('../lib/service-workbench-bff.ts');
  const uuid = n => `01920000-0000-7000-8000-00000000000${n}`;
  const project = uuid(1), task = uuid(2), principal = uuid(3), event = uuid(4);
  const env = {FAMILY_P1_ENABLED: '1', SERVICE_WORKBENCH_ENABLED: 'true', SERVICE_WORKBENCH_API_ORIGIN: 'http://127.0.0.1:4678'};
  const token = 's'.repeat(43), resource = `projects/${project}/commands`;
  const key = 'a'.repeat(32);
  const submit = (id, kind = 'TASK_STATUS') => handleServiceWorkbench(new Request(`${origin}/api/service-workbench/${resource}`, {
    method: 'POST', headers: {origin, 'content-type': 'application/json', 'idempotency-key': key},
    body: JSON.stringify({kind, payload: {id, reason: 'CLIENT_ACTION', revision: 1, status: 'COMPLETED'}}),
  }), env, 'development', resource, token);
  let assigned = true, active = true, status = 'IN_PROGRESS';
  const persisted = new Set();
  const outbound = context.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal(options.headers.Authorization, `Bearer ${token}`);
    if (options.method === 'POST') {
      const requestKey = options.headers['Idempotency-Key'];
      const replayed = persisted.has(requestKey);
      persisted.add(requestKey);
      status = 'COMPLETED';
      return Response.json({status: 'ALLOW', result: {eventId: event, revision: 2}, replayed});
    }
    return Response.json({schemaVersion: 'service-workbench.v1',
      project: {id: project, title: 'Synthetic A', domain: 'EDUCATION', status: active ? 'ACTIVE' : 'CLOSED', stage: 'INTERVIEW',
        opened: active, template: 'HK_MASTERS', code: 'A', scope: 'Synthetic', revision: 1, staff: false, write: false,
        manage: false, clinicalEnabled: false, viewerPrincipalId: principal},
      subjects: [], team: [], milestones: [], tasks: [{id: task, title: 'Interview Practice', status, priority: 'NORMAL',
        dueAt: null, assignee: assigned ? principal : uuid(5), subjectId: uuid(6), audience: 'CUSTOMER'}],
      applications: [], materials: [], deliverables: [], messages: [], events: [], commercial: {availability: 'NOT_AUTHORIZED'},
    });
  });
  assert.equal((await submit(task, 'STAGE')).status, 422);
  assert.equal(outbound.mock.callCount(), 0);
  assert.equal((await submit(uuid(7))).status, 403);
  assert.equal((await (await submit(task)).json()).replayed, false);
  assert.equal((await (await submit(task)).json()).replayed, true);
  assert.deepEqual([...persisted], [key]);
  assigned = false;
  assert.equal((await submit(task)).status, 403);
  assigned = true;
  active = false;
  assert.equal((await submit(task)).status, 403);
});
