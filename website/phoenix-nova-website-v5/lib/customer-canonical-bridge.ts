import {readCustomerSession,type AuthConfig} from "./customer-auth";
import {handleServiceWorkbench,type WorkbenchEnv,workbenchEnabled} from "./service-workbench-bff";
import {summarySearch} from "./family-service-summary";

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
 return workbenchEnabled(env,mode)&&env.CUSTOMER_CANONICAL_BRIDGE_ENABLED==="true";
}
export async function handleCustomerServices(request:Request,env:WorkbenchEnv,mode:string|undefined,resource:string,
 config:AuthConfig|null,provider:CustomerCanonicalProvider|undefined):Promise<Response>{
 const fail=(status:number,code:string)=>Response.json({error:{code}},{status,headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"}});
 if(!customerBridgeEnabled(env,mode))return fail(404,"NOT_FOUND");
 const url=new URL(request.url);
 if(!["localhost","127.0.0.1"].includes(url.hostname)||(resource==="summary"?summarySearch(url)===null:!!url.search)||
  ["authorization","x-customer-id","x-family-id","x-project-id","x-principal-id","x-role","x-channel","x-source-system","x-phoenix-customer-bridge"].some(h=>request.headers.has(h))||
  request.headers.get("sec-fetch-site")==="cross-site"||request.headers.has("origin")&&request.headers.get("origin")!==url.origin)
  return fail(403,"ACCESS_DENIED");
 if(resource==="dev-session")return fail(404,"NOT_FOUND");
 if(resource==="summary"&&request.method!=="GET")return fail(405,"METHOD_NOT_ALLOWED");
 if(!config||config.origin!==url.origin)return fail(503,"IDENTITY_BRIDGE_UNAVAILABLE");
 const unavailable=()=>fail(503,"IDENTITY_BRIDGE_UNAVAILABLE");
 try{
  const session=await readCustomerSession(request,config);
  if(!session)return fail(401,"SIGN_IN_REQUIRED");
  const requestId=crypto.randomUUID();
  const audit=async(phase:"attempt"|"prepared"|"outcome",action:string)=>{
   await config.recordAccess(session.id,action,requestId+":"+phase);
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
   const response=await handleServiceWorkbench(request,env,mode,resource,mapped.token);
   if(!response.ok)return recordFailure(response);
   // The upstream response is buffered. This audit row precedes the final
   // release check and records preparation, not delivery.
   await audit("prepared","CANONICAL_ACCESS_PREPARED");
   const current=await readCustomerSession(request,config,{touch:false});
   if(!current||current.id!==session.id||current.token_hash!==session.token_hash)
    return recordFailure(fail(401,"SIGN_IN_REQUIRED"));
   await mapped.assertCurrent();
   if(!(current.valid_until>Date.now()))return recordFailure(fail(401,"SIGN_IN_REQUIRED"));
   return response;
  }catch{return recordFailure(unavailable());}
 }catch{return unavailable();}
}
