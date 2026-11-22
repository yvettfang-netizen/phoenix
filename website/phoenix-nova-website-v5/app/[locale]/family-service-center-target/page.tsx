import {notFound} from "next/navigation";
import {env} from "cloudflare:workers";
import {FamilyServiceCenterTarget} from "@/components/family-service-center-target";
import {serviceCenterPreviewEnabled} from "@/lib/family-service-center-target";

export const dynamic="force-dynamic";
export const metadata={
  title:"Phoenix Family OS · Family Service Center Target Preview",
  robots:{index:false,follow:false,nocache:true}
};
export default async function Page({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  if((locale!=="zh"&&locale!=="en")||
    !serviceCenterPreviewEnabled(env as unknown as Record<string,unknown>,process.env.NODE_ENV)){
    notFound();
  }
  return <FamilyServiceCenterTarget locale={locale}/>;
}
