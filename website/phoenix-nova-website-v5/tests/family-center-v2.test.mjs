import test from 'node:test';
import assert from 'node:assert/strict';
import { centerV2Enabled, centerDemoEnabled, parseCanonicalSummaries, preferredServices, scopedDashboard, verifiedDates } from '../lib/family-center-v2.ts';
import { fixture, scenarios } from '../lib/family-center-v2-fixtures.ts';
test('V2 flags default off; authenticated or production accounts cannot receive synthetic fixtures',()=>{
  assert.equal(centerV2Enabled({}),false);
  const env={FAMILY_CENTER_V2_ENABLED:'true',FAMILY_CENTER_V2_DEMO_ENABLED:'true'};
  assert.equal(centerDemoEnabled(env,'development',false),true);
  assert.equal(centerDemoEnabled(env,'development',true),false);
  assert.equal(centerDemoEnabled(env,'production',false),false);
  assert.equal(centerDemoEnabled({...env,FAMILY_CENTER_V2_ENABLED:'false'},'development',false),false);
});
test('A-F use explicit service facts; narrowing subject never grants other records or invents payment',()=>{
  for(const s of scenarios){
    const data=fixture(s,false);
    assert.equal(data.services.length,s==='new'?0:s==='multi'?3:1);
    const self=scopedDashboard(data,'demo-self-a');assert.equal(self.services.length,0);assert.equal(self.reports.length,0);assert.equal(self.dates.length,0);
    assert.equal(scopedDashboard(data,'untrusted').services.length,0);
    assert(!/diagnosis|paymentAmount|bank|medicalRecord/.test(JSON.stringify(data)));
  }
  const data=fixture('multi',true);
  assert.equal(preferredServices(data.services,'health')[0].domain,'health');
  assert.equal(verifiedDates(data.dates).length,1);
  assert.equal(verifiedDates([{...data.dates[0],verified:false}]).length,0);
  assert.equal(verifiedDates([{...data.dates[0],source:''}]).length,0);
  assert.equal(verifiedDates([{...data.dates[0],date:'2026-02-30'}]).length,0);
});
test('Canonical v2 only accepts minimal DTOs; no guardian/relation/service is invented',()=>{
  const f={schemaVersion:'family-summary.v2',family:{familyRef:'fam_'+'a'.repeat(32),displayName:'Synthetic family'}};
  const s={schemaVersion:'student-summary.v2',items:[{studentRef:'stu_'+'b'.repeat(32),displayName:'Synthetic student'}]};
  const view=parseCanonicalSummaries(f,s);
  assert.equal(view.services.length,0);assert.equal(view.reports.length,0);assert.equal(view.dates.length,0);
  assert.equal(view.families[0].members[0].relation,'student');
  for(const [family,students] of [[{...f,patientConsent:true},s],[{...f,schemaVersion:'family-summary.v1'},s],[f,{...s,items:[...s.items,...s.items]}],[f,{...s,items:[{...s.items[0],diagnosis:'forbidden'}]}]]) assert.throws(()=>parseCanonicalSummaries(family,students));
  assert.equal(parseCanonicalSummaries(f,{...s,items:[]}).families[0].members.length,0);
});
