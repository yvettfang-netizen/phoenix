import { BrandMark } from "./brand-mark";
import Link from "next/link";
import { SiteDirectory } from "./site-directory";
import type { Locale } from "./v5-site";
import styles from "./site-chrome-v3.module.css";

export function SiteEcosystemContent({ locale, consultationPath, localized = false, brandLocale }: { locale: Locale; consultationPath?: string; localized?: boolean; brandLocale?: Locale }) {
  const zh = locale === "zh";
  return <div className={styles.inner}>
    <div className={styles.top}>
      <div className={styles.brand}>
        <BrandMark href={`/${locale}`} label={zh ? (localized ? "凤启环球首页" : "Phoenix Nova 首页") : "Phoenix Nova home"} locale={brandLocale ?? (localized ? locale : undefined)} />
        <p>{zh && localized ? "每一次启程。" : "For Every Beginning."}</p>
        <span>{zh ? "每一次启程，都值得更好的未来。" : "Every beginning deserves a better future."}</span>
      </div>
      <div className={styles.mission}><small>{zh && localized ? "全球家庭成长平台" : "GLOBAL FAMILY GROWTH PLATFORM"}</small><p>{zh ? <>承东方之源，<br />启全球新程。</> : <>Rooted in the East.<br />Opening a global chapter.</>}</p></div>
      <div className={styles.digital}><strong>NOVA DIGITAL</strong><p>{zh ? "进入凤启世界" : "Enter the Phoenix world"}</p><small>{zh ? "公开入口待确认 · 暂未开放" : "Public entry unconfirmed · Not open"}</small></div>
    </div>
    <SiteDirectory locale={locale} consultationPath={consultationPath} localized={localized} />
    <div className={styles.company}><div><small>{zh ? "公司主体" : localized ? "OPERATING BRAND" : "LEGAL ENTITY"}</small><strong>{!zh && localized ? "Phoenix Nova™" : "凤启环球信息科技（深圳）有限公司"}</strong>{!zh && localized && <Link href="/en/about">Company information ↗</Link>}</div><p>{zh ? "公开信息仅用于方向理解，不构成录取、身份、医疗、法律或收益保证。" : "Public information supports understanding only and is not a guarantee of admission, immigration, medical, legal or financial outcomes."}</p></div>
    <div className={styles.bottom}><span>© 2026 Phoenix Nova™</span><span>{zh ? "品牌版权保留 · 候选预览，尚未正式发布" : "All brand rights reserved · Candidate preview, not released"}</span></div>
  </div>;
}
