import { AppError } from '../domain/errors'
import { evaluateFreeAssessment, FreeAssessmentInputError, FreeAssessmentSnapshot } from '../education/free-assessment/engine'

/**
 * Anonymous counterpart of the paid questionnaire. It never reads the session,
 * never persists an answer set and never forwards client-supplied rule context:
 * only the frozen questionnaire versions, the respondent role and the answers
 * reach the engine.
 */
export function evaluateAnonymousFreeAssessment(body: unknown): FreeAssessmentSnapshot {
  try {
    return evaluateFreeAssessment(body)
  } catch (error) {
    if (error instanceof FreeAssessmentInputError) {
      throw new AppError(400, 'INVALID_FREE_ASSESSMENT', '免费测评答案无效')
    }
    throw error
  }
}
