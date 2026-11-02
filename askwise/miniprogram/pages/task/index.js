const api = require('../../api');
const pending = require('../../pending');
const projection = require('../../task-projection');
const storage = require('../../storage');
const ui = require('../../ui');

const SUBJECT_OPTIONS = ['Mathematics', 'Politics'];
const TOPICS_BY_SUBJECT = {
  Mathematics: ['line intersects ellipse with Vieta'],
  Politics: ['联系多样性 vs 矛盾特殊性']
};

function topicsFor(subject) {
  return TOPICS_BY_SUBJECT[subject] || [];
}

function answerFromData(data) {
  return {
    conditions: String(data.conditions || '').trim(),
    method: String(data.method || '').trim(),
    work: String(data.work || '').trim(),
    conclusion: String(data.conclusion || '').trim()
  };
}

function answerIsEmpty(answer) {
  return !answer || !Object.keys(answer).some((key) => String(answer[key] || '').trim());
}

function validateCreatePayload(payload) {
  if (!SUBJECT_OPTIONS.includes(payload.subject)) {
    return '请选择 Mathematics 或 Politics。';
  }
  if (!topicsFor(payload.subject).includes(payload.topic)) {
    return 'topic 只支持当前两个场景，请重新选择。';
  }
  if (!payload.question) {
    return '请填写问题。';
  }
  if (answerIsEmpty(payload.answer)) {
    return 'answer 不能为空，请至少填写一个结构化答案字段。';
  }
  return '';
}

Page({
  data: Object.assign(ui.pageState('idle'), {
    id: '',
    subjectOptions: SUBJECT_OPTIONS,
    topicOptions: TOPICS_BY_SUBJECT.Mathematics,
    subjectIndex: 0,
    topicIndex: 0,
    subject: 'Mathematics',
    topic: TOPICS_BY_SUBJECT.Mathematics[0],
    question: '',
    conditions: '',
    method: '',
    work: '',
    conclusion: '',
    task: null,
    session: null,
    sessionSolved: 0,
    attempts: [],
    diagnosis: null,
    latestHint: null,
    latestEvidenceText: '',
    photos: [],
    pendingCreate: false,
    pendingAttempt: false,
    pendingUpload: false,
    uploading: false,
    photoLoading: false,
    uploadPath: ''
  }),

  onLoad(options) {
    if (!storage.getToken()) {
      ui.toLogin();
      return;
    }
    const id = options && options.id ? String(options.id) : '';
    this.setData({ id });
    if (id) {
      this.loadTask();
      return;
    }
    this.hydratePendingCreate();
  },

  hydratePendingCreate() {
    const record = pending.read('task-create');
    if (!record || !record.payload) {
      return;
    }
    const payload = record.payload;
    const answer = payload.answer || {};
    const subjectIndex = SUBJECT_OPTIONS.indexOf(payload.subject);
    const subject = subjectIndex >= 0 ? payload.subject : '';
    const topicOptions = topicsFor(subject || SUBJECT_OPTIONS[0]);
    const topicIndex = topicOptions.indexOf(payload.topic);
    this.setData({
      pendingCreate: true,
      subjectIndex: subjectIndex >= 0 ? subjectIndex : 0,
      subject,
      topicOptions,
      topicIndex: topicIndex >= 0 ? topicIndex : 0,
      topic: topicIndex >= 0 ? payload.topic : '',
      question: payload.question || '',
      conditions: answer.conditions || '',
      method: answer.method || '',
      work: answer.work || '',
      conclusion: answer.conclusion || ''
    });
  },

  onSubjectChange(event) {
    const subjectIndex = Number(event.detail.value);
    const subject = SUBJECT_OPTIONS[subjectIndex];
    const topicOptions = topicsFor(subject);
    this.setData({
      subjectIndex,
      subject,
      topicOptions,
      topicIndex: 0,
      topic: topicOptions[0] || ''
    });
  },

  onTopicChange(event) {
    const topicIndex = Number(event.detail.value);
    this.setData({
      topicIndex,
      topic: this.data.topicOptions[topicIndex] || ''
    });
  },

  onFieldInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [field]: event.detail.value });
  },

  setError(error) {
    const attemptPending = this.data.id && pending.read('attempt-' + this.data.id);
    const uploadPending = this.data.id && pending.read('upload-' + this.data.id);
    this.setData(Object.assign(ui.pageState('error', ui.safeError(error)), {
      pendingCreate: Boolean(pending.read('task-create')),
      pendingAttempt: Boolean(attemptPending),
      pendingUpload: Boolean(uploadPending)
    }));
    if (ui.isUnauthorized(error)) {
      ui.toLogin();
    }
  },

  loadTask() {
    if (!this.data.id) {
      return Promise.resolve(null);
    }
    this.setData(ui.pageState('busy'));
    return api.getTask(this.data.id).then((response) => {
      this.applyTaskDetail(response);
      return response;
    }).catch((error) => {
      this.setError(error);
      return null;
    });
  },

  applyTaskDetail(response) {
    const projected = projection.projectTaskDetail(response);
    const evidence = projected.latestEvidence;
    const latestEvidenceText = typeof evidence === 'string'
      ? evidence
      : (evidence && (evidence.title || evidence.description || evidence.url || ''));
    this.setData(Object.assign(ui.pageState(projected.solved ? 'solved' : 'idle'), {
      task: projected.task,
      session: projected.session,
      sessionSolved: projected.sessionSolved,
      attempts: projected.attempts,
      diagnosis: projected.diagnosis,
      latestHint: projected.latestHint,
      latestEvidenceText: latestEvidenceText || '',
      photos: projected.photos
    }));
  },

  createPayload() {
    return {
      subject: String(this.data.subject || '').trim(),
      topic: String(this.data.topic || '').trim(),
      question: String(this.data.question || '').trim(),
      answer: answerFromData(this.data)
    };
  },

  submitCreatePayload(payload, requestId) {
    this.setData(Object.assign(ui.pageState('busy'), { pendingCreate: true }));
    return api.createTask(payload, requestId).then((response) => {
      const body = response || {};
      const taskId = body.taskId;
      if (!taskId) {
        this.setError({ code: 'API_SHAPE', message: '创建任务响应缺少 taskId，未标记为成功。' });
        return null;
      }
      this.setData(Object.assign(ui.pageState('idle'), { pendingCreate: false }));
      wx.redirectTo({ url: '/pages/task/index?id=' + encodeURIComponent(String(taskId)) });
      return body;
    }).catch((error) => {
      this.setError(error);
      return null;
    });
  },

  submitCreate() {
    const payload = this.createPayload();
    const validationError = validateCreatePayload(payload);
    if (validationError) {
      this.setData(ui.pageState('error', validationError));
      return;
    }
    this.submitCreatePayload(payload);
  },

  retryCreate() {
    const record = pending.read('task-create');
    if (!record) {
      return;
    }
    const validationError = validateCreatePayload(record.payload);
    if (validationError) {
      this.setData(ui.pageState('error', validationError));
      return;
    }
    this.submitCreatePayload(record.payload, record.request_id);
  },

  attemptPayload() {
    return { answer: answerFromData(this.data) };
  },

  submitAttemptPayload(payload, requestId) {
    if (!this.data.id) {
      return Promise.resolve(null);
    }
    const body = payload || null;
    if (body && answerIsEmpty(body.answer)) {
      this.setData(ui.pageState('error', 'answer 不能为空，请填写至少一个结构化答案字段。'));
      return Promise.resolve(null);
    }
    this.setData(Object.assign(ui.pageState('busy'), { pendingAttempt: true }));
    return api.submitAttempt(this.data.id, body, requestId).then(() => {
      // The retry response is not a snapshot. Always re-read the server state
      // so solved, diagnosis, hint and evidence come from GET /tasks/:id.
      this.setData({ pendingAttempt: false });
      return this.loadTask();
    }).catch((error) => {
      this.setError(error);
      return null;
    });
  },

  submitAttempt() {
    this.submitAttemptPayload(this.attemptPayload());
  },

  retryAttempt() {
    const record = pending.read('attempt-' + this.data.id);
    if (record) {
      this.submitAttemptPayload(null, record.request_id);
    }
  },

  onChoosePhoto() {
    if (!this.data.id) {
      return;
    }
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (response) => {
        const filePath = response && response.tempFilePaths && response.tempFilePaths[0];
        if (!filePath || !api.isAllowedPhoto(filePath)) {
          this.setError({ code: 'VALIDATION', message: '只支持 png、jpeg 或 webp 图片。' });
          return;
        }
        this.uploadPhoto(filePath);
      },
      fail: () => {}
    });
  },

  uploadPhoto(filePath, requestId) {
    this.setData(Object.assign(ui.pageState('busy'), { uploading: true, pendingUpload: true }));
    return api.uploadPhoto(this.data.id, filePath, requestId).then(() => {
      this.setData(Object.assign(ui.pageState('idle'), {
        uploading: false,
        pendingUpload: false,
        uploadPath: ''
      }));
      return this.loadTask();
    }).catch((error) => {
      this.setData({ uploading: false });
      this.setError(error);
      return null;
    });
  },

  retryUpload() {
    const record = pending.read('upload-' + this.data.id);
    if (record && record.payload) {
      this.uploadPhoto(record.payload.filePath, record.request_id);
    }
  },

  openPhoto(event) {
    const photoId = event.currentTarget.dataset.photoId;
    if (!photoId) {
      return;
    }
    this.setData({ photoLoading: true });
    api.downloadAuthenticated('/uploads/' + encodeURIComponent(String(photoId))).then((response) => {
      this.setData({ photoLoading: false });
      wx.previewImage({ current: response.tempFilePath, urls: [response.tempFilePath] });
    }).catch((error) => {
      this.setData({ photoLoading: false });
      this.setError(error);
    });
  },

  goToday() {
    wx.reLaunch({ url: '/pages/today/index' });
  },

  goEvidence() {
    wx.navigateTo({ url: '/pages/evidence/index' });
  },

  logout() {
    api.logout().then(ui.toLogin, ui.toLogin);
  }
});
