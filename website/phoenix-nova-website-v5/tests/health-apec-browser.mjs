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
  const p=await b.newPage({viewport:{width,height:1000}});await p.goto(origin+`/${locale}/health`,{waitUntil:'networkidle'});
  const region=p.locator('#brand-origin');assert.equal(await region.count(),1);
  const text=await region.innerText();assert.match(text,/APEC/i);
  assert.match(text,locale==='zh'?/会后|计划启动|首发/:/Post-APEC|after APEC|planned|launching/i);
  assert.match(text,locale==='zh'?/无关|不.*官方|独立/:/not affiliated|no affiliation|independent/i);
  assert.doesNotMatch(text,/倒计时|报名|开幕|活动预告|18.?19|countdown|registration|opening ceremony|event preview/i);
  assert.doesNotMatch(text,/APEC[^.]{0,100}(?:partner|合作伙伴|official project|官方项目|designated service|指定医疗)/i);
  assert.equal(await region.locator('img,form,input').count(),0);
  assert.ok(await region.locator('a[href="https://www.szns.gov.cn/english/apec2026shenzhen/"]').count());
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.ok((await p.locator('meta[name=robots]').getAttribute('content')).includes('noindex'));
  const scripts=await p.locator('script[type="application/ld+json"]').allTextContents();for(const s of scripts)assert.doesNotMatch(s,/"@type"\s*:\s*"Event"/);
  await region.screenshot({path:`${out}/${locale}-${width}-origin.png`});await p.screenshot({path:`${out}/${locale}-${width}-full.png`,fullPage:true});
  await region.locator(`a[href="/${locale}/health/shenzhen-international-medical"]`).click();await p.waitForURL('**/health/shenzhen-international-medical');
  await p.locator('#consultation a').click();await p.waitForURL(`**/${locale}/health#consultation`);assert.equal(await p.locator('#consultation').count(),1);
  results.push({locale,width,status:'PASS',checks:'origin, disclosure, source, responsive, noindex, preserved anchors, journey to existing consultation'});await p.close();
 }
}catch(e){results.push({status:'FAIL',error:String(e)});throw e;}finally{await b.close();writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log(results);}
