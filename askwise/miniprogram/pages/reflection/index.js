const api = require('../../api');
const pending = require('../../pending');
const storage = require('../../storage');
const ui = require('../../ui');

Page({
  data: Object.assign(ui.pageState('idle'), {
    q1: '',
    q2: '',
    q3: '',
    reflections: [],
    pendingSubmit: false
  }),

  onShow() {
    if (!storage.getToken()) {
      ui.toLogin();
      return;
    }
    this.hydratePending();
    this.loadReflections();
  },

  hydratePending() {
    const record = pending.read('reflection');
    if (record && record.payload) {
      this.setData(Object.assign({ pendingSubmit: true }, record.payload));
    }
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [field]: event.detail.value });
  },

  loadReflections() {
    this.setData(ui.pageState('busy'));
    api.getReflection().then((response) => {
      this.setData(Object.assign(ui.pageState('idle'), {
        reflections: Array.isArray(response) ? response : []
      }));
    }).catch((error) => {
      if (ui.isUnauthorized(error)) {
        ui.toLogin();
        return;
      }
      this.setData(ui.pageState('error', ui.safeError(error)));
    });
  },

  submitPayload(payload, requestId) {
    this.setData(Object.assign(ui.pageState('busy'), { pendingSubmit: true }));
    api.submitReflection(payload, requestId).then(() => {
      this.setData(Object.assign(ui.pageState('solved'), { pendingSubmit: false }));
      this.loadReflections();
    }).catch((error) => {
      this.setData({ pendingSubmit: Boolean(pending.read('reflection')) });
      if (ui.isUnauthorized(error)) {
        ui.toLogin();
        return;
      }
      this.setData(ui.pageState('error', ui.safeError(error)));
    });
  },

  submit() {
    const payload = {
      q1: String(this.data.q1 || '').trim(),
      q2: String(this.data.q2 || '').trim(),
      q3: String(this.data.q3 || '').trim()
    };
    if (!payload.q1 || !payload.q2 || !payload.q3) {
      this.setData(ui.pageState('error', 'q1、q2、q3 三个复盘字段必须全部填写。'));
      return;
    }
    this.submitPayload(payload);
  },

  retrySubmit() {
    const record = pending.read('reflection');
    if (record) {
      this.submitPayload(null, record.request_id);
    }
  },

  goToday() {
    wx.reLaunch({ url: '/pages/today/index' });
  },

  goEvidence() {
    wx.navigateTo({ url: '/pages/evidence/index' });
  },

  goDashboard() {
    wx.navigateTo({ url: '/pages/dashboard/index' });
  },

  logout() {
    api.logout().then(ui.toLogin, ui.toLogin);
  }
});
