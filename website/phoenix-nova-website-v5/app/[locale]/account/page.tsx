import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/v5-site";
import { CustomerAccount } from "@/components/customer-account";

export const metadata = {title:"账户登录｜Account",robots:{index:false,follow:false}};
export const dynamic = "force-dynamic";
export default async function AccountPage({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;
  if(locale!=="zh"&&locale!=="en")notFound();
  return <><SiteHeader locale={locale} page="family-center"/><CustomerAccount locale={locale}/></>;
}
