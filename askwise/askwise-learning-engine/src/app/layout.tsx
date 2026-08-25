import type { Metadata } from "next";
import "./globals.css";
import TopNav from "@/components/navigation/top-nav";

export const metadata: Metadata = {
  title: "ASKWISE 13-Day Learning Engine",
  description: "ASKWISE Learning Engine V1.0 Web MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <TopNav />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
