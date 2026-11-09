import {env} from "cloudflare:workers";
import {handleCustomerServices,type CustomerCanonicalProvider} from "@/lib/customer-canonical-bridge";
import {customerAuthConfig} from "@/db/customer-auth";
export const dynamic="force-dynamic";
async function handle(request:Request){
 const values=env as unknown as Record<string,unknown>;
 return handleCustomerServices(request,values,process.env.NODE_ENV,"summary",customerAuthConfig(),values.CUSTOMER_CANONICAL_PROVIDER as CustomerCanonicalProvider|undefined);
}
export {handle as GET,handle as POST,handle as PUT,handle as DELETE,handle as OPTIONS};
