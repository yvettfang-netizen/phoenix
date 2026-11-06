import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync,rmSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';

// Component scenarios are synthetic mocks, separate from the runner's real PG page probe.
export async function familyCenterVisualRegression({browser,origin,website}) {
  const dir=path.join(website,'.sites-runtime','family-center-v2');mkdirSync(dir,{recursive:true});
  const file=path.join(dir,`probe-${randomBytes(6).toString('hex')}.tsx`);
  writeFileSync(file,`import React from 'react';import {createRoot} from 'react-dom/client';import {FamilyCenterV2} from '../../components/family-center-v2';
const root=createRoot(document.getElementById('family-v2-probe'));window.__familyV2=(props)=>root.render(React.createElement(FamilyCenterV2,props));window.__familyV2Stop=()=>root.unmount();`,{flag:'wx'});
  let context;
  try{
    context=await browser.newContext();await context.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
    const page=await context.newPage();page.setDefaultTimeout(20000);await page.goto(origin+'/en',{waitUntil:'networkidle'});
    await page.evaluate(()=>{for(const child of document.body.children)if(!['SCRIPT','STYLE','LINK'].includes(child.tagName))child.setAttribute('data-family-v2-background','');const node=document.createElement('div');node.id='family-v2-probe';document.body.appendChild(node);});
    await page.evaluate(async u=>{await import(u)},'/.sites-runtime/family-center-v2/'+path.basename(file));
    await page.addStyleTag({content:'[data-family-v2-background]{display:none!important}'});
    const render=async(locale,extra={})=>{await page.evaluate(p=>window.__familyV2(p),{locale,demo:true,personalized:true,harmony:true,...extra});await page.locator('[data-family-center-v2]').waitFor();};
    for(const locale of ['zh','en']){
      await render(locale);
      for(const width of [1440,1024,768,390]){
        await page.setViewportSize({width,height:1050});
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${locale} ${width} overflow`);
        assert.equal(await page.locator('.fc-services article').count(),4);
        assert.equal(await page.locator('.fc-sidebar nav button').count(),5);
        assert(await page.locator('.fc-hero').boundingBox());
        if(process.env.FAMILY_CENTER_SCREENSHOTS){mkdirSync(process.env.FAMILY_CENTER_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.FAMILY_CENTER_SCREENSHOTS,`${locale}-${width}.png`),fullPage:true});}
      }
    }
    await render('en');await page.setViewportSize({width:1440,height:1050});
    for(const scenario of ['education','identity','wealth','health','multi','new']){
      await page.getByLabel('Scenario',{exact:true}).selectOption(scenario);
      assert.equal(await page.locator('.fc-service-detail').count(),scenario==='multi'?3:scenario==='new'?0:1);
    }
    await page.getByLabel('Scenario',{exact:true}).selectOption('multi');
    await page.getByRole('button',{name:'Pin Health',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Pin Health',exact:true}).getAttribute('aria-pressed'),'true');
    await page.getByLabel('Family',{exact:true}).selectOption('demo-family-b');assert.equal(await page.getByRole('button',{name:'Pin Health',exact:true}).getAttribute('aria-pressed'),'false');
    await page.getByLabel('Family',{exact:true}).selectOption('demo-family-a');await page.getByLabel('Subject',{exact:true}).selectOption('demo-self-a');assert.equal(await page.locator('.fc-service-detail').count(),0);
    await page.getByLabel('Subject',{exact:true}).selectOption('demo-child-a');
    await page.getByRole('button',{name:'Education & Reports',exact:false}).first().click();
    await page.getByRole('button',{name:'Learning planning summary · sample'}).click();await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Overview',exact:false}).first().click();
    for(const state of ['loading','empty','no-permission','unavailable','stale','error']){await page.getByLabel('Module status preview',{exact:true}).selectOption(state);assert.equal(await page.locator('.fc-members button').count(),0);assert.equal(await page.locator('.fc-service-detail').count(),0);}
    await page.getByLabel('Module status preview',{exact:true}).selectOption('ready');
    await page.getByRole('button',{name:'Notifications',exact:true}).focus();assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Notifications');
    await render('en',{demo:false,account:true,canonical:false});assert.equal(await page.getByLabel('Scenario',{exact:true}).count(),0);assert.equal(await page.locator('.fc-members button').count(),0);assert.equal(await page.locator('.fc-service-detail').count(),0);
    console.log('PASS FAMILY-V2 visual 1440/1024/768/390 zh/en; A-F fixtures, family/subject narrowing, pin reset, report dialog/Escape, focus and authenticated no-demo boundary');
  }finally{await context?.close();assert.equal(path.dirname(realpathSync(file)),realpathSync(dir));rmSync(file);}
}
