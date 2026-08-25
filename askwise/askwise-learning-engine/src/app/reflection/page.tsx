import { getPilotContext, getReflections, upsertDailyReflection } from "@/lib/db";
import { revalidatePath } from "next/cache";
import AskwiseButton from "@/components/ui/button";
import CardShell from "@/components/ui/card-shell";

export default function ReflectionPage() {
  const day = getPilotContext().day;
  const existing = getReflections(undefined, day) as {
    id: number;
    q1: string;
    q2: string;
    q3: string;
  } | undefined;

  async function saveReflection(formData: FormData) {
    "use server";
    upsertDailyReflection({
      q1: String(formData.get("q1") || ""),
      q2: String(formData.get("q2") || ""),
      q3: String(formData.get("q3") || ""),
    });
    revalidatePath("/reflection");
  }

  return (
    <div>
      <h1>Daily Reflection</h1>
      <CardShell
        title={`Day ${day} Reflection`}
        description="Capture learning evidence before advancing."
      >
        <form action={saveReflection}>
          <label>Q1: 今天哪一个地方我原来以为自己会，其实不会？</label>
          <textarea name="q1" rows={3} defaultValue={existing?.q1 ?? ""} />

          <label>Q2: 今天哪一个提示真正帮助我继续思考？</label>
          <textarea name="q2" rows={3} defaultValue={existing?.q2 ?? ""} />

          <label>Q3: 如果明天遇到类似问题，我会先做什么？</label>
          <textarea name="q3" rows={3} defaultValue={existing?.q3 ?? ""} />

          <AskwiseButton type="submit" variant="primary">
            Save Reflection
          </AskwiseButton>
        </form>
      </CardShell>
    </div>
  );
}
