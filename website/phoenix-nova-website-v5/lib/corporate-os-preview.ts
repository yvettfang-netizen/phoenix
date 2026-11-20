import { workbenchEnabled, type WorkbenchEnv } from "./service-workbench-bff";

/** This gates an informational design preview, never an identity or role grant.
 * Keep it inside the existing local synthetic workbench boundary until the
 * server-owned organisation and workspace contracts are independently ready.
 * Pass the actual Host header, not a forwarded host or browser-selected role.
 */
export function corporateOsPreviewEnabled(
  env: WorkbenchEnv,
  mode: string | undefined,
  host: string | null,
): boolean {
  if (!workbenchEnabled(env, mode)
    || env.SERVICE_WORKBENCH_SYNTHETIC_PREVIEW !== "true"
    || env.CUSTOMER_CANONICAL_BRIDGE_ENABLED === "true"
    || !host) return false;

  try {
    const origin = new URL(`http://${host}`);
    return ["localhost", "127.0.0.1"].includes(origin.hostname)
      && origin.host === host
      && !origin.username && !origin.password
      && origin.pathname === "/" && !origin.search && !origin.hash;
  } catch {
    return false;
  }
}
