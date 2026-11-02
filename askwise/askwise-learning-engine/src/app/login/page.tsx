import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { login } from "@/lib/pilot/auth-core";
import { authStorePath } from "@/lib/pilot/paths";
import { SESSION_COOKIE } from "@/lib/pilot/request";

export const dynamic = "force-dynamic";

export default function LoginPage({ searchParams }: { searchParams?: { error?: string } }) {
  async function signIn(form: FormData) {
    "use server";
    const result = login(authStorePath, String(form.get("account") || ""), String(form.get("password") || ""));
    if (!result) redirect("/login?error=invalid");
    cookies().set(SESSION_COOKIE, result.token, {
      httpOnly: true, sameSite: "strict", secure: process.env.ASKWISE_COOKIE_SECURE !== "false",
      path: "/", expires: new Date(result.expiresAt),
    });
    redirect("/");
  }
  return <section className="askwise-card"><h1>ASKWISE Pilot Login</h1>
    <p>Rule-based learning diagnosis. Your attempt comes first.</p>
    {searchParams?.error ? <p role="alert">Login unavailable. Check your account or try later.</p> : null}
    <form action={signIn}><label>Account<input name="account" required maxLength={80} autoComplete="username" /></label>
      <label>Password<input name="password" type="password" required maxLength={256} autoComplete="current-password" /></label>
      <button type="submit">Sign in</button></form></section>;
}
