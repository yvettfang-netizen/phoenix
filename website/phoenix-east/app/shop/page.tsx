import type { Metadata } from "next";

import { ShopPage } from "@/components/commerce";

export const metadata: Metadata = {
  title: "线上商店｜凤启东方",
  description: "凤启东方正式作品目录、可获得方式与官方微店导流。",
};

export default function ShopRoute() {
  return <ShopPage />;
}
