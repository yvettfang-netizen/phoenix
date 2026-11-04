import test from "node:test";
import assert from "node:assert/strict";
import { loadCbiTypescript } from "./cbi-test-loader.mjs";
const engine = await loadCbiTypescript("../lib/cbi-comparison-engine.ts");
const { cbiCountries } = await loadCbiTypescript("../lib/cbi-data.ts");
const today = "2026-11-02";
function record(index = 0, overrides = {}) {
  const country = structuredClone(cbiCountries[index]);
  const source = country.official_sources[0];
  return { ...country, content_status: "PUBLISHED", minimum_investment: 100, currency: "USD", field_sources: { minimum_investment: source, currency: source, family_categories: source, government_fees: source, operational_status: source }, planning_details: { family_categories: ["INDIVIDUAL", "MINOR_CHILDREN"] }, ...overrides };
}
test("formal comparison rejects review, stale, foreign or non-citizen records without silently shrinking selection", () => {
  const a = record(), b = record(1);
  assert.equal(engine.comparisonSelection([a,b],[a.country_id,b.country_id],false,today).length,2);
  for (const change of [{ content_status:"IMPORT_REVIEW" },{next_review_at:"2026-01-01"},{passport_issuance_status:"NON_CITIZEN_TRAVEL_DOCUMENT"},{country_code:"CA"}]) {
    assert.deepEqual(engine.comparisonSelection([a,{...b,...change}],[a.country_id,b.country_id],false,today),[]);
  }
  assert.deepEqual(engine.comparisonSelection([a,b],[a.country_id,"unknown"],true,today),[]);
  assert.deepEqual(engine.comparisonSelection([a,b],[a.country_id,b.country_id,"a","b","c"],true,today),[]);
});
test("amounts require their own current official field evidence; unknown never becomes zero", () => {
  const a = record();
  assert.equal(engine.verifiedMinimum(a,today),100);
  assert.equal(engine.verifiedMinimum({...a,field_sources:{minimum_investment:a.field_sources.minimum_investment}},today),null,"currency needs its own binding too");
  for (const source of [undefined,{...a.field_sources.minimum_investment,source_type:"INTERNAL_EXPERIENCE"},{...a.field_sources.minimum_investment,effective_status:"EXPIRED"},{...a.field_sources.minimum_investment,verified_at:"2027-01-01"}]) {
    const changed={...a,field_sources:{minimum_investment:source}};
    assert.equal(engine.verifiedMinimum(changed,today),null);
    assert.equal(engine.amountRangeMatches(changed,{min:"0",max:"100",currency:"USD"},today),false);
  }
});
test("amount ranges retain currency and reject ambiguity, inversion and non-finite values", () => {
  const a=record();
  assert.equal(engine.amountRangeMatches(a,{min:"100",max:"100",currency:"USD"},today),true);
  for (const range of [{min:"0",max:"100",currency:"EUR"},{min:"0",max:"100",currency:""},{min:"101",max:"100",currency:"USD"},{min:"1e2",max:"",currency:"USD"},{min:"-1",max:"100",currency:"USD"}]) assert.equal(engine.amountRangeMatches(a,range,today),false);
  assert.equal(engine.amountRangeMatches({...a,minimum_investment:null},{min:"",max:"",currency:""},today),true);
});
test("family filters use verified explicit categories, not guessed legal eligibility", () => {
  const a=record();
  assert.equal(engine.familyPreferenceMatches(a,["INDIVIDUAL","MINOR_CHILDREN"],today),true);
  assert.equal(engine.familyPreferenceMatches(a,["PARENTS"],today),false);
  assert.equal(engine.familyPreferenceMatches({...a,field_sources:{}},["INDIVIDUAL"],today),false);
  assert.equal(engine.familyPreferenceMatches({...a,field_sources:{"planning_details.family_categories":a.field_sources.family_categories}},["INDIVIDUAL"],today),true);
  assert.equal(engine.familyPreferenceMatches({...a,field_sources:{...a.field_sources,"planning_details.family_categories":{...a.field_sources.family_categories,source:"Conflicting source"}}},["INDIVIDUAL"],today),false);
});
test("report separates fees, status, tax and currency; includes pending items and mandatory notice", () => {
  const a=record(), b=record(1,{operational_status:"SUSPENDED",currency:"EUR"});
  const report=engine.buildComparisonReport([a,b],"zh",false,today);
  assert.equal(report.countries.length,2);
  assert.equal(report.notice,engine.COMPARISON_NOTICE.zh);
  assert.equal(report.rows.find(row=>row.key==="operational_status").values[1],"已暂停");
  assert.match(report.rows.find(row=>row.key==="minimum_investment").values[1],/EUR/);
  for (const key of ["government_fees","professional_fees","third_party_fees","due_diligence_fees","nationality_acquisition","passport_issuance_status","tax","fx"]) assert.ok(report.rows.some(row=>row.key===key));
  assert.ok(report.gaps.length>0); assert.equal(report.rows.find(row=>row.key==="government_fees").values[0],"待核实");
  assert.doesNotMatch(JSON.stringify(report),/success rate|approval probability|保证获批|百分百/);
  assert.throws(()=>engine.buildComparisonReport(cbiCountries.slice(0,2),"en",false,today),/VERIFIED_COMPARISON/);
  assert.equal(engine.buildComparisonReport(cbiCountries.slice(0,2),"en",true,today).status,"INTERNAL_REVIEW_NOT_FOR_PUBLICATION");
});

test("published detail and FAQ cannot bypass field verification; preview charges stay guarded", async () => {
  const { normalizeCbiCountry } = await loadCbiTypescript("../components/cbi-types.ts");
  const raw = record(0, { field_sources:{}, government_fees:{zh:"未核实金额",en:"Unverified fee"}, family_eligibility:{zh:"未核实条件",en:"Unverified condition"}, planning_details:{professional_fees:{zh:"服务金额",en:"Service fee"}} });
  for (const status of ["PUBLISHED","IMPORT_REVIEW"]) {
    const view=normalizeCbiCountry({...raw,content_status:status});
    assert.equal(view.raw.content_status,status);
    assert.match(view.governmentFees.en,/Pending verification/);
    assert.match(view.planningDetails.professional_fees.en,/Pending verification/);
    if(status==="PUBLISHED") { assert.match(view.familyEligibility.en,/Pending verification/); assert.match(view.faq[4].answer.en,/Pending verification/); }
  }
});

test("report uses a public source allowlist and strips URL tracking and audit identities", () => {
  const a = record(), b = record(1);
  const marker = "private-reviewer@example.invalid";
  for (const country of [a,b]) {
    country.official_sources[0].owner = marker;
    country.official_sources[0].official_url += "?token=secret-tracking#private";
  }
  const report = engine.buildComparisonReport([a,b], "en", false, today);
  assert.ok(report.countries.every(country => country.programme === "Pending verification"), "Programme names need field-specific evidence too");
  const output = JSON.stringify(report);
  assert.doesNotMatch(output, /private-reviewer|secret-tracking|effective_scope|"owner"/);
  for (const country of report.official_sources) {
    assert.ok(country.sources.length);
    for (const source of country.sources) {
      assert.deepEqual(Object.keys(source).sort(), ["source_type","source","official_url","verified_at","effective_status"].sort());
      assert.equal(new URL(source.official_url).search, "");
      assert.equal(new URL(source.official_url).hash, "");
    }
  }
});
