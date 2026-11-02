const api = require('../../api');
const storage = require('../../storage');
const ui = require('../../ui');

function formatStats(stats) {
  const source = stats && typeof stats === 'object' && !Array.isArray(stats) ? stats : {};
  return Object.keys(source).map((key) => {
    const value = source[key];
    return {
      key,
      value: value && typeof value === 'object' ? JSON.stringify(value) : String(value == null ? '' : value)
    };
  });
}

Page({
  data: Object.assign(ui.pageState('idle'), {
    stats: [],
    rawStats: {}
  }),

  onShow() {
    if (!storage.getToken()) {
      ui.toLogin();
      return;
    }
    this.loadDashboard();
  },

  loadDashboard() {
    this.setData(ui.pageState('busy'));
    api.getDashboard().then((response) => {
      const stats = response && response.stats ? response.stats : response;
      this.setData(Object.assign(ui.pageState('idle'), {
        rawStats: stats || {},
        stats: formatStats(stats)
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
    this.loadDashboard();
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
