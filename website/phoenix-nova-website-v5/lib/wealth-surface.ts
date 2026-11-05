import { headers } from "next/headers";
/** Set only by the Worker after validating the actual URL hostname. */
export async function isWealthSurface() {
  return (await headers()).get("x-phoenix-surface") === "wealth";
}
export const MAIN_SITE_ORIGIN = "https://phoenixnova.com.cn";
