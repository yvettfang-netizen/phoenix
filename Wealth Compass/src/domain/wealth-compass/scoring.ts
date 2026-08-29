import type { AssessmentSession, ScoreResult } from "./types";

export class RulesNotLoadedError extends Error {
  readonly code = "RULES_NOT_LOADED";
  constructor() { super("Wealth Compass official scoring rules are not loaded."); }
}

export function scoreAssessment(_session: AssessmentSession): ScoreResult {
  void _session;
  throw new RulesNotLoadedError();
}
