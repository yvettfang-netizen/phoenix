import type { Snapshot } from './free-education-assessment.js'

export function presentGrowthCards(snapshot: Snapshot): {
  id: string
  label: string
  findings: {
    id: string
    title: string
    summary: string
    actions: string[]
    evidenceLabel: string
    questionPrompts: string[]
    officialSources: string[]
    officialNotice: string
  }[]
  missingInformation: string[]
}[]
