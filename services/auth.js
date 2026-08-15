const repository = require('./repository')
const { isoNow } = require('../utils/date')

function loginFamilyUser(profile = {}) {
  return new Promise((resolve) => {
    const completeLogin = () => {
      const app = getApp()
      let user = repository.where('users', (item) => item.wechat_id === 'local_family_user')[0]
      if (!user) {
        user = repository.insert('users', {
          wechat_id: 'local_family_user', name: profile.name || '家庭用户', phone: '',
          role: 'family_user', created_at: isoNow()
        })
      }
      app.setCurrentUser(user.id)
      resolve(user)
    }

    // V0.1 performs the WeChat login handshake but keeps a local demo identity.
    // Production must exchange `code` on a trusted server and store the returned openid.
    if (wx.login) wx.login({ success: completeLogin, fail: completeLogin })
    else completeLogin()
  })
}

function loginAdvisorDemo() {
  const app = getApp()
  const advisor = repository.getById('users', 'usr_phoenix_advisor')
  app.setCurrentUser(advisor.id)
  return advisor
}

function logout() {
  const app = getApp()
  app.setCurrentUser('')
}

module.exports = { loginFamilyUser, loginAdvisorDemo, logout }
