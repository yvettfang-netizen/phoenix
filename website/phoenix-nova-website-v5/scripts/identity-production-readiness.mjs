/** Read-only evidence collection. Exit 2 means HOLD. No JSON approval input,
 * deploy, migration, publishing, service configuration or secret reads. */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const REQUIRED_CHECKS = ["candidate", "identity", "education", "health", "website/phoenix-nova-website-v5", "website/phoenix-digital-world", "website/phoenix-east", "public-candidate-scan", "website-regression", "education-client-regression", "wealth-compass-regression", "isolated-postgres (16, fresh)", "isolated-postgres (16, upgrade)", "isolated-postgres (17, fresh)", "isolated-postgres (17, upgrade)"];
const SHA = /^[a-f0-9]{40}$/;

export function evaluateReadiness(evidence) {
  const blockers = [];
  const block = (code, detail) => blockers.push({ code, detail });
  const sha = evidence.local_sha;
  if (!Array.isArray(evidence.collection_errors) || evidence.collection_errors.length) block("EVIDENCE_COLLECTION_FAILED", "Missing or incomplete evidence collection cannot advance release review.");
  if (!SHA.test(sha ?? "") || evidence.pr?.head?.sha !== sha) block("EXACT_HEAD_REQUIRED", "Local candidate and live PR HEAD must match.");
  if (evidence.working_tree_clean !== true) block("CLEAN_WORKTREE_REQUIRED", "Uncommitted or untracked candidate changes cannot be attested by a commit SHA.");
  if (evidence.main_synchronized !== true) block("MAIN_SYNC_REQUIRED", "Live PR base must be an ancestor of the candidate.");
  if (evidence.pr?.draft !== false || evidence.pr?.state !== "open") block("PR_NOT_RELEASE_REVIEWABLE", "PR remains Draft, closed, or unavailable.");
  const checks = evidence.checks;
  if (!Array.isArray(checks) || !checks.length || REQUIRED_CHECKS.some(name => !checks.some(c => c.name === name && c.head_sha === sha && c.status === "completed" && c.conclusion === "success")) || checks.some(c => c.head_sha !== sha || c.status !== "completed" || c.conclusion !== "success")) block("EXACT_HEAD_CI_REQUIRED", "All expected checks must complete successfully at the candidate SHA; empty, skipped, pending and stale checks fail closed.");
  const counts = evidence.audit?.metadata?.vulnerabilities;
  if (!counts || ["critical", "high", "moderate", "low", "total"].some(key => !Number.isInteger(counts[key]) || counts[key] !== 0)) block("DEPENDENCY_AUDIT_REQUIRED", "A complete audit with zero findings is required by this next-stage gate.");
  const latest = new Map();
  for (const review of [...(evidence.reviews ?? [])].sort((a,b) => a.id - b.id)) {
    if (review.state !== "PENDING" && review.state !== "COMMENTED") latest.set(review.user?.login?.toLowerCase(), review);
  }
  const author = evidence.pr?.user?.login?.toLowerCase();
  const approvals = [...latest.entries()].filter(([actor,r]) => actor && actor !== author && r.state === "APPROVED" && r.commit_id === sha && ["admin", "maintain", "write"].includes(evidence.review_permissions?.[actor]));
  if (!approvals.length || [...latest.entries()].some(([actor,r]) => actor !== author && r.state === "CHANGES_REQUESTED")) block("INDEPENDENT_REVIEW_REQUIRED", "An authorized non-author must approve this exact HEAD; outstanding change requests block release review.");
  if (evidence.unresolved_review_threads !== 0) block("REVIEW_THREADS_REQUIRED", "All review threads must be resolved; missing thread evidence fails closed.");
  for (const [kind, marker] of [["security", "IDENTITY_SECURITY_APPROVED"], ["fact", "IDENTITY_FACTS_APPROVED"]]) {
    const allowed = evidence.policy?.[`authorized_${kind}_reviewers`];
    if (!Array.isArray(allowed) || !approvals.some(([actor,r]) => allowed.some(name => typeof name === "string" && name.toLowerCase() === actor) && (r.body ?? "").split(/\r?\n/).some(line => line.trim() === `${marker} ${sha}`))) block(`${kind.toUpperCase()}_APPROVAL_REQUIRED`, "A designated reviewer must record explicit scope approval in their live exact-HEAD GitHub review; local approval booleans are ignored.");
  }
  if (!Array.isArray(evidence.countries) || evidence.countries.length !== 4 || new Set(evidence.countries.map(c=>c?.code)).size !== 4 || ["KN","AR","VU","ST"].some(code=>!evidence.countries.some(c=>c?.code===code && c.publication_ready===true && Array.isArray(c.unverified_fields) && c.unverified_fields.length===0))) block("FOUR_COUNTRY_FACTS_REQUIRED", "Four independently reviewed, published, current source-bound country records are required. Unknown fields remain gaps.");
  if (evidence.canonical_adapter?.status !== "VERIFIED") block("CANONICAL_IMPORT_CONTRACT_MISSING", "No approved Country/Programme/Policy adapter, scoped staff RBAC, immutable storage/audit, idempotency or recovery integration is established.");
  if (evidence.staging_runtime?.status !== "VERIFIED" || evidence.staging_runtime?.commit_sha !== sha) block("STAGING_RUNTIME_EVIDENCE_MISSING", "Approved environment, artifact/SHA binding and real HTTPS/security/recovery evidence are required. Local rehearsal is insufficient.");
  return { schema_version: 1, candidate_sha: sha ?? null, status: blockers.length ? "HOLD" : "READY_FOR_MANUAL_RELEASE_REVIEW", deployment_authorized: false, production_import_enabled: false, blockers };
}

const root = fileURLToPath(new URL("../", import.meta.url));
const run = (command,args,timeout=20000) => execFileSync(command,args,{cwd:root,encoding:"utf8",timeout,maxBuffer:8*1024*1024,stdio:["ignore","pipe","pipe"]});
function gh(path) { return JSON.parse(run("gh",["api",path])); }
export function countryReadiness(record, engine, planningFields) {
  const fields = ["programme_name","programme_type","legal_basis","investment_options","minimum_investment","currency","government_fees","due_diligence_fees","family_eligibility","residence_requirement","interview_requirement","source_of_funds_requirement","processing_time","dual_nationality_policy","passport_validity","passport_renewal","legal_status","operational_status","application_status","passport_issuance_status","official_authority","travel_access_data"];
  const required = [...fields,...planningFields.map(field=>`planning_details.${field}`),"planning_details.family_categories","planning_details.residence_requirement_category"];
  return {code:record.country_code,publication_ready:engine.formalComparable(record),unverified_fields:required.filter(field=>{
    const key=field.replace(/^planning_details\./, "");
    const value=field.startsWith("planning_details.")?record.planning_details?.[key]:record[key];
    return !engine.verifiedField(record,key) || value===null || value===undefined || value==="";
  }),content_status:record.content_status,next_review_at:record.next_review_at};
}

async function countryEvidence() {
  const ts = await import("typescript");
  const compile = (name, replacements={}) => {
    let code = ts.transpileModule(readFileSync(resolve(root,"lib",name),"utf8"), {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
    for (const [from,to] of Object.entries(replacements)) code=code.replaceAll(`"${from}"`,JSON.stringify(to));
    return "data:text/javascript;base64,"+Buffer.from(code).toString("base64");
  };
  const schema = compile("cbi-schema.ts");
  const {CBI_PLANNING_DETAIL_FIELDS} = await import(schema);
  const engine = await import(compile("cbi-comparison-engine.ts",{"./cbi-schema.ts":schema}));
  const {cbiCountries} = await import(compile("cbi-data.ts"));
  return cbiCountries.map(record=>countryReadiness(record,engine,CBI_PLANNING_DETAIL_FIELDS));
}

export async function collectReadiness() {
  const evidence = { local_sha: run("git",["rev-parse","HEAD"]).trim(), working_tree_clean:run("git",["status","--porcelain","--untracked-files=normal"]).trim()==="", main_synchronized:false, policy: JSON.parse(readFileSync(resolve(root,"docs/identity-v31/release-review-policy.json"),"utf8")), collection_errors: [], review_permissions: {}, countries: await countryEvidence(), canonical_adapter:{status:"EVIDENCE_MISSING"}, staging_runtime:{status:"EVIDENCE_MISSING"} };
  // These capabilities are deliberately not read from locally asserted approval
  // files or environment flags. Implement verified collection only after the
  // corresponding approved adapter/environment contract exists.
  const repo = "yvettfang-netizen/phoenix";
  try {
    evidence.pr=gh(`repos/${repo}/pulls/35`);
    try { if (SHA.test(evidence.pr.base?.sha ?? "")) { run("git",["merge-base","--is-ancestor",evidence.pr.base.sha,evidence.local_sha]);evidence.main_synchronized=true; } }
    catch { evidence.collection_errors.push("LATEST_BASE_ANCESTRY_UNVERIFIED"); }
    const pages=JSON.parse(run("gh",["api","--paginate","--slurp",`repos/${repo}/pulls/35/reviews?per_page=100`]));
    evidence.reviews=pages.flat();
    const checkPages=JSON.parse(run("gh",["api","--paginate","--slurp",`repos/${repo}/commits/${evidence.local_sha}/check-runs?per_page=100`]));
    evidence.checks=checkPages.flatMap(page=>page.check_runs);
    let cursor=null, unresolved=0, complete=false;
    for (let page=0;page<10;page++) {
      const query='query($cursor:String){repository(owner:"yvettfang-netizen",name:"phoenix"){pullRequest(number:35){reviewThreads(first:100,after:$cursor){nodes{isResolved} pageInfo{hasNextPage endCursor}}}}}';
      const args=["api","graphql","-f",`query=${query}`,...(cursor?["-f",`cursor=${cursor}`]:[])];
      const result=JSON.parse(run("gh",args));
      const threads=result.data.repository.pullRequest.reviewThreads;
      unresolved+=threads.nodes.filter(t=>t.isResolved!==true).length;
      if (!threads.pageInfo.hasNextPage) { complete=true;break; }
      cursor=threads.pageInfo.endCursor;
    }
    if (complete) evidence.unresolved_review_threads=unresolved;
    for (const actor of new Set(evidence.reviews.filter(r=>r.state==="APPROVED" && r.commit_id===evidence.local_sha).map(r=>r.user.login.toLowerCase()))) {
      try { evidence.review_permissions[actor]=gh(`repos/${repo}/collaborators/${encodeURIComponent(actor)}/permission`).permission; }
      catch { evidence.collection_errors.push("REVIEW_PERMISSION_UNAVAILABLE"); }
    }
  } catch { evidence.collection_errors.push("LIVE_GITHUB_EVIDENCE_UNAVAILABLE"); }
  const npm = process.env.npm_execpath ?? resolve(dirname(process.execPath),"node_modules/npm/bin/npm-cli.js");
  try {
    let raw;
    try { raw=run(process.execPath,[npm,"audit","--json","--include=dev","--include=optional","--fetch-timeout=15000","--fetch-retries=0"],60000); }
    catch(error) { raw=error.stdout; }
    evidence.audit=JSON.parse(String(raw));
  } catch { evidence.collection_errors.push("FULL_AUDIT_UNAVAILABLE"); }
  return { generated_at:new Date().toISOString(), ...evaluateReadiness(evidence), evidence };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href===import.meta.url) {
  if (process.argv.length!==2) { console.error("No approval overrides or JSON input are accepted."); process.exitCode=2; }
  else {
    try {
      const report=await collectReadiness();
      const out=resolve(root,"outputs/identity-v31/production-readiness.json");
      mkdirSync(dirname(out),{recursive:true});
      // Never retain raw review text or provider output in a public artifact.
      const {evidence,...summary}=report;
      summary.evidence_summary={ working_tree_clean:evidence.working_tree_clean,main_synchronized:evidence.main_synchronized,unresolved_review_threads:evidence.unresolved_review_threads??null,audit:evidence.audit?.metadata?.vulnerabilities??null, countries:evidence.countries, collection_errors:evidence.collection_errors, checks:evidence.checks?.map(c=>({name:c.name,sha:c.head_sha,status:c.status,conclusion:c.conclusion}))??[], canonical_adapter:evidence.canonical_adapter,staging_runtime:evidence.staging_runtime };
      writeFileSync(out,JSON.stringify(summary,null,2)+"\n");
      console.log(JSON.stringify(summary,null,2));
      process.exitCode=report.status==="HOLD"?2:0;
    } catch { console.error("HOLD: readiness evidence collection failed; no deployment is authorized."); process.exitCode=2; }
  }
}

export { REQUIRED_CHECKS };
