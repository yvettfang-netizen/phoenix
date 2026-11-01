/** Package only synthetic/public review evidence; never collect patient data. */
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
const code=ts.transpileModule(readFileSync('lib/health-geo-content.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {HEALTH_GEO_HUBS:hubs,HEALTH_GEO_GUIDES:guides}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const out='docs/previews/health-geo';mkdirSync(out,{recursive:true});
const fixed=[{entityId:'health.home',paths:{zh:'/zh/health',en:'/en/health'}},{entityId:'health.providers',paths:{zh:'/zh/health/providers',en:'/en/health/providers'}},{entityId:'health.provider.hyzen',paths:{zh:'/zh/health/providers/hyzen-hospital',en:'/en/health/providers/hyzen-hospital'}}];
const rows=[...fixed,...hubs,...guides];
writeFileSync('docs/HEALTH_GEO_URLS.md','# Health GEO candidate URL register\n\nAll entries are draft/noindex. The supplied Health hostname is recorded as a proposed HTTPS origin; deployment/TLS remains unverified. These are candidate URLs, not confirmed live production pages.\n\n| Language-neutral entity | 中文路径 | English path |\n|---|---|---|\n'+rows.map(r=>`| ${r.entityId} | \`${r.paths.zh}\` | \`${r.paths.en}\` |`).join('\n')+'\n\nThe six hubs include the unchanged existing family page. Twelve guide entities have paired language URLs. Provider and hospital-verification pages do not establish a partnership or current service availability.\n');
const suites={};for(const [name,path] of Object.entries({geo:'outputs/health-geo/results.json',off:'outputs/health-v30-off/browser-results.json',on:'outputs/health-v30-on/browser-results.json',familyOff:'outputs/health-v30-family-off/browser-results.json',familyOn:'outputs/health-v30-family-on/browser-results.json'})){
 if(!existsSync(path))throw Error('Missing evidence '+path);const data=JSON.parse(readFileSync(path,'utf8'));if(data.results.some(r=>r.status!=='PASS'))throw Error('Failure in '+name);suites[name]={passed:data.results.length,results:data.results};
}
writeFileSync(`${out}/browser-results.json`,JSON.stringify({baseline:'5771c910f8d1bb507eabf0cc6a529f6f28774217',runtime:'Windows frontend-only Node adapter, not production or real RLS evidence',suites},null,2)+'\n');
for(const locale of ['zh','en'])for(const width of [390,1440])for(const kind of ['home','guide','hyzen'])copyFileSync(`outputs/health-geo/${locale}-${width}-${kind}.png`,`${out}/${locale}-${width}-${kind}.png`);
const protectedPaths=['lib/health-compass.ts','lib/health-compass-gate.ts','components/health-compass.tsx','app/[locale]/compass/health/page.tsx','app/compass/health/page.tsx','public/brand/official/v3/phoenix-nova-header@2x.png','public/brand/official/v3/phoenix-nova-symbol-transparent.png'];
const integrity=protectedPaths.map(path=>{const repoPath='website/phoenix-nova-website-v5/'+path;const baseline=execFileSync('git',['rev-parse',`5771c910f8d1bb507eabf0cc6a529f6f28774217:${repoPath}`],{encoding:'utf8'}).trim();const current=execFileSync('git',['hash-object','--',path],{encoding:'utf8'}).trim();if(baseline!==current)throw Error('Protected source changed: '+path);return{path,baselineGitBlob:baseline,currentGitBlob:current,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')};});
writeFileSync(`${out}/integrity.json`,JSON.stringify(integrity,null,2)+'\n');console.log({urlPairs:rows.length,suites:Object.fromEntries(Object.entries(suites).map(([k,v])=>[k,v.passed])),protectedFiles:integrity.length});
