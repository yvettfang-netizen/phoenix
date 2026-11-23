import {familyP1Auth, familyP1Enabled} from "@/lib/family-p1-session";
import {env} from "cloudflare:workers";
import {handleServiceWorkbench} from "@/lib/service-workbench-bff";
import {customerBridgeEnabled,handleCustomerServices,type CustomerCanonicalProvider} from "@/lib/customer-canonical-bridge";
import {customerAuthConfig} from "@/db/customer-auth";
export const dynamic="force-dynamic";
async function handle(request:Request,context:{params:Promise<{path:string[]}>}){const {path}=await context.params;
 const values=env as unknown as Record<string,unknown>;
 if(familyP1Enabled(values,process.env.NODE_ENV)){
  const resource = path.join('/');
  const allowed = request.method === 'GET'
    ? /^(projects|catalogue|projects\/[a-f0-9-]{36})$/.test(resource)
    : request.method === 'POST' && /^projects\/[a-f0-9-]{36}\/commands$/.test(resource);
  if (!allowed) {
    return Response.json({error: {code: 'NOT_FOUND'}}, {status: 404, headers: {'Cache-Control': 'private, no-store'}});
  }
  return handleCustomerServices(request, values, process.env.NODE_ENV, resource, familyP1Auth(values),
    values.CUSTOMER_CANONICAL_PROVIDER as CustomerCanonicalProvider | undefined);
 }
 if(customerBridgeEnabled(values,process.env.NODE_ENV))return handleCustomerServices(request,values,process.env.NODE_ENV,path.join("/"),customerAuthConfig(),values.CUSTOMER_CANONICAL_PROVIDER as CustomerCanonicalProvider|undefined);
 return handleServiceWorkbench(request,values,process.env.NODE_ENV,path.join("/"));}
export {handle as GET,handle as POST,handle as PUT,handle as PATCH,handle as DELETE,handle as HEAD,handle as OPTIONS};
