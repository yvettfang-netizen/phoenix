type Variant = "primary" | "secondary" | "ghost";

type Props = {
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  href?: string;
  variant?: Variant;
  className?: string;
  disabled?: boolean;
};

const variantClass: Record<Variant, string> = {
  primary: "button button-primary",
  secondary: "button button-secondary",
  ghost: "button button-ghost",
};

export default function AskwiseButton({
  children,
  type = "button",
  href,
  variant = "primary",
  className = "",
  disabled,
}: Props) {
  const classNames = `${variantClass[variant]} ${className}`.trim();

  if (href) {
    return (
      <a className={classNames} href={href}>
        {children}
      </a>
    );
  }

  return (
    <button className={classNames} type={type} disabled={disabled}>
      {children}
    </button>
  );
}
