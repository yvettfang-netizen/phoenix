import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetailPage } from "@/components/commerce";
import { getProductBySlug, products } from "@/lib/commerce";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  return {
    title: product ? `${product.title}｜凤启东方` : "作品详情｜凤启东方",
    description: product?.copy ?? "凤启东方作品详情。",
  };
}

export default async function ProductRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return <ProductDetailPage product={product} />;
}
