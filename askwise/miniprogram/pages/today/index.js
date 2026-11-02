const api = require('../../api');
const storage = require('../../storage');
const ui = require('../../ui');

Page({
  data: Object.assign(ui.pageState('idle'), {
    day: '',
    tasks: []
  }),

  onShow() {
    if (!storage.getToken()) {
      ui.toLogin();
      return;
    }
    this.loadToday();
  },

  loadToday() {
    this.setData(ui.pageState('busy'));
    api.getToday().then((response) => {
      this.setData(Object.assign(ui.pageState('idle'), {
        day: response && response.day ? response.day : '',
        tasks: response && Array.isArray(response.tasks) ? response.tasks : []
      }));
    }).catch((error) => {
      if (ui.isUnauthorized(error)) {
        ui.toLogin();
        return;
      }
      this.setData(ui.pageState('error', ui.safeError(error)));
    });
  },

  retry() {
    this.loadToday();
  },

  openTask(event) {
    const id = event.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({ url: '/pages/task/index?id=' + encodeURIComponent(String(id)) });
    }
  },

  newTask() {
    wx.navigateTo({ url: '/pages/task/index' });
  },

  goEvidence() {
    wx.navigateTo({ url: '/pages/evidence/index' });
  },

  goReflection() {
    wx.navigateTo({ url: '/pages/reflection/index' });
  },

  goDashboard() {
    wx.navigateTo({ url: '/pages/dashboard/index' });
  },

  logout() {
    api.logout().then(ui.toLogin, ui.toLogin);
  }
});
