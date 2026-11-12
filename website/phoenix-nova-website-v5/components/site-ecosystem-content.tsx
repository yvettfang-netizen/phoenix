import { BrandMark } from "./brand-mark";
import { SiteDirectory } from "./site-directory";
import type { Locale } from "./v5-site";
import styles from "./site-chrome-v3.module.css";
import Link from "next/link";
import { localizedHref } from "@/lib/locale-navigation";
import { healthPreviewEnabled } from "@/lib/health-compass-gate";

export function SiteEcosystemContent({ locale, consultationPath, localized = false, brandLocale, compact = false, mainOrigin }: { locale: Locale; consultationPath?: string; localized?: boolean; brandLocale?: Locale; compact?: boolean; mainOrigin?: string }) {
  const zh = locale === "zh";
  if (compact) return <div className={styles.compactFooter} data-compact-footer>
    <div className={styles.compactLinks}><BrandMark href={`${mainOrigin ?? ""}${localizedHref(locale, "")}`} label={zh ? "凤启环球首页" : "Phoenix Nova home"} /><nav aria-label={zh ? "页脚导航" : "Footer navigation"}>
      {[["专业服务", "Services", "/compass"], ["教育生态", "Learning", "/education#academy"], ["家庭中心", "Family Center", "/account"], ["凤启洞察", "Insights", "/insights"], ["关于凤启", "About", "/about"]].map(([cn,en,path]) => <Link key={path} href={`${mainOrigin ?? ""}${localizedHref(locale,path)}`}>{zh ? cn : en}</Link>)}
      <a href="https://fengqi-research-institute.yvettfang.chatgpt.site">{zh ? "数字凤启 · 进入仙兽图" : "Digital Phoenix"}</a>
      {healthPreviewEnabled() && <Link href={localizedHref(locale,"/compass/health")} data-testid="health-entry">{zh ? "健康评估预览" : "Health assessment preview"}</Link>}
    </nav></div>
    <div className={styles.compactPromise}>
      <div>
        <strong>{zh ? "每一次启程，都值得更好的未来。" : "Every Beginning Deserves a Better Future."}</strong>
        <span>{zh ? "连接世界资源，陪伴家庭成长。" : "Connecting Global Resources. Growing with Families."}</span>
      </div>
      <Link href={`${mainOrigin ?? ""}${localizedHref(locale, "/about")}`}>{zh ? "了解我们的故事 →" : "Our Story →"}</Link>
    </div>
    <div className={styles.compactCopyright}><span>© 2026 Phoenix Nova™</span><details><summary>{zh ? "公司与服务声明" : "Company & service notice"}</summary><p>{zh ? "凤启环球信息科技（深圳）有限公司。公开信息不构成录取、身份、医疗、法律或收益保证。" : "Phoenix Nova™. Public information does not guarantee admission, immigration, medical, legal or financial outcomes."}</p></details><Link href={`${mainOrigin ?? ""}${localizedHref(locale === "zh" ? "en" : "zh", "")}`}>{zh ? "EN" : "中文"}</Link></div>
  </div>;
  return <div className={styles.inner}>
    <div className={styles.top}>
      <div className={styles.brand}>
        <BrandMark href={`${mainOrigin ?? ""}/${locale}`} label={zh ? (localized || brandLocale === "zh" ? "凤启环球首页" : "Phoenix Nova 首页") : "Phoenix Nova home"} />
        <p>{zh && localized ? "每一次启程。" : "For Every Beginning."}</p>
        <span>{zh ? "每一次启程，都值得更好的未来。" : "Every beginning deserves a better future."}</span>
      </div>
      <div className={styles.mission}><small>{zh && localized ? "全球家庭成长平台" : "GLOBAL FAMILY GROWTH PLATFORM"}</small><p>{zh ? <>承东方之源，<br />启全球新程。</> : <>Rooted in the East.<br />Opening a global chapter.</>}</p></div>
      <div className={styles.digital}><strong>{localized ? "NOVA DIGITAL" : zh ? "数字凤启" : "NOVA DIGITAL"}</strong><p>{zh ? "进入凤启世界" : "Enter the Phoenix world"}</p>{localized ? <small>{zh ? "公开入口待确认 · 暂未开放" : "Public entry unconfirmed · Not open"}</small> : <a href="https://fengqi-research-institute.yvettfang.chatgpt.site">{zh ? "进入仙兽图 →" : "Explore the guardian world →"}</a>}</div>
    </div>
    <SiteDirectory locale={locale} consultationPath={consultationPath} localized={localized} mainOrigin={mainOrigin} />
    <div className={styles.company}><div><small>{zh ? "公司主体" : localized ? "OPERATING BRAND" : "LEGAL ENTITY"}</small><strong>{!zh && localized ? "Phoenix Nova™" : "凤启环球信息科技（深圳）有限公司"}</strong>{!zh && localized && <Link href={`${mainOrigin ?? ""}/en/about`}>Company information ↗</Link>}</div><p>{zh ? "公开信息仅用于方向理解，不构成录取、身份、医疗、法律或收益保证。" : "Public information supports understanding only and is not a guarantee of admission, immigration, medical, legal or financial outcomes."}</p></div>
    <div className={styles.bottom}><span>© 2026 Phoenix Nova™</span><span>{zh ? "品牌版权保留 · 候选预览，尚未正式发布" : "All brand rights reserved · Candidate preview, not released"}</span></div>
  </div>;
}
