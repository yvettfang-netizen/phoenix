import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.HEALTH_EVIDENCE_DIR||'outputs/health-apec';mkdirSync(out,{recursive:true});
const origin=process.env.HEALTH_ORIGIN||'http://127.0.0.1:4432';
const b=await chromium.launch({headless:true,...(process.env.HEALTH_BROWSER_PATH?{executablePath:process.env.HEALTH_BROWSER_PATH}:{})});
const results=[];
try {
 const path='website/phoenix-nova-website-v5/components/health-landing.tsx';
 const before=execFileSync('git',['show','ef0b8ca8229723590466bef8ea2eeb3bce048541:'+path],{encoding:'utf8'});
 const after=readFileSync('components/health-landing.tsx','utf8');
 for(const token of before.match(/id="[^"]+"|heading\("\d+"/g)||[])assert.ok(after.includes(token),'preserved anchor/number '+token);
 for(const locale of ['zh','en'])for(const width of [390,768,1440]){
  const p=await b.newPage({viewport:{width,height:1000}});
  const timing = locale === 'zh' ? /会后开始/ : /after the meeting/i;
  const pending = locale === 'zh'
    ? /具体机构、服务范围及可用性仍待逐项核实/
    : /specific providers, service scope and availability are still to be verified individually/i;
  const disclosure = locale === 'zh'
    ? /与APEC会议官方组织、授权、指定医疗服务或赞助无关/
    : /independent of the official APEC organisers, authorisations, designated medical services and sponsorship/i;
  const pages = [
    { path: `/${locale}/health/family`, region: '#family-brand-origin', image: 'health-claims.jpg', screenshot: 'family-origin' },
    { path: `/${locale}/health`, region: '#brand-origin', image: 'health-v31-gba-family.png', screenshot: 'origin' },
  ];
  for (const { path, region: selector, image, screenshot } of pages) {
    const response = await p.goto(origin + path, { waitUntil: 'networkidle' });
    assert.equal(response?.status(), 200, path);
    const region = p.locator(selector);
    assert.equal(await region.count(), 1, path);
    const text = await region.innerText();
    for (const token of [/2026/, /18/, /19/, /APEC/, timing, pending, disclosure]) assert.match(text, token, path);
    assert.equal(await region.locator('img,form,input').count(), 0, path);
    assert.ok(await region.locator('a[href="https://www.szns.gov.cn/english/apec2026shenzhen/"]').count(), path);
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path);
    assert.match(await p.locator('meta[name="robots"]').getAttribute('content'), /noindex/, path);
    const shareImage = `https://health.phoenixnova.com.cn/images/${image}`;
    assert.equal(await p.locator('meta[property="og:image"]').getAttribute('content'), shareImage, path);
    assert.equal(await p.locator('meta[name="twitter:image"]').getAttribute('content'), shareImage, path);
    const scripts = await p.locator('script[type="application/ld+json"]').allTextContents();
    for (const script of scripts) assert.doesNotMatch(script, /"@type"\s*:\s*"Event"/, path);
    await region.screenshot({ path: `${out}/${locale}-${width}-${screenshot}.png` });
  }
  await p.screenshot({path:`${out}/${locale}-${width}-full.png`,fullPage:true});
  const region = p.locator('#brand-origin');
  await region.locator(`a[href="/${locale}/health/shenzhen-international-medical"]`).click();await p.waitForURL('**/health/shenzhen-international-medical');
  await p.locator('#consultation a').click();await p.waitForURL(`**/${locale}/health#consultation`);assert.equal(await p.locator('#consultation').count(),1);
  results.push({locale,width,status:'PASS',checks:'Health and Family post-meeting wording, pending verification, disclosure, share images, source, responsive, noindex, preserved anchors, journey to existing consultation'});await p.close();
 }
}catch(e){results.push({status:'FAIL',error:String(e)});throw e;}finally{await b.close();writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log(results);}
