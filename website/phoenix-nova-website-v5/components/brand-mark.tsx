import Link from "next/link";

type BrandMarkProps = {
  inverse?: boolean;
  compact?: boolean;
  className?: string;
  href?: string;
  label?: string;
};

export function BrandMark({ inverse = false, compact = false, className = "", href = "/", label = "Phoenix Nova 首页" }: BrandMarkProps) {
  const asset = { src: "/brand/official/v3/phoenix-nova-bilingual-b@2x.png", width: 2172, height: 724 };
  return (
    <Link
      href={href}
      aria-label={label}
      data-testid="brand-mark"
      data-brand-variant="b"
      className={`brand-mark ${compact ? "brand-mark--compact" : ""} ${inverse ? "brand-mark--inverse" : ""} ${className}`}
    >
      <span className="brand-mark__asset-wrap">
        {/* Founder 提供的 B 版 PNG 作为单一视觉资产；不重绘、不滤镜、不裁切。 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="brand-mark__asset"
          src={asset.src}
          width={asset.width}
          height={asset.height}
          loading={compact ? "eager" : "lazy"}
          fetchPriority={compact ? "high" : undefined}
          decoding="async"
          alt=""
        />
      </span>
    </Link>
  );
}

