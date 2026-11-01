import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const js=ts.transpileModule(readFileSync(new URL('../lib/health-geo-content.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const content=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
test('six centres reuse family planning and twelve unique guides have complete bilingual provenance',()=>{
 assert.equal(content.HEALTH_GEO_HUBS.length,6);assert.equal(content.HEALTH_GEO_GUIDES.length,12);
 const ids=new Set(),paths=new Set();
 for(const record of [...content.HEALTH_GEO_HUBS,...content.HEALTH_GEO_GUIDES]){
  assert.ok(!ids.has(record.entityId));ids.add(record.entityId);assert.equal(record.indexable,false);assert.equal(record.publicationStatus,'draft');
  for(const locale of ['zh','en']){assert.ok(record.paths[locale].startsWith(`/${locale}/health/`));assert.ok(!paths.has(record.paths[locale]));paths.add(record.paths[locale]);}
 }
 for(const guide of content.HEALTH_GEO_GUIDES){
  assert.equal(guide.sections.length,3);assert.ok(guide.officialSources.length>0);assert.equal(guide.clinicalScope,'non-clinical-preparation-and-navigation');
  for(const locale of ['zh','en']){assert.ok(guide.directAnswer[locale].length>50);assert.ok(guide.applicability.notCovered[locale]);for(const section of guide.sections){assert.ok(section.heading[locale]);assert.ok(section.body[locale]);}}
  for(const id of guide.relatedGuideIds)assert.ok(content.getHealthGeoGuide(id),`missing related guide ${id}`);
  for(const source of guide.officialSources){assert.equal(new URL(source.url).protocol,'https:');assert.ok(source.factScope.zh&&source.factScope.en);assert.ok(source.linkScope.length>0);}
 }
 assert.deepEqual(content.HEALTH_GEO_HUBS.find(h=>h.id==='family-health-planning').paths,{zh:'/zh/health/family',en:'/en/health/family'});
});
test('price comparison guide publishes no numerical savings or unsupported quotation',()=>{
 const guide=content.getHealthGeoGuide('shenzhen-hong-kong-private-cost-comparison');
 assert.ok(guide);assert.doesNotMatch(JSON.stringify(guide),/\d+(?:\.\d+)?\s*%|[$£¥]\s*\d/);
 assert.match(guide.directAnswer.en,/compar|quote|price/i);
});
