import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "凤启东方｜Phoenix East",
  description:
    "Contemporary Eastern Design & Heritage Objects — 东方意象，当代成物。",
  other: {
    "codex-preview": "development",
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
