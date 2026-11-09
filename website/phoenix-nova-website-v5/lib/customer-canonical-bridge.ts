import {readCustomerSession,type AuthConfig} from "./customer-auth";
import {handlePrivateWorkbench,handleServiceWorkbench,type WorkbenchEnv,workbenchEnabled} from "./service-workbench-bff";
import {summarySearch} from "./family-service-summary";
import {PrivateWorkbenchAccessDenied,privateCustomerProvider,privateWorkbenchConfig,privateWorkbenchRequested,privateWorkbenchResource} from "./private-customer-workbench";

/** Server-owned adapter only. Never deserialize this capability from request data.
 * assertCurrent must recheck the bound source account and session as well as
 * the current principal, family, subject and grants.
 * The server-to-server opaque token must resolve to the CUSTOMER gateway profile. */
export interface CustomerCanonicalProvider {
 resolve(identity:{customerId:string;sessionHash:string}):Promise<{
  token:string;assertCurrent():Promise<void>;
 } | null>;
}
export function customerBridgeEnabled(env:WorkbenchEnv,mode:string|undefined){
 if(privateWorkbenchRequested(env))return privateWorkbenchConfig(env)!==null;
 return workbenchEnabled(env,mode)&&env.CUSTOMER_CANONICAL_BRIDGE_ENABLED==="true";
}
export async function handleCustomerServices(request:Request,env:WorkbenchEnv,mode:string|undefined,resource:string,
 config:AuthConfig|null,developmentProvider:CustomerCanonicalProvider|undefined):Promise<Response>{
 const privateMode=privateWorkbenchRequested(env);
 const privateConfig=privateMode?privateWorkbenchConfig(env):null;
 const security={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer",
  ...(privateMode?{"X-Robots-Tag":"noindex, nofollow, noarchive"}:{})};
 const fail=(status:number,code:string)=>Response.json({error:{code}},{status,headers:security});
 const unavailable=()=>fail(503,"IDENTITY_BRIDGE_UNAVAILABLE");
 if(privateMode&&!privateConfig)return unavailable();
 if(!privateMode&&!customerBridgeEnabled(env,mode))return fail(404,"NOT_FOUND");
 const auth=privateConfig?.auth??config;
 const url=new URL(request.url);
 const fetchSite=request.headers.get("sec-fetch-site");
 if((privateConfig?url.origin!==privateConfig.auth.origin:!["localhost","127.0.0.1"].includes(url.hostname))||(resource==="summary"?summarySearch(url)===null:!!url.search)||
  ["authorization","x-customer-id","x-family-id","x-project-id","x-principal-id","x-role","x-channel","x-source-system","x-phoenix-customer-bridge"].some(h=>request.headers.has(h))||
  (privateConfig?fetchSite!==null&&!["same-origin","none"].includes(fetchSite):fetchSite==="cross-site")||request.headers.has("origin")&&request.headers.get("origin")!==url.origin)
  return fail(403,"ACCESS_DENIED");
 if(resource==="dev-session")return fail(404,"NOT_FOUND");
 if((privateConfig||resource==="summary")&&request.method!=="GET")return fail(405,"METHOD_NOT_ALLOWED");
 if(privateConfig&&!privateWorkbenchResource(resource))return fail(404,"NOT_FOUND");
 if(!auth||auth.origin!==url.origin)return unavailable();
 const auditDb=privateConfig?.audit??auth.db;
 const provider=privateConfig?privateCustomerProvider(privateConfig.authority):developmentProvider;
 try{
  const session=await readCustomerSession(request,auth,{touch:!privateConfig});
  if(!session)return fail(401,"SIGN_IN_REQUIRED");
  const requestId=crypto.randomUUID();
  const audit=async(phase:"attempt"|"prepared"|"outcome",action:string)=>{
   const result=await auditDb.prepare("INSERT INTO core_auth_audit (id,actor_user_id,action,created_at) VALUES (?,?,?,?)")
    .bind(requestId+":"+phase,session.id,action,Date.now()).run();
   if(result.meta?.changes!==1)throw new Error("Canonical audit write failed");
  };
  await audit("attempt","CANONICAL_ACCESS_ATTEMPT");
  const recordFailure=async(response:Response)=>{
   try{
    await audit("outcome",response.status>=500?"CANONICAL_ACCESS_UNAVAILABLE":"CANONICAL_ACCESS_DENIED");
    return response;
   }catch{return unavailable();}
  };
  try{
   if(!provider||typeof provider.resolve!=="function")return recordFailure(fail(503,"IDENTITY_MAPPING_NOT_CONFIGURED"));
   const mapped=await provider.resolve({customerId:session.id,sessionHash:session.token_hash});
   if(!mapped||!/^[A-Za-z0-9_-]{32,256}$/.test(mapped.token)||typeof mapped.assertCurrent!=="function")
    return recordFailure(fail(403,"IDENTITY_MAPPING_REQUIRED"));
   await mapped.assertCurrent();
   const response=privateConfig?await handlePrivateWorkbench(request,privateConfig.gateway,resource,mapped.token):
    await handleServiceWorkbench(request,env,mode,resource,mapped.token);
   if(privateConfig)response.headers.set("X-Robots-Tag","noindex, nofollow, noarchive");
   if(!response.ok)return recordFailure(response);
   // The upstream response is buffered. This audit row precedes the final
   // release check and records preparation, not delivery.
   await audit("prepared","CANONICAL_ACCESS_PREPARED");
   const current=await readCustomerSession(request,auth,{touch:false});
   if(!current||current.id!==session.id||current.token_hash!==session.token_hash)
    return recordFailure(fail(401,"SIGN_IN_REQUIRED"));
   await mapped.assertCurrent();
   if(!(current.valid_until>Date.now()))return recordFailure(fail(401,"SIGN_IN_REQUIRED"));
   return response;
  }catch(error){return recordFailure(error instanceof PrivateWorkbenchAccessDenied?fail(403,"ACCESS_DENIED"):unavailable());}
 }catch{return unavailable();}
}
