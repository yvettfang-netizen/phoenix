import { getMathMaps, getPilotContext, upsertMathMap } from "@/lib/db";
import { revalidatePath } from "next/cache";
import CardShell from "@/components/ui/card-shell";
import AskwiseButton from "@/components/ui/button";

export default function MathMapPage() {
  const day = getPilotContext().day;
  const existing = getMathMaps(undefined, day) as Array<{
    id: number;
    problem_type: string;
    recognition_signal: string;
    possible_strategy: string;
    why_this_strategy: string;
    common_mistake: string;
    example: string;
  }>;

  async function saveMap(formData: FormData) {
    "use server";
    upsertMathMap({
      problemType: String(formData.get("problemType") || ""),
      recognitionSignal: String(formData.get("recognitionSignal") || ""),
      possibleStrategy: String(formData.get("possibleStrategy") || ""),
      whyThisStrategy: String(formData.get("whyThisStrategy") || ""),
      commonMistake: String(formData.get("commonMistake") || ""),
      example: String(formData.get("example") || ""),
    });
    revalidatePath("/maps/math");
  }

  return (
    <div className="grid">
      <h1>Math Strategy Map</h1>
      <CardShell title="Add / Update Math Map" description="记录触发信号、策略与常见误区">
        <form action={saveMap}>
          <label>Problem Type</label>
          <input name="problemType" required />
          <label>Recognition Signal</label>
          <textarea name="recognitionSignal" rows={2} required />
          <label>Possible Strategy</label>
          <textarea name="possibleStrategy" rows={2} required />
          <label>Why This Strategy</label>
          <textarea name="whyThisStrategy" rows={2} required />
          <label>Common Mistake</label>
          <textarea name="commonMistake" rows={2} required />
          <label>Example</label>
          <textarea name="example" rows={3} required />
          <AskwiseButton type="submit" variant="primary">
            Save Map
          </AskwiseButton>
        </form>
      </CardShell>

      <CardShell title="Saved Maps">
        {existing.length === 0 ? <p>No map saved for this day.</p> : null}
        {existing.map((item) => (
          <article className="timeline-item" key={item.id}>
            <h3>{item.problem_type}</h3>
            <p>
              <strong>Recognition Signal:</strong> {item.recognition_signal}
            </p>
            <p>
              <strong>Possible Strategy:</strong> {item.possible_strategy}
            </p>
            <p>
              <strong>Why This Strategy:</strong> {item.why_this_strategy}
            </p>
            <p>
              <strong>Common Mistake:</strong> {item.common_mistake}
            </p>
            <p>
              <strong>Example:</strong> {item.example}
            </p>
          </article>
        ))}
      </CardShell>
    </div>
  );
}
