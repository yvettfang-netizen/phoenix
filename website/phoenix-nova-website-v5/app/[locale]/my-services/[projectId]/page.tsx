import {env} from "cloudflare:workers";
import {notFound} from "next/navigation";
import {ServiceWorkbench} from "@/components/service-workbench";
import {workbenchEnabled} from "@/lib/service-workbench-bff";
import {customerBridgeEnabled} from "@/lib/customer-canonical-bridge";
import {privateWorkbenchOrigin} from "@/lib/workbench-private-staging";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{locale:string;projectId:string}>}){
 const {locale,projectId}=await params;
 const values=env as unknown as Record<string,unknown>;
 if((locale!=="zh"&&locale!=="en")||!/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(projectId)||!workbenchEnabled(values,process.env.NODE_ENV))notFound();
 return <ServiceWorkbench key={projectId} locale={locale} projectId={projectId}
   synthetic={!customerBridgeEnabled(values,process.env.NODE_ENV)&&values.SERVICE_WORKBENCH_SYNTHETIC_PREVIEW==="true"}
   fileTransferAvailable={!privateWorkbenchOrigin(values)}/>;
}
