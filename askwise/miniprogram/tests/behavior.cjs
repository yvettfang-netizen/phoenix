'use strict';

const assert = require('assert');

const storageData = new Map();
const calls = [];
const redirects = [];
let requestHandler = () => ({ statusCode: 500, data: {} });
let downloadHandler = () => ({ statusCode: 200, tempFilePath: '/tmp/evidence.bin' });

global.wx = {
  getStorageSync(key) {
    return storageData.get(key);
  },
  setStorageSync(key, value) {
    storageData.set(key, value);
  },
  removeStorageSync(key) {
    storageData.delete(key);
  },
  getStorageInfoSync() {
    return { keys: Array.from(storageData.keys()) };
  },
  request(options) {
    calls.push({ kind: 'request', options });
    const result = requestHandler(options);
    if (result && result.fail) {
      options.fail({ errMsg: 'mock network failure' });
      return;
    }
    options.success(result);
  },
  downloadFile(options) {
    calls.push({ kind: 'download', options });
    const result = downloadHandler(options);
    if (result && result.fail) {
      options.fail({ errMsg: 'mock download failure' });
      return;
    }
    options.success(result);
  },
  uploadFile() {
    throw new Error('uploadFile is not used in this behavior test');
  },
  reLaunch() {},
  navigateTo() {},
  redirectTo(options) {
    redirects.push(options);
  }
};

const config = require('../config');
const API_ROOT = 'https://api.example.test/api/pilot/v1';
config.getApiRoot = () => API_ROOT;
config.buildUrl = (path) => API_ROOT + (String(path).charAt(0) === '/' ? path : '/' + path);
config.buildAssetUrl = (path) => 'https://api.example.test' + (String(path).charAt(0) === '/' ? path : '/' + path);

const storage = require('../storage');
const pending = require('../pending');
const api = require('../api');
const projection = require('../task-projection');
const evidenceProjection = require('../evidence-projection');
const ui = require('../ui');

assert.strictEqual(ui.poseFor('error'), ui.POSES.idle);
assert.strictEqual(ui.poseFor('busy'), 'https://api.example.test/assets/aoyu/poses/thinking.png');

function settle(promise) {
  return promise.then((value) => ({ ok: true, value }), (error) => ({ ok: false, error }));
}

async function main() {
  requestHandler = (options) => {
    if (options.url === API_ROOT + '/login') {
      return { statusCode: 200, data: { token: 'token-one' } };
    }
    return { statusCode: 200, data: {} };
  };
  await api.localLogin('student-one', 'uat-only');
  assert.strictEqual(storage.getToken(), 'token-one');

  const createPayload = {
    subject: 'Mathematics',
    topic: 'line intersects ellipse with Vieta',
    question: 'mock question',
    answer: { conditions: 'a', method: 'b', work: 'c', conclusion: 'd' }
  };
  requestHandler = () => ({ fail: true });
  const failedCreate = await settle(api.createTask(createPayload, 'create-key-1'));
  assert.strictEqual(failedCreate.ok, false);
  const pendingAfterFailure = pending.read('task-create');
  assert.strictEqual(pendingAfterFailure.request_id, 'create-key-1');
  assert.deepStrictEqual(pendingAfterFailure.payload.answer, createPayload.answer);

  requestHandler = (options) => {
    assert.strictEqual(options.data.request_id, 'create-key-1');
    return { statusCode: 200, data: { taskId: 'task-real-1', sessionId: 'session-real-1' } };
  };
  await api.createTask(null, 'create-key-1');
  assert.strictEqual(pending.read('task-create'), null);

  pending.save('reflection', 'unauthorized-key', { q1: 'a', q2: 'b', q3: 'c' });
  requestHandler = () => ({ statusCode: 401, data: { error: 'expired' } });
  const unauthorized = await settle(api.getToday());
  assert.strictEqual(unauthorized.ok, false);
  assert.strictEqual(storage.getToken(), '');
  assert.strictEqual(Array.from(storageData.keys()).some((key) => key.indexOf('askwise.pending.') === 0), false);

  requestHandler = (options) => ({
    statusCode: 200,
    data: { token: options.url.endsWith('/login') ? 'token-two' : 'token-three' }
  });
  await api.localLogin('student-two', 'uat-only');
  pending.save('reflection', 'new-student-key', { q1: 'x', q2: 'y', q3: 'z' });
  await api.localLogin('student-three', 'uat-only');
  assert.strictEqual(pending.read('reflection'), null);
  pending.save('reflection', 'logout-key', { q1: 'x', q2: 'y', q3: 'z' });
  requestHandler = () => ({ statusCode: 200, data: {} });
  await api.logout();
  assert.strictEqual(storage.getToken(), '');
  assert.strictEqual(pending.read('reflection'), null);

  requestHandler = () => ({ statusCode: 200, data: { token: 'token-download' } });
  await api.localLogin('student-four', 'uat-only');
  const originalRemoveStorageSync = wx.removeStorageSync;
  wx.removeStorageSync = (key) => {
    if (key === 'askwise.session.token') {
      throw new Error('mock token clear failure');
    }
    storageData.delete(key);
  };
  const clearResult = storage.clearSession();
  assert.strictEqual(clearResult, false);
  assert.strictEqual(storage.getToken(), '');
  wx.removeStorageSync = originalRemoveStorageSync;
  requestHandler = () => ({ statusCode: 200, data: { token: 'token-download' } });
  await api.localLogin('student-four', 'uat-only');
  let downloadCalls = 0;
  downloadHandler = (options) => {
    downloadCalls += 1;
    assert.strictEqual(options.header.Authorization, 'Bearer token-download');
    return { statusCode: 200, tempFilePath: '/tmp/evidence.bin' };
  };
  const foreignDownload = await settle(api.downloadAuthenticated('https://evil.example/assets/a.png'));
  assert.strictEqual(foreignDownload.ok, false);
  assert.strictEqual(foreignDownload.error.code, 'CONFIG');
  assert.strictEqual(downloadCalls, 0);
  await api.downloadAuthenticated('/uploads/evidence.png');
  await api.downloadAuthenticated('/uploads/550e8400-e29b-41d4-a716-446655440000');
  await api.downloadAuthenticated(API_ROOT + '/uploads/evidence.png');
  assert.strictEqual(downloadCalls, 3);

  const projected = projection.projectTaskDetail({
    task: { id: 'task-real-1', subject: 'Mathematics', topic: createPayload.topic, question: 'q' },
    session: { id: 'session-real-1', solved: 1 },
    diagnosis: { type: 'K2', reason: 'work missing', confidence: 0.75 },
    latestHint: { hint_level: 2, content: 'check the substitution' },
    attempts: [{
      attempt_number: 2,
      student_response: '{"conclusion":"x"}',
      hint_level: 2,
      is_correct: true,
      timestamp: '2026-11-01T00:00:00Z'
    }],
    latestEvidence: { title: 'mock evidence' },
    photos: [{
      id: '550e8400-e29b-41d4-a716-446655440000',
      student_id: 7,
      task_id: 101,
      content_type: 'image/jpeg',
      bytes: 321,
      created_at: '2026-11-01T00:00:00Z'
    }]
  });
  assert.strictEqual(projected.sessionSolved, 1);
  assert.strictEqual(projected.solved, true);
  assert.deepStrictEqual(projected.diagnosis, { type: 'K2', reason: 'work missing', confidence: 0.75 });
  assert.deepStrictEqual(projected.latestHint, { hint_level: 2, content: 'check the substitution' });
  assert.deepStrictEqual(projected.attempts[0].studentResponse, { conclusion: 'x' });
  assert.strictEqual(projected.attempts[0].isCorrect, true);
  assert.strictEqual(projected.attempts[0].isCorrectLabel, '规则识别通过');
  assert.strictEqual(projected.photos[0].id, '550e8400-e29b-41d4-a716-446655440000');
  assert.strictEqual(projected.photos[0].bytes, 321);

  const evidence = evidenceProjection.projectEvidenceList([{
    id: 8,
    task_id: 101,
    date: '2026-11-01',
    subject: 'Mathematics',
    topic: 'line intersects ellipse with Vieta',
    question: 'q',
    initial_attempt: '{"work":"x"}',
    diagnosis: 'K2',
    hint_level: 1,
    hint_count: 2,
    retry_count: 1,
    final_result: 'pass',
    independence: 'independent',
    reflection: 'r',
    created_at: '2026-11-01T00:00:00Z'
  }]);
  assert.strictEqual(evidence[0].subject, 'Mathematics');
  assert.strictEqual(evidence[0].initialAttempt, '{"work":"x"}');
  assert.strictEqual(evidence[0].hintCount, 2);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(evidence[0], 'downloadUrl'), false);

  let pageDefinition;
  global.Page = (definition) => {
    pageDefinition = definition;
  };
  require('../pages/task/index.js');
  const page = {
    data: Object.assign({}, pageDefinition.data, {
      id: 'task-real-1',
      conditions: 'a',
      method: 'b',
      work: 'c',
      conclusion: 'd'
    }),
    setData(patch) {
      this.data = Object.assign({}, this.data, patch);
    }
  };
  page.applyTaskDetail = pageDefinition.applyTaskDetail.bind(page);
  page.setError = pageDefinition.setError.bind(page);
  page.loadTask = pageDefinition.loadTask.bind(page);
  requestHandler = (options) => {
    if (options.method === 'POST' && options.url.endsWith('/tasks/task-real-1/attempts')) {
      return { statusCode: 200, data: { sessionId: 'session-real-1', diagnosis: {}, mode: 'debug', correct: false } };
    }
    if (options.method === 'GET' && options.url.endsWith('/tasks/task-real-1')) {
      return {
        statusCode: 200,
        data: {
          task: { id: 'task-real-1', subject: 'Mathematics', topic: createPayload.topic, question: 'q' },
          session: { id: 'session-real-1', solved: 1 },
          diagnosis: { type: 'K3', reason: 'refreshed reason', confidence: 0.9 },
          latestHint: { hint_level: 3, content: 'refreshed hint' },
          latestEvidence: { title: 'refreshed evidence' },
          attempts: []
        }
      };
    }
    return { statusCode: 500, data: {} };
  };
  const callsBeforeRetry = calls.length;
  await pageDefinition.submitAttemptPayload.call(page, { answer: createPayload.answer }, 'attempt-retry-key');
  const retryCalls = calls.slice(callsBeforeRetry).filter((entry) => entry.kind === 'request');
  assert.strictEqual(retryCalls[0].options.method, 'POST');
  assert.strictEqual(retryCalls[1].options.method, 'GET');
  assert.strictEqual(page.data.latestHint.content, 'refreshed hint');
  assert.strictEqual(page.data.latestEvidenceText, 'refreshed evidence');
  assert.strictEqual(page.data.sessionSolved, 1);

  redirects.length = 0;
  page.data = Object.assign({}, pageDefinition.data);
  requestHandler = () => ({ statusCode: 200, data: { sessionId: 'session-only' } });
  await pageDefinition.submitCreatePayload.call(page, createPayload, 'missing-id-key');
  assert.strictEqual(redirects.length, 0);
  assert.strictEqual(page.data.state, 'error');
  assert.ok(page.data.error.indexOf('taskId') >= 0);

  requestHandler = () => ({ statusCode: 200, data: { taskId: 'task-real-2', sessionId: 'session-real-2' } });
  await pageDefinition.submitCreatePayload.call(page, createPayload, 'real-id-key');
  assert.strictEqual(redirects.length, 1);
  assert.ok(redirects[0].url.indexOf('id=task-real-2') >= 0);
  assert.strictEqual(page.data.state, 'idle');

  console.log('askwise native miniprogram mock wx behavior: PASS');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
