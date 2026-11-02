import fs from "node:fs";
import path from "node:path";
import { authStorePath } from "./paths";
import { requirePilotStudent } from "./request";
import { ownsPilotExperiment } from "../db";
import { getCompassSession, registerIdMappings, startCompassSession, type CompassInputPayload } from "../compass/mock-adapter";

const owners = new Map<string, number>();
type Fixture = { external_student_id: string; external_assessment_id: string; askwise_student_id: number; askwise_experiment_id: number };

export function mockCompassHandoff(payload: CompassInputPayload) {
  const owner = requirePilotStudent();
  if (typeof payload.integration_version === "string" && payload.integration_version.trim() && payload.integration_version.trim() !== "v1.0") {
    return { environment: "mock" as const, diagnosis_source: "fixture" as const, payload: startCompassSession(payload) };
  }
  const file = path.join(path.dirname(authStorePath), "compass-fixtures.json");
  if (!fs.existsSync(file)) throw new Error("COMPASS_MOCK_NOT_CONFIGURED");
  const fixtures = JSON.parse(fs.readFileSync(file, "utf8")) as Fixture[];
  const fixture = fixtures.find(row => row.external_student_id === payload.student_id && row.external_assessment_id === payload.assessment_id && row.askwise_student_id === owner);
  if (!fixture || !ownsPilotExperiment(fixture.askwise_experiment_id)) throw new Error("Resource unavailable");
  registerIdMappings({ student_id: fixture.external_student_id, assessment_id: fixture.external_assessment_id, askwise_student_id: String(owner), askwise_experiment_id: String(fixture.askwise_experiment_id) });
  const result = startCompassSession(payload);
  if (result.status !== "error") owners.set(result.askwise_session_id, owner);
  return { environment: "mock" as const, diagnosis_source: "fixture" as const, payload: result };
}

export function mockCompassWriteback(sessionId: string) {
  if (owners.get(sessionId) !== requirePilotStudent()) throw new Error("Resource unavailable");
  return { environment: "mock" as const, diagnosis_source: "fixture" as const, payload: getCompassSession(sessionId) };
}
