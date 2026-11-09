import {validWorkbenchResponse} from "./service-workbench-contract";
import {validFamilyServiceSummary,summarySearch} from "./family-service-summary";
export type WorkbenchEnv=Record<string,unknown>;
export function workbenchEnabled(env:WorkbenchEnv,mode:string|undefined){return mode==="development"&&env.SERVICE_WORKBENCH_ENABLED==="true";}
export async function handleServiceWorkbench(request:Request,env:WorkbenchEnv,mode:string|undefined,resource:string,trustedToken?:string):Promise<Response>{
 const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
 const reply=(status:number,code:string)=>Response.json({error:{code}},{status,headers});
 if(!workbenchEnabled(env,mode))return reply(404,"NOT_FOUND");
 const url=new URL(request.url);
 if(!["127.0.0.1","localhost"].includes(url.hostname)||(resource==="summary"?summarySearch(url)===null:!!url.search)||["x-family-id","x-role","x-principal-id","x-channel","x-source-system","authorization","x-phoenix-customer-bridge"].some(h=>request.headers.has(h))||
  request.headers.get("sec-fetch-site")==="cross-site"||request.headers.has("origin")&&request.headers.get("origin")!==url.origin)return reply(403,"ACCESS_DENIED");
 if(!["GET","POST"].includes(request.method))return reply(405,"METHOD_NOT_ALLOWED");
 if(request.method==="POST"&&request.headers.get("origin")!==url.origin)return reply(403,"ORIGIN_REQUIRED");
 const uuid="[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
 const route=new RegExp("^(projects|summary|catalogue|dev-session)$|^projects/"+uuid+"(?:/(commands|materials)|/materials/"+uuid+"/download)?$");
 if(!route.test(resource))return reply(404,"NOT_FOUND");
 const login=resource==="dev-session";
 if(login&&(request.method!=="POST"||env.SERVICE_WORKBENCH_SYNTHETIC_PREVIEW!=="true"))return reply(404,"NOT_FOUND");
 const entries=(request.headers.get("cookie")??"").split(";").map(x=>x.trim()).filter(x=>x.startsWith("phoenix_workbench_session="));
 const token=trustedToken??(entries.length===1?entries[0].slice("phoenix_workbench_session=".length):"");
 if(!login&&!/^[A-Za-z0-9_-]{32,256}$/.test(token))return reply(401,"SIGN_IN_REQUIRED");
 try{
  const upstream=new URL(String(env.SERVICE_WORKBENCH_API_ORIGIN??""));
  if(upstream.protocol!=="http:"||upstream.hostname!=="127.0.0.1"||upstream.username||upstream.password||upstream.pathname!=="/"||upstream.search||upstream.hash)return reply(503,"WORKBENCH_UNAVAILABLE");
  let body:ArrayBuffer|undefined;
  if(request.method==="POST"){
   if(!request.headers.get("content-type")?.startsWith("application/json"))return reply(415,"JSON_REQUIRED");
   if(Number(request.headers.get("content-length")??0)>1000000)return reply(413,"BODY_TOO_LARGE");
   const input=request.body?.getReader();if(!input)return reply(400,"INVALID_JSON");
   const chunks:Uint8Array[]=[];let size=0,expired=false;
   const timer=setTimeout(()=>{expired=true;void input.cancel().catch(()=>{});},5000);
   try{for(;;){const item=await input.read();if(item.done)break;size+=item.value.byteLength;if(size>1000000){await input.cancel();return reply(413,"BODY_TOO_LARGE");}chunks.push(item.value);}}
   finally{clearTimeout(timer);input.releaseLock();}
   if(expired)return reply(408,"BODY_TIMEOUT");
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}body=bytes.buffer;
  }
  const h:Record<string,string>={"Cache-Control":"no-store"};if(!login)h.Authorization="Bearer "+token;
  if(trustedToken)h["X-Phoenix-Customer-Bridge"]="p1";
  if(body)h["Content-Type"]="application/json";
  const key=request.headers.get("idempotency-key");if(key)h["Idempotency-Key"]=key;
  const response=await fetch(new URL("/v1/service-workbench/"+resource+(resource==="summary"?url.search:""),upstream),{method:request.method,headers:h,body,redirect:"manual",signal:AbortSignal.timeout(12000)});
  if(!response.ok)return reply([400,401,403,404,405,409,413,415,422,429].includes(response.status)?response.status:503,response.status===409?"REVISION_OR_IDEMPOTENCY_CONFLICT":response.status===422?"INVALID_COMMAND":response.status===403?"ACCESS_DENIED":"WORKBENCH_UNAVAILABLE");
  const reader=response.body?.getReader();if(!reader)return reply(503,"WORKBENCH_UNAVAILABLE");
  const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>1000000){await reader.cancel();return reply(503,"WORKBENCH_UNAVAILABLE");}chunks.push(part.value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  if(resource.endsWith("/download")){
   if(!response.headers.get("content-disposition")?.startsWith("attachment;"))return reply(503,"WORKBENCH_UNAVAILABLE");
   return new Response(bytes,{status:200,headers:{...headers,"Content-Type":"application/octet-stream","Content-Disposition":response.headers.get("content-disposition")!}});
  }
  if(!response.headers.get("content-type")?.startsWith("application/json"))return reply(503,"WORKBENCH_UNAVAILABLE");
  const data=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  if(login){
   if(typeof data.token!=="string"||!/^[A-Za-z0-9_-]{32,256}$/.test(data.token)||data.synthetic!==true)return reply(503,"WORKBENCH_UNAVAILABLE");
   return Response.json({synthetic:true},{status:200,headers:{...headers,"Set-Cookie":"phoenix_workbench_session="+data.token+"; HttpOnly; SameSite=Strict; Path=/; Max-Age=900"}});
  }
  if(!(resource==="summary"?validFamilyServiceSummary(data):validWorkbenchResponse(resource,data)))return reply(503,"WORKBENCH_UNAVAILABLE");
  return Response.json(data,{status:200,headers});
 }catch{return reply(503,"WORKBENCH_UNAVAILABLE");}
}
