/** Read-only GitHub preflight. Never merges, deploys, changes DNS or grants approval. */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const exec = promisify(execFile);
export const REQUIRED_WORKFLOWS = [
  "website-pr-checks.yml",
  "health-compass-validation.yml",
  "canonical-0035-premerge.yml",
  "education-page-validation.yml",
  "identity-page-validation.yml",
];

function currentApproval(reviews, pr) {
  const decisions = reviews.filter((r) =>
    r.user?.login === "Jimson614" && r.user.login !== pr.user?.login &&
    ["APPROVED", "CHANGES_REQUESTED", "DISMISSED"].includes(r.state),
  ).sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at) || b.id - a.id);
  const latest = decisions[0];
  return latest?.state === "APPROVED" && latest.commit_id === pr.head.sha;
}

function prFingerprint(pr) {
  return JSON.stringify([pr.head.sha, pr.state, pr.merged, pr.merged_at, pr.draft,
    pr.base.ref, pr.base.repo?.full_name, pr.user?.login,
    pr.merged ? pr.merge_commit_sha : null]);
}

function reviewFingerprint(reviews) {
  return JSON.stringify(reviews.map((r) => [r.id, r.state, r.commit_id, r.user?.login, r.submitted_at])
    .sort((a, b) => a[0] - b[0]));
}

function runFingerprint(runs) {
  return JSON.stringify(runs.map((r) => [r.id, r.run_attempt, r.head_sha, r.event, r.path,
    r.status, r.conclusion, r.pull_requests?.map((pr) => pr.number).sort((a, b) => a - b)])
    .sort((a, b) => a[0] - b[0]));
}

function workflowEvidenceFor(runs, candidate) {
  const head = candidate.head.sha;
  return REQUIRED_WORKFLOWS.map((file) => {
    const matching = runs.filter((run) =>
      run.head_sha === head && run.event === "pull_request" &&
      run.path?.split("@")[0] === `.github/workflows/${file}` &&
      run.pull_requests?.some((pr) => pr.number === candidate.number),
    ).sort((a, b) => b.id - a.id || (b.run_attempt || 1) - (a.run_attempt || 1));
    const latest = matching[0];
    return {
      workflow: file,
      pass: latest?.status === "completed" && latest.conclusion === "success",
      runId: latest?.id ?? null,
      url: latest?.html_url ?? null,
      status: latest?.status ?? "MISSING",
      conclusion: latest?.conclusion ?? null,
    };
  });
}

export function evaluatePreflight(snapshot) {
  const { candidate, brand, mainSha, runs } = snapshot;
  const head = candidate.head.sha;
  const workflowEvidence = workflowEvidenceFor(runs, candidate);
  const brandWorkflowEvidence = workflowEvidenceFor(snapshot.brandRuns, brand);
  const checks = [
    ["BRAND_MERGED", brand.merged === true && Boolean(brand.merged_at), "#40 must be merged by an authorized maintainer"],
    ["BRAND_APPROVAL", currentApproval(snapshot.brandReviews, brand), "Jimson must approve the actual #40 head"],
    ["BRAND_CI", brandWorkflowEvidence.every((r) => r.pass), "The latest #40 head must also have all five successful PR workflows"],
    ["CANDIDATE_OPEN", candidate.state === "open" && candidate.merged !== true, "#43 must be an open, unmerged candidate"],
    ["BASE_MAIN", candidate.base.ref === "main" && candidate.base.repo?.full_name === snapshot.repository,
      "After #40 merges, sync main and retarget #43 to this repository's main"],
    ["MAIN_INCLUDED", ["ahead", "identical"].includes(snapshot.mainComparison.status) && snapshot.mainComparison.behind_by === 0,
      "The candidate must contain the latest main; inspect squash-merge conflicts without force pushing"],
    ["INDEPENDENT_APPROVAL", currentApproval(snapshot.candidateReviews, candidate), "Jimson must approve the final #43 head"],
    ["READY_FOR_REVIEW", candidate.draft === false, "Mark ready only after the required acceptance and review"],
    ["CURRENT_HEAD_CI", workflowEvidence.every((r) => r.pass), "All five latest PR workflow runs must succeed on this exact head"],
    ["SNAPSHOT_STABLE", snapshot.finalCandidateSha === head && snapshot.finalMainSha === mainSha &&
      snapshot.finalBrandSha === brand.head.sha && snapshot.finalBrandMerged === brand.merged && snapshot.evidenceStable === true,
      "Refs, PR state, reviews or CI changed during collection; rerun against the latest evidence"],
  ].map(([id, pass, action]) => ({ id, status: pass ? "PASS" : "HOLD", action: pass ? null : action }));
  return {
    collectedAt: snapshot.collectedAt,
    repository: snapshot.repository,
    source: "GitHub REST GET through authenticated gh api; no remote writes",
    candidate: { number: candidate.number, head, base: candidate.base.ref, url: candidate.html_url },
    brand: { number: brand.number, head: brand.head.sha, merged: brand.merged,
      mergeCommit: brand.merged ? brand.merge_commit_sha : null },
    mainSha,
    status: checks.every((check) => check.status === "PASS") ? "CODE_PREREQUISITES_PASS" : "HOLD",
    productionReady: "NOT_ASSESSED",
    checks,
    workflowEvidence,
    brandWorkflowEvidence,
    requiredExternalEvidence: [
      "Founder brand/content acceptance and browser-local-only scope confirmation",
      "Unresolved review threads and repository protection rules require independent confirmation",
      "Exact source SHA -> saved Sites version -> successful deployment ID -> authorized staging URL",
      "Staging access policy, noindex and actual deployed runtime acceptance",
      "DNS and old-server account ownership; target mapping supplied by the hosting provider",
      "Wealth SAN, trusted TLS chain, hostname verification, HTTP->HTTPS and error-page acceptance",
      "Accepted rollback version, owner, trigger and rehearsal result",
      "Explicit Founder authorization before any merge/deployment/domain/traffic action",
    ],
  };
}

export async function collectSnapshot(api, repository) {
  const root = `repos/${repository}`;
  const [candidate, brand, main, candidateReviews, brandReviews] = await Promise.all([
    api(`${root}/pulls/43`), api(`${root}/pulls/40`), api(`${root}/git/ref/heads/main`),
    api(`${root}/pulls/43/reviews?per_page=100`, "array"),
    api(`${root}/pulls/40/reviews?per_page=100`, "array"),
  ]);
  const head = candidate.head.sha;
  const mainSha = main.object.sha;
  const [runPages, brandRunPages, mainComparison] = await Promise.all([
    api(`${root}/actions/runs?head_sha=${head}&event=pull_request&per_page=100`, "pages"),
    api(`${root}/actions/runs?head_sha=${brand.head.sha}&event=pull_request&per_page=100`, "pages"),
    api(`${root}/compare/${mainSha}...${head}`),
  ]);
  // Reviews and reruns can change without a new commit. Take a second evidence
  // snapshot, then recheck all PR gate fields and refs before reporting.
  const [finalCandidateReviews, finalBrandReviews, finalRunPages, finalBrandRunPages] = await Promise.all([
    api(`${root}/pulls/43/reviews?per_page=100`, "array"),
    api(`${root}/pulls/40/reviews?per_page=100`, "array"),
    api(`${root}/actions/runs?head_sha=${head}&event=pull_request&per_page=100`, "pages"),
    api(`${root}/actions/runs?head_sha=${brand.head.sha}&event=pull_request&per_page=100`, "pages"),
  ]);
  const [finalCandidate, finalBrand, finalMain] = await Promise.all([
    api(`${root}/pulls/43`), api(`${root}/pulls/40`), api(`${root}/git/ref/heads/main`),
  ]);
  const runs = runPages.flatMap((page) => page.workflow_runs);
  const brandRuns = brandRunPages.flatMap((page) => page.workflow_runs);
  const finalRuns = finalRunPages.flatMap((page) => page.workflow_runs);
  const finalBrandRuns = finalBrandRunPages.flatMap((page) => page.workflow_runs);
  return {
    repository, collectedAt: new Date().toISOString(), candidate, brand, mainSha,
    candidateReviews: finalCandidateReviews, brandReviews: finalBrandReviews, mainComparison,
    runs: finalRuns, brandRuns: finalBrandRuns,
    finalCandidateSha: finalCandidate.head.sha, finalMainSha: finalMain.object.sha,
    finalBrandSha: finalBrand.head.sha, finalBrandMerged: finalBrand.merged,
    evidenceStable: prFingerprint(candidate) === prFingerprint(finalCandidate) &&
      prFingerprint(brand) === prFingerprint(finalBrand) &&
      reviewFingerprint(candidateReviews) === reviewFingerprint(finalCandidateReviews) &&
      reviewFingerprint(brandReviews) === reviewFingerprint(finalBrandReviews) &&
      runFingerprint(runs) === runFingerprint(finalRuns) &&
      runFingerprint(brandRuns) === runFingerprint(finalBrandRuns),
  };
}

async function githubGet(endpoint, pagination) {
  const args = ["api", "--method", "GET", endpoint];
  if (pagination) args.push("--paginate", "--slurp");
  try {
    const { stdout } = await exec("gh", args, { timeout: 60000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
    const result = JSON.parse(stdout);
    return pagination === "array" ? result.flat() : result;
  } catch {
    // Do not echo auth errors, command environments or credential-bearing stderr.
    throw new Error(`EVIDENCE_MISSING: GitHub GET failed for ${endpoint}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--output") {
    throw new Error("Usage: node scripts/wealth-release-preflight.mjs --output outputs/wealth-release/preflight.json");
  }
  const output = resolve(args[1]);
  const report = evaluatePreflight(await collectSnapshot(githubGet, "yvettfang-netizen/phoenix"));
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ status: report.status, head: report.candidate.head, productionReady: report.productionReady, output,
    holds: report.checks.filter((check) => check.status === "HOLD").map((check) => check.id) }));
  process.exitCode = report.status === "HOLD" ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 2; });
}
