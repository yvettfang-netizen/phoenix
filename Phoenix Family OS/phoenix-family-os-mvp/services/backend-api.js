'use strict'
const SESSION_KEY = 'PFS_CANONICAL_SESSION_V1'
const REQUEST_TIMEOUT_MS = 5000
function error(code, statusCode) {
  return Object.assign(new Error(code), { code, ...(statusCode ? { statusCode } : {}) })
}
function configuredOrigin() {
  const cfg = typeof wx.getExtConfigSync === 'function' ? wx.getExtConfigSync() : null
  const origin = cfg && cfg.phoenixCanonicalApiOrigin
  if (typeof origin !== 'string' || !/^https:\/\/[a-z0-9.-]+(?::443)?$/i.test(origin)) {
    throw error('canonical_not_configured')
  }
  return origin
}
function currentSession() {
  const value = wx.getStorageSync(SESSION_KEY)
  if (!value || typeof value.token !== 'string' ||
      !/^[A-Za-z0-9_-]{32,512}$/.test(value.token) ||
      Number.isNaN(Date.parse(value.expiresAt)) ||
      Date.parse(value.expiresAt) <= Date.now() + 30000) {
    throw error('canonical_sign_in_required', 401)
  }
  return value
}
function clearSession() {
  if (wx.removeStorageSync) wx.removeStorageSync(SESSION_KEY)
  else wx.setStorageSync(SESSION_KEY, '')
}
function validateReceipt(value) {
  if (!value || value.status !== 'synced' || typeof value.submissionId !== 'string' ||
      value.submissionId.length < 1 || value.submissionId.length > 200 ||
      typeof value.receivedAt !== 'string' || Number.isNaN(Date.parse(value.receivedAt))) {
    throw error('invalid_response')
  }
  return value
}
async function submitQuestionnaire(payload) {
  const base = configuredOrigin()
  const session = currentSession()
  return new Promise((resolve, reject) => {
    wx.request({
      url: base + '/v1/questionnaire-submissions',
      method: 'POST',
      data: payload,
      header: {
        'content-type': 'application/json',
        'Authorization': 'Bearer ' + session.token
      },
      timeout: REQUEST_TIMEOUT_MS,
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          try { resolve(validateReceipt(response.data)) } catch (err) { reject(err) }
          return
        }
        if (response.statusCode === 401) clearSession()
        const code = response.data && response.data.error && response.data.error.code
        reject(error(code || 'canonical_request_rejected', response.statusCode))
      },
      fail() { reject(error('canonical_unavailable')) }
    })
  })
}
module.exports = { SESSION_KEY, REQUEST_TIMEOUT_MS, clearSession, submitQuestionnaire, validateReceipt }
