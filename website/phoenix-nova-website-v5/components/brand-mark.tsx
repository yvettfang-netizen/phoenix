import Link from "next/link";

type BrandMarkProps = {
  inverse?: boolean;
  compact?: boolean;
  className?: string;
  href?: string;
  label?: string;
  locale?: "zh" | "en";
};

export function BrandMark({ inverse = false, compact = false, className = "", href = "/", label = "Phoenix Nova 首页", locale: _locale }: BrandMarkProps) {
  const asset = { src: "/brand/official/v3/phoenix-nova-bilingual-b@2x.png", width: 2172, height: 724 };
  return (
    <Link
      href={href}
      aria-label={label}
      data-testid="brand-mark"
      className={`brand-mark ${compact ? "brand-mark--compact" : ""} ${inverse ? "brand-mark--inverse" : ""} ${className}`}
    >
      <span className="brand-asset-wrap">
        {/* Serve approved raster bytes directly: the image shim emits density
            srcsets even for unoptimized images. No rescaling proxy for logos. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="brand-asset brand-asset--mark"
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
