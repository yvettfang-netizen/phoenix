type PatternVariant = "master" | "education" | "identity" | "wealth" | "health";

/**
 * Reused from the approved V4 component system. V5 changes the surrounding
 * composition, while preserving the established compass geometry.
 */
export function PatternMedallion({
  variant,
  size = "card",
  className = "",
}: {
  variant: PatternVariant;
  size?: "hero" | "card" | "node";
  className?: string;
}) {
  const ticks = Array.from({ length: 36 }, (_, index) => {
    const major = index % 9 === 0;
    return (
      <line
        className={major ? "is-major" : ""}
        key={index}
        x1="160"
        x2="160"
        y1="15"
        y2={major ? "29" : "23"}
        transform={`rotate(${index * 10} 160 160)`}
      />
    );
  });

  return (
    <div className={`pattern-medallion pattern-medallion--${size} pattern-medallion--${variant} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 320 320" role="presentation">
        <circle className="pattern-medallion__field" cx="160" cy="160" r="154" />
        <g className="pattern-medallion__ticks">{ticks}</g>
        <circle className="pattern-medallion__ring pattern-medallion__ring--outer" cx="160" cy="160" r="137" />
        <circle className="pattern-medallion__ring" cx="160" cy="160" r="115" />
        <circle className="pattern-medallion__ring pattern-medallion__ring--fine" cx="160" cy="160" r="88" />

        {variant === "master" ? (
          <g className="pattern-medallion__pattern pattern-medallion__pattern--master">
            <path d="M160 55A105 105 0 0 1 265 160" />
            <path d="M265 160A105 105 0 0 1 160 265" />
            <path d="M160 265A105 105 0 0 1 55 160" />
            <path d="M55 160A105 105 0 0 1 160 55" />
            <path d="M160 72V116M248 160H204M160 248V204M72 160H116" />
            <circle cx="160" cy="160" r="44" />
            <path d="M160 121L172 148L199 160L172 172L160 199L148 172L121 160L148 148Z" />
          </g>
        ) : null}

        {variant === "education" ? (
          <g className="pattern-medallion__pattern">
            <path d="M76 126c22-24 44-24 66 0s44 24 66 0 36-19 50-7" />
            <path d="M70 154c24-24 48-24 72 0s48 24 72 0 31-18 42-10" />
            <path d="M82 184c20-19 40-19 60 0s40 19 60 0 32-17 46-8" />
            <path d="M118 196v-55c16-8 30-7 42 3v55c-12-10-26-11-42-3Zm84 0v-55c-16-8-30-7-42 3v55c12-10 26-11 42-3Z" />
            <path d="M160 142c-2-15 7-25 22-29-1 15-9 24-22 29Zm0 0c0-13-7-21-20-26 0 13 7 22 20 26Z" />
          </g>
        ) : null}

        {variant === "identity" ? (
          <g className="pattern-medallion__pattern">
            <path d="M79 206c25-3 35-23 44-44 10-24 19-44 47-44 30 0 35 28 64 30" />
            <path d="M88 224c34-1 49-24 60-46 10-20 19-36 43-36 22 0 32 12 46 18" />
            <path d="M124 202v-78h72v78M145 202v-54h30v54" />
            <circle cx="160" cy="176" r="4" />
            <path d="M83 106h36M101 88v36M216 91l21 21M237 91l-21 21" />
          </g>
        ) : null}

        {variant === "wealth" ? (
          <g className="pattern-medallion__pattern">
            <circle cx="160" cy="160" r="69" />
            <circle cx="160" cy="160" r="48" />
            <circle cx="160" cy="160" r="26" />
            <path d="M160 91v22M229 160h-22M160 229v-22M91 160h22" />
            <path d="M112 112l16 16M208 112l-16 16M208 208l-16-16M112 208l16-16" />
            <path d="M160 134l26 15v30l-26 15-26-15v-30Z" />
          </g>
        ) : null}

        {variant === "health" ? (
          <g className="pattern-medallion__pattern">
            <path d="M73 118c22 18 44 18 66 0s44-18 66 0 35 16 49 7" />
            <path d="M68 202c24-19 48-19 72 0s48 19 72 0 31-16 42-9" />
            <path d="M160 118c17 13 24 27 21 42-3 15-10 29-21 42-11-13-18-27-21-42-3-15 4-29 21-42Z" />
            <path d="M118 160c13-17 27-24 42-21 15 3 29 10 42 21-13 11-27 18-42 21-15 3-29-4-42-21Z" />
            <circle cx="160" cy="160" r="12" />
          </g>
        ) : null}

        <g className="pattern-medallion__needle">
          <path d="M160 53l8 93-8 14-8-14Z" />
          <path d="M160 267l-6-94 6-13 6 13Z" />
          <circle cx="160" cy="160" r="12" />
          <circle cx="160" cy="160" r="4" />
        </g>
      </svg>
    </div>
  );
}
