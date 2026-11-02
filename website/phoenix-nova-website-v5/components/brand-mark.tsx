import Link from "next/link";
import styles from "./brand-mark.module.css";

type BrandMarkProps = {
  inverse?: boolean;
  compact?: boolean;
  className?: string;
  href?: string;
  label?: string;
  locale?: "zh" | "en";
};

export function BrandMark({ inverse = false, compact = false, className = "", href = "/", label = "Phoenix Nova 首页", locale }: BrandMarkProps) {
  const asset = { src: "/brand/official/v3/phoenix-nova-header@2x.png", width: 1040, height: 320 };
  const chinese = locale === "zh" && !inverse;
  return (
    <Link
      href={href}
      aria-label={label}
      className={`brand-mark ${chinese ? "brand-mark--zh" : ""} ${compact ? "brand-mark--compact" : ""} ${inverse ? "brand-mark--inverse" : ""} ${className}`}
    >
      <span className={`brand-asset-wrap ${chinese ? styles.chinese : ""}`}>
        {/* Serve approved raster bytes directly: the image shim emits density
            srcsets even for unoptimized images. No rescaling proxy for logos. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={`brand-asset brand-asset--mark ${chinese ? styles.symbol : ""}`}
          src={chinese ? "/brand/official/v3/phoenix-nova-symbol-transparent.png" : asset.src}
          width={chinese ? 632 : asset.width}
          height={chinese ? 784 : asset.height}
          loading={compact ? "eager" : "lazy"}
          fetchPriority={compact ? "high" : undefined}
          decoding="async"
          alt=""
        />
        {chinese && <span className={styles.wordmark} aria-hidden="true">凤启环球<small>PHOENIX NOVA™</small></span>}
      </span>
    </Link>
  );
}
