import { exportStudentData } from "@/lib/db";

export const dynamic = "force-dynamic";
export async function GET() {
  return new Response(JSON.stringify(exportStudentData()), { headers: {
    "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
    "Content-Disposition": "attachment; filename=askwise-learning-export.json",
  } });
}
