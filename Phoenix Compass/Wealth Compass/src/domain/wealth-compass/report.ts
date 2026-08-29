import type { ScoreResult } from "./types";
import { RulesNotLoadedError } from "./scoring";

export function assertReportable(score: ScoreResult): void {
  if (score.rulesStatus !== "RULES_LOADED") throw new RulesNotLoadedError();
}
