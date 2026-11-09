import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { readCustomerSession } from "@/lib/customer-auth";
import { privateWorkbenchConfig } from "@/lib/private-customer-workbench";

export async function requirePrivateWorkbenchSession(values: Record<string, unknown>, locale: "zh" | "en") {
  const config = privateWorkbenchConfig(values);
  const incoming = await headers();
  if (!config || incoming.get("host") !== new URL(config.auth.origin).host) notFound();
  const request = new Request(config.auth.origin + "/api/customer-auth/session", { headers: incoming });
  const session = await readCustomerSession(request, config.auth, { touch: false }).catch(() => null);
  if (!session) redirect(`/${locale}/account`);
}
