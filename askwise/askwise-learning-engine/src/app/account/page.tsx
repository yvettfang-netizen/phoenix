import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logout } from "@/lib/pilot/auth-core";
import { authStorePath } from "@/lib/pilot/paths";
import { requirePilotStudent, SESSION_COOKIE } from "@/lib/pilot/request";
import { deleteStudentData } from "@/lib/db";

export const dynamic = "force-dynamic";
export default function AccountPage() {
  requirePilotStudent();
  async function signOut() {
    "use server";
    logout(authStorePath, cookies().get(SESSION_COOKIE)?.value || "");
    cookies().delete(SESSION_COOKIE);
    redirect("/login");
  }
  async function remove(form: FormData) {
    "use server";
    requirePilotStudent();
    if (form.get("confirmation") !== "DELETE") return;
    deleteStudentData();
    cookies().delete(SESSION_COOKIE);
    redirect("/login");
  }
  return <section className="askwise-card"><h1>Pilot account</h1>
    <a href="/account/export">Export my learning data</a>
    <form action={signOut}><button type="submit">Sign out</button></form>
    <p>Deleting removes your active learning records and revokes access. Restricted backups follow the operator retention policy.</p>
    <form action={remove}><label>Type DELETE to remove your records<input name="confirmation" required /></label>
      <button type="submit">Delete my learning data</button></form></section>;
}
