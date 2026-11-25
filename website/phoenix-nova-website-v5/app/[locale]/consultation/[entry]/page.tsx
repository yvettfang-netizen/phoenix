import { notFound } from "next/navigation";
import { WebsiteConsultationPage } from "@/components/website-consultation-page";
import { isConsultationEntry } from "@/lib/website-consultation-intake";

export const dynamic = "force-dynamic";
export { generateMetadata } from "../page";

export default async function CompassConsultationPage({ params }: { params: Promise<{ locale: string; entry: string }> }) {
  const { locale, entry } = await params;
  if ((locale !== "zh" && locale !== "en") || !isConsultationEntry(entry)) notFound();
  return <WebsiteConsultationPage locale={locale} entry={entry} />;
}
