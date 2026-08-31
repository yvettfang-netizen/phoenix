import assert from 'node:assert/strict'
import test from 'node:test'
import { FREE_PARENT_QUESTIONNAIRE_VERSION } from '../src/domain/education-compass/contracts'
import { getEducationCompassQuestionnaireBank } from '../src/domain/education-compass/registry'
import { buildEducationPathwaySignalV12 } from '../src/domain/education-compass/pathway-fit'
import { validateQuestionnaireAnswers } from '../src/domain/education-compass/validator'

const IDENTITY = { familyId: 'family_v12_001', studentId: 'student_v12_001', assessmentId: 'assessment_v12_001' }

function answers(overrides: Record<string, unknown> = {}) {
  return {
    PF01: 'GRADE_11', PF02: 'GAOKAO', PF03: 'UNDERSTANDS_BUT_UNSTABLE', PF04: 'WILLING_WITH_SUPPORT',
    PF05: 'HONG_KONG', PF05A: 'NONE', PF06: 'HK_VS_ABROAD', ...overrides
  }
}

test('V1.2 Free default exposes six core questions and a conditional Hong Kong status question', () => {
  const bank = getEducationCompassQuestionnaireBank('LEVEL_1', null)
  assert.equal(bank.questionnaireVersion, FREE_PARENT_QUESTIONNAIRE_VERSION)
  assert.deepEqual(bank.questions.map(({ id }) => id), ['PF01', 'PF02', 'PF03', 'PF04', 'PF05', 'PF05A', 'PF06'])
  assert.deepEqual(bank.questions.find(({ id }) => id === 'PF05A')?.visibility, {
    questionId: 'PF05', questionKey: 'target_region', allowedValues: ['HONG_KONG', 'MULTI_REGION']
  })
  assert.equal(bank.scoringMode, 'NONE')

  const nonHongKong = validateQuestionnaireAnswers({
    level: 'LEVEL_1', educationSystem: null, questionnaireVersion: FREE_PARENT_QUESTIONNAIRE_VERSION,
    answers: answers({ PF05: 'UK', PF05A: 'HK_PR' }), mode: 'SUBMIT'
  })
  assert.equal(nonHongKong.canSubmit, true)
  assert.equal(nonHongKong.answers.PF05A, undefined)

  assert.throws(() => validateQuestionnaireAnswers({
    level: 'LEVEL_1', educationSystem: null, questionnaireVersion: FREE_PARENT_QUESTIONNAIRE_VERSION,
    answers: answers({ PF05: 'HONG_KONG', PF05A: undefined }), mode: 'SUBMIT'
  }))
})

test('V1.2 Free returns pathway signals, variables and no probability, guarantee or diagnosis', () => {
  const validated = validateQuestionnaireAnswers({
    level: 'LEVEL_1', educationSystem: null, questionnaireVersion: FREE_PARENT_QUESTIONNAIRE_VERSION,
    answers: answers(), mode: 'SUBMIT'
  })
  const result = buildEducationPathwaySignalV12(IDENTITY, validated.answers)
  assert.equal(result.result_kind, 'EDUCATION_PATHWAY_SIGNAL')
  assert.equal(result.hong_kong_fit_signal.status, 'PRIORITY_EXPLORE')
  assert.equal(result.overseas_fit_signal.status, 'CONTINUE_EVALUATING')
  assert(result.key_variables.length >= 1 && result.key_variables.length <= 3)
  assert.equal(result.scoring_mode, 'NONE')
  const productOutput = JSON.stringify({
    hongKongFitSignal: result.hong_kong_fit_signal,
    overseasFitSignal: result.overseas_fit_signal,
    keyVariables: result.key_variables,
    nextInsight: result.next_insight,
  })
  for (const forbidden of ['%', '录取概率', '成功率', '保证', '诊断']) assert.equal(productOutput.includes(forbidden), false)
  assert.match(result.disclaimer, /不构成.*承诺/)
})
