import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePreflight, collectSnapshot, REQUIRED_WORKFLOWS } from "../scripts/wealth-release-preflight.mjs";

const head = "a".repeat(40), mainSha = "b".repeat(40), brandHead = "c".repeat(40);
const approval = (commit, extra = {}) => ({ id: 1, user: { login: "Jimson614" }, state: "APPROVED",
  commit_id: commit, submitted_at: "2026-11-04T10:00:00Z", ...extra });
function ready() {
  return {
    repository: "yvettfang-netizen/phoenix", collectedAt: "2026-11-04T10:01:00Z",
    candidate: { number: 43, state: "open", merged: false, draft: false, user: { login: "author" },
      head: { sha: head }, base: { ref: "main", repo: { full_name: "yvettfang-netizen/phoenix" } }, html_url: "https://github.com/yvettfang-netizen/phoenix/pull/43" },
    brand: { number: 40, head: { sha: brandHead }, user: { login: "author" }, merged: true,
      merged_at: "2026-11-04T10:00:00Z", merge_commit_sha: mainSha, base: { ref: "main" } },
    mainSha, finalCandidateSha: head, finalMainSha: mainSha, finalBrandSha: brandHead, finalBrandMerged: true,
    evidenceStable: true,
    candidateReviews: [approval(head)], brandReviews: [approval(brandHead)],
    mainComparison: { status: "ahead", behind_by: 0 },
    runs: REQUIRED_WORKFLOWS.map((file, index) => ({ id: index + 1, head_sha: head,
      event: "pull_request", pull_requests: [{ number: 43 }], path: `.github/workflows/${file}`,
      status: "completed", conclusion: "success", html_url: `https://github.com/example/actions/runs/${index + 1}` })),
    brandRuns: REQUIRED_WORKFLOWS.map((file, index) => ({ id: index + 10, head_sha: brandHead,
      event: "pull_request", pull_requests: [{ number: 40 }], path: `.github/workflows/${file}`,
      status: "completed", conclusion: "success" })),
  };
}
const held = (report, id) => report.checks.find((check) => check.id === id)?.status === "HOLD";

test("code prerequisites never claim deployment or Founder approval", () => {
  const report = evaluatePreflight(ready());
  assert.equal(report.status, "CODE_PREREQUISITES_PASS");
  assert.equal(report.productionReady, "NOT_ASSESSED");
  assert.ok(report.requiredExternalEvidence.some((item) => item.includes("rollback")));
  assert.ok(report.requiredExternalEvidence.some((item) => item.includes("Founder")));
});

test("unmerged brand, stacked base and draft remain separate holds despite green CI", () => {
  const snapshot = ready();
  snapshot.brand.merged = false;
  snapshot.brand.merged_at = null;
  snapshot.candidate.base.ref = "codex/brand-bilingual-logo-v32-20261103";
  snapshot.candidate.draft = true;
  const report = evaluatePreflight(snapshot);
  for (const id of ["BRAND_MERGED", "BASE_MAIN", "READY_FOR_REVIEW"]) assert.ok(held(report, id));
  assert.equal(held(report, "CURRENT_HEAD_CI"), false);
  assert.equal(report.status, "HOLD");
  assert.equal(report.brand.mergeCommit, null, "an unmerged PR's synthetic merge SHA is not a merged commit");
});

test("approval must belong to the actual head and cannot come from the PR author", () => {
  const snapshot = ready();
  snapshot.candidateReviews = [approval("d".repeat(40))];
  assert.ok(held(evaluatePreflight(snapshot), "INDEPENDENT_APPROVAL"));
  snapshot.candidateReviews = [approval(head)];
  snapshot.candidate.user.login = "Jimson614";
  assert.ok(held(evaluatePreflight(snapshot), "INDEPENDENT_APPROVAL"));
});

test("later requested changes or dismissed approval cannot inherit an earlier approval", () => {
  for (const state of ["CHANGES_REQUESTED", "DISMISSED"]) {
    const snapshot = ready();
    snapshot.candidateReviews.push(approval(head, { id: 2, state, submitted_at: "2026-11-04T10:00:30Z" }));
    assert.ok(held(evaluatePreflight(snapshot), "INDEPENDENT_APPROVAL"));
  }
});

test("old-head, foreign-PR, missing and pending CI evidence fail closed", () => {
  for (const mutation of [
    (run) => { run.head_sha = "d".repeat(40); },
    (run) => { run.pull_requests = [{ number: 40 }]; },
    (run) => { run.status = "in_progress"; run.conclusion = null; },
  ]) {
    const snapshot = ready(); mutation(snapshot.runs[0]);
    assert.ok(held(evaluatePreflight(snapshot), "CURRENT_HEAD_CI"));
  }
  const snapshot = ready(); snapshot.runs.pop();
  assert.ok(held(evaluatePreflight(snapshot), "CURRENT_HEAD_CI"));
});

test("the latest failed workflow run overrides an older green run", () => {
  const snapshot = ready();
  snapshot.runs.push({ ...snapshot.runs[0], id: 100, conclusion: "failure" });
  const report = evaluatePreflight(snapshot);
  assert.ok(held(report, "CURRENT_HEAD_CI"));
  assert.equal(report.workflowEvidence[0].runId, 100);
  snapshot.brandRuns[0].conclusion = "failure";
  assert.ok(held(evaluatePreflight(snapshot), "BRAND_CI"));
});

test("stale main ancestry and ref changes during collection remain holds", () => {
  const snapshot = ready(); snapshot.mainComparison = { status: "diverged", behind_by: 1 };
  assert.ok(held(evaluatePreflight(snapshot), "MAIN_INCLUDED"));
  snapshot.finalCandidateSha = "e".repeat(40);
  assert.ok(held(evaluatePreflight(snapshot), "SNAPSHOT_STABLE"));
  snapshot.finalCandidateSha = head; snapshot.finalMainSha = "f".repeat(40);
  assert.ok(held(evaluatePreflight(snapshot), "SNAPSHOT_STABLE"));
  snapshot.finalMainSha = mainSha; snapshot.finalBrandSha = "f".repeat(40);
  assert.ok(held(evaluatePreflight(snapshot), "SNAPSHOT_STABLE"));
});

function mockApi(snapshot, mutate = () => {}) {
  const counts = new Map();
  return async (endpoint) => {
    const count = (counts.get(endpoint) || 0) + 1;
    counts.set(endpoint, count);
    const value = structuredClone(snapshot);
    mutate(value, endpoint, count);
    if (endpoint.includes("/reviews")) return endpoint.includes("/43/") ? value.candidateReviews : value.brandReviews;
    if (endpoint.endsWith("/pulls/43")) return value.candidate;
    if (endpoint.endsWith("/pulls/40")) return value.brand;
    if (endpoint.endsWith("/git/ref/heads/main")) return { object: { sha: value.mainSha } };
    if (endpoint.includes("/compare/")) return value.mainComparison;
    if (endpoint.includes("/actions/runs?")) {
      const runs = endpoint.includes(brandHead) ? value.brandRuns : value.runs;
      return [{ workflow_runs: runs.slice(0, 2) }, { workflow_runs: runs.slice(2) }];
    }
    throw Error("Unexpected endpoint");
  };
}

test("collection reads all workflow pages and rechecks refs, reviews and CI before reporting", async () => {
  const snapshot = ready(), calls = [];
  const get = mockApi(snapshot);
  const api = async (endpoint) => {
    calls.push(endpoint);
    return get(endpoint);
  };
  const actual = await collectSnapshot(api, snapshot.repository);
  assert.equal(actual.runs.length, 5);
  assert.equal(calls.filter((endpoint) => endpoint.endsWith("/pulls/43")).length, 2);
  assert.equal(calls.filter((endpoint) => endpoint.endsWith("/git/ref/heads/main")).length, 2);
  assert.equal(evaluatePreflight(actual).status, "CODE_PREREQUISITES_PASS");
});

test("same-head approval withdrawal, new CI failure and PR-state changes invalidate the snapshot", async () => {
  const mutations = [
    (s, endpoint) => { if (endpoint.includes("/43/reviews")) s.candidateReviews[0].state = "DISMISSED"; },
    (s, endpoint) => { if (endpoint.includes("/actions/runs?") && endpoint.includes(head)) s.runs.push({ ...s.runs[0], id: 100, conclusion: "failure" }); },
    (s, endpoint) => { if (endpoint.endsWith("/pulls/43")) s.candidate.draft = true; },
    (s, endpoint) => { if (endpoint.endsWith("/pulls/43")) s.candidate.state = "closed"; },
    (s, endpoint) => { if (endpoint.endsWith("/pulls/43")) s.candidate.base.ref = "other"; },
  ];
  for (const mutate of mutations) {
    const api = mockApi(ready(), (s, endpoint, count) => { if (count === 2) mutate(s, endpoint); });
    const snapshot = await collectSnapshot(api, "yvettfang-netizen/phoenix");
    assert.ok(held(evaluatePreflight(snapshot), "SNAPSHOT_STABLE"));
    assert.equal(evaluatePreflight(snapshot).status, "HOLD");
  }
});
