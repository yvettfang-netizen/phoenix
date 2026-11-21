import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const run = (program, args, options = {}) => execFileSync(program, args, {
  cwd: root, encoding: options.encoding === "buffer" ? null : "utf8", maxBuffer: 16 * 1024 * 1024,
});
const hash = (value) => createHash("sha256").update(value).digest("hex");
const git = (...args) => run("git", args).trim();
const main = git("rev-parse", "origin/main");
const pr76 = git("rev-parse", "origin/pr-76-head");
const pr77 = git("rev-parse", "origin/pr-77-head");
const migrationDir = resolve(root, "database/canonical/migrations");
const names = readdirSync(migrationDir).filter((name) => /^\d{4}_.+\.sql$/.test(name)).sort();
if (names.length !== 37 || names.some((name, i) => Number(name.slice(0, 4)) !== i + 1)) {
  throw new Error("Formal migration list is not exactly 0001–0037");
}
const migrations = names.map((name) => {
  const path = `database/canonical/migrations/${name}`;
  const bytes = readFileSync(resolve(migrationDir, name));
  const mainBytes = execFileSync("git", ["show", `origin/main:${path}`], { cwd: root, maxBuffer: 4 * 1024 * 1024 });
  if (!bytes.equals(mainBytes)) throw new Error(`Formal migration differs from main: ${name}`);
  return { path, sha256: hash(bytes) };
});
const candidatePaths = [
  "database/canonical/forward-candidates/service-workbench/0038_service_project_workbench.sql",
  "database/canonical/forward-candidates/service-workbench/0039_service_project_summary.sql",
];
const candidates = candidatePaths.map((path) => ({ path, sha256: hash(readFileSync(resolve(root, path))), status: "FORWARD_CANDIDATE" }));
const sql42 = "database/canonical/forward-candidates/workspace-authorization/0042_organization_workspace_authorization.sql";
const candidate42 = execFileSync("git", ["show", `origin/pr-77-head:${sql42}`], { cwd: root, maxBuffer: 4 * 1024 * 1024 });
candidates.push({ path: sql42, sha256: hash(candidate42), status: "PR_77_CANDIDATE" });
const diffs = [76, 77].map((number) => {
  const ref = `origin/pr-${number}-head`;
  const patch = run("git", ["diff", "--binary", "origin/main", ref], { encoding: "buffer" });
  const paths = run("git", ["diff", "--name-only", "origin/main", ref]).trim().split(/\r?\n/).filter(Boolean);
  if (paths.some((path) => path.startsWith("database/canonical/migrations/"))) {
    throw new Error(`PR #${number} alters formal migrations`);
  }
  const pr = JSON.parse(run("gh", ["pr", "view", String(number), "--repo", "yvettfang-netizen/phoenix",
    "--json", "number,state,isDraft,headRefOid,baseRefOid,statusCheckRollup"]));
  if (pr.headRefOid !== git("rev-parse", ref)) throw new Error(`PR #${number} remote HEAD changed during audit`);
  return {
    number, head: pr.headRefOid, base: pr.baseRefOid, state: pr.state, isDraft: pr.isDraft,
    fullDiffSha256: hash(patch), changedPaths: paths,
    checks: pr.statusCheckRollup.map((check) => ({
      name: check.name ?? check.context, status: check.status, conclusion: check.conclusion,
      url: check.detailsUrl ?? check.targetUrl ?? null,
    })),
  };
});
const formalSql = names.map((name) => readFileSync(resolve(migrationDir, name), "utf8")).join("\n");
const result = {
  schemaVersion: "academic-studio-v21-p0-source-evidence.v1",
  capturedAt: new Date().toISOString(),
  main,
  formalMigrations: migrations,
  educationStudyEnrollmentsCreateTableFound: /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?education\.study_enrollments\b/i.test(formalSql),
  candidates,
  pullRequests: diffs,
  scope: "Source/CI snapshot only; no database or production connection",
};
mkdirSync(resolve(here, "evidence"), { recursive: true });
const output = resolve(here, "evidence/source-audit.json");
writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({
  main, migrations: names.length, studyEnrollments: result.educationStudyEnrollmentsCreateTableFound,
  candidates: candidates.map((candidate) => ({ path: candidate.path, sha256: candidate.sha256 })),
  pullRequests: diffs.map((diff) => ({
    number: diff.number, head: diff.head, files: diff.changedPaths.length,
    success: diff.checks.filter((check) => check.conclusion === "SUCCESS").length,
    failure: diff.checks.filter((check) => check.conclusion === "FAILURE").length,
    pending: diff.checks.filter((check) => check.status !== "COMPLETED").length,
  })),
  output,
}, null, 2));
