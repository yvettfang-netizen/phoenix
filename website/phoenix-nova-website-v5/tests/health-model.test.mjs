import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const source = readFileSync(new URL("../lib/health-compass.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const model = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
const { questions, dimensions, normaliseAnswers, getResults, dimensionStatus, toggleAction, actionText } = model;
test("14-question Chinese source remains identical to the supplied prototype", () => {
  const frozen = questions.map(q => ({ id: q.id, title: q.title[0], hint: q.hint[0], options: q.options.map(o => ({ value: o.value, label: o.label[0] })) }));
  assert.equal(questions.length, 14);
  assert.equal(createHash("sha256").update(JSON.stringify(frozen)).digest("hex"), "df3c795277e63e972926da0bf6ec9aa0418cb7a65c164b180e8bdbf1882ada3d");
});
test("all bilingual labels and six directions are complete", () => {
  assert.equal(dimensions.length, 6);
  for (const q of questions) for (const copy of [q.title, q.hint, ...q.options.map(o => o.label)]) assert.ok(copy[0] && copy[1]);
  for (const d of dimensions) assert.ok(d.title[1] && d.action[1]);
});
test("context-only, missing and invalid answers never invent results", () => {
  assert.deepEqual(getResults([]), []);
  assert.deepEqual(getResults(["self", "hk"]), []);
  assert.deepEqual(getResults(Array(14).fill("INJECTED")), []);
  assert.equal(normaliseAnswers([]).length, 14);
});
test("all 36 arrangement pairs follow the original deterministic rules", () => {
  const values = [null, "clear", "partial", "todo", "unknown", "na"];
  for (const a of values) for (const b of values) {
    const pair = [a, b];
    const expected = pair.every(v => v === null) ? "信息不足，不作判断" : pair.every(v => v === "na") ? "本次不适用" : pair.some(v => v === "partial" || v === "todo") ? "你有待整理的安排" : pair.includes("unknown") ? "你有待了解的事项" : pair.includes(null) ? "仅提供了部分信息" : "你已说明现有安排";
    assert.equal(dimensionStatus(pair)[0], expected, JSON.stringify(pair));
  }
});
test("missing dimensions stay missing rather than healthy", () => {
  const result = getResults([null, null, "clear"]);
  assert.equal(result.length, 6);
  assert.equal(result[0].status[0], "仅提供了部分信息");
  assert.ok(result.slice(1).every(d => d.status[0] === "信息不足，不作判断"));
});
test("action cap, validity, selection order and toggling are deterministic", () => {
  let selected = [];
  for (const id of ["follow", "care", "access", "cover"]) selected = toggleAction(selected, id);
  assert.deepEqual(selected, ["follow", "care", "access"]);
  assert.deepEqual(toggleAction(selected, "care"), ["follow", "access"]);
  assert.deepEqual(toggleAction(selected, "INJECTED"), selected);
});
test("export contains chosen generic actions but no raw answers or health score", () => {
  const plan = actionText(["care", "access", "care", "INJECTED"], "zh");
  assert.ok(plan.indexOf("1. 家庭照护协作") < plan.indexOf("2. 就医路径"));
  assert.doesNotMatch(plan, /HC01|HC03|INJECTED|全家一起|已有清晰安排/);
  assert.match(plan, /非医疗建议/);
});
test("model and UI contain no persistence, API, analytics or external form calls", () => {
  const ui = readFileSync(new URL("../components/health-compass.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source + ui, /localStorage|sessionStorage|indexedDB|document\.cookie|fetch\s*\(|sendBeacon|XMLHttpRequest|WebSocket|console\./);
  assert.doesNotMatch(ui, /type=["']file|<form[^>]*action/);
});

