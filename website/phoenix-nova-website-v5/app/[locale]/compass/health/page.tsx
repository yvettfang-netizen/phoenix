import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { HealthCompass } from "@/components/health-compass";
import { healthPreviewEnabled } from "@/lib/health-compass-gate";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Health Compass · Candidate preview" : "健康罗盘 · 候选体验",
    robots: { index: false, follow: false, nocache: true },
  };
}
export default async function HealthPage({ params }: Props) {
  const { locale } = await params;
  if ((locale !== "zh" && locale !== "en") || !healthPreviewEnabled()) notFound();
  const zh = locale === "zh";
  return <div lang={zh ? "zh-Hans" : "en"}>
    <header className="site-header" style={{ position: "relative" }}>
      <div className="site-header__inner shell" style={{ display: "flex", flexWrap: "wrap", height: "auto", minHeight: 84, gap: 12, justifyContent: "space-between", paddingTop: 16, paddingBottom: 16 }}>
        <BrandMark compact href={`/${locale}`} label={zh ? "Phoenix Nova 首页" : "Phoenix Nova home"} />
        <nav className="header-actions" style={{ flexWrap: "wrap", minHeight: 44, gap: 16 }} aria-label={zh ? "健康罗盘导航" : "Health Compass navigation"}>
          <a href={`/${locale}/compass`}>{zh ? "返回凤启罗盘" : "Back to Compass"}</a>
          <a className="locale-switch" href={`/${zh ? "en" : "zh"}/compass/health`} title={zh ? "切换语言会清空本次回答" : "Switching language clears this session"}>{zh ? "EN" : "中文"}</a>
        </nav>
      </div>
    </header>
    <main><HealthCompass locale={locale} /></main>
    <footer className="site-footer" style={{ padding: "24px 0", color: "#f7f3e9" }}>
      <div className="shell site-footer__bottom" style={{ flexWrap: "wrap", gap: 16, fontSize: 12, color: "inherit" }}>
        <span>© 2026 Phoenix Nova™ · 凤启环球信息科技（深圳）有限公司</span>
        <span>{zh ? "V5 候选体验 · 尚未正式发布" : "V5 candidate preview · Not released"}</span>
        <a href={`/${locale}`}>{zh ? "返回首页" : "Back home"}</a>
      </div>
    </footer>
  </div>;
}

