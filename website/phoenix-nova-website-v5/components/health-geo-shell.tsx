import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "./v5-site";
import { healthJsonLd, healthBreadcrumb, HEALTH_PUBLISHER_ID, HEALTH_GEO_ORIGIN, type HealthGeoLocale, type LocalizedHealthText } from "@/lib/health-geo";
import styles from "./health-geo.module.css";
export function HealthGeoShell({ locale, slugs, title, description, schema, children }: { locale: HealthGeoLocale; slugs: LocalizedHealthText; title: string; description: string; schema?: object; children: ReactNode }) {
  const other = locale === "zh" ? "en" : "zh";
  const graph = { "@context": "https://schema.org", "@graph": [{ "@type": "Organization", "@id": HEALTH_PUBLISHER_ID, name: "Phoenix Nova™", url: HEALTH_GEO_ORIGIN }, healthBreadcrumb(locale, title, slugs[locale]), ...(schema ? [schema] : [])] };
  return <div className={styles.page} lang={locale === "zh" ? "zh-Hans" : "en"}>
    <SiteHeader locale={locale} page="health" appearance="v3" localized localeHref={`/${other}/health/${slugs[other]}`} partnersHref={`/${locale}/health#partners`} />
    <main className={styles.wrap}>
      <nav aria-label={locale === "zh" ? "面包屑" : "Breadcrumb"}><Link href={`/${locale}/health`}>{locale === "zh" ? "全球健康" : "Global Health"}</Link> / {title}</nav>
      <header><p className={styles.status}>{locale === "zh" ? "全球健康资料中心 · 候选预览" : "Global Health knowledge centre · Candidate preview"}</p><h1>{title}</h1><p>{description}</p></header>
      {children}
      <aside id="consultation" className={styles.cta}><h2>{locale === "zh" ? "从核实信息，走向清晰安排。" : "From verified information to clearer arrangements."}</h2><p>{locale === "zh" ? "可独立准备咨询，无需先完成健康罗盘。本地准备入口不提交预约，不接收病历或保险文件。" : "Prepare a conversation independently of Health Compass. The local preparation entry does not submit a booking or receive medical or insurance files."}</p><Link href={`/${locale}/health#consultation`}>{locale === "zh" ? "准备服务咨询" : "Prepare a service consultation"} ↗</Link></aside>
    </main><SiteFooter locale={locale} appearance="v3" consultationPath="/health#consultation" localized />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: healthJsonLd(graph) }} />
  </div>;
}
