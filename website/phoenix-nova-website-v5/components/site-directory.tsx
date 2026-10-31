"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Locale } from "./v5-site";
import { directoryGroups, directoryText } from "@/lib/site-directory";
import styles from "./site-chrome-v3.module.css";

export function SiteDirectory({ locale, consultationPath = "/identity#consultation" }: { locale: Locale; consultationPath?: string }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 700px)");
    const apply = () => root.current?.querySelectorAll("details").forEach((group, index) => { group.open = !mobile.matches || index === 0; });
    apply();
    mobile.addEventListener("change", apply);
    return () => mobile.removeEventListener("change", apply);
  }, []);
  return <div ref={root} className={styles.directory} role="navigation" aria-label={locale === "zh" ? "页脚产品导航" : "Footer product directory"}>
    {directoryGroups.map(group => <details className={styles.group} key={group.title[1]} open>
      <summary>{directoryText(group.title, locale)}<span aria-hidden="true">+</span></summary>
      <ul>{group.items.map(item => <li key={item.label[1]}>
        {item.path !== undefined ? <Link href={`/${locale}${item.path === "/identity#consultation" ? consultationPath : item.path}`}>
          {directoryText(item.label, locale)}{item.status && <small>{directoryText(item.status, locale)}</small>}
        </Link> : <span className={styles.pending}>{directoryText(item.label, locale)}<small>{locale === "zh" ? "待开放" : "Not open"}</small></span>}
      </li>)}</ul>
    </details>)}
  </div>;
}
