"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Locale } from "./v5-site";
import { directoryGroups, directoryText } from "@/lib/site-directory";
import { familyCenterEntryPath } from "@/lib/locale-navigation";
import styles from "./site-chrome-v3.module.css";
import { WEALTH_ORIGIN } from "@/lib/wealth-routing";

export function SiteDirectory({ locale, consultationPath = "/identity#consultation", localized = false, mainOrigin, publicFamilyDemo = false }: { locale: Locale; consultationPath?: string; localized?: boolean; mainOrigin?: string; publicFamilyDemo?: boolean }) {
  const labelFor = (label: readonly [string, string]) => {
    if (!localized || locale !== "zh") return directoryText(label, locale);
    return label[0].replace("凤启罗盘 Phoenix Compass", "凤启罗盘").replace("Education｜", "").replace("Identity｜", "").replace("Wealth｜", "").replace("Health｜", "").replace(" Phoenix Academy", "").replace(" Family OS", "");
  };
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
      <ul>{group.items.map(item => {
        const path = item.familyCenterEntry ? familyCenterEntryPath(publicFamilyDemo) : item.path;
        const DirectoryLink = item.familyCenterEntry && publicFamilyDemo ? "a" : Link;
        const status = item.familyCenterEntry && publicFamilyDemo
          ? (locale === "zh" ? "合成数据演示" : "Synthetic-data demo")
          : item.status && directoryText(item.status, locale);
        return <li key={item.label[1]}>
          {path !== undefined ? <DirectoryLink href={path === "/wealth" ? `${mainOrigin ? "" : WEALTH_ORIGIN}/${locale}` : path === "/identity#consultation" ? `/${locale}${consultationPath}` : `${mainOrigin ?? ""}/${locale}${path}`}>
            {labelFor(item.label)}{status && <small>{status}</small>}
          </DirectoryLink> : <span className={styles.pending}>{labelFor(item.label)}<small>{locale === "zh" ? "待开放" : "Not open"}</small></span>}
        </li>;
      })}</ul>
    </details>)}
  </div>;
}
