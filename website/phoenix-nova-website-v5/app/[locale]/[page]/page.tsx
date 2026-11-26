import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageIds, routeMetadata, V5Site, type Locale, type PageId } from "@/components/v5-site";
import { pageDescriptions } from "@/lib/v5-metadata";

type Props = { params: Promise<{ locale: string; page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, page } = await params;
  if ((locale !== "zh" && locale !== "en") || !pageIds.includes(page as (typeof pageIds)[number])) return {};
  const item = routeMetadata[page as Exclude<PageId, "home">];
  if (page === "about") return { title: locale === "zh" ? "关于我们｜Phoenix Nova 凤启环球｜全球家庭成长平台" : "About Phoenix Nova | Global Family Growth Platform", description: locale === "zh" ? "认识 Phoenix Nova 凤启环球，了解教育、身份、健康与财富四大专业服务、家庭长期规划理念、服务方式与专业责任。" : "Discover Phoenix Nova, a global family growth platform connecting education, identity, health and wealth planning through professional guidance and long-term coordination." };
  if (page === "contact") return { title: locale === "zh" ? "联系我们｜Phoenix Nova 凤启环球" : "Contact Us | Phoenix Nova", description: locale === "zh" ? "联系 Phoenix Nova 凤启环球，了解香港总部、深圳运营、北京及潮州代表处的服务网络、统一邮箱及专业服务咨询方式。" : "Contact Phoenix Nova for our Hong Kong headquarters, Shenzhen operations, Beijing and Chaozhou representative offices, central email and service enquiries." };
  return { title: locale === "zh" ? item.zh : item.en, description: pageDescriptions[page]?.[locale === "zh" ? 0 : 1] };
}

export default async function LocalizedPage({ params }: Props) {
  const { locale, page } = await params;
  if ((locale !== "zh" && locale !== "en") || !pageIds.includes(page as (typeof pageIds)[number])) notFound();
  return <V5Site locale={locale as Locale} page={page as PageId} />;
}
