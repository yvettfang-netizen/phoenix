import test from 'node:test';import assert from 'node:assert/strict';
import {validFamilyServiceSummary,summarySearch} from '../lib/family-service-summary.ts';
const id='01920000-0000-7000-8000-000000000136';
function payload(){return {schemaVersion:'service-project-summary.v1',projects:[{service_project_id:id,name:'Synthetic project',compass:'EDUCATION',status:'ACTIVE',current_stage:'MATERIALS',adviser:null,next_milestone:null,customer_todo_count:2,overdue_count:1,latest_progress:null,detail_href:'/en/my-services/'+id}],as_of:new Date().toISOString(),expires_at:new Date(Date.now()+60000).toISOString(),next_cursor:null};}
test('summary refuses stale, duplicate, clinical, nested and unbounded DTOs',()=>{
 assert(validFamilyServiceSummary(payload()));
 for(const mutate of [p=>p.secret='private',p=>p.projects[0].name={clinical:'private'},p=>p.projects[0].patient='private',p=>p.projects.push({...p.projects[0]}),p=>p.expires_at=new Date(Date.now()-1000).toISOString(),p=>p.projects[0].detail_href='https://evil.test',p=>p.projects[0].compass='HEALTH',p=>p.projects[0].overdue_count=3]){
  const p=payload();mutate(p);assert.equal(validFamilyServiceSummary(p),false);
 }
 const p=payload();Object.assign(p.projects[0],{compass:'HEALTH',customer_todo_count:0,overdue_count:0});assert(validFamilyServiceSummary(p));
});
test('pagination accepts only bounded selectors, never authority parameters',()=>{
 for(const query of ['limit=51','limit=0','limit=20&limit=1','family_id=x','cursor=x'])assert.equal(summarySearch(new URL('http://localhost/?'+query)),null);
 const u=new URL('http://localhost/?limit=20');u.searchParams.set('cursor',JSON.stringify({at:new Date().toISOString(),project:id}));assert(summarySearch(u));
});
