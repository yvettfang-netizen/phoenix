import { notFound, redirect } from "next/navigation";
import { healthPreviewEnabled } from "@/lib/health-compass-gate";
export const dynamic = "force-dynamic";
export default function HealthAlias() {
  if (!healthPreviewEnabled()) notFound();
  redirect("/zh/compass/health");
}
