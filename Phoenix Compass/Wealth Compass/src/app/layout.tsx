import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wealth Compass™｜家庭财富健康入口",
  description: "以克制、清晰的方式梳理家庭财富关注方向。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><div className="shell">
    <header className="nav"><Link className="brand" href="/">PHOENIX <span>NOVA™</span></Link><small>WEALTH COMPASS™</small></header>
    {children}
  </div></body></html>;
}
