import {env} from "cloudflare:workers";
import {handleServiceWorkbench} from "@/lib/service-workbench-bff";
export const dynamic="force-dynamic";
async function handle(request:Request,context:{params:Promise<{path:string[]}>}){const {path}=await context.params;return handleServiceWorkbench(request,env as unknown as Record<string,unknown>,process.env.NODE_ENV,path.join("/"));}
export {handle as GET,handle as POST,handle as PUT,handle as PATCH,handle as DELETE,handle as HEAD,handle as OPTIONS};
