import Link from "next/link";
import { healthPreviewEnabled } from "@/lib/health-compass-gate";
import type { HealthLocale } from "@/lib/health-compass";

/** Additive candidate entry; does not restructure the independently changing V5 homepage. */
export function HealthCompassEntry({ locale }: { locale: HealthLocale }) {
  if (!healthPreviewEnabled()) return null;
  return <aside aria-label={locale === "zh" ? "健康罗盘候选入口" : "Health Compass preview entry"} style={{ background: "#e8efe7", color: "#193e36", padding: "12px 20px", fontSize: 14 }}>
    <div className="shell" style={{ display: "flex", flexWrap: "wrap", gap: "8px 24px", alignItems: "center", justifyContent: "space-between" }}>
      <span>{locale === "zh" ? "健康罗盘 · 整理家人的健康事务，不做医疗判断" : "Health Compass · Organise family health tasks, not medical judgements"}</span>
      <Link href={`/${locale}/compass/health`} prefetch={false} data-testid="health-entry" style={{ textDecoration: "underline", minHeight: 44, display: "inline-flex", alignItems: "center" }}>
        {locale === "zh" ? "进入候选体验 →" : "Open candidate preview →"}
      </Link>
    </div>
  </aside>;
}

