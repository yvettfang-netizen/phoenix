import type { ReactNode } from "react";

type Props = {
  title?: string;
  description?: string;
  className?: string;
  children: ReactNode;
};

export default function CardShell({ title, description, className = "", children }: Props) {
  return (
    <section className={`askwise-card ${className}`}>
      {title ? (
        <div className="askwise-card-header">
          <h2>{title}</h2>
          {description ? <p className="muted">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
