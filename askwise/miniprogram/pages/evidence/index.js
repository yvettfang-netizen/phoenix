const api = require('../../api');
const storage = require('../../storage');
const ui = require('../../ui');
const projection = require('../../evidence-projection');

Page({
  data: Object.assign(ui.pageState('idle'), {
    items: []
  }),

  onShow() {
    if (!storage.getToken()) {
      ui.toLogin();
      return;
    }
    this.loadEvidence();
  },

  loadEvidence() {
    this.setData(ui.pageState('busy'));
    api.getEvidence().then((response) => {
      this.setData(Object.assign(ui.pageState('idle'), {
        items: projection.projectEvidenceList(response)
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
    this.loadEvidence();
  },

  goToday() {
    wx.reLaunch({ url: '/pages/today/index' });
  },

  goReflection() {
    wx.navigateTo({ url: '/pages/reflection/index' });
  },

  logout() {
    api.logout().then(ui.toLogin, ui.toLogin);
  }
});
