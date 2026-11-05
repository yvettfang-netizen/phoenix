import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync,rmSync,realpathSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import path from 'node:path';

/** Browser-only component lifecycle probe. All payloads here are explicitly synthetic mocks,
 * not Canonical/database acceptance. The PG runner separately proves the real SQL chain.
 */
export async function runUiStateReviewRegression({browser,origin,website,expectOriginal=false}){
  const directory=path.join(website,'.sites-runtime','canonical-ui-review');mkdirSync(directory,{recursive:true});
  const file=path.join(directory,'probe-'+randomBytes(6).toString('hex')+'.tsx');
  const source=`import React from 'react';
import {createRoot} from 'react-dom/client';
import {CanonicalFamilyPreview} from '../../components/canonical-family-preview';
const root=createRoot(document.getElementById('pr55-state-probe'));
window.__pr55Render=(sessionMode)=>root.render(React.createElement(CanonicalFamilyPreview,{locale:'en',sessionMode}));
window.__pr55Stop=()=>root.unmount();
`;
  // The probe is uniquely owned, contains no credentials, and is never committed.
  writeFileSync(file,source,{flag:'wx',mode:0o600});
  let context,release;const held=[];
  const gate=new Promise(resolve=>{release=resolve;});
  try{
    context=await browser.newContext();
    await context.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
    await context.route('**/api/canonical/**',async route=>{
      const url=new URL(route.request().url());
      if(url.pathname.includes('/session-projections/')){held.push(url.pathname);await gate;await route.fulfill({status:401,contentType:'application/json',body:'{"error":{"code":"SYNTHETIC_DENY"}}'});return;}
      const value=url.pathname.endsWith('/family')?{family:{displayName:'Review synthetic old family',familyRef:'fam_'+'a'.repeat(32)}}:{items:[{displayName:'Review synthetic old student',studentRef:'stu_'+'a'.repeat(32)}]};
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)});
    });
    const page=await context.newPage();await page.goto(origin+'/en',{waitUntil:'domcontentloaded',timeout:60000});
    await page.evaluate(()=>{const node=document.createElement('div');node.id='pr55-state-probe';document.body.appendChild(node);});
    const moduleUrl='/.sites-runtime/canonical-ui-review/'+path.basename(file);
    await page.evaluate(async url=>{await import(url);},moduleUrl);
    await page.evaluate(()=>window.__pr55Render(false));
    await page.locator('#pr55-state-probe [data-family-name]').filter({hasText:'Review synthetic old family'}).waitFor();
    await page.evaluate(()=>window.__pr55Render(true));
    for(let i=0;i<100&&held.length<2;i++)await new Promise(r=>setTimeout(r,50));
    assert.equal(held.length,2,'Both new-mode requests must be awaiting authorization');
    const retained=await page.locator('#pr55-state-probe [data-family-name]').count();
    console.log('REVIEW_OBSERVATION '+JSON.stringify({probe:'R55-UI1',phase:expectOriginal?'original':'fixed',oldNameVisibleBeforeNewAuthorization:retained,newModeRequestsHeld:held.length,syntheticComponentProbe:true}));
    assert.equal(retained,expectOriginal?1:0,expectOriginal?'Original counterexample no longer reproduced':'Old-mode DTO must disappear before new authorization completes');
    if(!expectOriginal)assert.equal(await page.locator('#pr55-state-probe [data-student-summary]').count(),0);
    release();await page.locator('#pr55-state-probe').getByText('Family details unavailable or not authorized.',{exact:true}).waitFor();
    assert.equal(await page.locator('#pr55-state-probe [data-family-name]').count(),0);
    console.log(expectOriginal?'REPRODUCED R55-UI1 old mode state survives prop change until new-mode denial':'PASS R55-UI1 mode transition resets old data before authorization; denied mode shows no old DTO');
    if(!expectOriginal){
      await page.evaluate(()=>window.__pr55Render(false));
      await page.locator('#pr55-state-probe [data-family-name]').filter({hasText:'Review synthetic old family'}).waitFor();
      assert.equal(await page.locator('#pr55-state-probe').getByText('Family details unavailable or not authorized.',{exact:true}).count(),0);
      console.log('PASS R55-UI2 returning to legacy mode starts fresh; previous denial does not suppress a separately authorized response');
    }
    await page.evaluate(()=>window.__pr55Stop());
  }finally{
    release();await context?.close();
    assert.equal(path.dirname(realpathSync(file)),realpathSync(directory));rmSync(file);
  }
}
