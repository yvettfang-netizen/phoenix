import test from "node:test";
import assert from "node:assert/strict";
import { evaluateReadiness, countryReadiness, REQUIRED_CHECKS } from "../scripts/identity-production-readiness.mjs";

// Synthetic evaluator inputs, never a deployment or database fixture.
const sha="a".repeat(40), stale="b".repeat(40);
function fixture() {
  return { local_sha:sha,collection_errors:[],working_tree_clean:true,main_synchronized:true,unresolved_review_threads:0,pr:{head:{sha},user:{login:"author"},draft:false,state:"open"},
    checks:REQUIRED_CHECKS.map(name=>({name,head_sha:sha,status:"completed",conclusion:"success"})),
    audit:{metadata:{vulnerabilities:{critical:0,high:0,moderate:0,low:0,total:0}}},
    reviews:[{id:1,user:{login:"reviewer"},commit_id:sha,state:"APPROVED",body:`IDENTITY_SECURITY_APPROVED ${sha}\nIDENTITY_FACTS_APPROVED ${sha}`}],
    review_permissions:{reviewer:"write"},policy:{authorized_security_reviewers:["reviewer"],authorized_fact_reviewers:["reviewer"]},
    countries:["KN","AR","VU","ST"].map(code=>({code,publication_ready:true,unverified_fields:[]})),
    canonical_adapter:{status:"VERIFIED"},staging_runtime:{status:"VERIFIED",commit_sha:sha} };
}
const codes=e=>evaluateReadiness(e).blockers.map(b=>b.code);

test("readiness fails closed without live evidence; local approved booleans cannot authorize deployment",()=>{
  const result=evaluateReadiness({approved:true,security_approved:true,production_ready:true});
  assert.equal(result.status,"HOLD");assert.equal(result.deployment_authorized,false);assert.equal(result.production_import_enabled,false);
  for(const code of ["EXACT_HEAD_REQUIRED","EXACT_HEAD_CI_REQUIRED","DEPENDENCY_AUDIT_REQUIRED","INDEPENDENT_REVIEW_REQUIRED","SECURITY_APPROVAL_REQUIRED","FACT_APPROVAL_REQUIRED","FOUR_COUNTRY_FACTS_REQUIRED","CANONICAL_IMPORT_CONTRACT_MISSING","STAGING_RUNTIME_EVIDENCE_MISSING"])assert.ok(result.blockers.some(b=>b.code===code),code);
});

test("even complete synthetic evidence only advances to manual release review, never deploy/import authority",()=>{
  const result=evaluateReadiness(fixture());
  assert.equal(result.status,"READY_FOR_MANUAL_RELEASE_REVIEW");assert.deepEqual(result.blockers,[]);
  assert.equal(result.deployment_authorized,false);assert.equal(result.production_import_enabled,false);
});

test("self approvals, old commits, read-only permissions, dismissed reviews and change requests cannot pass",()=>{
  for(const change of [e=>{e.pr.user.login="REVIEWER";},e=>{e.reviews[0].commit_id=stale;},e=>{e.review_permissions.reviewer="read";},e=>{e.reviews.push({...e.reviews[0],id:2,state:"DISMISSED"});},e=>{e.reviews.push({id:2,user:{login:"other"},commit_id:sha,state:"CHANGES_REQUESTED"});}]){
    const e=fixture();change(e);assert.ok(codes(e).includes("INDEPENDENT_REVIEW_REQUIRED"));
  }
});

test("a general approval is insufficient for security/facts; scope and authorized reviewers are exact",()=>{
  for(const body of ["APPROVED",`IDENTITY_SECURITY_APPROVED ${stale}\nIDENTITY_FACTS_APPROVED ${stale}`,`not IDENTITY_SECURITY_APPROVED ${sha}`]){
    const e=fixture();e.reviews[0].body=body;assert.ok(codes(e).includes("SECURITY_APPROVAL_REQUIRED"));assert.ok(codes(e).includes("FACT_APPROVAL_REQUIRED"));
  }
  const e=fixture();e.policy.authorized_security_reviewers=[];assert.ok(codes(e).includes("SECURITY_APPROVAL_REQUIRED"));
});

test("CI must include every expected check at the exact SHA without skips, pending or failures",()=>{
  for(const change of [e=>{e.checks=[];},e=>{e.checks.pop();},e=>{e.checks[0].conclusion="skipped";},e=>{e.checks[0].status="in_progress";},e=>{e.checks[0].head_sha=stale;},e=>{e.checks[0].conclusion="failure";}]){
    const e=fixture();change(e);assert.ok(codes(e).includes("EXACT_HEAD_CI_REQUIRED"));
  }
});

test("missing/low/moderate/critical audit evidence, Draft and a changed HEAD all block",()=>{
  for(const severity of ["critical","high","moderate","low","total"]){const e=fixture();e.audit.metadata.vulnerabilities[severity]=1;assert.ok(codes(e).includes("DEPENDENCY_AUDIT_REQUIRED"));}
  const missing=fixture();delete missing.audit;assert.ok(codes(missing).includes("DEPENDENCY_AUDIT_REQUIRED"));
  const draft=fixture();draft.pr.draft=true;assert.ok(codes(draft).includes("PR_NOT_RELEASE_REVIEWABLE"));
  const moved=fixture();moved.pr.head.sha=stale;assert.ok(codes(moved).includes("EXACT_HEAD_REQUIRED"));
  const dirty=fixture();dirty.working_tree_clean=false;assert.ok(codes(dirty).includes("CLEAN_WORKTREE_REQUIRED"));
  const outdated=fixture();outdated.main_synchronized=false;assert.ok(codes(outdated).includes("MAIN_SYNC_REQUIRED"));
  const unresolved=fixture();unresolved.unresolved_review_threads=1;assert.ok(codes(unresolved).includes("REVIEW_THREADS_REQUIRED"));
  const incomplete=fixture();incomplete.collection_errors=["REVIEW_PERMISSION_UNAVAILABLE"];assert.ok(codes(incomplete).includes("EVIDENCE_COLLECTION_FAILED"));
});

test("country gate includes detailed fees, eligibility, travel and every schema planning field",()=>{
  const record={country_code:"KN",content_status:"IMPORT_REVIEW",planning_details:{eligibility:{en:"unreviewed"},passport_fees:{en:"unreviewed"}}};
  const result=countryReadiness(record,{formalComparable:()=>false,verifiedField:()=>false},["eligibility","passport_fees","professional_fees","processing_time_observed"]);
  for(const field of ["programme_type","official_authority","travel_access_data","planning_details.eligibility","planning_details.passport_fees","planning_details.professional_fees","planning_details.processing_time_observed","planning_details.family_categories"])assert.ok(result.unverified_fields.includes(field),field);
});

test("unknown/stale/unpublished country data and missing Canonical/runtime evidence remain HOLD",()=>{
  for(const change of [e=>{e.countries[0].publication_ready=false;},e=>{e.countries[0].unverified_fields=["processing_time"];},e=>{e.countries[0].code="CA";},e=>{delete e.countries[0].unverified_fields;}]){const e=fixture();change(e);assert.ok(codes(e).includes("FOUR_COUNTRY_FACTS_REQUIRED"));}
  const e=fixture();e.canonical_adapter={status:"EVIDENCE_MISSING"};e.staging_runtime={status:"VERIFIED",commit_sha:stale};
  assert.ok(codes(e).includes("CANONICAL_IMPORT_CONTRACT_MISSING"));assert.ok(codes(e).includes("STAGING_RUNTIME_EVIDENCE_MISSING"));
});
