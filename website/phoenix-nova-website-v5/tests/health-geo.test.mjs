import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import ts from "typescript";
const code=ts.transpileModule(readFileSync(new URL('../lib/health-geo.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const geo=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
test('different Chinese and English slugs retain reciprocal, self-referential canonicals',()=>{
 const slugs={zh:'foreign-patients-china',en:'international-patients-china'};const labels={zh:'国际患者',en:'International patients'};
 const zh=geo.healthGeoMetadata('zh',slugs,labels,labels),en=geo.healthGeoMetadata('en',slugs,labels,labels);
 assert.ok(zh.alternates.canonical.endsWith('/zh/health/foreign-patients-china'));assert.ok(en.alternates.canonical.endsWith('/en/health/international-patients-china'));assert.deepEqual(zh.alternates.languages,en.alternates.languages);assert.equal(en.robots.index,false);
 assert.throws(()=>geo.healthGeoUrl('en','../family-center'));
});
test('preview, unreviewed, empty and expired content never enters a sitemap',()=>{
 const item={paths:{zh:'guides/example',en:'guides/example'},reviewed:true,published:true,substantive:true,sourceVerified:true,expiresAt:null,modifiedAt:'2026-11-01'};
 const release={deploymentVerified:true,founderReleaseApproved:true,searchAllowed:true,trainingAllowed:false};
 assert.deepEqual(geo.healthSitemap([item],'2026-11-02'),[]);assert.equal(geo.healthSitemap([item],'2026-11-02',release).length,2);
 for(const patch of [{reviewed:false},{published:false},{substantive:false},{sourceVerified:false},{expiresAt:'2026-11-01'},{modifiedAt:'invalid'}])assert.deepEqual(geo.healthSitemap([{...item,...patch}],'2026-11-02',release),[]);
 assert.equal(release.trainingAllowed,false);
});
test('JSON-LD cannot close its containing script and Phoenix remains an Organization',()=>{
 const json=geo.healthJsonLd({name:'</script><script>alert(1)</script>'});assert.equal(json.includes('<'),false);assert.equal(JSON.parse(json).name,'</script><script>alert(1)</script>');assert.ok(geo.HEALTH_PUBLISHER_ID.endsWith('#phoenix-nova'));
});
