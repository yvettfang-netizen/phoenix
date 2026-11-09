import {env} from "cloudflare:workers";
import {handleServiceWorkbench} from "@/lib/service-workbench-bff";
import {customerBridgeEnabled,handleCustomerServices} from "@/lib/customer-canonical-bridge";
import {handleStagingStaff,hasStagingStaffSession,workbenchCustomerProvider} from "@/lib/workbench-staging-identity";
import {customerAuthConfig} from "@/db/customer-auth";
export const dynamic="force-dynamic";
async function handle(request:Request,context:{params:Promise<{path:string[]}>}){const {path}=await context.params;
 const values=env as unknown as Record<string,unknown>;
 if(hasStagingStaffSession(request,values))return handleStagingStaff(request,values,path.join("/"));
 if(customerBridgeEnabled(values,process.env.NODE_ENV))return handleCustomerServices(request,values,process.env.NODE_ENV,path.join("/"),customerAuthConfig(),workbenchCustomerProvider(values));
 return handleServiceWorkbench(request,values,process.env.NODE_ENV,path.join("/"));}
export {handle as GET,handle as POST,handle as PUT,handle as PATCH,handle as DELETE,handle as HEAD,handle as OPTIONS};
