const repository = require('./services/repository')
const analytics = require('./services/analytics')

App({
  globalData: {
    currentUserId: '',
    appName: 'Phoenix Family OS™'
  },

  onLaunch() {
    repository.initialize()
    this.globalData.currentUserId = wx.getStorageSync('PFS_CURRENT_USER_ID') || ''
  },

  onShow() {
    analytics.trackSession(this.globalData.currentUserId)
  },

  setCurrentUser(userId) {
    this.globalData.currentUserId = userId
    wx.setStorageSync('PFS_CURRENT_USER_ID', userId)
  },

  getCurrentUser() {
    return repository.getById('users', this.globalData.currentUserId)
  }
})
