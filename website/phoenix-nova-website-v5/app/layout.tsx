import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "./customer-center.css";
import "./account.css";
import { FamilyDemoProvider } from "@/components/family-demo-provider";

export const metadata: Metadata = {
  title: {
    default: "Phoenix Nova website V5",
    template: "%s｜Phoenix Nova™",
  },
  description: "Phoenix Nova™ Global Family Growth Platform — 一个入口，走进凤启世界。",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  other: {
    "candidate-status": "private-review",
  },
  // Founder deferred small-size favicon acceptance; no candidate icon is enabled.
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const documentLanguage = requestHeaders.get("x-phoenix-health-locale") === "en" ? "en" : "zh-Hans";
  return (
    <html lang={documentLanguage}>
      <body className="antialiased"><FamilyDemoProvider>{children}</FamilyDemoProvider></body>
    </html>
  );
}
