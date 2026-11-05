import {readCustomerSession,type AuthConfig} from "./customer-auth";
import {handleServiceWorkbench,type WorkbenchEnv,workbenchEnabled} from "./service-workbench-bff";
import {summarySearch} from "./family-service-summary";

/** Server-owned adapter only. Never deserialize this capability from request data.
 * Mapping authority must recheck account, principal, family, subject and grants.
 * The opaque token is server-to-server only and never returned to the browser. */
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
  ["authorization","x-customer-id","x-family-id","x-project-id","x-principal-id","x-role","x-channel","x-source-system"].some(h=>request.headers.has(h))||
  request.headers.get("sec-fetch-site")==="cross-site"||request.headers.has("origin")&&request.headers.get("origin")!==url.origin)
  return fail(403,"ACCESS_DENIED");
 if(resource==="dev-session")return fail(404,"NOT_FOUND");
 if(resource==="summary"&&request.method!=="GET")return fail(405,"METHOD_NOT_ALLOWED");
 if(!config||config.origin!==url.origin)return fail(503,"IDENTITY_BRIDGE_UNAVAILABLE");
 try{
  const session=await readCustomerSession(request,config);
  if(!session)return fail(401,"SIGN_IN_REQUIRED");
  const audit=async(action:string)=>{await config.db.prepare("INSERT INTO core_auth_audit (id,actor_user_id,action,created_at) VALUES (?,?,?,?)").bind(crypto.randomUUID(),session.id,action,Date.now()).run();};
  await audit("CANONICAL_ACCESS_ATTEMPT");
  if(!provider||typeof provider.resolve!=="function"){await audit("CANONICAL_MAPPING_UNAVAILABLE");return fail(503,"IDENTITY_MAPPING_NOT_CONFIGURED");}
  const mapped=await provider.resolve({customerId:session.id,sessionHash:session.token_hash});
  if(!mapped||!/^[A-Za-z0-9_-]{32,256}$/.test(mapped.token)||typeof mapped.assertCurrent!=="function"){await audit("CANONICAL_MAPPING_DENIED");return fail(403,"IDENTITY_MAPPING_REQUIRED");}
  await mapped.assertCurrent();
  const response=await handleServiceWorkbench(request,env,mode,resource,mapped.token);
  // Never release a response after logout, session expiry or mapping revocation.
  const current=await readCustomerSession(request,config);
  if(!current||current.id!==session.id||current.token_hash!==session.token_hash)return fail(401,"SIGN_IN_REQUIRED");
  await mapped.assertCurrent();
  await audit(response.ok?"CANONICAL_ACCESS_GRANTED":"CANONICAL_ACCESS_DENIED");
  return response;
 }catch{return fail(503,"IDENTITY_BRIDGE_UNAVAILABLE");}
}
