const assert = require('assert')

// 免费初评是唯一一个不登录也能走的出口，因此单独锁三件事：
// 环境门（正式版与体验版同一份能力，仅未知环境关闭）、规则引擎四卡、以及 evaluate 请求绝不带会话。
async function run() {
  const runtime = require('../config/runtime')
  const api = require('../services/api')
  const { freeAssessmentAvailable, remoteEnabled, PATH } = require('../services/free-education-assessment')
  const engine = require('../models/free-education-assessment')

  const originalEnvironment = runtime.accountEnvironment
  const originalBaseUrl = runtime.apiBaseUrl
  const originalIsDemo = runtime.isDemo
  const originalConstant = runtime.API_BASE_URL
  const originalRequest = wx.request
  try {
    for (const [environment, expected] of [['develop', true], ['test', true], ['trial', true], ['release', true], ['unknown', false]]) {
      runtime.accountEnvironment = () => environment
      assert.strictEqual(freeAssessmentAvailable(), expected, `free assessment must be ${expected ? 'visible' : 'hidden'} in ${environment}`)
    }

    // 本地预览包（loopback）与离线包（.invalid）不应发出评测请求：发了只会得到
    // ERR_CONNECTION_REFUSED / ERR_NAME_NOT_RESOLVED，然后仍然回落到端内引擎。
    runtime.isDemo = () => false
    for (const [base, expected] of [
      ['https://api.phoenixnova.com.cn', true],
      ['http://127.0.0.1:3000', false],
      ['https://education-compass-offline-test.invalid', false],
      ['', false]
    ]) {
      runtime.API_BASE_URL = base
      assert.strictEqual(remoteEnabled(), expected, `remote evaluation must be ${expected} for ${base || 'an empty base'}`)
    }

    const answers = {
      Q1: 'PATHWAY_UNCLEAR', Q2: 'SECONDARY_FORM_4_YEAR_10', Q3: 'DSE',
      Q4: 'GOOD_INTEREST_UNCLEAR', Q5: ['STEM_TECH'], Q6: ['HK'], Q8: 'UNIVERSITY_AND_MAJOR_FIT',
      'Q9.A': 'ELIGIBILITY', 'Q12.A': 'COMPARE_PATHWAYS'
    }
    for (const role of ['PARENT_GUARDIAN', 'STUDENT', 'UNDECLARED']) {
      const snapshot = engine.evaluateFreeAssessment({ versions: engine.VERSIONS, respondent_role: role, answers })
      assert.strictEqual(snapshot.cards.length, 4, `${role} must receive four cards`)
      assert.deepStrictEqual(snapshot.versions, engine.VERSIONS)
      assert.strictEqual(snapshot.authorizations.ADVISOR_CONTACT, 'NOT_GRANTED')
    }

    let sentHeaders = null
    runtime.apiBaseUrl = () => 'https://api.phoenixnova.com.cn'
    api.setAccessToken('free-assessment-session-token')
    wx.request = (options) => {
      sentHeaders = options.header
      options.success({ statusCode: 200, data: { cards: [] } })
    }
    await api.request(PATH, {
      method: 'POST',
      data: { versions: engine.VERSIONS, respondent_role: 'PARENT_GUARDIAN', answers }
    })
    assert.strictEqual(sentHeaders.Authorization, undefined, 'the anonymous evaluate call must not carry a session')
  } finally {
    runtime.accountEnvironment = originalEnvironment
    runtime.apiBaseUrl = originalBaseUrl
    runtime.isDemo = originalIsDemo
    runtime.API_BASE_URL = originalConstant
    wx.request = originalRequest
    api.setAccessToken('')
  }

  console.log('✓ free assessment: released-and-trial entry, four-card engine and anonymous evaluate request')
}

module.exports = { run }
