"use client";

import type { ReactNode } from "react";

const sharedSections = new Set(["#services", "#cross-border-process", "#health-compass", "#consultation", "#family-planning", "#partners", "#family-center", "#why-phoenix"]);

/** Native navigation also works without JS. Never carry query strings or answers. */
export function HealthLocaleLink({ href, className, label, children }: { href: string; className?: string; label?: string; children: ReactNode }) {
  return <a href={href} className={className} aria-label={label} onClick={event => {
    const hash = window.location.hash;
    event.currentTarget.href = href + (sharedSections.has(hash) ? hash : "");
  }}>{children}</a>;
}

export function HealthPartnerSectionLink({ children }: { children: ReactNode }) {
  return <a href="#partners" onClick={event => {
    const menu = event.currentTarget.closest("details");
    if (menu) menu.open = false;
  }}>{children}</a>;
}
