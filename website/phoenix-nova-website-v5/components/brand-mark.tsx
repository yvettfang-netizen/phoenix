import Link from "next/link";

type BrandMarkProps = {
  inverse?: boolean;
  compact?: boolean;
  className?: string;
  href?: string;
  label?: string;
};

export function BrandMark({ inverse = false, compact = false, className = "", href = "/", label = "Phoenix Nova 首页" }: BrandMarkProps) {
  const asset = compact
    ? { src: "/brand/official/v3/phoenix-nova-header@2x.png", width: 1040, height: 320 }
    : { src: "/brand/official/v3/phoenix-nova-primary-trimmed.png", width: 1059, height: 1116 };
  return (
    <Link
      href={href}
      aria-label={label}
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
