'use strict'

const assert = require('node:assert/strict')
const { readFile } = require('node:fs/promises')
const path = require('node:path')

const { MockWechatAuthProvider } = require('../server/dist/src/auth/wechat-auth-provider.js')
const {
  FREE_PARENT_QUESTIONNAIRE_VERSION: FREE_VERSION,
  GROWTH_DISCOVERY_QUESTIONNAIRE_VERSION: GROWTH_VERSION
} = require('../server/dist/src/domain/education-compass/contracts.js')
const { validateSourceCatalog } = require('../server/dist/src/domain/source-catalog.js')
const { GROWTH_DISCOVERY_PRODUCT_CODE } = require('../server/dist/src/domain/products.js')
const { createAppServer } = require('../server/dist/src/http/app.js')
const { MockPaymentProvider } = require('../server/dist/src/payments/mock-payment-provider.js')
const { AssessmentService } = require('../server/dist/src/services/assessment-service.js')
const { AuthService } = require('../server/dist/src/services/auth-service.js')
const { EducationCompassService } = require('../server/dist/src/services/education-compass-service.js')
const { OrderService, seedProducts } = require('../server/dist/src/services/order-service.js')
const { ProfileService } = require('../server/dist/src/services/profile-service.js')
const { ReportService } = require('../server/dist/src/services/report-service.js')
const { InMemoryStore } = require('../server/dist/src/store/memory-store.js')

const TEST_SECRET = 'education-compass-local-smoke-secret-only'
const FORBIDDEN_LOCKED_KEYS = [
  'pathway_fit',
  'strength_signals',
  'learning_bottlenecks',
  'subject_focus',
  'growth_direction',
  'action_plan_30d',
  'evidence_refs'
]
const V12_FREE_QUESTION_IDS = ['PF01', 'PF02', 'PF03', 'PF04', 'PF05', 'PF05A', 'PF06']
const V12_REPORT_MODULE_KEYS = [
  'pathway_fit',
  'strength_signals',
  'learning_bottlenecks',
  'subject_focus',
  'growth_direction',
  'action_plan_30d'
]
const FORBIDDEN_FREE_CONCLUSIONS = ['%', '录取概率', '成功率', '保证', '诊断']

const catalog = validateSourceCatalog({
  version: 'EDUCATION-SMOKE-SOURCE-CATALOG-V1',
  dataAsOf: '2026-08-25',
  reviewedAt: '2026-08-25T00:00:00.000Z',
  reviewedBy: 'Local synthetic smoke test',
  entries: [{
    sourceId: 'EDUCATION-SMOKE-SOURCE-1',
    title: 'Local synthetic reviewed source',
    applicableYear: '2026',
    verifiedAt: '2026-08-25T00:00:00.000Z'
  }]
})

async function request(base, path, options = {}) {
  const headers = new Headers(options.headers)
  if (options.body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${base}${path}`, { ...options, headers })
  const contentType = response.headers.get('content-type') || ''
  const body = response.status === 204
    ? null
    : contentType.includes('application/json') ? await response.json() : await response.text()
  return { response, body }
}

async function expectJson(base, path, options, expectedStatus) {
  const result = await request(base, path, options)
  assert.equal(result.response.status, expectedStatus, `${options?.method || 'GET'} ${path}: ${JSON.stringify(result.body)}`)
  return result.body
}

function requiredAnswers(questionnaire, overrides = {}) {
  const answers = {}
  for (const questionId of questionnaire.requiredQuestionIds) {
    const question = questionnaire.questions.find((item) => item.id === questionId)
    assert.ok(question, `question bank omitted ${questionId}`)
    if (question.type === 'YEAR_SELECT') {
      answers[questionId] = String(new Date().getUTCFullYear() + 1)
    } else if (question.type === 'MULTI_CHOICE' || question.type === 'MULTI_CHOICE_DYNAMIC') {
      answers[questionId] = [question.options[0].code]
    } else if (question.type === 'SUBJECT_RANGE_MATRIX') {
      answers[questionId] = [{
        subject_code: question.matrixSubjectOptions[0].code,
        range_code: question.matrixRangeOptions[0].code
      }]
    } else {
      answers[questionId] = question.options[0].code
    }
  }
  return { ...answers, ...overrides }
}

function reportModules(payload) {
  const candidates = [payload.full?.modules, payload.report?.modules, payload.modules, payload.result?.modules]
  const modules = candidates.find(Array.isArray)
  assert.ok(modules, 'full report response must include ordered report modules')
  return modules
}

function optionAnswer(questionnaire, questionId, code) {
  const question = questionnaire.questions.find((item) => item.id === questionId)
  assert.ok(question, `questionnaire omitted ${questionId}`)
  assert.ok(question.options.some((option) => option.code === code), `${questionId} omitted ${code}`)
  return question.type === 'MULTI_CHOICE' || question.type === 'MULTI_CHOICE_DYNAMIC' ? [code] : code
}

function nonAdvisorPathAnswer(questionnaire) {
  const question = questionnaire.questions.find((item) => item.id === 'PF06')
  assert.ok(question, 'questionnaire omitted PF06')
  const option = question.options.find(({ code }) => !['HK_VS_ABROAD', 'PATH_CHOICE'].includes(code))
  assert.ok(option, 'PF06 must provide a non-advisor comparison option')
  return option.code
}

function assertV12FreeResult(result) {
  assert.equal(result.result_kind, 'EDUCATION_PATHWAY_SIGNAL')
  for (const key of ['hong_kong_fit_signal', 'overseas_fit_signal', 'key_variables', 'next_insight']) {
    assert.ok(Object.hasOwn(result, key), `V1.2 Free result omitted ${key}`)
  }
  const productOutput = JSON.stringify({
    hongKongFit: result.hong_kong_fit_signal,
    overseasFit: result.overseas_fit_signal,
    keyVariables: result.key_variables,
    nextInsight: result.next_insight
  })
  for (const forbidden of FORBIDDEN_FREE_CONCLUSIONS) {
    assert.equal(productOutput.includes(forbidden), false, `Free result includes forbidden conclusion: ${forbidden}`)
  }
}

async function runDiscoveryScenario({ base, headers, freeBank, payment, prefix, studentName, freeOverrides, growthMode }) {
  const studentResponse = await expectJson(base, '/v1/me/students', {
    method: 'POST', headers,
    body: JSON.stringify({ name: studentName, age: 16, educationSystem: 'GAOKAO', grade: 'UPPER_SECONDARY' })
  }, 201)
  const studentId = studentResponse.student.id
  const freeCreate = await expectJson(base, '/v1/education-compass/free-parent-assessments', {
    method: 'POST', headers: { ...headers, 'Idempotency-Key': `${prefix}-free-create` },
    body: JSON.stringify({
      studentId,
      sourceEntry: 'INTERNAL_UAT',
      consent: {
        scope: 'CORE_ASSESSMENT', copyVersion: 'guardian_core_assessment_v1.0.0-rc1', locale: 'zh-CN', guardianAuthorityConfirmed: true
      }
    })
  }, 201)
  const freeAnswers = requiredAnswers(freeBank, freeOverrides)
  if (!['HONG_KONG', 'MULTI_REGION'].includes(freeAnswers.PF05)) delete freeAnswers.PF05A
  const freeSaved = await expectJson(base, `/v1/assessments/${freeCreate.assessmentId}/draft`, {
    method: 'PUT', headers,
    body: JSON.stringify({ revision: freeCreate.revision, answers: freeAnswers, clientSaveToken: `${prefix}-free-save` })
  }, 200)
  assert.equal(freeSaved.canSubmit, true)
  const freeSubmitted = await expectJson(base, `/v1/assessments/${freeCreate.assessmentId}/submit`, {
    method: 'POST', headers: { ...headers, 'Idempotency-Key': `${prefix}-free-submit` },
    body: JSON.stringify({ revision: freeSaved.revision })
  }, 200)
  assert.equal(freeSubmitted.resultState, 'READY')
  assertV12FreeResult(freeSubmitted.result)

  const growthCreate = await expectJson(base, `/v1/students/${studentId}/education-assessments`, {
    method: 'POST', headers: { ...headers, 'Idempotency-Key': `${prefix}-growth-create` },
    body: JSON.stringify({
      assessmentKind: 'STUDENT_GROWTH_DISCOVERY', sourceAssessmentId: freeCreate.assessmentId, sourceEntry: 'LEVEL_1_RESULT',
      educationSystem: 'GAOKAO', respondent: 'STUDENT',
      assent: {
        scope: 'STUDENT_ASSESSMENT_ASSENT', copyVersion: 'student_assent_growth_discovery_v1.0.0-rc1', locale: 'zh-CN', studentConfirmed: true
      }
    })
  }, 201)
  const growthBank = (await expectJson(base, `/v1/assessments/${growthCreate.assessmentId}/questionnaire`, { headers }, 200)).questionnaire
  const growthAnswers = requiredAnswers(growthBank, {
    EGD01: 'CONFIRM_STUDENT_SELF', EGD02: 'UPPER_SECONDARY', EGD03: 'GAOKAO',
    EGD06: optionAnswer(growthBank, 'EGD06', growthMode === 'positive' ? 'FOUNDATION' : 'UNSURE'),
    EGD09: optionAnswer(growthBank, 'EGD09', 'UNSURE')
  })
  const growthSaved = await expectJson(base, `/v1/assessments/${growthCreate.assessmentId}/draft`, {
    method: 'PUT', headers,
    body: JSON.stringify({ revision: growthCreate.revision, educationSystem: 'GAOKAO', answers: growthAnswers, clientSaveToken: `${prefix}-growth-save` })
  }, 200)
  assert.equal(growthSaved.canSubmit, true)
  const locked = await expectJson(base, `/v1/assessments/${growthCreate.assessmentId}/submit`, {
    method: 'POST', headers: { ...headers, 'Idempotency-Key': `${prefix}-growth-submit` },
    body: JSON.stringify({ revision: growthSaved.revision })
  }, 200)
  assert.equal(locked.resultState, 'LOCKED')
  for (const key of FORBIDDEN_LOCKED_KEYS) assert.equal(JSON.stringify(locked).includes(key), false, `locked response leaked ${key}`)

  const order = await expectJson(base, `/v1/assessments/${growthCreate.assessmentId}/orders`, {
    method: 'POST', headers: { ...headers, 'Idempotency-Key': `${prefix}-growth-order` },
    body: JSON.stringify({ productCode: GROWTH_DISCOVERY_PRODUCT_CODE })
  }, 201)
  await expectJson(base, `/v1/orders/${order.orderId}/wechat-prepay`, { method: 'POST', headers, body: '{}' }, 200)
  payment.setOrderState(order.outTradeNo, 'SUCCESS')
  const transaction = await payment.queryOrder(order.outTradeNo)
  const notification = payment.makeTransactionNotification(transaction)
  const webhookHeaders = { 'Content-Type': 'application/json' }
  for (const [name, value] of Object.entries(notification.headers)) {
    if (value !== undefined) webhookHeaders[name] = value
  }
  await expectJson(base, '/v1/webhooks/wechat-pay/transactions', {
    method: 'POST', headers: webhookHeaders, body: notification.rawBody.toString('utf8')
  }, 204)

  const full = await expectJson(base, `/v1/assessments/${growthCreate.assessmentId}/result`, { headers }, 200)
  assert.equal(full.resultState, 'READY')
  assert.equal(full.result.result_kind, 'STUDENT_GROWTH_DISCOVERY')
  for (const key of V12_REPORT_MODULE_KEYS) assert.ok(Object.hasOwn(full.result, key), `full result omitted ${key}`)
  const report = await expectJson(base, `/v1/reports/${full.reportId}`, { headers }, 200)
  assert.equal(report.access, 'full')
  assert.deepEqual(reportModules(report).map(({ key }) => key), V12_REPORT_MODULE_KEYS)
  return { freeSubmitted, full, report }
}

async function main() {
  const store = new InMemoryStore()
  const authProvider = new MockWechatAuthProvider()
  const payment = new MockPaymentProvider(TEST_SECRET)
  await seedProducts(store, new Date().toISOString())

  const auth = new AuthService(store, authProvider, TEST_SECRET)
  const profiles = new ProfileService(store)
  const assessments = new AssessmentService(store, catalog)
  const education = new EducationCompassService(store, true)
  const orders = new OrderService(store, payment, catalog, true, undefined, undefined, true)
  const reports = new ReportService(store)
  const server = createAppServer({ auth, profiles, assessments, education, orders, reports })

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  const base = `http://127.0.0.1:${address.port}`
  const checkpoints = []

  try {
    const health = await expectJson(base, '/health', {}, 200)
    assert.deepEqual(health, { ok: true })
    checkpoints.push('health')

    const previewMarkup = await readFile(path.resolve(__dirname, '..', 'pages', 'compass-preview', 'index.wxml'), 'utf8')
    assert.match(previewMarkup, /进入 Education Growth Discovery/)
    checkpoints.push('value-gap-cta')

    const login = await expectJson(base, '/v1/auth/wechat/session', {
      method: 'POST',
      body: JSON.stringify({ code: 'education-compass-local-smoke' })
    }, 200)
    const headers = { Authorization: `Bearer ${login.accessToken}` }

    await expectJson(base, '/v1/me/family', {
      method: 'PUT', headers,
      body: JSON.stringify({
        familyName: '本地冒烟家庭',
        parentName: '本地冒烟家长',
        phone: '13900000000',
        location: 'LOCAL_ONLY',
        goal: '验证 Education Compass V0.5 离线闭环'
      })
    }, 200)
    const studentResponse = await expectJson(base, '/v1/me/students', {
      method: 'POST', headers,
      body: JSON.stringify({
        name: '本地冒烟学生',
        age: 16,
        educationSystem: 'GAOKAO',
        grade: 'UPPER_SECONDARY'
      })
    }, 201)
    const studentId = studentResponse.student.id
    checkpoints.push('profile')

    const freeBank = (await expectJson(base, `/v1/education-compass/questionnaires/${FREE_VERSION}`, {
      headers
    }, 200)).questionnaire
    assert.equal(freeBank.questionnaireVersion, FREE_VERSION)
    assert.deepEqual(freeBank.questions.map(({ id }) => id), V12_FREE_QUESTION_IDS)
    assert.deepEqual(freeBank.questions.find(({ id }) => id === 'PF05A')?.visibility, {
      questionId: 'PF05', questionKey: 'target_region', allowedValues: ['HONG_KONG', 'MULTI_REGION']
    })
    checkpoints.push('v12-free-bank', 'pf05a-conditional')
    const freeCreate = await expectJson(base, '/v1/education-compass/free-parent-assessments', {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': 'smoke-free-create-001' },
      body: JSON.stringify({
        studentId,
        sourceEntry: 'INTERNAL_UAT',
        consent: {
          scope: 'CORE_ASSESSMENT',
          copyVersion: 'guardian_core_assessment_v1.0.0-rc1',
          locale: 'zh-CN',
          guardianAuthorityConfirmed: true
        }
      })
    }, 201)
    assert.equal(freeCreate.questionnaireVersion, FREE_VERSION)
    const freeAnswers = requiredAnswers(freeBank, {
      PF05: 'MULTI_REGION',
      PF05A: 'HK_PR'
    })
    const freeSaved = await expectJson(base, `/v1/assessments/${freeCreate.assessmentId}/draft`, {
      method: 'PUT', headers,
      body: JSON.stringify({
        revision: freeCreate.revision,
        answers: freeAnswers,
        clientSaveToken: 'smoke-free-save-001'
      })
    }, 200)
    assert.equal(freeSaved.canSubmit, true)
    const freeSubmitted = await expectJson(base, `/v1/assessments/${freeCreate.assessmentId}/submit`, {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': 'smoke-free-submit-001' },
      body: JSON.stringify({ revision: freeSaved.revision })
    }, 200)
    assert.equal(freeSubmitted.resultState, 'READY')
    assert.equal(freeSubmitted.result.result_kind, 'EDUCATION_PATHWAY_SIGNAL')
    for (const key of ['hong_kong_fit_signal', 'overseas_fit_signal', 'key_variables', 'next_insight']) {
      assert.ok(Object.hasOwn(freeSubmitted.result, key), `V1.2 Free result omitted ${key}`)
    }
    const freeProductOutput = JSON.stringify({
      hongKongFit: freeSubmitted.result.hong_kong_fit_signal,
      overseasFit: freeSubmitted.result.overseas_fit_signal,
      keyVariables: freeSubmitted.result.key_variables,
      nextInsight: freeSubmitted.result.next_insight
    })
    for (const forbidden of FORBIDDEN_FREE_CONCLUSIONS) {
      assert.equal(freeProductOutput.includes(forbidden), false, `Free result includes forbidden conclusion: ${forbidden}`)
    }
    checkpoints.push('level1-v12-ready', 'free-result-signals', 'free-no-probability-or-guarantee')

    const growthCreate = await expectJson(base, `/v1/students/${studentId}/education-assessments`, {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': 'smoke-growth-create-001' },
      body: JSON.stringify({
        assessmentKind: 'STUDENT_GROWTH_DISCOVERY',
        sourceAssessmentId: freeCreate.assessmentId,
        sourceEntry: 'LEVEL_1_RESULT',
        educationSystem: 'GAOKAO',
        respondent: 'STUDENT',
        assent: {
          scope: 'STUDENT_ASSESSMENT_ASSENT',
          copyVersion: 'student_assent_growth_discovery_v1.0.0-rc1',
          locale: 'zh-CN',
          studentConfirmed: true
        }
      })
    }, 201)
    assert.equal(growthCreate.questionnaireVersion, GROWTH_VERSION)
    const growthBank = (await expectJson(base, `/v1/assessments/${growthCreate.assessmentId}/questionnaire`, {
      headers
    }, 200)).questionnaire
    const growthAnswers = requiredAnswers(growthBank, {
      EGD01: 'CONFIRM_STUDENT_SELF',
      EGD02: 'UPPER_SECONDARY',
      EGD03: 'GAOKAO',
      EGD06: optionAnswer(growthBank, 'EGD06', 'FOUNDATION'),
      EGD09: optionAnswer(growthBank, 'EGD09', 'UNSURE')
    })
    const growthSaved = await expectJson(base, `/v1/assessments/${growthCreate.assessmentId}/draft`, {
      method: 'PUT', headers,
      body: JSON.stringify({
        revision: growthCreate.revision,
        educationSystem: 'GAOKAO',
        answers: growthAnswers,
        clientSaveToken: 'smoke-growth-save-001'
      })
    }, 200)
    assert.equal(growthSaved.canSubmit, true)
    const locked = await expectJson(base, `/v1/assessments/${growthCreate.assessmentId}/submit`, {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': 'smoke-growth-submit-001' },
      body: JSON.stringify({ revision: growthSaved.revision })
    }, 200)
    assert.equal(locked.resultState, 'LOCKED')
    const lockedRaw = JSON.stringify(locked)
    for (const key of FORBIDDEN_LOCKED_KEYS) assert.equal(lockedRaw.includes(key), false, `locked response leaked ${key}`)
    checkpoints.push('level2-locked-no-leak')

    const order = await expectJson(base, `/v1/assessments/${growthCreate.assessmentId}/orders`, {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': 'smoke-growth-order-001' },
      body: JSON.stringify({ productCode: GROWTH_DISCOVERY_PRODUCT_CODE })
    }, 201)
    await expectJson(base, `/v1/orders/${order.orderId}/wechat-prepay`, {
      method: 'POST', headers, body: '{}'
    }, 200)
    payment.setOrderState(order.outTradeNo, 'SUCCESS')
    const transaction = await payment.queryOrder(order.outTradeNo)
    const notification = payment.makeTransactionNotification(transaction)
    const webhookHeaders = { 'Content-Type': 'application/json' }
    for (const [name, value] of Object.entries(notification.headers)) {
      if (value !== undefined) webhookHeaders[name] = value
    }
    await expectJson(base, '/v1/webhooks/wechat-pay/transactions', {
      method: 'POST', headers: webhookHeaders, body: notification.rawBody.toString('utf8')
    }, 204)

    const full = await expectJson(base, `/v1/assessments/${growthCreate.assessmentId}/result`, { headers }, 200)
    assert.equal(full.resultState, 'READY')
    assert.equal(full.result.result_kind, 'STUDENT_GROWTH_DISCOVERY')
    for (const key of V12_REPORT_MODULE_KEYS) assert.ok(Object.hasOwn(full.result, key), `full result omitted ${key}`)
    const primaryReport = await expectJson(base, `/v1/reports/${full.reportId}`, { headers }, 200)
    assert.equal(primaryReport.access, 'full')
    assert.deepEqual(reportModules(primaryReport).map(({ key }) => key), V12_REPORT_MODULE_KEYS)
    const positiveSupport = primaryReport.capabilities.nextSupport
    assert.equal(positiveSupport.askwise.eligible, true)
    assert.equal(positiveSupport.askwise.enabled, false)
    assert.equal(positiveSupport.askwise.ctaMode, 'CONSENT_REQUIRED_RESERVED_HANDOFF')
    assert.equal(positiveSupport.askwise.requiresExplicitConsent, true)
    assert.equal(positiveSupport.deepAssessment.displayPrice, '¥980')
    assert.equal(positiveSupport.advisor.available, true)

    const counts = await store.read(async (tx) => ({
      entitlements: (await tx.findMany('entitlements', { userId: login.user.id })).length,
      transactionEvents: (await tx.findMany('paymentEvents', { eventKind: 'TRANSACTION' })).length
    }))
    assert.deepEqual(counts, { entitlements: 1, transactionEvents: 1 })
    const independentRouting = await runDiscoveryScenario({
      base, headers, freeBank, payment, prefix: 'smoke-independent-routing-002', studentName: '本地独立路由学生',
      freeOverrides: { PF05: 'MULTI_REGION', PF05A: 'HK_PR' }, growthMode: 'negative'
    })
    const independentSupport = independentRouting.report.capabilities.nextSupport
    assert.equal(independentSupport.askwise.eligible, false)
    assert.equal(independentSupport.askwise.ctaMode, 'NONE')
    assert.equal(independentSupport.deepAssessment.displayPrice, '¥980')
    assert.equal(independentSupport.advisor.available, true)

    const observingFallback = await runDiscoveryScenario({
      base, headers, freeBank, payment, prefix: 'smoke-observing-fallback-003', studentName: '本地继续观察学生',
      freeOverrides: { PF05: 'UK', PF06: nonAdvisorPathAnswer(freeBank) }, growthMode: 'negative'
    })
    const observingSupport = observingFallback.report.capabilities.nextSupport
    assert.equal(observingSupport.askwise.eligible, false)
    assert.equal(observingSupport.askwise.ctaMode, 'NONE')
    assert.equal(observingSupport.advisor.available, false)
    assert.equal(observingSupport.deepAssessment.displayPrice, null)

    checkpoints.push(
      'mock-payment-authority', 'level2-v12-ready', 'six-layer-report-pathway-first',
      'askwise-positive-consent-gate', 'askwise-negative', 'advisor-980-independent-routing', 'continue-observing-fallback'
    )

    process.stdout.write(`${JSON.stringify({
      status: 'PASS',
      mode: 'LOCAL_HTTP_MOCK',
      externalCalls: 0,
      checkpoints
    })}\n`)
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    await store.close?.()
  }
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    status: 'FAIL',
    mode: 'LOCAL_HTTP_MOCK',
    error: error instanceof Error ? error.message : String(error)
  })}\n`)
  process.exitCode = 1
})
