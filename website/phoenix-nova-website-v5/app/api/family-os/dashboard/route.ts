import {env} from 'cloudflare:workers';
import {handleServiceWorkbench} from '@/lib/service-workbench-bff';
export const dynamic='force-dynamic';
export function GET(request:Request){return handleServiceWorkbench(request,env as unknown as Record<string,unknown>,process.env.NODE_ENV,'dashboard');}
