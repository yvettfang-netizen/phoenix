import Link from "next/link";
import Image from "next/image";

type BrandMarkProps = {
  inverse?: boolean;
  compact?: boolean;
  className?: string;
  href?: string;
  label?: string;
};

export function BrandMark({ inverse = false, compact = false, className = "", href = "/", label = "Phoenix Nova 首页" }: BrandMarkProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`brand-mark ${compact ? "brand-mark--compact" : ""} ${inverse ? "brand-mark--inverse" : ""} ${className}`}
    >
      <span className="brand-asset-wrap">
        <Image
          className="brand-asset brand-asset--mark"
          src="/brand/phoenix-nova-mark-official.png"
          width={145}
          height={145}
          priority
          unoptimized
          alt=""
        />
      </span>
      <span className="brand-lockup" aria-hidden="true">
        <span className="brand-cn">鳳啟</span>
        <span className="brand-en">PHOENIX NOVA™</span>
      </span>
    </Link>
  );
}
