const runtime = require('../config/runtime')
const api = require('./api')
const shared = require('../models/free-education-assessment.js')

const PATH = '/v1/education-compass/free-assessment/evaluate'

// 免费初评是匿名开放能力：开发、测试、体验版与正式版走同一份实现与同一份题库，
// 只有识别不出环境（unknown）时才关闭，避免在未知环境里误开匿名出口。
const AVAILABLE_ENVIRONMENTS = ['develop', 'test', 'trial', 'release']

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
    try {
      const snapshot = runtime.isDemo() ? shared.evaluateFreeAssessment(payload)
        : await api.request(PATH, { method: 'POST', data: payload })
      if (JSON.stringify(snapshot?.versions) !== JSON.stringify(shared.VERSIONS) ||
        snapshot.cards?.length !== 4) throw new Error('INVALID_SNAPSHOT')
      if (!this.freeClosed) this.setData({ freeSnapshot: snapshot })
    } catch {
      // 本地预览降级：后端尚未提供该接口时，用同一份端内 8+4 规则引擎生成快照。
      // 规则与版本同源（models/free-education-assessment.js），结果语义一致。
      let fallback = null
      try { fallback = shared.evaluateFreeAssessment(payload) } catch { fallback = null }
      if (!this.freeClosed) {
        if (fallback && fallback.cards?.length === 4) this.setData({ freeSnapshot: fallback })
        else this.setData({ freeError: '暂时无法生成快照。答案仍在当前页面，可重试。' })
      }
    } finally {
      if (!this.freeClosed) this.setData({ freeBusy: false })
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

module.exports = { PATH, freeAssessmentAvailable, freeAssessmentControls }
