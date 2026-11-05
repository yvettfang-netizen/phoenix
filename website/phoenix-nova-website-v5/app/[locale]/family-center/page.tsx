import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { SiteHeader, V5Site } from "@/components/v5-site";
import { CustomerAccount } from "@/components/customer-account";
import { customerAuthEnabled, customerAuthConfig } from "@/db/customer-auth";
import { readCustomerSession } from "@/lib/customer-auth";
import { env } from "cloudflare:workers";
import { FamilyCenterV2 } from "@/components/family-center-v2";
import { centerV2Enabled, centerDemoEnabled } from "@/lib/family-center-v2";
import { sessionFamilyPreviewEnabled } from "@/lib/canonical-family-projection";

function NewCenter({locale,account=false}:{locale:"zh"|"en";account?:boolean}) {
  const values=env as unknown as Record<string,unknown>;
  return <FamilyCenterV2 locale={locale} account={account}
    demo={centerDemoEnabled(values,process.env.NODE_ENV,account)}
    canonical={!account && sessionFamilyPreviewEnabled(values,process.env.NODE_ENV)}
    personalized={values.FAMILY_CENTER_PERSONALIZATION_ENABLED==="true"}
    harmony={values.FAMILY_CENTER_HARMONY_ENABLED==="true"}/>;
}

export const metadata={title:"家庭中心｜Family Center",robots:{index:false,follow:false,nocache:true}};
export const dynamic="force-dynamic";
async function ProtectedCenter({locale}:{locale:"zh"|"en"}) {
  const config=customerAuthConfig();
  if(!config)return <><SiteHeader locale={locale} page="family-center"/><CustomerAccount locale={locale}/></>;
  let user;
  try {user=await readCustomerSession(new Request(`${config.origin}/api/customer-auth/session`,{headers:await headers()}),config);}
  catch {return <><SiteHeader locale={locale} page="family-center"/><CustomerAccount locale={locale}/></>;}
  if(!user)redirect(`/${locale}/account`);
  // A verified account does not own the synthetic family shown in the UI preview.
  if(centerV2Enabled(env as unknown as Record<string,unknown>))return <><NewCenter locale={locale} account/><CustomerAccount locale={locale} familyView/></>;
  return <><SiteHeader locale={locale} page="family-center"/><CustomerAccount locale={locale} familyView/></>;
}
export default async function FamilyCenterPage({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;if(locale!=="zh"&&locale!=="en")notFound();
  if((env as unknown as Record<string,unknown>).FAMILY_CENTER_MAINTENANCE_ENABLED==="true")return <main data-family-maintenance style={{maxWidth:700,margin:'10vh auto',padding:24}}><h1>{locale==="zh"?"家庭中心暂时维护":"Family Center temporarily unavailable"}</h1><p>{locale==="zh"?"你的资料不会在此页面显示。请稍后重试或联系顾问。":"No personal records are displayed here. Please retry later or contact an adviser."}</p><nav aria-label={locale==="zh"?"维护期间导航":"Maintenance navigation"}><Link href={`/${locale}`}>{locale==="zh"?"返回首页":"Home"}</Link>{" · "}<Link href={`/${locale}/account`}>{locale==="zh"?"账户与安全":"Account & security"}</Link>{" · "}<Link href={`/${locale}/education#consultation`}>{locale==="zh"?"联系顾问":"Contact an adviser"}</Link></nav></main>;
  if(customerAuthEnabled())return <ProtectedCenter locale={locale}/>;
  if(centerV2Enabled(env as unknown as Record<string,unknown>))return <NewCenter locale={locale}/>;
  return <><div className="account-preview-link"><Link href={`/${locale}/account`}>{locale==="zh"?"账户登录入口":"Account sign-in"}</Link>{locale==="zh"?" · 以下为虚构家庭的界面预览。":" · The following preview uses a fictional family."}</div><V5Site locale={locale} page="family-center"/></>;
}
