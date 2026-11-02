const storage = require('./storage');

App({
  globalData: {
    pageState: 'idle'
  },

  onLaunch() {},

  hasSession() {
    return Boolean(storage.getToken());
  }
});
