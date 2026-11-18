import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {execFileSync} from 'node:child_process'
import {createServer} from 'node:http'
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import path from 'node:path'
import {pathToFileURL,fileURLToPath} from 'node:url'
import {startP1Fixture} from './fixture.mjs'

const version=process.argv[2]||'16'
assert(['16','17'].includes(version))
const root=process.cwd()
const website=path.resolve(root,'website/phoenix-nova-website-v5')
const output=path.resolve(process.env.P1_EVIDENCE_DIR||('out/p1-family-service/browser-pg'+version))
mkdirSync(output,{recursive:true})
const record={
 schemaVersion:'phoenix-p1-family-service-browser.v1',
 sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 started:new Date().toISOString(),
 postgres:version,
 harness:'isolated esbuild React component harness; not the built Worker/Sites runtime',
 syntheticOnly:true,
 routeMocking:false,
 delayedResponse:'Cross-tab tests hold and release an actual authorized HTTP response without changing its content.',
 transport:'browser -> isolated UI proxy -> server-owned customer bridge -> P0 BFF -> real PostgreSQL; D1 cookie is a real Miniflare D1 session',
 checks:[],
 screenshots:[],
 status:'FAIL',
 realIdentity:{status:'BLOCKED',reason:'This evidence uses D1 test accounts and synthetic Canonical mappings only.'}
}
let fixture,uiServer,browser,lastPage
const check=(name,details={})=>{record.checks.push({name,status:'PASS',...details});console.log('PASS browser '+name)}
const safeName=value=>value.replace(/[^a-z0-9_-]/gi,'_')

export async function bundleComponents(){
 const require=createRequire(path.join(website,'package.json'))
 const esbuild=require('esbuild')
 const familyPath=path.resolve(website,'components/family-service-overview.tsx').replaceAll('\\','/')
 const centerPath=path.resolve(website,'components/family-center-v2.tsx').replaceAll('\\','/')
 const accountPath=path.resolve(website,'components/customer-account.tsx').replaceAll('\\','/')
 const workbenchPath=path.resolve(website,'components/service-workbench.tsx').replaceAll('\\','/')
 const entry=[
  'import React from "react";',
  'import {createRoot} from "react-dom/client";',
  'import {FamilyCenterV2} from "'+centerPath+'";',
  'import {CustomerAccount} from "'+accountPath+'";',
  'import {ServiceWorkbench} from "'+workbenchPath+'";',
  'const root=document.getElementById("root");',
  'const match=location.pathname.match(new RegExp("^/(en|zh)/my-services(?:/([0-9a-f-]{36}))?$"));',
  'const locale=location.pathname.startsWith("/zh")?"zh":"en";',
  'document.documentElement.lang=locale;',
  'root.replaceChildren();',
  'const readOnly=new URLSearchParams(location.search).get("readOnly")==="1";',
  'const page=match?React.createElement(ServiceWorkbench,{locale,projectId:match[2],readOnly}):location.pathname.endsWith("/account")?React.createElement(CustomerAccount,{locale}):React.createElement(FamilyCenterV2,{locale,account:true,workbench:true});',
  'createRoot(root).render(page);'
 ].join('\n')
 const stubPlugin={
  name:'p1-browser-stubs',
  setup(build){
   build.onResolve({filter:new RegExp('^next/link$')},()=>({path:'next-link',namespace:'p1-browser'}))
   build.onLoad({filter:/^next-link$/,namespace:'p1-browser'},()=>({loader:'js',resolveDir:website,contents:'import React from "react";export default function Link(props){const p={...props};delete p.children;delete p.prefetch;return React.createElement("a",p,props.children)}'}))
   build.onResolve({filter:new RegExp('^next/image$')},()=>({path:'next-image',namespace:'p1-browser'}))
   build.onLoad({filter:/^next-image$/,namespace:'p1-browser'},()=>({loader:'js',resolveDir:website,contents:'import React from "react";export default function Image(props){const p={...props};delete p.unoptimized;return React.createElement("img",p)}'}))
   build.onLoad({filter:new RegExp('\\.css$')},()=>({loader:'js',contents:'export default "";'}))
  }
 }
 const result=await esbuild.build({
  stdin:{contents:entry,resolveDir:website,sourcefile:'p1-browser-entry.tsx',loader:'tsx'},
  bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',jsx:'automatic',
  alias:{'@':website},plugins:[stubPlugin],logLevel:'silent'
 })
 assert.equal(result.errors.length,0)
 return result.outputFiles[0].text
}

async function startUiServer(bundle){
 const css=readFileSync(path.join(website,'components/family-center-v2.css'),'utf8')+'\n'+readFileSync(path.join(website,'components/family-service-overview.css'),'utf8')+'\n'+readFileSync(path.join(website,'components/service-workbench.css'),'utf8')
 uiServer=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url??'/', 'http://'+(req.headers.host??'127.0.0.1'))
   if(url.pathname==='/assets/p1-browser.js'){res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'});res.end(bundle);return}
   if(url.pathname==='/assets/p1-browser.css'){res.writeHead(200,{'content-type':'text/css; charset=utf-8','cache-control':'no-store'});res.end(css);return}
   if(url.pathname.startsWith('/brand/')||url.pathname.startsWith('/images/')){
    const publicRoot=path.resolve(website,'public')
    const asset=path.resolve(publicRoot,'.'+decodeURIComponent(url.pathname))
    if(!asset.startsWith(publicRoot+path.sep))throw Error('asset path escape')
    const bytes=readFileSync(asset)
    const type=asset.endsWith('.png')?'image/png':asset.endsWith('.jpg')||asset.endsWith('.jpeg')?'image/jpeg':asset.endsWith('.svg')?'image/svg+xml':'application/octet-stream'
    res.writeHead(200,{'content-type':type,'cache-control':'no-store'});res.end(bytes);return
   }
   if(url.pathname.startsWith('/api/customer-auth/')||url.pathname.startsWith('/api/family-services/')||url.pathname.startsWith('/api/service-workbench/')){
    const chunks=[]
    for await(const chunk of req)chunks.push(Buffer.from(chunk))
    const headers={}
    for(const [key,value] of Object.entries(req.headers))if(value!==undefined&&key.toLowerCase()!=='host')headers[key]=Array.isArray(value)?value.join(','):value
    headers.cookie=req.headers.cookie??''
    if(req.method==='POST')headers.origin=fixture.bridgeOrigin
    const upstream=await fetch(fixture.bridgeOrigin+url.pathname+url.search,{method:req.method,headers,body:chunks.length?Buffer.concat(chunks):undefined})
    const outputHeaders={}
    upstream.headers.forEach((value,key)=>{outputHeaders[key]=value})
    res.writeHead(upstream.status,outputHeaders)
    res.end(Buffer.from(await upstream.arrayBuffer()))
    return
   }
   const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>P1 isolated browser harness</title><link rel="stylesheet" href="/assets/p1-browser.css"></head><body><div id="p1-harness-banner" data-synthetic="true">Synthetic isolated browser component harness · no production data · not built Worker UI</div><div id="root"></div><script src="/assets/p1-browser.js"></script></body></html>'
   res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'})
   res.end(html)
  }catch{
   res.writeHead(503,{'content-type':'text/plain'});res.end('isolated browser harness unavailable')
  }
 })
 await new Promise(resolve=>uiServer.listen(0,'127.0.0.1',resolve))
 return'http://127.0.0.1:'+uiServer.address().port
}

export async function loadChromium(modulePath){
 const entry=existsSync(path.join(modulePath,'index.mjs'))?'index.mjs':'index.js'
 const imported=await import(pathToFileURL(path.join(modulePath,entry)).href)
 const chromium=(imported.default??imported).chromium
 assert.equal(typeof chromium?.launch,'function','Pinned Playwright Chromium launcher is required')
 return chromium
}

async function main(){
 assert.ok(process.env.PLAYWRIGHT_MODULE,'PLAYWRIGHT_MODULE must point to the pinned Playwright package')
 fixture=await startP1Fixture({root,version})
 const bundle=await bundleComponents()
 const uiOrigin=await startUiServer(bundle)
 const modulePath=path.resolve(process.env.PLAYWRIGHT_MODULE)
 const chromium=await loadChromium(modulePath)
 browser=await chromium.launch({headless:true})
 const contexts=[]
 const contextFor=async(alias)=>{
  const context=await browser.newContext({viewport:{width:1440,height:1100},timezoneId:'Asia/Shanghai'})
  contexts.push(context)
  const cookie=fixture.accounts[alias].cookie.split(';')[0].split('=')
  await context.addCookies([{name:cookie[0],value:cookie.slice(1).join('='),url:uiOrigin,httpOnly:true,sameSite:'Lax'}])
  return context
 }
 const pageFor=async(alias,locale='en',width=1440)=>{
  const context=await contextFor(alias)
  const page=await context.newPage()
  lastPage=page
  await page.setViewportSize({width,height:1100})
  page.setDefaultTimeout(30000)
  await page.goto(uiOrigin+'/'+locale+'/family-center',{waitUntil:'networkidle'})
  return{context,page}
 }
 const noOverflow=async(page,label)=>{
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,label+' horizontal overflow')
 }
 const shot=async(page,label)=>{
  const file=path.join(output,safeName(label)+'.png')
  await page.screenshot({path:file,fullPage:true})
  record.screenshots.push(file)
 }

 const assertCrossTabSignOut=async({alias,number,title,action,label})=>{
  const context=await contextFor(alias)
  // Keep the other document's visibility path open to test the logout signal
  // separately from the guard which already clears a hidden document.
  await context.addInitScript(()=>Object.defineProperty(document,'visibilityState',{get:()=> 'visible'}))
  const account=await context.newPage()
  const workbench=await context.newPage()
  lastPage=workbench
  const projectUrl=uiOrigin+'/api/service-workbench/projects/'+fixture.project(number)
  const ready=Promise.withResolvers()
  const release=Promise.withResolvers()
  const finished=Promise.withResolvers()
  const network=Promise.withResolvers()
  let heldRequest
  try{
   await Promise.all([account.goto(uiOrigin+'/en/account'),workbench.goto(uiOrigin+'/en/my-services/'+fixture.project(number)+'?readOnly=1')])
   const projectTitle=workbench.getByRole('heading',{name:title,exact:true})
   await projectTitle.waitFor()
   const logout=account.getByRole('button',{name:label,exact:true})
   await logout.waitFor()
   const timeOrigin=await workbench.evaluate(()=>performance.timeOrigin)
   workbench.on('requestfailed',request=>{if(request===heldRequest)network.resolve('aborted')})
   workbench.on('response',response=>{
    if(response.request()===heldRequest)void response.finished().then(()=>network.resolve('delivered'))
   })
   await workbench.route(projectUrl,async route=>{
    try{
     heldRequest=route.request()
     const response=await route.fetch({maxRedirects:0,timeout:10000})
     const body=await response.body()
     ready.resolve(response.status())
     await release.promise
     // Cancellation is a valid outcome for the already authorized response.
     await route.fulfill({response,body}).catch(()=>{})
    }catch(error){ready.reject(error)}
    finally{finished.resolve()}
   },{times:1})
   await workbench.getByRole('button',{name:'Refresh',exact:true}).click()
   const status=await Promise.race([ready.promise,new Promise(resolve=>setTimeout(()=>resolve(0),11000).unref())])
   assert.equal(status,200,'The held response must have been authorized before logout')
   assert.equal(await projectTitle.count(),1,'Workbench still shows the loaded project before logout')
   const [response]=await Promise.all([
    account.waitForResponse(response=>response.url()===uiOrigin+'/api/customer-auth/'+action),
    logout.click(),
   ])
   assert.equal(response.status(),200)
   await projectTitle.waitFor({state:'detached',timeout:1500})
   assert.equal(await workbench.evaluate(()=>performance.timeOrigin),timeOrigin,'Workbench must clear without document navigation')
   release.resolve()
   await finished.promise
   const delivery=await Promise.race([network.promise,new Promise(resolve=>setTimeout(()=>resolve('timeout'),3000).unref())])
   assert.notEqual(delivery,'timeout','Expected a delivered response or browser cancellation')
   await workbench.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)))
   assert.equal(await projectTitle.count(),0,'A late response must not repopulate the workbench')
   const oldCookie=fixture.accounts[alias].cookie.split(';')[0]
   assert.equal((await context.request.get(projectUrl,{headers:{cookie:oldCookie}})).status(),401)
   check(action+' clears a second workbench tab and suppresses a late authorized response',{delivery})
  }finally{
   release.resolve()
   await context.close()
  }
 }

 let view=await pageFor('client-a','en',1440)
 await view.page.locator('[data-family-service-overview]').waitFor()
 await view.page.getByRole('heading',{name:'Synthetic HK Masters 310',exact:true}).waitFor()
 assert.equal(await view.page.getByRole('heading',{name:'Synthetic Identity Hong Kong 319',exact:true}).count(),0)
 await noOverflow(view.page,'client-a-en-1440')
 await shot(view.page,'client-a-en-1440')
 await view.page.setViewportSize({width:390,height:1100})
 await noOverflow(view.page,'client-a-en-390')
 await shot(view.page,'client-a-en-390')
 check('client A English Family Service Overview reads real PG summary', {identity:'client-a',locale:'en'})

 const navigation=view.page.getByRole('navigation',{name:'Family Center navigation'})
 assert.equal(await navigation.locator('button,a').count(),3)
 await navigation.getByRole('link',{name:'My Services',exact:true}).click()
 await view.page.locator('.sw-projects').getByRole('heading',{name:'Synthetic HK Masters 310',exact:true}).waitFor()
 assert.equal(await view.page.locator('.sw-projects').getByText('Synthetic Identity Hong Kong 319',{exact:true}).count(),0)
 await view.page.goto(uiOrigin+'/en/family-center',{waitUntil:'networkidle'})

 const card310=view.page.locator('.fso-card').filter({hasText:'Synthetic HK Masters 310'})
 await card310.getByRole('heading',{name:'Synthetic HK Masters 310',exact:true}).click()
 await view.page.locator('[data-service-workbench]').waitFor()
 await view.page.getByRole('heading',{name:'Synthetic HK Masters 310',exact:true}).waitFor()
 await view.page.goto(uiOrigin+'/en/family-center',{waitUntil:'networkidle'})
 await view.page.locator('.fso-next-list a[href$="/'+fixture.project(310)+'#tasks"]').click()
 await view.page.getByRole('heading',{name:'Project tasks',exact:true}).waitFor()
 const taskRow=view.page.locator('article').filter({hasText:'Synthetic client: upload transcript'})
 await view.page.goto(uiOrigin+'/en/my-services/'+fixture.project(310)+'?readOnly=1#tasks',{waitUntil:'networkidle'})
 await taskRow.getByText('Synthetic client: upload transcript',{exact:true}).waitFor()
 assert.equal(await taskRow.getByRole('button').count(),0)
 check('read-only workbench displays a customer task without mutation controls')
 await view.page.goto(uiOrigin+'/en/my-services/'+fixture.project(310)+'#tasks',{waitUntil:'networkidle'})
 await taskRow.getByText('Synthetic client: upload transcript',{exact:true}).waitFor()
 await taskRow.getByRole('button',{name:'In progress',exact:true}).click()
 await view.page.getByText('Saved. Showing the latest database records.',{exact:true}).waitFor()
 await taskRow.getByRole('button',{name:'Complete task',exact:true}).click()
 await view.page.getByText('Saved. Showing the latest database records.',{exact:true}).waitFor()
 await taskRow.getByText(/^Completed ·/).waitFor()
 check('client A card enters the real P0 project and completes the authorized task', {project:fixture.project(310)})
 await view.page.goto(uiOrigin+'/en/family-center',{waitUntil:'networkidle'})
 const clientCard=view.page.locator('.fso-card').filter({hasText:'Synthetic HK Masters 310'})
 await clientCard.getByText('No pending tasks',{exact:true}).waitFor()
 await clientCard.getByText('A task was completed',{exact:true}).waitFor()
 check('Family Service Overview re-fetches the reduced todo count after P0 task completion')
 await view.context.close()

 view=await pageFor('client-identity','en',1440)
 await view.page.getByRole('heading',{name:'Synthetic Identity Hong Kong 319',exact:true}).waitFor()
 assert.equal(await view.page.getByRole('heading',{name:'Synthetic HK Masters 310',exact:true}).count(),0)
 await noOverflow(view.page,'identity-en-1440');await shot(view.page,'identity-en-1440')
 check('client B Identity view contains only its authorized Identity project')
 await view.context.close()

 view=await pageFor('client-c','zh',1440)
 await view.page.getByRole('heading',{name:'Synthetic HK Masters 312',exact:true}).waitFor()
 await view.page.getByRole('heading',{name:'Synthetic Identity Planning 318',exact:true}).waitFor()
 assert.equal(await view.page.getByRole('heading',{name:'Synthetic Identity Hong Kong 319',exact:true}).count(),0)
 assert.ok(await view.page.locator('.fso-card').count()>=2)
 await noOverflow(view.page,'client-c-zh-1440');await shot(view.page,'client-c-zh-1440')
 await view.page.setViewportSize({width:390,height:1100})
 await noOverflow(view.page,'client-c-zh-390');await shot(view.page,'client-c-zh-390')
 check('client C Chinese view contains multiple authorized project cards')
 await view.context.close()

 const cancelRead=await fixture.rt.call('manager','projects/'+fixture.project(312))
 assert.equal(cancelRead.status,200)
 const cancel=await fixture.rt.call('manager','projects/'+fixture.project(312)+'/commands',{kind:'PROJECT_STATUS',payload:{revision:cancelRead.body.project.revision,status:'CANCELLED',reason:'P1_BROWSER_TERMINATE'}},'p1-browser-cancel-312')
 assert.equal(cancel.status,200,JSON.stringify(cancel.body))
 view=await pageFor('client-c','en',390)
 await view.page.locator('.fso-history .fso-card').filter({hasText:'Synthetic HK Masters 312'}).getByText('Terminated',{exact:true}).waitFor()
 await noOverflow(view.page,'terminated-en-390');await shot(view.page,'terminated-en-390')
 check('terminated service moves to history after a real manager command')
 await view.context.close()

 fixture.env.SERVICE_WORKBENCH_API_ORIGIN=fixture.emptyApi.origin
 view=await pageFor('client-empty','en',1440)
 await view.page.getByText('There are no service projects to show yet',{exact:true}).waitFor()
 await noOverflow(view.page,'empty-en-1440');await shot(view.page,'empty-en-1440')
 check('unsubscribed synthetic customer receives the real empty state and exploration path')
 await view.context.close()
 fixture.env.SERVICE_WORKBENCH_API_ORIGIN=fixture.rt.origin

 view=await pageFor('client-a','en',1440)
 await view.page.getByText('On hold',{exact:true}).waitFor()
 await shot(view.page,'paused-en-1440')
 check('paused project remains visible with a server-recorded On hold status')
 await view.context.close()

 const managerDetail=await fixture.rt.call('manager','projects/'+fixture.project(311))
 assert.equal(managerDetail.status,200,JSON.stringify(managerDetail.body))
 const managerResume=await fixture.rt.call('manager','projects/'+fixture.project(311)+'/commands',{kind:'PROJECT_STATUS',payload:{revision:managerDetail.body.project.revision,status:'ACTIVE',reason:'P1_BROWSER_RESUME'}},'p1-browser-resume-311')
 assert.equal(managerResume.status,200,JSON.stringify(managerResume.body))
 const managerActive=await fixture.rt.call('manager','projects/'+fixture.project(311))
 assert.equal(managerActive.status,200,JSON.stringify(managerActive.body))
 const managerUpdate=await fixture.rt.call('manager','projects/'+fixture.project(311)+'/commands',{kind:'PROJECT_STATUS',payload:{revision:managerActive.body.project.revision,status:'COMPLETED',reason:'P1_BROWSER_HISTORY'}},'p1-browser-close-311')
 assert.equal(managerUpdate.status,200,JSON.stringify(managerUpdate.body))
 view=await pageFor('client-a','en',1440)
 await view.page.getByRole('heading',{name:'Service history',exact:true}).waitFor()
 await view.page.getByRole('heading',{name:'Synthetic HK Masters 311',exact:true}).waitFor()
 await shot(view.page,'history-en-1440')
 check('completed project moves into the Family Service history section')
 await view.context.close()

 await fixture.revoke(310,1)
 view=await pageFor('client-a','en',1440)
 assert.equal(await view.page.getByRole('heading',{name:'Synthetic HK Masters 310',exact:true}).count(),0)
 await view.page.getByRole('heading',{name:'Service history',exact:true}).waitFor()
 await view.page.getByRole('heading',{name:'Synthetic HK Masters 311',exact:true}).waitFor()
 const revokedDetail=await fixture.call('client-a','projects/'+fixture.project(310))
 assert.equal(revokedDetail.status,403)
 await noOverflow(view.page,'revoked-en-1440')
 check('revoked project disappears and the UI does not retain stale progress')
 await view.context.close()

 await assertCrossTabSignOut({alias:'client-identity',number:319,title:'Synthetic Identity Hong Kong 319',action:'logout',label:'Sign out'})
 await assertCrossTabSignOut({alias:'client-c',number:318,title:'Synthetic Identity Planning 318',action:'logout-all',label:'Sign out all devices'})

 record.status='PASS_SYNTHETIC_ISOLATED_BROWSER_COMPONENT'
 record.finished=new Date().toISOString()
 writeFileSync(path.join(output,'p1-browser-pg'+version+'.json'),JSON.stringify(record,null,2)+'\n')
 console.log('PASS P1 isolated browser component harness on PG'+version)
}

if(path.resolve(process.argv[1]??'')===fileURLToPath(import.meta.url)){
try{await main()}
catch(error){
 record.status='FAIL'
 if(lastPage&&!lastPage.isClosed())try{
  writeFileSync(path.join(output,'synthetic-browser-failure.txt'),(await lastPage.locator('body').innerText({timeout:2000})).slice(0,12000))
  await lastPage.screenshot({path:path.join(output,'synthetic-browser-failure.png'),fullPage:true,timeout:5000})
 }catch{}
 record.error={name:error?.name,message:error?.message,stack:error?.stack}
 record.finished=new Date().toISOString()
 writeFileSync(path.join(output,'p1-browser-pg'+version+'.json'),JSON.stringify(record,null,2)+'\n')
 console.error(error)
 process.exitCode=1
}
finally{
 try{await browser?.close()}catch{}
 try{await uiServer?.closeAllConnections();await new Promise(resolve=>uiServer?uiServer.close(()=>resolve()):resolve())}catch{}
 try{await fixture?.close()}catch{}
}

}
