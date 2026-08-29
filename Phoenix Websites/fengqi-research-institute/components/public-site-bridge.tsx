"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

const PHOENIX_NOVA_V4_URL = "https://phoenix-nova-mvp.yvettfang.chatgpt.site/v4";

function isPublicPage(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/world" ||
    pathname === "/fenghuang-xingtu" ||
    pathname === "/hongmeng-world" ||
    pathname === "/founder/access" ||
    pathname === "/guest" ||
    pathname.startsWith("/guest/") ||
    pathname === "/dongfang-qijing" ||
    pathname.startsWith("/dongfang-qijing/")
  );
}

export function PublicSiteBridge() {
  const pathname = usePathname();

  if (!isPublicPage(pathname)) return null;

  const hasDenseTopbar = pathname === "/world" || pathname === "/fenghuang-xingtu" || pathname === "/hongmeng-world";

  return (
    <>
      <a
        className={`nova-main-back${hasDenseTopbar ? " nova-main-back--lower" : ""}`}
        href={PHOENIX_NOVA_V4_URL}
        aria-label="返回 Phoenix Nova 凤启环球主站"
      >
        <span>返回凤启主站</span>
        <small>BACK TO PHOENIX NOVA</small>
        <ArrowUpRight aria-hidden="true" />
      </a>

      <footer className="nova-bridge-footer" aria-label="Phoenix Nova 主品牌关系与主站入口">
        <div className="nova-bridge-footer__inner">
          <div className="nova-bridge-footer__brand">
            <Image
              src="/phoenix-nova-official-mark-navy-v1.png"
              alt="Phoenix Nova Official Logo System V1.0 官方羽翼标志"
              width={126}
              height={126}
            />
            <div>
              <small>PHOENIX NOVA™</small>
              <h2>返回凤启环球主站</h2>
              <span>BACK TO PHOENIX NOVA</span>
            </div>
          </div>

          <div className="nova-bridge-footer__relationship">
            <dl>
              <div>
                <dt>Phoenix Nova™</dt>
                <dd>母品牌与产品服务主站</dd>
              </div>
              <div>
                <dt>凤启东方 / NOVA DIGITAL</dt>
                <dd>品牌数字世界与生态体验空间</dd>
              </div>
            </dl>
            <p>了解 Compass、凤启学苑、Family OS<br />与全球家庭成长服务。</p>
          </div>

          <a className="nova-bridge-footer__cta" href={PHOENIX_NOVA_V4_URL}>
            返回主网站
            <ArrowUpRight aria-hidden="true" />
          </a>
        </div>
      </footer>
    </>
  );
}
