import type { ReactNode } from "react";
import { SiteFooter, SiteHeader, type Locale } from "./v5-site";
import { safeJsonLd } from "@/lib/cbi-seo";
import styles from "./cbi-explorer.module.css";

export function CbiPageFrame({
  locale,
  children,
  structuredData,
}: {
  locale: Locale;
  children: ReactNode;
  structuredData?: Record<string, unknown>;
}) {
  return (
    <div className={styles.page} lang={locale === "zh" ? "zh-CN" : "en"} data-cbi-page>
      <SiteHeader locale={locale} page="identity" appearance="v3" />
      {children}
      <div className={styles.pageFooter}><SiteFooter locale={locale} appearance="v3" /></div>
      {structuredData ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} /> : null}
    </div>
  );
}
