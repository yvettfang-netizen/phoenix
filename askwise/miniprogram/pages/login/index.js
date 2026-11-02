const api = require('../../api');
const ui = require('../../ui');

Page({
  data: Object.assign(ui.pageState('idle'), {
    account: '',
    password: ''
  }),

  onInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [field]: event.detail.value });
  },

  showError(error) {
    this.setData(ui.pageState('error', ui.safeError(error)));
  },

  finishLogin() {
    this.setData(Object.assign(ui.pageState('solved'), { password: '' }));
    wx.reLaunch({ url: '/pages/today/index' });
  },

  onWechatLogin() {
    this.setData(ui.pageState('busy'));
    wx.login({
      success: (response) => {
        if (!response || !response.code) {
          this.showError({ code: 'VALIDATION', message: '微信登录未返回 code。' });
          return;
        }
        api.wechatLogin(response.code).then(() => this.finishLogin()).catch((error) => this.showError(error));
      },
      fail: () => this.showError({ code: 'NETWORK' })
    });
  },

  onLocalLogin() {
    const account = String(this.data.account || '').trim();
    const password = String(this.data.password || '');
    if (!account || !password) {
      this.showError({ code: 'VALIDATION', message: '请输入账号和密码。' });
      return;
    }
    this.setData(ui.pageState('busy'));
    api.localLogin(account, password).then(() => this.finishLogin()).catch((error) => this.showError(error));
  }
});
