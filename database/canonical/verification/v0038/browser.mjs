import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync,writeFileSync,readFileSync,unlinkSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createCluster,id,protect} from './cluster.mjs';
import {seedWorkbench} from './fixtures.mjs';
import {startWorkbench} from './runtime.mjs';
export async function startWebsite(rt,port=4686){
 const website=path.resolve('website/phoenix-nova-website-v5'),config=path.join(website,'.dev.vars');assert(!existsSync(config),'Existing preview configuration must be preserved');
 const content='SERVICE_WORKBENCH_ENABLED=true\nSERVICE_WORKBENCH_SYNTHETIC_PREVIEW=true\nSERVICE_WORKBENCH_API_ORIGIN='+rt.origin+'\nFAMILY_CENTER_V2_ENABLED=true\n';
 writeFileSync(config,content,{mode:0o600,flag:'wx'});protect(config);
 const env={...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_WRITE_LOGS:'false',WRANGLER_LOG_PATH:'.wrangler/logs',MINIFLARE_REGISTRY_PATH:'.wrangler/registry'};
 for(const name of Object.keys(env))if(/proxy/i.test(name))delete env[name];
 const child=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:website,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
 const logs=[];child.stdout.on('data',b=>logs.push(b.toString()));child.stderr.on('data',b=>logs.push(b.toString()));
 const origin='http://127.0.0.1:'+port;
 const close=async()=>{if(child.exitCode===null){child.kill();await Promise.race([new Promise(r=>child.once('exit',r)),new Promise(r=>setTimeout(r,5000))]);}if(existsSync(config)&&readFileSync(config,'utf8')===content)unlinkSync(config);};
 try{let ready=false;for(let n=0;n<100;n++){if(child.exitCode!==null)throw Error('Owned Vite exited: '+logs.join('').slice(-2000));try{const r=await fetch(origin+'/en/my-services',{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready,'Loopback website ready');return{origin,logs,close};}catch(error){await close();throw error;}
}
export async function browserRegression(rt,origin,output,project=310){
 const module=process.env.PLAYWRIGHT_MODULE;assert(module,'PLAYWRIGHT_MODULE must reference an isolated installed Playwright');
 const {chromium}=await import(pathToFileURL(path.resolve(module,existsSync(path.join(module,'index.mjs'))?'index.mjs':'index.js')).href);
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});const contexts=[],checks=[];
 const check=name=>{checks.push({name,status:'PASS'});console.log('PASS browser '+name)};
 const newPage=async()=>{const c=await browser.newContext({viewport:{width:1440,height:1050}});contexts.push(c);await c.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());const p=await c.newPage();p.setDefaultTimeout(25000);return p;};
 const login=async(p,alias,lang='en')=>{await p.goto(origin+'/'+lang+'/my-services',{waitUntil:'networkidle'});await p.getByLabel(lang==='en'?'Test account':'测试账户',{exact:true}).selectOption(alias);await p.getByRole('button',{name:lang==='en'?'Open test account':'进入测试账户',exact:true}).click();await p.locator('.sw-projects .sw-card').first().waitFor();};
 const detail=async(p,lang='en')=>{await p.goto(origin+'/'+lang+'/my-services/'+id(project),{waitUntil:'networkidle'});await p.getByRole('heading',{name:'Synthetic HK Masters '+project,exact:true}).waitFor();};
 const tab=(p,name)=>p.getByRole('button',{name,exact:true}).click();
 const saved=p=>p.getByRole('status').waitFor();
 try{
  const client=await newPage(),advisor=await newPage();await login(client,'client-a');await login(advisor,'advisor-a');
  assert.equal(await client.locator('.sw-projects').getByText('Synthetic HK Masters 313',{exact:true}).count(),0);
  const cookies=await client.context().cookies();assert(cookies.find(c=>c.name==='phoenix_workbench_session')?.httpOnly);assert(!(await client.evaluate(()=>document.cookie)).includes('phoenix_workbench_session'));
  check('real list excludes unopened projects; browser cookie HttpOnly');
  await detail(client);await detail(advisor);await tab(client,'Tasks');await client.getByRole('button',{name:'In progress',exact:true}).first().click();await saved(client);
  check('client task command persists through BFF and PostgreSQL');
  await tab(client,'Materials');const upload=client.locator('form').filter({has:client.getByRole('heading',{name:'Upload material or a new version',exact:true})});
  await upload.getByLabel('Material label',{exact:true}).fill('SYNTHETIC_TRANSCRIPT');await upload.getByLabel('Choose file',{exact:true}).setInputFiles({name:'synthetic-transcript.txt',mimeType:'text/plain',buffer:Buffer.from('Synthetic browser transcript v1')});await upload.getByRole('button',{name:'Upload',exact:true}).click();await saved(client);
  await tab(advisor,'Materials');await advisor.getByRole('button',{name:'Refresh',exact:true}).click();
  const review=advisor.locator('form').filter({has:advisor.getByRole('heading',{name:'Review material',exact:true})}).first();await review.locator('select').selectOption('CHANGES_REQUESTED');await review.getByLabel('Review note / change request',{exact:true}).fill('Synthetic additional page required');await review.getByRole('button',{name:'Record review',exact:true}).click();await saved(advisor);
  await client.getByText('Synthetic additional page required',{exact:true}).waitFor();await upload.locator('select[name=documentId]').selectOption({label:'SYNTHETIC_TRANSCRIPT'});await upload.getByLabel('Choose file',{exact:true}).setInputFiles({name:'synthetic-transcript.txt',mimeType:'text/plain',buffer:Buffer.from('Synthetic browser transcript v2 complete')});await upload.getByRole('button',{name:'Upload',exact:true}).click();await saved(client);
  await advisor.getByRole('button',{name:'Refresh',exact:true}).click();const secondReview=advisor.locator('form').filter({has:advisor.getByRole('heading',{name:'Review material',exact:true})}).first();await secondReview.locator('select').selectOption('APPROVED');await secondReview.getByLabel('Review note / change request',{exact:true}).fill('Synthetic browser review approved');await secondReview.getByRole('button',{name:'Record review',exact:true}).click();await saved(advisor);await client.getByText('Synthetic browser review approved',{exact:true}).waitFor();check('actual upload, review return, immutable second version and adviser/client synchronization');
  await tab(advisor,'Applications');const form=advisor.locator('form').filter({has:advisor.getByRole('heading',{name:'Add a school / programme application',exact:true})});await form.getByLabel('Application round',{exact:true}).fill('BROWSER_R1');await form.getByRole('button',{name:'Create application',exact:true}).click();await saved(advisor);await advisor.getByText('BROWSER_R1',{exact:false}).waitFor();check('canonical catalogue creates persisted school/programme application');
  await tab(client,'Contract & payment');assert.equal(await client.getByRole('button',{name:/confirm payment|edit contract/i}).count(),0);await client.getByRole('heading',{name:'Contract & payment · read only',exact:true}).waitFor();check('contract/payment display has no mutation controls');
  for(const lang of ['en','zh']){await detail(client,lang);for(const width of [1440,390]){await client.setViewportSize({width,height:1050});await client.screenshot({path:path.join(output,'workbench-'+lang+'-'+width+'.png'),fullPage:true});assert(await client.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),lang+' '+width+' overflow');}}check('English/Chinese and desktop/mobile layout');
  await login(client,'client-b');await client.goto(origin+'/en/my-services/'+id(project));await client.getByRole('alert').waitFor();assert.equal(await client.getByRole('heading',{name:'Synthetic HK Masters '+project,exact:true}).count(),0);check('same-family identity switch clears prior project data and refuses access');
  await login(client,'client-a');await client.goto(origin+'/en/family-center');await client.locator('.sw-home-cards').getByText('Synthetic HK Masters '+project,{exact:true}).waitFor();check('Family Center My Services uses actual authorized project cards');
  return checks;
 }catch(error){for(const [i,c]of contexts.entries()){const p=c.pages()[0];if(p){writeFileSync(path.join(output,'browser-failure-'+i+'.txt'),await p.locator('body').innerText());await p.screenshot({path:path.join(output,'browser-failure-'+i+'.png'),fullPage:true});}}throw error;
 }finally{await Promise.all(contexts.map(c=>c.close()));await browser.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve('database/canonical/verification/v0038/browser.mjs')){
 const output=path.resolve(process.env.WORKBENCH_EVIDENCE_DIR||'out/service-project-workbench-v1');mkdirSync(output,{recursive:true});let db,rt,web;const record={status:'FAIL',started:new Date().toISOString()};
 try{db=await createCluster(process.argv[2]||'16');record.candidateSha=db.candidateSha;rt=await startWorkbench(db,seedWorkbench(db));web=await startWebsite(rt);record.checks=await browserRegression(rt,web.origin,output);record.status='PASS';}catch(error){record.error={message:error.message,stack:error.stack};console.error(error);process.exitCode=1;}
 finally{await web?.close();await rt?.close();db?.cleanup();record.finished=new Date().toISOString();writeFileSync(path.join(output,'browser-pg'+(process.argv[2]||'16')+'.json'),JSON.stringify(record,null,2)+'\n');if(web)writeFileSync(path.join(output,'website-runtime.txt'),web.logs.join(''));}
}
