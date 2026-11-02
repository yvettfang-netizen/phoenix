// Shared transport types only. Clients must never import the engine or database.
export interface StructuredAnswer { conditions: string; method: string; work: string; conclusion: string; }
export interface CreatePilotTask { subject: "Mathematics" | "Politics"; topic: string; question: string; answer: StructuredAnswer; request_id: string; }
export type PilotCompanionState = "idle" | "listening" | "thinking" | "guiding" | "encouraging" | "celebrating" | "reflecting" | "safe_error";
export interface PilotApiError { error: string; retryable: boolean; }

export function structuredResponse(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_INPUT");
  const source = value as Record<string, unknown>;
  const fields = ["conditions", "method", "work", "conclusion"] as const;
  const answer = Object.fromEntries(fields.map(key => {
    const text = source[key];
    if (typeof text !== "string" || text.length > 2000) throw new Error("INVALID_INPUT");
    return [key, text.trim()];
  }));
  if (!Object.values(answer).some(Boolean)) throw new Error("INVALID_INPUT");
  return JSON.stringify(answer);
}
