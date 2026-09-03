import type { Metadata } from "next";
import { PublicSiteBridge } from "@/components/public-site-bridge";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phoenix Nova Digital World",
  description: "鹤潼引路，凤凰执中，九大仙灵各守其境。进入 Phoenix Nova 正在生长的数字世界。",
  robots: {
    index: false,
    follow: false,
  },
  other: {
    "codex-preview": "development",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <PublicSiteBridge />
      </body>
    </html>
  );
}
