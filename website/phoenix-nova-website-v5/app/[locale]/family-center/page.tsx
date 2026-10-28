import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { SiteHeader, V5Site } from "@/components/v5-site";
import { CustomerAccount } from "@/components/customer-account";
import { customerAuthEnabled, customerAuthConfig } from "@/db/customer-auth";
import { readCustomerSession } from "@/lib/customer-auth";

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
  return <><SiteHeader locale={locale} page="family-center"/><CustomerAccount locale={locale} familyView/></>;
}
export default async function FamilyCenterPage({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;if(locale!=="zh"&&locale!=="en")notFound();
  if(customerAuthEnabled())return <ProtectedCenter locale={locale}/>;
  return <><div className="account-preview-link"><Link href={`/${locale}/account`}>{locale==="zh"?"账户登录入口":"Account sign-in"}</Link>{locale==="zh"?" · 以下为虚构家庭的界面预览。":" · The following preview uses a fictional family."}</div><V5Site locale={locale} page="family-center"/></>;
}
