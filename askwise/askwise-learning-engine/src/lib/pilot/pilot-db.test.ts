import { beforeAll, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const browser = vi.hoisted(() => ({ token: "" }));
vi.mock("next/headers", () => ({ cookies: () => ({ get: () => ({ value: browser.token }) }), headers: () => ({ get: () => null }) }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("AUTH_REQUIRED"); } }));

let store: typeof import("../db");
let auth: typeof import("./auth-core");
let flow: typeof import("./learning-session");
let restore: typeof import("./backup");
let root: string;
let authPath: string;
let a: number;
let b: number;
let aToken: string;
let bToken: string;
const password = "anonymous-test-password-42";

beforeAll(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "askwise-pilot-uat-"));
  authPath = path.join(root, "auth.json");
  process.env.ASKWISE_DB_PATH = path.join(root, "isolated.db");
  process.env.ASKWISE_AUTH_PATH = authPath;
  store = await import("../db");
  auth = await import("./auth-core");
  flow = await import("./learning-session");
  restore = await import("./backup");
  a = store.provisionPilotStudent("pilot_anon_a");
  b = store.provisionPilotStudent("pilot_anon_b");
  auth.provisionCredential(authPath, "anon_a", password, a);
  auth.provisionCredential(authPath, "anon_b", password, b);
  aToken = auth.login(authPath, "anon_a", password)!.token;
  bToken = auth.login(authPath, "anon_b", password)!.token;
});

function task(subject = "Mathematics") {
  return store.createTask({ subject, topic: subject === "Politics" ? "Concept comparison" : "line intersects ellipse with Vieta", question: "Anonymous pilot question", confidence: "I am stuck", initialAttempt: "" });
}

describe("independent SQLite pilot acceptance", () => {
  it("rejects missing/forged and expired sessions before reading or writing", () => {
    for (const token of ["", "forged-token"]) {
      browser.token = token;
      expect(() => store.getPilotContext()).toThrow("AUTH_REQUIRED");
      expect(() => task()).toThrow("AUTH_REQUIRED");
      expect(() => store.listLearningEvidence()).toThrow("AUTH_REQUIRED");
      expect(() => store.exportStudentData()).toThrow("AUTH_REQUIRED");
      expect(() => store.deleteStudentData()).toThrow("AUTH_REQUIRED");
    }
    browser.token = auth.login(authPath, "anon_a", password, Date.now() - 9 * 3600000)!.token;
    expect(() => store.getPilotContext()).toThrow("AUTH_REQUIRED");
  });

  it("blocks all A-to-B task/session/map/evidence reads and writes", () => {
    browser.token = bToken;
    const owned = task();
    store.upsertDailyReflection({ q1: "B reflection", q2: "B hint", q3: "B next step" });
    browser.token = aToken;
    const blocked = [
      () => store.getTaskById(owned.taskId), () => store.getSessionByTask(owned.taskId),
      () => store.getSessionSnapshot(owned.sessionId), () => store.getSessionById(owned.sessionId),
      () => store.getLatestHintLevel(owned.sessionId), () => store.getAttemptsForSession(owned.sessionId),
      () => store.getLatestAttempt(owned.sessionId), () => store.getEvidenceForTask(owned.taskId),
      () => store.addAttempt(owned.sessionId, "injected", 0, true),
      () => store.saveDiagnosis(owned.sessionId, "K2", "injected", 1),
      () => store.saveHint(owned.sessionId, 5, "injected"),
      () => store.closeSession(owned.sessionId, "injected", true),
      () => store.buildEvidenceForSession(owned.sessionId, "injected"),
      () => flow.submitLearningAttempt(owned.taskId, "Vieta"),
      () => store.listTodayTasks(b), () => store.getPoliticalMaps(b),
      () => store.getMathMaps(b), () => store.getReflections(b),
    ];
    blocked.forEach((op, index) => expect(op, `Cross-student operation ${index}`).toThrow("Resource unavailable"));
    expect(JSON.stringify(store.exportStudentData())).not.toContain("B reflection");
  });

  it("persists Math diagnosis, gradual hint, retry, solved evidence, reflection and dashboard", () => {
    browser.token = aToken;
    const owned = task();
    expect(store.getSessionSnapshot(owned.sessionId)?.session.retry_count).toBe(0);
    const first = flow.submitLearningAttempt(owned.taskId, "ordinary algebra");
    expect(first.diagnosis).toBe("K2");
    const initial = store.getSessionSnapshot(owned.sessionId)!;
    expect(initial.session.retry_count).toBe(0);
    expect(initial.attempts).toHaveLength(1);
    expect(initial.diagnosis?.type).toBe("K2");
    expect(initial.latestHint?.hint_level).toBe(1);
    expect(initial.latestHint?.content).not.toContain("Vieta");
    expect(flow.submitLearningAttempt(owned.taskId, "Vieta root relationship").correct).toBe(true);
    const solved = store.getSessionSnapshot(owned.sessionId)!;
    expect(solved.session.solved).toBe(1);
    expect(solved.session.retry_count).toBe(1);
    expect(store.getEvidenceForTask(owned.taskId)).toBeTruthy();
    store.upsertDailyReflection({ q1: "Recognize the tool", q2: "Condition hint", q3: "Connect conditions to method" });
    expect(store.getDailyReflection(1)).toBeTruthy();
    expect(store.getDashboardStats()?.tasksCompleted).toBeGreaterThan(0);
    expect(store.getDashboardStats()?.independentRate).toBe("0%");
    const readonly = new Database(process.env.ASKWISE_DB_PATH!, { readonly: true });
    expect(readonly.prepare("SELECT count(*) n FROM learning_evidences WHERE task_id=?").get(owned.taskId)).toEqual({ n: 1 });
    readonly.close();
  });

  it("persists Politics taxonomy and maps without changing engine rules", () => {
    browser.token = aToken;
    const owned = task("Politics");
    expect(flow.submitLearningAttempt(owned.taskId, "unrelated material").diagnosis).toBe("P5");
    const input = "\u8054\u7cfb\u591a\u6837\u6027\u4e0e\u77db\u76fe\u7279\u6b8a\u6027";
    expect(flow.submitLearningAttempt(owned.taskId, input).correct).toBe(true);
    store.upsertPoliticalMap({ topic: "Comparison", coreConcept: "Concept A/B", keyPoint: "Difference", connection: "Material signal", triggerQuestion: "Which principle?", myOwnExplanation: "Anonymous explanation" });
    store.upsertMathMap({ problemType: "Ellipse", recognitionSignal: "Two intersections", possibleStrategy: "Vieta", whyThisStrategy: "Root relation", commonMistake: "Wrong sign", example: "Anonymous example" });
    expect(store.getPoliticalMaps()).toHaveLength(1);
    expect(store.getMathMaps()).toHaveLength(1);
  });

  it("logout revokes token and re-login restores same persisted records", () => {
    browser.token = aToken;
    const before = store.listLearningEvidence().length;
    auth.logout(authPath, aToken);
    expect(() => store.listLearningEvidence()).toThrow("AUTH_REQUIRED");
    aToken = auth.login(authPath, "anon_a", password)!.token;
    browser.token = aToken;
    expect(store.listLearningEvidence()).toHaveLength(before);
    expect(store.getReflections()).toHaveLength(1);
  });

  it("scopes Compass mock handoff/writeback to approved anonymous ID fixtures", async () => {
    browser.token = aToken;
    const context = store.getPilotContext();
    const compass = await import("./compass-service");
    const payload = { student_id: "external_anon_a", assessment_id: "assessment_anon_a", subject_focus: "ellipse Vieta", learning_bottleneck: "method selection", priority_issue: "trigger", recommended_learning_goal: "recognize tool" };
    expect(() => compass.mockCompassHandoff(payload)).toThrow("COMPASS_MOCK_NOT_CONFIGURED");
    fs.writeFileSync(path.join(root, "compass-fixtures.json"), JSON.stringify([{ external_student_id: payload.student_id, external_assessment_id: payload.assessment_id, askwise_student_id: a, askwise_experiment_id: context.experimentId }]));
    const result = compass.mockCompassHandoff(payload);
    expect(result.environment).toBe("mock");
    expect(result.diagnosis_source).toBe("fixture");
    if (result.payload.status === "error") throw Error("unexpected mock failure");
    const sessionId = result.payload.askwise_session_id;
    const repeated = compass.mockCompassHandoff(payload);
    if (repeated.payload.status === "error") throw Error("unexpected repeat failure");
    expect(repeated.payload.askwise_session_id).toBe(sessionId);
    expect(compass.mockCompassWriteback(sessionId).environment).toBe("mock");
    browser.token = bToken;
    expect(() => compass.mockCompassHandoff(payload)).toThrow("Resource unavailable");
    expect(() => compass.mockCompassWriteback(sessionId)).toThrow("Resource unavailable");
    browser.token = aToken;
  });

  it("backs up active WAL data and restores identical schema and rows offline", async () => {
    const backup = path.join(root, "backup.db");
    const restored = path.join(root, "restore.db");
    await store.backupPilotDatabase(backup);
    await restore.restorePilotBackup(backup, restored);
    const live = new Database(process.env.ASKWISE_DB_PATH!, { readonly: true });
    const copy = new Database(restored, { readonly: true });
    expect(copy.pragma("integrity_check", { simple: true })).toBe("ok");
    expect(copy.pragma("foreign_key_check")).toEqual([]);
    const schema = "SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name";
    expect(copy.prepare(schema).all()).toEqual(live.prepare(schema).all());
    for (const { name } of live.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]) {
      expect(copy.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()).toEqual(live.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all());
    }
    live.close(); copy.close();
    await expect(restore.restorePilotBackup(backup, restored)).rejects.toThrow("already exists");
    await expect(store.backupPilotDatabase(backup)).rejects.toThrow("already exists");
  });

  it("exports only current student and deletion revokes credentials while preserving B", () => {
    browser.token = aToken;
    const exported = store.exportStudentData();
    expect(exported.student_id).toBe(a);
    expect(exported.canonical_student_id).toBeNull();
    expect(exported.records.learning_evidences.length).toBeGreaterThan(0);
    expect(exported.records.students).toHaveLength(1);
    store.deleteStudentData();
    expect(auth.authenticate(authPath, aToken)).toBeNull();
    expect(auth.login(authPath, "anon_a", password)).toBeNull();
    expect(() => store.getPilotContext()).toThrow("AUTH_REQUIRED");
    const check = new Database(process.env.ASKWISE_DB_PATH!, { readonly: true });
    expect(check.prepare("SELECT id FROM students WHERE id=?").get(a)).toBeUndefined();
    expect(check.pragma("foreign_key_check")).toEqual([]);
    check.close();
    browser.token = bToken;
    expect(store.getPilotContext().studentId).toBe(b);
    expect(store.getReflections()).toHaveLength(1);
    expect(store.listLearningEvidence()).toEqual([]);
  });
});
