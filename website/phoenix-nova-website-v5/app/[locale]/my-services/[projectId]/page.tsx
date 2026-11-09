import {env} from "cloudflare:workers";
import {notFound} from "next/navigation";
import {ServiceWorkbench} from "@/components/service-workbench";
import {workbenchEnabled} from "@/lib/service-workbench-bff";
import {customerBridgeEnabled} from "@/lib/customer-canonical-bridge";
import {privateWorkbenchRequested} from "@/lib/private-customer-workbench";
import {requirePrivateWorkbenchSession} from "@/db/private-workbench-page";
export const dynamic="force-dynamic";
export const metadata = { robots: { index: false, follow: false, nocache: true } };
export default async function Page({ params }: { params: Promise<{ locale: string; projectId: string }> }) {
  const { locale, projectId } = await params;
  if ((locale !== "zh" && locale !== "en") || !/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(projectId)) notFound();
  const values = env as unknown as Record<string, unknown>;
  if (privateWorkbenchRequested(values)) {
    await requirePrivateWorkbenchSession(values, locale);
    return <ServiceWorkbench key={projectId} locale={locale} projectId={projectId} readOnly />;
  }
  if (!workbenchEnabled(values, process.env.NODE_ENV)) notFound();
  const synthetic = !customerBridgeEnabled(values, process.env.NODE_ENV) && values.SERVICE_WORKBENCH_SYNTHETIC_PREVIEW === "true";
  return <ServiceWorkbench key={projectId} locale={locale} projectId={projectId} synthetic={synthetic} />;
}
