import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin=process.env.EDUCATION_ORIGIN || 'http://127.0.0.1:4420';
const out=process.env.EDUCATION_KNOWLEDGE_EVIDENCE_DIR || 'outputs/education-pr38';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.EDUCATION_BROWSER?{executablePath:process.env.EDUCATION_BROWSER}:{})});
const results=[];
try {
 const page=await browser.newPage();
 for(const locale of ['zh','en']) {
  for(const width of [320,390,768,1440]) {
   await page.setViewportSize({width,height:900});
   for(const path of ['', '/schools', '/universities/hku']) {
    const route=`/${locale}/education${path}`;
    assert.equal((await page.goto(origin+route,{waitUntil:'networkidle'})).status(),200);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' overflow');
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);
    const canonical=await page.locator('link[rel="canonical"]').getAttribute('href');
    assert.equal(new URL(canonical).pathname,route);
    for(const [language,expectedLocale] of [['zh-Hans','zh'],['en','en']]) {
     const alternate=await page.locator(`link[rel="alternate"][hreflang="${language}"]`).getAttribute('href');
     assert.equal(new URL(alternate).pathname,route.replace('/'+locale+'/', '/'+expectedLocale+'/'));
    }
    for(const json of await page.locator('script[type="application/ld+json"]').allTextContents()) assert.ok(JSON.parse(json));
    results.push({locale,width,path,check:'responsive, metadata and structured data',status:'PASS'});
   }
   for(const path of ['programmes','guides/unverified-guide','universities/missing-school','missing-section']) {
    assert.equal((await page.goto(`${origin}/${locale}/education/${path}`,{waitUntil:'networkidle'})).status(),404,path);
    results.push({locale,width,path,check:'unpublished and unknown routes return 404',status:'PASS'});
   }
   assert.equal((await page.goto(`${origin}/${locale}`,{waitUntil:'networkidle'})).status(),200);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.equal(await page.locator('h1').count(),1);
   results.push({locale,width,check:'homepage regression',status:'PASS'});
  }
  const payload='"><script>globalThis.__educationXss=1</script>';
  const route=`${origin}/${locale}/education/schools?q=${encodeURIComponent(payload)}&page=Infinity&next=https://evil.example`;
  assert.equal((await page.goto(route,{waitUntil:'networkidle'})).status(),200);
  assert.equal(new URL(page.url()).origin,origin);
  assert.equal(await page.evaluate(()=>globalThis.__educationXss),undefined);
  assert.equal(await page.locator('input[name="q"]').inputValue(),payload);
  assert.equal(await page.locator('a[href^="javascript:"],a[href^="data:"],a[href^="//"]').count(),0);
  await page.goto(`${origin}/${locale}/education/schools?funding=government&funding=aided&stage=primary-schools&sort=name-desc`,{waitUntil:'networkidle'});
  assert.deepEqual(await page.locator('select[name="funding"]').evaluate(el=>Array.from(el.selectedOptions,o=>o.value)),['government','aided']);
  await page.locator('main nav a').filter({hasText:locale==='zh'?'下一页':'Next'}).click();
  await page.waitForURL(/page=2/);
  const query=new URL(page.url()).searchParams;
  assert.deepEqual(query.getAll('funding'),['government','aided']); assert.equal(query.get('sort'),'name-desc');
  results.push({locale,check:'XSS, redirect and repeated query pagination',status:'PASS'});
 }
 assert.match(await (await page.request.get(origin+'/robots.txt')).text(),/Disallow: \//);
 for(const name of ['sitemap','sitemap-education','sitemap-schools','sitemap-universities','sitemap-programmes','sitemap-guides']) {
  const response=await page.request.get(`${origin}/${name}.xml`);
  assert.equal(response.status(),200); assert.match(response.headers()['x-robots-tag'],/noindex/);
  assert.equal((await response.text()).includes('<loc>'),false);
 }
 results.push({check:'robots and all sitemap collections remain closed',status:'PASS'});
} finally {
 await browser.close(); await writeFile(`${out}/readiness-results.json`,JSON.stringify({results},null,2)); console.log({passed:results.length});
}
