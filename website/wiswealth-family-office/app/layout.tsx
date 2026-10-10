import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://wiswealth-family-office.yvettfang.chatgpt.site"),
  title: "智富家办 | WisWealth Family Office",
  description:
    "智富家办以 Wisdom · Wealth · Health 为理念，为家庭连接身份、教育、健康与财富的长期规划。",
  openGraph: {
    title: "智富家办 | WisWealth Family Office",
    description: "以智慧规划未来，以财富守护成长，以健康延续家族价值。",
    type: "website",
    locale: "zh_CN",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "智富家办 Wisdom · Wealth · Health" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "智富家办 | WisWealth Family Office",
    description: "以智慧规划未来，以财富守护成长，以健康延续家族价值。",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
