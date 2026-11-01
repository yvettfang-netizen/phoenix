import Link from "next/link";
import { notFound } from "next/navigation";
import { HealthGeoShell } from "@/components/health-geo-shell";
import { healthGeoMetadata } from "@/lib/health-geo";
type Props = { params: Promise<{locale: string}> };
const slugs = {zh:"providers",en:"providers"};
const titles = {zh:"大湾区医疗机构与资源中心",en:"Greater Bay Area Medical Provider Resource Centre"};
const descriptions = {zh:"区分公开资料、资料已核验与正式合作，按实际范围了解机构信息。",en:"Distinguish public information, verified facts and formal partnerships when exploring providers."};
export async function generateMetadata({params}:Props) {const {locale}=await params;return locale==="zh"||locale==="en"?healthGeoMetadata(locale,slugs,titles,descriptions):{};}
export default async function Providers({params}:Props) {
  const {locale}=await params;if(locale!=="zh"&&locale!=="en")notFound();const zh=locale==="zh";
  return <HealthGeoShell locale={locale} slugs={slugs} title={titles[locale]} description={descriptions[locale]}>
    <section><h2>{zh?"资源状态先说清楚":"Understand the resource status first"}</h2><p>{zh?"公开收录不是签约、接诊或保险网络确认。机构资质、医生执业、语言服务、费用与预约条件必须逐项核实。当前没有已批准的正式推荐名单。":"Public listing does not confirm a partnership, admission or insurance network. Verify institutional credentials, practitioner registration, language services, fees and booking conditions individually. There is no approved recommendation directory here."}</p>
      <ul>{(zh?["公开信息：可追溯公开来源，但不能代替现行服务核实。","资料已核验：须按字段记录官方证据、日期及范围。","正式合作：还须有签署协议及可公开的范围。","尚未核实：不作为推荐、可预约或可理赔的证明。"]:["Public information: traceable public sources, not a substitute for current verification.","Verified information: official evidence, date and scope recorded per field.","Formal partnership: also requires a signed agreement and approved public scope.","Unverified: not proof of recommendation, bookability or insurance eligibility."]).map(text=><li key={text}>{text}</li>)}</ul>
    </section><section><h2>{zh?"首发资料核验专题":"Initial provider verification topic"}</h2><article><h3>{zh?"深圳禾正医院":"Shenzhen Hyzen Hospital"}</h3><p>{zh?"公开资料研究入口；现行资质、医生排班、英语服务、报价与凤启合作范围尚待核验。":"A public-information research entry. Current credentials, clinician availability, English services, pricing and any Phoenix partnership scope remain to be verified."}</p><Link href={`/${locale}/health/providers/hyzen-hospital`}>{zh?"查看资料核验页":"View the verification record"} ↗</Link></article></section>
  </HealthGeoShell>;
}
