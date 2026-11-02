import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { authenticate } from "./auth-core";
import { authStorePath } from "./paths";

export const SESSION_COOKIE = "askwise_pilot_session";

export function requirePilotStudent(): number {
  const authorization = headers().get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : cookies().get(SESSION_COOKIE)?.value || "";
  const id = authenticate(authStorePath, token);
  if (!id) redirect("/login");
  return id;
}
