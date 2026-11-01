import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import ts from 'typescript';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const code=ts.transpileModule(readFileSync(new URL('../lib/health-geo-content.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {HEALTH_GEO_HUBS:hubs,HEALTH_GEO_GUIDES:guides}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const origin=process.env.HEALTH_ORIGIN||'http://127.0.0.1:4430';const out=resolve(process.env.HEALTH_EVIDENCE_DIR||'outputs/health-geo');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.HEALTH_BROWSER_PATH?{executablePath:process.env.HEALTH_BROWSER_PATH}:{})});
const page=await browser.newPage();const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 for(const locale of ['zh','en']){
  const paths=[`/${locale}/health`,...hubs.filter(h=>h.routeKind==='new-draft').map(h=>h.paths[locale]),...guides.map(g=>g.paths[locale]),`/${locale}/health/providers`,`/${locale}/health/providers/hyzen-hospital`];
  for(const width of [320,390,768,1024,1440]){
   await page.setViewportSize({width,height:1000});
   for(const path of paths){
    const response=await page.goto(origin+path,{waitUntil:'networkidle'});assert.equal(response.status(),200,path);assert.equal(await page.locator('h1').count(),1,path);
    assert.equal(await page.locator('html').getAttribute('lang'),locale==='zh'?'zh-Hans':'en');
    await page.locator('footer').scrollIntoViewIfNeeded();
    const brands=page.locator('header .brand-mark img,footer .brand-mark img');assert.equal(await brands.count(),2);
    for(const brand of await brands.all()){assert.equal(await brand.getAttribute('src'),locale==='zh'?'/brand/official/v3/phoenix-nova-symbol-transparent.png':'/brand/official/v3/phoenix-nova-header@2x.png');await brand.evaluate(i=>i.decode());const ratio=await brand.evaluate(i=>{const r=i.getBoundingClientRect();return Math.abs(r.width/r.height-i.naturalWidth/i.naturalHeight)});assert.ok(ratio<.01);}
    if(locale==='zh'){assert.equal(await page.locator('header .brand-mark--zh,footer .brand-mark--zh').count(),2);assert.ok((await page.locator('header .brand-mark').innerText()).includes('凤启环球'));}
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${path} ${width}px overflow`);
    assert.ok((await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'));
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://health.phoenixnova.com.cn'+path);
    const json=await page.locator('script[type="application/ld+json"]').allTextContents();
    if(path!==`/${locale}/health`){assert.equal(json.length,1);const graph=JSON.parse(json[0])['@graph'];const publisher=graph.find(node=>node['@id']==='https://health.phoenixnova.com.cn/#phoenix-nova');assert.equal(publisher['@type'],'Organization');assert.ok(graph.some(n=>n['@type']==='BreadcrumbList'));}
    assert.equal(await page.locator('input[type=file],form[method=post]').count(),0);
    assert.equal(await page.locator('a[href*="founder"],a[href*="/admin"]').count(),0);
    const guide=guides.find(g=>g.paths[locale]===path),hub=hubs.find(h=>h.paths[locale]===path);
    if(guide||hub){const record=guide||hub;const expected=record.paths[locale==='zh'?'en':'zh'];assert.equal(await page.locator('header .locale-switch').getAttribute('href'),expected);}
    if([390,1440].includes(width)&&(path===`/${locale}/health`||path===guides[0].paths[locale]||path.endsWith('/hyzen-hospital'))){await page.locator('footer').scrollIntoViewIfNeeded();await page.locator('footer img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));await page.screenshot({path:resolve(out,`${locale}-${width}-${path===`/${locale}/health`?'home':path.endsWith('/hyzen-hospital')?'hyzen':'guide'}.png`),fullPage:true});}
    results.push({path,width,status:'PASS'});
   }
  }
  const foreign=hubs.find(h=>h.id==='foreign-patients-china');await page.goto(origin+foreign.paths[locale],{waitUntil:'networkidle'});await page.locator('header .locale-switch').click();await page.waitForURL('**'+foreign.paths[locale==='zh'?'en':'zh']);results.push({check:`${locale} paired foreign-patient slug switch`,status:'PASS'});
 }
 const noJs=await browser.newContext({javaScriptEnabled:false});const staticPage=await noJs.newPage();for(const locale of ['zh','en']){await staticPage.goto(origin+guides[0].paths[locale],{waitUntil:'networkidle'});assert.equal(await staticPage.locator('h1').innerText(),guides[0].title[locale]);assert.ok((await staticPage.locator('main').innerText()).includes(guides[0].directAnswer[locale]));results.push({check:`${locale} SSR guide readable without JavaScript`,status:'PASS'});}await noJs.close();
 const robots=await page.request.get(origin+'/robots.txt');assert.equal(robots.status(),200);assert.match(await robots.text(),/Disallow: \//);const sitemap=await page.request.get(origin+'/sitemap-health.xml');assert.equal(sitemap.status(),200);assert.doesNotMatch(await sitemap.text(),/<loc>/);results.push({check:'preview robots and sitemap exclude drafts and private records',status:'PASS'});assert.deepEqual(errors,[]);
}catch(error){results.push({status:'FAIL',error:String(error)});throw error;}finally{await browser.close();writeFileSync(resolve(out,'results.json'),JSON.stringify({results},null,2));console.log({passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length});}
