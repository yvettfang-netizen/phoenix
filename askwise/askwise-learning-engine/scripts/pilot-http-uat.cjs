// Real HTTP acceptance against anonymous, local-only UAT accounts. Never log tokens/answers.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const base = process.env.ASKWISE_UAT_URL || "http://127.0.0.1:3012/api/pilot/v1";
if (new URL(base).hostname !== "127.0.0.1") throw Error("Local anonymous UAT only");
const password = process.env.ASKWISE_UAT_PASSWORD;
if (!password) throw Error("Set ASKWISE_UAT_PASSWORD privately");
const answer = work => ({ conditions: "", method: "", work, conclusion: "" });
let checks = 0;
const pass = label => { checks++; console.log("PASS", label); };
async function call(route, token, method = "GET", body) {
  const response = await fetch(base + "/" + route, { method, headers: {
    ...(token ? { Authorization: "Bearer " + token } : {}), ...(body ? { "Content-Type": "application/json" } : {}),
  }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
  const result = await response.json();
  return { status: response.status, result };
}
async function signIn(account) {
  const result = await call("login", null, "POST", { account, password });
  assert.equal(result.status, 200); return result.result.token;
}
async function main() {
  assert.equal((await call("today")).status, 401);
  pass("unauthenticated API denied");
  const a = await signIn("anon_a"); const b = await signIn("anon_b");
  pass("anonymous A/B login");
  const input = { subject: "Mathematics", topic: "line intersects ellipse with Vieta", question: "Anonymous two-intersection question", answer: answer("ordinary algebra"), request_id: randomUUID() };
  const first = await call("tasks", a, "POST", input);
  assert.equal(first.status, 201);
  // Intentionally discard the first response at the caller boundary, then replay.
  const duplicate = await call("tasks", a, "POST", input);
  assert.deepEqual(duplicate.result, first.result);
  const taskId = first.result.taskId;
  let state = await call("tasks/" + taskId, a);
  assert.equal(state.result.attempts.length, 1); assert.equal(state.result.session.retry_count, 0);
  assert.equal(state.result.diagnosis.type, "K2"); assert.equal(state.result.latestHint.hint_level, 1);
  assert.equal(state.result.diagnosis_source, "rules");
  pass("Math initial attempt, K2, Hint1, retry0 and lost-response replay");
  assert.equal((await call("tasks", a, "POST", { ...input, question: "changed" })).status, 409);
  pass("same idempotency key with changed payload rejected");
  assert.equal((await call("tasks/" + taskId, b)).status, 404);
  assert.equal((await call("tasks/" + taskId + "/attempts", b, "POST", { answer: answer("Vieta"), request_id: randomUUID() })).status, 404);
  pass("cross-student task read/write rejected");
  const retry = { answer: answer("Vieta root relationship"), request_id: randomUUID() };
  const solved = await call("tasks/" + taskId + "/attempts", a, "POST", retry);
  assert.equal(solved.status, 200); assert.equal(solved.result.correct, true);
  assert.deepEqual((await call("tasks/" + taskId + "/attempts", a, "POST", retry)).result, solved.result);
  state = await call("tasks/" + taskId, a);
  assert.equal(state.result.session.solved, 1); assert.equal(state.result.session.retry_count, 1); assert.equal(state.result.attempts.length, 2);
  assert.ok(state.result.evidence); pass("retry idempotency, solved and actual evidence");
  const p = await call("tasks", a, "POST", { ...input, subject: "Politics", topic: "Concept comparison", answer: answer("unrelated material"), request_id: randomUUID() });
  assert.equal(p.status, 201);
  assert.equal((await call("tasks/" + p.result.taskId, a)).result.diagnosis.type, "P5");
  const politics = await call("tasks/" + p.result.taskId + "/attempts", a, "POST", { answer: answer("\u8054\u7cfb\u591a\u6837\u6027\u4e0e\u77db\u76fe\u7279\u6b8a\u6027"), request_id: randomUUID() });
  assert.equal(politics.result.correct, true); pass("Politics P5 then rule-recognized retry");
  const reflection = { q1: "Anonymous knowledge gap", q2: "Anonymous useful hint", q3: "Anonymous next method", request_id: randomUUID() };
  assert.equal((await call("reflection", a, "POST", reflection)).status, 200);
  assert.ok((await call("dashboard", a)).result.tasksCompleted >= 2); pass("reflection and dashboard persistence");
  const invalid = new FormData(); invalid.append("request_id", randomUUID()); invalid.append("photo", new Blob(["not an image"]), "fake.png");
  const bad = await fetch(base + "/tasks/" + taskId + "/uploads", { method: "POST", headers: { Authorization: "Bearer " + a }, body: invalid });
  assert.equal(bad.status, 400);
  const form = new FormData(); form.append("request_id", randomUUID()); form.append("photo", new Blob([fs.readFileSync("public/assets/aoyu/expressions/default.png")], { type: "image/png" }), "anonymous.png");
  const photo = await fetch(base + "/tasks/" + taskId + "/uploads", { method: "POST", headers: { Authorization: "Bearer " + a }, body: form });
  assert.equal(photo.status, 201); const attachment = await photo.json();
  const repeatedPhoto = await fetch(base + "/tasks/" + taskId + "/uploads", { method: "POST", headers: { Authorization: "Bearer " + a }, body: form });
  assert.equal(repeatedPhoto.status, 201); assert.deepEqual(await repeatedPhoto.json(), attachment);
  pass("photo upload replay uses the same protected attachment");
  assert.equal((await fetch(base + "/uploads/" + attachment.id, { headers: { Authorization: "Bearer " + a } })).status, 200);
  assert.equal((await fetch(base + "/uploads/" + attachment.id, { headers: { Authorization: "Bearer " + b } })).status, 404);
  pass("invalid photo rejected, authenticated upload/download and B denied");
  const exported = (await call("export", a)).result;
  assert.equal(exported.records.students.length, 1); assert.ok(exported.attachments.some(p => p.id === attachment.id));
  pass("own data export includes attachment references");
  assert.equal((await call("logout", a, "POST", {})).status, 200);
  assert.equal((await call("evidence", a)).status, 401);
  const fresh = await signIn("anon_a");
  assert.ok((await call("evidence", fresh)).result.some(e => e.task_id === taskId));
  pass("logout revocation and re-login persistence");
  const disposable = await signIn("anon_delete");
  const disposableTask = await call("tasks", disposable, "POST", { ...input, request_id: randomUUID() });
  assert.equal(disposableTask.status, 201);
  assert.equal((await call("delete", disposable, "POST", { confirmation: "DELETE" })).status, 200);
  assert.equal((await call("today", disposable)).status, 401);
  assert.equal((await call("login", null, "POST", { account: "anon_delete", password })).status, 401);
  assert.equal((await call("today", b)).status, 200); pass("disposable account deletion and other student preserved");
  const unavailable = await call("wechat-login", null, "POST", { code: "anonymous-missing-provider-config" });
  assert.equal(unavailable.status, 503); assert.equal(unavailable.result.error, "WECHAT_NOT_CONFIGURED");
  pass("WeChat unavailable fails explicitly without fake login");
  console.log("HTTP acceptance:", checks, "passed; only anonymous local UAT data used.");
}
main().catch(error => { console.error("HTTP UAT FAIL:", error.message); process.exitCode = 1; });
