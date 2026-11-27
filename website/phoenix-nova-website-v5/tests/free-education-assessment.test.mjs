import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { REGISTRY, BRANCHES, CARDS, VERSIONS, isValidAnswer, reviseAnswer, assessmentPath,
  evaluateFreeAssessment, verifyOfficialRule, anonymousActionAllowed } from "../../../Phoenix Compass/education compass/models/free-education-assessment.js";
import { handleFreeEducationAssessment, freeAssessmentPreviewEnabled } from "../lib/free-education-assessment.ts";
import { presentGrowthCards } from "../../../Phoenix Compass/education compass/models/free-education-presentation.js";

const require = createRequire(import.meta.url);
const mini = require("../../../Phoenix Compass/education compass/services/free-education-assessment.js");
const base = { Q1: "PATHWAY_UNCLEAR", Q2: "SECONDARY_FORM_1_YEAR_7", Q3: "DSE" };
const input = answers => ({ versions: VERSIONS, respondent_role: "PARENT_GUARDIAN", answers });
const findings = snapshot => snapshot.cards.flatMap(card => card.findings);
const request = (payload, options = {}) => new Request("https://example.test/api/free-education-assessment", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), ...options,
});

test("every frozen registry choice has the right cardinality and type", () => {
  assert.equal(REGISTRY.length, 28);
  assert.equal(REGISTRY.reduce((sum, q) => sum + q.allowed_values.length, 0), 159);
  assert.equal(new Set(REGISTRY.map(q => q.question_id)).size, 28);
  assert.deepEqual(REGISTRY.filter(q => q.required).map(q => q.question_id), ["Q1","Q2","Q3"]);
  for (const q of REGISTRY) {
    for (const { value } of q.allowed_values) {
      assert.ok(isValidAnswer(q, q.answer_type === "SINGLE_CHOICE" ? value : [value]));
    }
    assert.equal(isValidAnswer(q, null), !q.required);
    assert.equal(isValidAnswer(q, "UNKNOWN_EXTERNAL_CODE"), false);
    const normal = q.allowed_values.map(o => o.value).filter(value => !q.exclusive_options.includes(value));
    if (q.answer_type === "MULTI_CHOICE") {
      assert.ok(isValidAnswer(q, normal.slice(0, q.max_selections)));
      assert.equal(isValidAnswer(q, normal.slice(0, q.max_selections + 1)), false);
      for (const excluded of q.exclusive_options) {
        assert.equal(isValidAnswer(q, [excluded, normal[0]]), false);
      }
    }
  }
  const q5 = REGISTRY.find(q => q.question_id === "Q5");
  assert.ok(isValidAnswer(q5, ["BROAD_INTERESTS", "STEM_TECH"]));
  for (const required of ["Q1", "Q2", "Q3"]) {
    const answers = { ...base };
    delete answers[required];
    assert.throws(() => evaluateFreeAssessment(input(answers)));
  }
  assert.throws(() => evaluateFreeAssessment(input({ ...base, Q13: "SYNTHETIC" })));
});

const allObserved = new Set();
for (const [branch, concern] of Object.entries(BRANCHES)) {
  test(branch + " yields one path, at most twelve, and traced rule output", () => {
    const answers = { ...base, Q1: concern, Q4: "STABLE_CLEAR_GOALS", Q5: ["PRACTICAL_PROBLEM_SOLVING"],
      Q6: ["HK", "GB"], Q7: "VOLATILE_RESULTS", Q8: "DEVELOP_GROWTH_STRENGTHS" };
    const path = assessmentPath(answers);
    assert.equal(path.questions.length, 12);
    assert.deepEqual(path.questions.slice(8).map(q => q.question_id), [9,10,11,12].map(n => "Q" + n + "." + branch));
    for (const q of path.questions.slice(8)) {
      answers[q.question_id] = q.answer_type === "MULTI_CHOICE" ? [q.allowed_values[0].value] : q.allowed_values[0].value;
    }
    const snapshot = evaluateFreeAssessment(input(answers));
    assert.deepEqual(snapshot.cards.map(c => c.id), CARDS.map(c => c.id));
    assert.deepEqual(presentGrowthCards(snapshot).map(c => c.label), CARDS.map(c => c.label));
    for (const f of findings(snapshot)) {
      assert.ok(f.evidence_refs.length);
      assert.ok(f.evidence_refs.every(ref => answers[ref.question_id] !== undefined));
      assert.equal(f.rule_version, VERSIONS.rule_version);
      allObserved.add(f.rule_id);
    }
    if (branch !== "D") assert.equal(snapshot.profile.practice_evidence_status, "NOT_EXPLORED");
    else assert.ok(findings(snapshot).some(f => f.rule_id === "EDU-R005" && f.evidence_level === "L2"));
  });
}

test("all twelve rules are reached across the golden branches", () => {
  assert.deepEqual([...allObserved].sort(), Array.from({ length: 12 }, (_, i) => "EDU-R" + String(i + 1).padStart(3, "0")));
});

test("changing branch removes old answers; skip only when evidence is semantically reusable", () => {
  const previous = { ...base, "Q9.A": "REGION", Q6: ["HK"] };
  const revised = reviseAnswer(previous, "Q1", "MULTI_REGION_PLANNING");
  assert.ok(!Object.hasOwn(revised, "Q9.A"));
  assert.equal(assessmentPath(revised).questions.length, 11);
  const result = evaluateFreeAssessment(input(revised));
  assert.equal(result.question_status["Q9.E"], "SKIPPED_DUPLICATE");
  assert.equal(result.profile.primary_preferred_region, "HK");
  assert.equal(new Set(findings(result).map(f => f.finding_id)).size, findings(result).length);
  const changed = reviseAnswer(revised, "Q6", ["HK","GB"]);
  assert.equal(assessmentPath(changed).questions.length, 12);
  assert.throws(() => evaluateFreeAssessment(input({ ...changed, "Q9.A": "REGION" })));
  assert.ok(assessmentPath({ ...base, Q1: "CURRICULUM_CHOICE" }).questions.some(q => q.question_id === "Q12.B"));
  assert.equal(evaluateFreeAssessment(input({ ...base, Q4: null })).question_status.Q4, "USER_SKIPPED");
  assert.equal(evaluateFreeAssessment(input(base)).question_status.Q4, "MISSING");
  const skipped = Object.fromEntries(["Q4", "Q5", "Q6", "Q7", "Q8"].map(id => [id, null]));
  const snapshot = evaluateFreeAssessment(input({ ...base, ...skipped }));
  assert.ok(Object.keys(skipped).every(id => snapshot.question_status[id] === "USER_SKIPPED"));
});

test("official rule gate applies current, precise, independently reviewed rules and subject evidence", () => {
  const scope = { jurisdiction: "HK", institution: "synthetic-school", programme: "synthetic-programme",
    admission_year: 2030, qualification_system: "DSE", rule_category: "ELIGIBILITY" };
  const asOf = "2029-10-01T00:00:00Z";
  const rule = { ...scope, rule_id: "synthetic-rule", verification_status: "VERIFIED",
    reviewed_by: "synthetic-reviewer", source_url: "https://rules.example.test/example", source_version: "r1",
    source_sha256: "a".repeat(64), source_published_at: "2029-01-01T00:00:00Z", verified_at: "2029-09-30T00:00:00Z",
    valid_from: "2029-10-01T00:00:00Z", valid_until: "2030-09-30T00:00:00Z",
    clause_key: "synthetic-policy-topic", required_conditions: ["test_category"] };
  const applicant = { test_category: { status: "VERIFIED", satisfied: true, evidence_id: "synthetic-condition" } };
  const fixture = { scope, asOf, records: [rule], applicant };
  assert.equal(verifyOfficialRule(fixture).applicable, true);
  assert.equal(verifyOfficialRule({ ...fixture, applicant: {} }).applicable, false);
  assert.equal(verifyOfficialRule({ ...fixture, asOf: rule.valid_until }).verification_status, "EXPIRED");
  assert.equal(verifyOfficialRule({ ...fixture, scope: { ...scope, admission_year: 2031 } }).verification_status, "UNVERIFIED");
  assert.equal(verifyOfficialRule({ ...fixture, records: [rule, { ...rule, clause_key: "conflict" }] }).verification_status, "CONFLICTED");
  const hk = input({ ...base, Q1: "HK_ADMISSION_GOAL", "Q9.C": "HK_PERMANENT" });
  assert.ok(findings(evaluateFreeAssessment(hk, fixture)).some(f => f.evidence_level === "L4"));
  assert.ok(findings(evaluateFreeAssessment(hk)).some(f => f.rule_id === "EDU-R012" &&
    f.evidence_level === "L3" && f.official_verification_status === "UNVERIFIED"));
  assert.ok(!findings(evaluateFreeAssessment(hk, { ...fixture, applicant: {} })).some(f => f.evidence_level === "L4"));
  const officialDisplay = context => presentGrowthCards(evaluateFreeAssessment(hk, context))
    .flatMap(card => card.findings).find(f => f.id.startsWith("EDU-R012:"));
  assert.equal(officialDisplay(fixture).evidenceLabel, "依据已核验的适用官方规则");
  assert.deepEqual(officialDisplay(fixture).officialSources, [rule.source_url]);
  assert.equal(officialDisplay(fixture).officialNotice, "");
  for (const context of [undefined, { ...fixture, asOf: rule.valid_until },
    { ...fixture, records: [rule, { ...rule, clause_key: "conflict" }] }]) {
    const finding = officialDisplay(context);
    assert.equal(finding.evidenceLabel, "需要进一步资料或专业评估");
    assert.equal(finding.officialNotice, "相关招生要求有待官方核实。");
    assert.deepEqual(finding.officialSources, []);
  }
  assert.equal(officialDisplay({ ...fixture, applicant: {} }).officialNotice, "相关招生要求对本次申请是否适用，仍需核实。");
});

test("display merges card and finding gaps, uses evidence copy, and leaves the snapshot intact", () => {
  const snapshot = evaluateFreeAssessment(input({ ...base, Q1: "GROWTH_EXPLORATION", Q5: ["PRACTICAL_PROBLEM_SOLVING"],
    Q7: "VOLATILE_RESULTS", "Q10.D": ["PROJECT"] }));
  snapshot.cards[1].missing_information.push("academic_period");
  const original = structuredClone(snapshot);
  const [stage, growth, , next] = presentGrowthCards(snapshot);
  assert.deepEqual(stage.missingInformation, []);
  assert.deepEqual(growth.missingInformation, [
    "尚未了解孩子近期的学习状态。",
    "尚未了解成绩所属学期或考试时间。",
    "尚未了解孩子在相关活动中持续投入的时间。"
  ]);
  assert.equal(stage.findings[0].evidenceLabel, "根据本次填写的信息");
  assert.equal(growth.findings.find(f => f.title === "兴趣与投入线索").evidenceLabel, "根据多项回答形成的观察");
  assert.ok(next.findings.some(f => f.evidenceLabel === "需要进一步资料或专业评估"));
  assert.ok(!next.missingInformation.includes("尚未了解孩子近期的学习状态。"));
  assert.deepEqual(stage.findings[0].questionPrompts, ["孩子现在读几年级？"]);
  assert.deepEqual(snapshot, original);
});

test("stateless website and native page generate the same anonymous golden result", async () => {
  assert.equal(freeAssessmentPreviewEnabled({}), false);
  assert.equal((await handleFreeEducationAssessment(request(input(base)), false)).status, 404);
  const screen = { ...mini.freeAssessmentControls, data: {}, setData(fields) { Object.assign(this.data, fields); } };
  const event = fields => ({ currentTarget: { dataset: fields } });
  screen.startFreeAssessment(event({ role: "PARENT_GUARDIAN" }));
  for (const value of Object.values(base)) {
    screen.selectFreeAnswer(event({ value }));
    await screen.nextFreeQuestion(event({}));
  }
  while (!screen.data.freeSnapshot) await screen.nextFreeQuestion(event({ skip: "yes" }));
  const website = await handleFreeEducationAssessment(request(input(screen.freeAnswers)), true);
  assert.equal(website.status, 200);
  assert.equal(website.headers.get("cache-control"), "no-store");
  const snapshot = await website.json();
  assert.deepEqual(snapshot, evaluateFreeAssessment(input(screen.freeAnswers)));
  assert.deepEqual(presentGrowthCards(snapshot), screen.data.freeSnapshot.cards);
  const id = screen.data.freeSnapshot.cards[0].findings[0].id;
  assert.equal(screen.data.freeEvidenceOpen, "");
  screen.toggleFreeEvidence(event({ findingId: id }));
  assert.equal(screen.data.freeEvidenceOpen, id);
  screen.toggleFreeEvidence(event({ findingId: id }));
  assert.equal(screen.data.freeEvidenceOpen, "");
  screen.backFreeQuestion();
  assert.equal(screen.data.freeStep.index, 0);
  screen.discardFreeAssessment();
  assert.equal(screen.freeAnswers, null);
});

test("anonymous endpoint rejects extra fields, authorization claims, invalid versions and oversized bodies", async () => {
  for (const key of ["person_id","contact","officialContext","save","accepted","crm_reference"]) {
    assert.equal((await handleFreeEducationAssessment(request({ ...input(base), [key]: true }), true)).status, 400);
  }
  assert.equal((await handleFreeEducationAssessment(request({ ...input(base), versions: {} }), true)).status, 400);
  assert.equal((await handleFreeEducationAssessment(request(input(base), {
    headers: { origin: "https://other.example.test", "content-type": "application/json" },
  }), true)).status, 403);
  assert.equal((await handleFreeEducationAssessment(request({ ...input(base), padding: "a".repeat(5000) }), true)).status, 413);
  const parent = evaluateFreeAssessment(input({ ...base, Q4: "SUBJECT_VARIANCE" }));
  const student = evaluateFreeAssessment({ ...input({ ...base, Q4: "SUBJECT_VARIANCE" }), respondent_role: "STUDENT" });
  assert.match(findings(parent).find(f => f.rule_id === "EDU-R004").summary, /家长观察/);
  assert.match(findings(student).find(f => f.rule_id === "EDU-R004").summary, /学生自述/);
  assert.equal(Object.values(parent.authorizations).filter(status => status === "NOT_GRANTED").length, 4);
  for (const action of Object.keys(parent.authorizations)) assert.equal(anonymousActionAllowed(action), false);
});
