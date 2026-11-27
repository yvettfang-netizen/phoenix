const runtime = require('../config/runtime')
const api = require('./api')
const shared = require('../models/free-education-assessment.js')

const PATH = '/v1/education-compass/free-assessment/evaluate'

// 免费初评是匿名开放能力：开发、测试、体验版与正式版走同一份实现与同一份题库，
// 只有识别不出环境（unknown）时才关闭，避免在未知环境里误开匿名出口。
const AVAILABLE_ENVIRONMENTS = ['develop', 'test', 'trial', 'release']

// 本地预览包没有可用的远程评测服务：dist/development 指向 127.0.0.1:3000，
// dist/offline-test 指向 *.invalid。以前这两类包仍会先发一次请求，控制台留下
// ERR_CONNECTION_REFUSED / ERR_NAME_NOT_RESOLVED 的红字，再回落到端内引擎，
// 看起来像功能坏了。现在先判断地址：连得上才发请求，连不上直接用端内引擎。
const LOOPBACK_BASE = /^https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/i
const OFFLINE_TEST_BASE = /^https?:\/\/[^/]*\.invalid(?::\d+)?$/i
const REMOTE_OVERRIDE_KEY = 'PFS_FREE_ASSESSMENT_REMOTE'

// 服务端一旦失败（离线、弱网、发布窗口），本次会话不再重试，避免每题都红一次。
let remoteDown = false

function remoteEnabled() {
  const base = String(runtime.API_BASE_URL || '').replace(/\/+$/, '')
  if (!base || OFFLINE_TEST_BASE.test(base) || runtime.isDemo()) return false
  if (!LOOPBACK_BASE.test(base)) return true
  // 需要在开发者工具里联调服务端时，控制台执行一次
  // wx.setStorageSync('PFS_FREE_ASSESSMENT_REMOTE', 1)，然后重新进入页面。
  try {
    return typeof wx !== 'undefined' && typeof wx.getStorageSync === 'function' &&
      wx.getStorageSync(REMOTE_OVERRIDE_KEY) === 1
  } catch (error) {
    return false
  }
}

function freeAssessmentAvailable() {
  return AVAILABLE_ENVIRONMENTS.includes(runtime.accountEnvironment())
}

function renderStep(answers, index) {
  const { questions } = shared.assessmentPath(answers)
  const question = questions[index]
  const answer = answers[question.question_id]
  const selected = [].concat(answer ?? [])
  return {
    index, total: questions.length, step: index + 1, question, canContinue: answer !== null && shared.isValidAnswer(question, answer),
    options: question.allowed_values.map(o => ({ ...o, selected: selected.includes(o.value) }))
  }
}

const freeAssessmentControls = {
  startFreeAssessment(event) {
    const role = event.currentTarget.dataset.role
    if (!['PARENT_GUARDIAN','STUDENT','UNDECLARED'].includes(role)) return
    this.freeAnswers = {}
    this.setData({ freeRole: role, freeError: '', freeSnapshot: null, freeStep: renderStep(this.freeAnswers, 0) })
  },
  selectFreeAnswer(event) {
    if (this.data.freeBusy) return
    const question = this.data.freeStep.question
    const { value } = event.currentTarget.dataset
    let picked = value
    if (question.answer_type === 'MULTI_CHOICE') {
      const values = [].concat(this.freeAnswers[question.question_id] ?? [])
      picked = values.includes(value) ? values.filter(code => code !== value)
        : question.exclusive_options.includes(value) ? [value]
          : [...values.filter(code => !question.exclusive_options.includes(code)), value]
      if (picked.length > question.max_selections) return
      picked = picked.length ? picked : null
    }
    this.freeAnswers = shared.reviseAnswer(this.freeAnswers, question.question_id, picked)
    this.setData({ freeStep: renderStep(this.freeAnswers, this.data.freeStep.index), freeError: '' })
  },
  async nextFreeQuestion(event) {
    if (this.data.freeBusy) return
    const step = this.data.freeStep
    const skip = event.currentTarget.dataset.skip === 'yes'
    if (skip && step.question.required || !skip && !step.canContinue) return
    if (skip) this.freeAnswers = shared.reviseAnswer(this.freeAnswers, step.question.question_id, null)
    if (step.index + 1 < shared.assessmentPath(this.freeAnswers).questions.length) {
      this.setData({ freeStep: renderStep(this.freeAnswers, step.index + 1), freeError: '' })
      return
    }
    this.setData({ freeBusy: true, freeError: '' })
    const payload = { versions: shared.VERSIONS, respondent_role: this.data.freeRole, answers: this.freeAnswers }
    let snapshot = null
    try {
      if (remoteEnabled() && !remoteDown) {
        try {
          const remote = await api.request(PATH, { method: 'POST', data: payload })
          const sameVersions = JSON.stringify(remote?.versions) === JSON.stringify(shared.VERSIONS)
          if (sameVersions && remote.cards?.length === 4) snapshot = remote
        } catch (error) {
          remoteDown = true
        }
      }
      // 端内引擎与远程接口同源（models/free-education-assessment.js），
      // 本地预览、离线包、服务端不可用时都用它出同一份四卡快照。
      if (!snapshot) snapshot = shared.evaluateFreeAssessment(payload)
    } catch (error) {
      snapshot = null
    } finally {
      if (!this.freeClosed) {
        this.setData(snapshot && snapshot.cards?.length === 4
          ? { freeSnapshot: snapshot, freeBusy: false }
          : { freeError: '暂时无法生成快照。答案仍在当前页面，可重试。', freeBusy: false })
      }
    }
  },
  backFreeQuestion() {
    if (this.data.freeBusy) return
    if (this.data.freeSnapshot) {
      this.setData({ freeSnapshot: null, freeStep: renderStep(this.freeAnswers, 0), freeError: '' })
    } else if (this.data.freeStep.index > 0) {
      this.setData({ freeStep: renderStep(this.freeAnswers, this.data.freeStep.index - 1), freeError: '' })
    } else {
      this.freeAnswers = {}
      this.setData({ freeRole: null, freeStep: null, freeError: '' })
    }
  },
  discardFreeAssessment() {
    this.freeClosed = true
    this.freeAnswers = null
  }
}

module.exports = { PATH, freeAssessmentAvailable, remoteEnabled, freeAssessmentControls }
