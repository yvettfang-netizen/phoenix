import Link from "next/link";

type BrandMarkProps = {
  inverse?: boolean;
  compact?: boolean;
  optimized?: boolean;
  className?: string;
  href?: string;
  label?: string;
};

const brandAssets = "/images/homepage-optimized/v1";
const brandSrcSet = [222, 444, 666].map((width) => `${brandAssets}/brand-bilingual-${width}.webp ${width}w`).join(", ");

export function BrandMark({ inverse = false, compact = false, optimized = false, className = "", href = "/", label = "Phoenix Nova 首页" }: BrandMarkProps) {
  const responsiveSizes = compact ? "(max-width: 700px) 180px, 220px" : "(max-width: 700px) 165px, 220px";
  return (
    <Link
      href={href}
      aria-label={label}
      data-testid="brand-mark"
      data-brand-variant="b"
      className={`brand-mark ${compact ? "brand-mark--compact" : ""} ${inverse ? "brand-mark--inverse" : ""} ${className}`}
    >
      <span className="brand-asset-wrap brand-mark__asset-wrap">
        {/* Keep the approved B-version PNG as a fallback for its lossless WebP variants. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="brand-asset brand-asset--mark brand-mark__asset"
          src="/brand/official/v3/phoenix-nova-bilingual-b@2x.png"
          srcSet={optimized ? brandSrcSet : undefined}
          sizes={optimized ? responsiveSizes : undefined}
          width={2172}
          height={724}
          loading={compact ? "eager" : "lazy"}
          fetchPriority={compact ? (optimized ? "low" : "high") : undefined}
          decoding="async"
          alt=""
        />
      </span>
    </Link>
  );
}
