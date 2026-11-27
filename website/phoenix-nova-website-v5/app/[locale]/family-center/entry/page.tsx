import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FamilyCenterEntry({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();

  redirect(`/${locale}/family-center`);
}
