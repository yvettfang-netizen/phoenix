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
      <span className="brand-asset-wrap brand-mark__asset-wrap">
        {/* Serve the Founder-approved B-version raster directly; no redraw, filter, crop, or font reflow. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="brand-asset brand-asset--mark brand-mark__asset"
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
