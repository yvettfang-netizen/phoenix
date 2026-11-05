import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {execFileSync} from 'node:child_process'
import {createServer} from 'node:http'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
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
 transport:'browser -> isolated UI proxy -> server-owned customer bridge -> P0 BFF -> real PostgreSQL; D1 cookie is a real Miniflare D1 session',
 checks:[],
 screenshots:[],
 status:'FAIL',
 realIdentity:{status:'BLOCKED',reason:'This evidence uses D1 test accounts and synthetic Canonical mappings only.'}
}
let fixture,uiServer,browser
const check=(name,details={})=>{record.checks.push({name,status:'PASS',...details});console.log('PASS browser '+name)}
const safeName=value=>value.replace(/[^a-z0-9_-]/gi,'_')

export async function bundleComponents(){
 const require=createRequire(path.join(website,'package.json'))
 const esbuild=require('esbuild')
 const familyPath=path.resolve(website,'components/family-service-overview.tsx').replaceAll('\\','/')
 const centerPath=path.resolve(website,'components/family-center-v2.tsx').replaceAll('\\','/')
 const workbenchPath=path.resolve(website,'components/service-workbench.tsx').replaceAll('\\','/')
 const entry=[
  'import React from "react";',
  'import {createRoot} from "react-dom/client";',
  'import {FamilyCenterV2} from "'+centerPath+'";',
  'import {ServiceWorkbench} from "'+workbenchPath+'";',
  'const root=document.getElementById("root");',
  'const match=location.pathname.match(new RegExp("^/(en|zh)/my-services/([0-9a-f-]{36})$"));',
  'const locale=location.pathname.startsWith("/zh")?"zh":"en";',
  'document.documentElement.lang=locale;',
  'root.replaceChildren();',
  'createRoot(root).render(match?React.createElement(ServiceWorkbench,{locale,projectId:match[2]}):React.createElement(FamilyCenterV2,{locale,account:true,workbench:true}));'
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
   if(url.pathname.startsWith('/api/family-services/')||url.pathname.startsWith('/api/service-workbench/')){
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

async function main(){
 assert.ok(process.env.PLAYWRIGHT_MODULE,'PLAYWRIGHT_MODULE must point to the pinned Playwright package')
 fixture=await startP1Fixture({root,version})
 const bundle=await bundleComponents()
 const uiOrigin=await startUiServer(bundle)
 const modulePath=path.resolve(process.env.PLAYWRIGHT_MODULE)
 const playwright=await import(pathToFileURL(path.join(modulePath,'index.js')).href)
 browser=await playwright.chromium.launch({headless:true})
 const contexts=[]
 const contextFor=async(alias)=>{
  const context=await browser.newContext({viewport:{width:1440,height:1100}})
  contexts.push(context)
  const cookie=fixture.accounts[alias].cookie.split(';')[0].split('=')
  await context.addCookies([{name:cookie[0],value:cookie.slice(1).join('='),url:uiOrigin,httpOnly:true,sameSite:'Lax'}])
  return context
 }
 const pageFor=async(alias,locale='en',width=1440)=>{
  const context=await contextFor(alias)
  const page=await context.newPage()
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

 const card310=view.page.locator('.fso-card').filter({hasText:'Synthetic HK Masters 310'})
 await card310.getByRole('heading',{name:'Synthetic HK Masters 310',exact:true}).click()
 await view.page.locator('[data-service-workbench]').waitFor()
 await view.page.getByRole('heading',{name:'Synthetic HK Masters 310',exact:true}).waitFor()
 await view.page.getByRole('button',{name:'Tasks',exact:true}).click()
 const taskRow=view.page.locator('article').filter({hasText:'Synthetic client: upload transcript'})
 await taskRow.getByText('Synthetic client: upload transcript',{exact:true}).waitFor()
 await taskRow.getByRole('button',{name:'In progress',exact:true}).click()
 await view.page.getByText('Saved. Showing the latest database records.',{exact:true}).waitFor()
 await taskRow.getByRole('button',{name:'Completed',exact:true}).click()
 await view.page.getByText('Saved. Showing the latest database records.',{exact:true}).waitFor()
 await taskRow.getByText('Completed',{exact:false}).waitFor()
 check('client A card enters the real P0 project and completes the authorized task', {project:fixture.project(310)})
 await view.page.goto(uiOrigin+'/en/family-center',{waitUntil:'networkidle'})
 const clientCard=view.page.locator('.fso-card').filter({hasText:'Synthetic HK Masters 310'})
 await clientCard.getByText('No pending tasks',{exact:true}).waitFor()
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

 record.status='PASS_SYNTHETIC_ISOLATED_BROWSER_COMPONENT'
 record.finished=new Date().toISOString()
 writeFileSync(path.join(output,'p1-browser-pg'+version+'.json'),JSON.stringify(record,null,2)+'\n')
 console.log('PASS P1 isolated browser component harness on PG'+version)
}

if(path.resolve(process.argv[1]??'')===fileURLToPath(import.meta.url)){
try{await main()}
catch(error){
 record.status='FAIL'
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
