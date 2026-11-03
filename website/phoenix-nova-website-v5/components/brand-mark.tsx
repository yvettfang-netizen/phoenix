import Link from "next/link";

type BrandMarkProps = {
  inverse?: boolean;
  compact?: boolean;
  className?: string;
  href?: string;
  label?: string;
};

export function BrandMark({ inverse = false, compact = false, className = "", href = "/", label = "Phoenix Nova 首页" }: BrandMarkProps) {
  const asset = { src: "/brand/official/v3/phoenix-nova-symbol-transparent.png", width: 632, height: 784 };
  return (
    <Link
      href={href}
      aria-label={label}
      data-testid="brand-mark"
      data-brand-variant="b"
      className={`brand-mark ${compact ? "brand-mark--compact" : ""} ${inverse ? "brand-mark--inverse" : ""} ${className}`}
    >
      <span className="brand-mark__symbol-wrap">
        {/* B版只复用 Founder 已批准的官方原色图腾 PNG；中文与英文为网页字体排版。 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="brand-mark__symbol"
          src={asset.src}
          width={asset.width}
          height={asset.height}
          loading={compact ? "eager" : "lazy"}
          fetchPriority={compact ? "high" : undefined}
          decoding="async"
          alt=""
        />
      </span>
      <span className="brand-mark__divider" aria-hidden="true" />
      <span className="brand-mark__wordmark" aria-hidden="true">
        <span className="brand-cn">鳳啟環球</span>
        <span className="brand-en">Phoenix Nova™</span>
      </span>
    </Link>
  );
}

