import assert from 'node:assert/strict'
import fs from 'node:fs'
import { AddressInfo } from 'node:net'
import path from 'node:path'
import test from 'node:test'
import { MockWechatAuthProvider } from '../src/auth/wechat-auth-provider'
import { validateSourceCatalog } from '../src/domain/source-catalog'
import { BRANCHES, REGISTRY, REGISTRY_ID, SPEC_SHA, VERSIONS } from '../src/education/free-assessment/registry'
import { evaluateFreeAssessment } from '../src/education/free-assessment/engine'
import { createAppServer } from '../src/http/app'
import { MockPaymentProvider } from '../src/payments/mock-payment-provider'
import { AssessmentService } from '../src/services/assessment-service'
import { AuthService } from '../src/services/auth-service'
import { OrderService, seedProducts } from '../src/services/order-service'
import { ProfileService } from '../src/services/profile-service'
import { ReportService } from '../src/services/report-service'
import { InMemoryStore } from '../src/store/memory-store'

const secret = 'free-assessment-test-session-secret'
const PATH = '/v1/education-compass/free-assessment/evaluate'

// The Mini Program copy is the source of truth for both the registry and the rules.
// Loading it here is what makes the parity assertions meaningful.
const projectRoot = (() => {
  const cwd = process.cwd()
  if (fs.existsSync(path.join(cwd, 'models', 'free-education-assessment.js'))) return cwd
  return path.resolve(__dirname, '../../..')
})()
const clientRegistry = require(path.join(projectRoot, 'models', 'free-education-registry.js'))
const clientEngine = require(path.join(projectRoot, 'models', 'free-education-assessment.js'))

const BASE = {
  Q2: 'SECONDARY_FORM_4_YEAR_10',
  Q3: 'DSE',
  Q4: 'GOOD_INTEREST_UNCLEAR',
  Q5: ['STEM_TECH', 'PRACTICAL_PROBLEM_SOLVING'],
  Q6: ['HK'],
  Q7: 'SUBJECT_STRENGTHS',
  Q8: 'UNIVERSITY_AND_MAJOR_FIT'
}

function payload(answers: Record<string, unknown>, role = 'PARENT_GUARDIAN') {
  return { versions: { ...VERSIONS }, respondent_role: role, answers }
}

const CASES: Array<{ name: string; input: ReturnType<typeof payload> }> = [
  {
    name: 'branch A pathway unclear, eligibility concern',
    input: payload({ ...BASE, Q1: 'PATHWAY_UNCLEAR', 'Q9.A': 'ELIGIBILITY', 'Q10.A': 'NO_CLEAR_TARGET', 'Q11.A': 'WILL_COMPARE', 'Q12.A': 'COMPARE_PATHWAYS' })
  },
  {
    name: 'branch B curriculum choice with multi-select options',
    input: payload({ ...BASE, Q1: 'CURRICULUM_CHOICE', 'Q9.B': ['DSE', 'A_LEVEL'], 'Q10.B': 'UNIVERSITY_OPTIONS', 'Q11.B': 'MATH_QUANTITATIVE', 'Q12.B': 'CONSIDERING' })
  },
  {
    name: 'branch C HK admission with academic gap',
    input: payload({ ...BASE, Q1: 'HK_ADMISSION_GOAL', 'Q9.C': 'CN_MAINLAND_RESIDENT', 'Q10.C': 'NON_JUPAS', 'Q11.C': 'EXPLORING', 'Q12.C': 'ACADEMIC_GAP' })
  },
  {
    name: 'branch D growth exploration with practice evidence',
    input: payload({ ...BASE, Q1: 'GROWTH_EXPLORATION', 'Q10.D': ['PROJECT', 'COMPETITION'], 'Q11.D': 'HANDS_ON_PRACTICE', 'Q12.D': 'INTEREST_DIRECTION' })
  },
  {
    name: 'branch E single region reuses Q6 for Q9.E',
    input: payload({ ...BASE, Q1: 'MULTI_REGION_PLANNING', Q6: ['GB'], 'Q10.E': 'SCHOOL_QUALITY', 'Q11.E': ['BUDGET', 'TIME'], 'Q12.E': 'WITHIN_SIX_MONTHS' })
  },
  {
    name: 'branch E two regions keeps Q9.E as its own question',
    input: payload({ ...BASE, Q1: 'MULTI_REGION_PLANNING', Q6: ['HK', 'GB'], 'Q9.E': 'HK', 'Q12.E': 'NOW' }, 'STUDENT')
  },
  {
    name: 'required answers only, undeclared respondent',
    input: payload({ Q1: 'PATHWAY_UNCLEAR', Q2: 'SECONDARY_FORM_1_YEAR_7', Q3: 'IB' }, 'UNDECLARED')
  },
  {
    name: 'explicit skips and undecided options',
    input: payload({
      Q1: 'CURRICULUM_CHOICE', Q2: 'OTHER_SECONDARY', Q3: 'UNDECIDED', Q4: null,
      Q5: ['UNKNOWN'], Q6: ['UNDECIDED'], Q7: null, Q8: 'UNDECIDED'
    })
  }
]

function listen() {
  const store = new InMemoryStore()
  const catalog = validateSourceCatalog({
    version: 'FREE-ASSESSMENT-TEST-CATALOG-V1',
    dataAsOf: '2026-11-27',
    reviewedAt: '2026-11-27T00:00:00.000Z',
    reviewedBy: 'Free assessment synthetic test',
    entries: [{
      sourceId: 'FREE-ASSESSMENT-TEST-SOURCE-1',
      title: 'Synthetic reviewed source',
      applicableYear: '2026',
      verifiedAt: '2026-11-27T00:00:00.000Z'
    }]
  })
  const auth = new AuthService(store, new MockWechatAuthProvider(), secret)
  const profiles = new ProfileService(store)
  const assessments = new AssessmentService(store, catalog)
  const orders = new OrderService(store, new MockPaymentProvider(secret), catalog, false)
  const reports = new ReportService(store)
  const server = createAppServer({ auth, profiles, assessments, orders, reports })
  return { store, server }
}

async function start(): Promise<{ server: ReturnType<typeof createAppServer>; base: string; close: () => Promise<void> }> {
  const { store, server } = listen()
  await seedProducts(store, new Date().toISOString())
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as AddressInfo
  return {
    server,
    base: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve())
    })
  }
}

async function post(base: string, body: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(`${base}${PATH}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body)
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) as Record<string, unknown> : {} }
}

test('server registry matches the Mini Program registry', () => {
  assert.deepStrictEqual(REGISTRY, clientRegistry.REGISTRY)
  assert.deepStrictEqual(BRANCHES, clientRegistry.BRANCHES)
  assert.deepStrictEqual(VERSIONS, clientRegistry.VERSIONS)
  assert.strictEqual(REGISTRY_ID, clientRegistry.REGISTRY_ID)
  assert.strictEqual(SPEC_SHA, clientRegistry.SPEC_SHA)
})

test('server engine produces the same snapshot as the Mini Program engine', () => {
  for (const testCase of CASES) {
    const expected = clientEngine.evaluateFreeAssessment(structuredClone(testCase.input))
    const actual = evaluateFreeAssessment(structuredClone(testCase.input))
    assert.deepStrictEqual(actual, expected, testCase.name)
    assert.strictEqual(actual.cards.length, 4, `${testCase.name}: four cards`)
  }
})

test('engine rejects answers that are outside the frozen questionnaire', () => {
  const invalid: unknown[] = [
    payload({ Q1: 'PATHWAY_UNCLEAR' }),
    payload({ ...BASE, Q1: 'PATHWAY_UNCLEAR', Q4: 'NOPE' }),
    payload({ ...BASE, Q1: 'PATHWAY_UNCLEAR', Z9: 'UNKNOWN' }),
    payload({ ...BASE, Q1: 'MULTI_REGION_PLANNING', Q6: ['HK', 'GB', 'US'] }),
    { versions: { ...VERSIONS, rule_version: 'v0' }, respondent_role: 'PARENT_GUARDIAN', answers: { ...BASE, Q1: 'PATHWAY_UNCLEAR' } },
    { versions: { ...VERSIONS }, respondent_role: 'ADVISOR', answers: { ...BASE, Q1: 'PATHWAY_UNCLEAR' } },
    { versions: { ...VERSIONS }, respondent_role: 'PARENT_GUARDIAN', answers: { ...BASE, Q1: 'PATHWAY_UNCLEAR' }, official_context: {} }
  ]
  for (const input of invalid) assert.throws(() => evaluateFreeAssessment(input), /INVALID_FREE_ASSESSMENT/)
})

test('anonymous evaluate route returns a four-card snapshot without a session', async () => {
  const app = await start()
  try {
    const input = CASES[0].input
    const first = await post(app.base, input)
    assert.strictEqual(first.status, 200)
    const snapshot = first.body as Record<string, any>
    assert.deepStrictEqual(snapshot.versions, VERSIONS)
    assert.strictEqual(snapshot.cards.length, 4)
    assert.strictEqual(snapshot.respondent_role, 'PARENT_GUARDIAN')
    assert.strictEqual(snapshot.authorizations.SAVE_RESULT, 'NOT_GRANTED')
    assert.strictEqual(snapshot.authorizations.ADVISOR_CONTACT, 'NOT_GRANTED')

    const second = await post(app.base, input)
    assert.deepStrictEqual(second.body, first.body, 'the route is stateless')
  } finally {
    await app.close()
  }
})

test('anonymous evaluate route fails closed on malformed or extended payloads', async () => {
  const app = await start()
  try {
    const cases: Array<[unknown, string]> = [
      [{}, 'INVALID_FREE_ASSESSMENT'],
      [payload({ Q1: 'PATHWAY_UNCLEAR' }), 'INVALID_FREE_ASSESSMENT'],
      [{ ...CASES[0].input, official_context: { scope: {} } }, 'INVALID_FREE_ASSESSMENT'],
      [{ ...CASES[0].input, answers: { ...CASES[0].input.answers, Z9: 'UNKNOWN' } }, 'INVALID_FREE_ASSESSMENT']
    ]
    for (const [body, code] of cases) {
      const response = await post(app.base, body)
      assert.strictEqual(response.status, 400)
      assert.strictEqual((response.body.error as Record<string, unknown>).code, code)
    }
    const response = await fetch(`${app.base}${PATH}?scope=x`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(CASES[0].input)
    })
    assert.strictEqual(response.status, 400)
  } finally {
    await app.close()
  }
})

test('anonymous evaluate route is rate limited per client address', async () => {
  const app = await start()
  try {
    let limited = 0
    for (let index = 0; index < 32; index += 1) {
      const response = await post(app.base, CASES[6].input)
      if (response.status === 429) {
        limited = index
        break
      }
      assert.strictEqual(response.status, 200)
    }
    assert.ok(limited >= 30, `expected the 31st request to be limited, saw ${limited}`)
  } finally {
    await app.close()
  }
})
