import {env} from "cloudflare:workers";
import {notFound} from "next/navigation";
import {ServiceWorkbench} from "@/components/service-workbench";
import {workbenchEnabled} from "@/lib/service-workbench-bff";
import {customerBridgeEnabled} from "@/lib/customer-canonical-bridge";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{locale:string}>}){const {locale}=await params;if((locale!=="zh"&&locale!=="en")||!workbenchEnabled(env as unknown as Record<string,unknown>,process.env.NODE_ENV))notFound();return <ServiceWorkbench locale={locale} synthetic={!customerBridgeEnabled(env as unknown as Record<string,unknown>,process.env.NODE_ENV)&&(env as unknown as Record<string,unknown>).SERVICE_WORKBENCH_SYNTHETIC_PREVIEW==="true"}/>;}
