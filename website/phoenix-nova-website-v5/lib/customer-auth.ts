/** Canonical identity adapter. No local D1/SQLite users, passwords, sessions or
 * rate-limit database is created by the Phoenix website. The trusted identity
 * provider is responsible for verification, revocation, audit and login UX. */
export interface CanonicalCustomerSession {
  id:string;
  username:string;
  created_at:number;
  token_hash:string;
  valid_until:number;
}
export interface AuthConfig {
  origin:string;
  verifySession(request:Request,options?:{touch?:boolean}):Promise<CanonicalCustomerSession|null>;
  recordAccess(actorId:string,action:string,requestId:string):Promise<void>;
}
export function validAuthOrigin(value:string) {
  try{
    const u=new URL(value);
    return u.origin===value&&!u.username&&!u.password&&
      (u.protocol==="https:"||(u.protocol==="http:"&&["127.0.0.1","localhost","[::1]"].includes(u.hostname)));
  }catch{return false;}
}
export async function readCustomerSession(request:Request,config:AuthConfig,{touch=true}:{touch?:boolean}={}):Promise<CanonicalCustomerSession|null>{
  if(!validAuthOrigin(config.origin)||new URL(request.url).origin!==config.origin||
    ["x-customer-id","x-family-id","x-principal-id","x-role"].some(h=>request.headers.has(h)))return null;
  const session=await config.verifySession(request,{touch});
  if(!session||typeof session.id!=="string"||session.id.length<1||
    typeof session.username!=="string"||typeof session.token_hash!=="string"||
    !Number.isFinite(session.valid_until)||session.valid_until<=Date.now()||
    !Number.isFinite(session.created_at))return null;
  return session;
}
export function authUnavailable(){
  return Response.json({error:"CANONICAL_AUTH_NOT_CONFIGURED"},{status:503,headers:{"Cache-Control":"no-store"}});
}
export async function handleCustomerAuth(request:Request,config:AuthConfig):Promise<Response>{
  if(!validAuthOrigin(config.origin))return authUnavailable();
  const action=new URL(request.url).pathname.split("/").at(-1);
  if(request.method==="GET"&&action==="session"){
    try{
      const session=await readCustomerSession(request,config);
      return Response.json({user:session?{id:session.id,username:session.username,createdAt:session.created_at}:null,registration:false},
        {headers:{"Cache-Control":"no-store"}});
    }catch{return authUnavailable();}
  }
  // Registration, passwords, recovery and session creation must belong to the
  // approved Canonical identity provider, not a new website-specific user table.
  return authUnavailable();
}
