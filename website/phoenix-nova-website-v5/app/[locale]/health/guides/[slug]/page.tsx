import Link from "next/link";
import { notFound } from "next/navigation";
import { HealthGeoShell } from "@/components/health-geo-shell";
import { HEALTH_GEO_GUIDES, getHealthGeoGuide, getHealthGeoHub } from "@/lib/health-geo-content";
import { HEALTH_GEO_ORIGIN, HEALTH_PUBLISHER_ID, healthGeoMetadata } from "@/lib/health-geo";
import styles from "@/components/health-geo.module.css";
type Props={params:Promise<{locale:string;slug:string}>};
function lookup(locale:"zh"|"en",slug:string){return HEALTH_GEO_GUIDES.find(g=>g.paths[locale]===`/${locale}/health/guides/${slug}`);}
export async function generateMetadata({params}:Props){const{locale,slug}=await params;if(locale!=="zh"&&locale!=="en")return{};const guide=lookup(locale,slug);if(!guide)return{};return healthGeoMetadata(locale,{zh:guide.paths.zh.replace('/zh/health/',''),en:guide.paths.en.replace('/en/health/','')},guide.title,guide.description);}
export default async function HealthGuide({params}:Props){const{locale,slug}=await params;if(locale!=="zh"&&locale!=="en")notFound();const guide=lookup(locale,slug);if(!guide)notFound();const zh=locale==="zh";const hub=getHealthGeoHub(guide.hubId);const slugs={zh:guide.paths.zh.replace('/zh/health/',''),en:guide.paths.en.replace('/en/health/','')};
return <HealthGeoShell locale={locale} slugs={slugs} title={guide.title[locale]} description={guide.description[locale]} schema={{"@type":"Article","@id":`${HEALTH_GEO_ORIGIN}/#${guide.entityId}`,headline:guide.title[locale],description:guide.description[locale],inLanguage:zh?"zh-Hans":"en",creativeWorkStatus:"Draft",dateModified:guide.verifiedAt,author:{"@id":HEALTH_PUBLISHER_ID},publisher:{"@id":HEALTH_PUBLISHER_ID},citation:guide.officialSources.map(s=>s.url),url:`${HEALTH_GEO_ORIGIN}${guide.paths[locale]}`}}>
 <section><h2>{zh?"明确答案":"The direct answer"}</h2><p className={styles.answer}>{guide.directAnswer[locale]}</p><p className={styles.status}>{zh?"资料核查日期":"Source review date"}：{guide.verifiedAt} · {zh?"非临床准备与导航内容；正式公开前仍需内容审核。":"Non-clinical preparation and navigation; editorial review is required before public release."}</p></section>
 {guide.sections.map(section=><section key={section.heading.en}><h2>{section.heading[locale]}</h2><p>{section.body[locale]}</p><ul>{section.points.map(point=><li key={point.en}>{point[locale]}</li>)}</ul></section>)}
 <section><h2>{zh?"适用条件与服务边界":"Applicability and boundaries"}</h2><p>{guide.applicability.suitableFor[locale]}</p><p>{guide.applicability.checkBeforeProceeding[locale]}</p><p>{guide.applicability.notCovered[locale]}</p></section>
 <section><h2>{zh?"官方来源与可支持范围":"Official sources and their scope"}</h2>{guide.officialSources.map(source=><article key={source.id}><h3><a href={source.url} rel="noopener noreferrer">{source.title[locale]} ↗</a></h3><p>{source.factScope[locale]}</p>{source.caution&&<p>{source.caution[locale]}</p>}<p className={styles.status}>{zh?"核查日期":"Reviewed"}：{source.verifiedAt}</p></article>)}</section>
 <section><h2>{zh?"相关专题":"Related topics"}</h2><ul>{hub&&<li><Link href={hub.paths[locale]}>{hub.names[locale]}</Link></li>}{guide.relatedGuideIds.map(id=>{const related=getHealthGeoGuide(id);return related?<li key={id}><Link href={related.paths[locale]}>{related.title[locale]}</Link></li>:null;})}</ul></section>
</HealthGeoShell>;}
