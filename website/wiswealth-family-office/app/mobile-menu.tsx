"use client";

import { useRef } from "react";

const links = [
  ["企业理念", "/about"],
  ["服务领域", "/#services"],
  ["规划方法", "/methodology"],
  ["智富洞察", "/insights"],
];

export default function MobileMenu() {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const closeMenu = () => detailsRef.current?.removeAttribute("open");

  return (
    <details className="mobile-menu" ref={detailsRef}>
      <summary
        className="menu-button"
        aria-label="打开或关闭网站导航"
      >
        <span /><span /><span />
      </summary>
      <nav className="mobile-nav" aria-label="手机导航">
        {links.map(([label, href]) => <a href={href} key={href} onClick={closeMenu}>{label}</a>)}
        <a className="mobile-nav-action" href="/#contact" onClick={closeMenu}>预约初步沟通</a>
      </n