import { getPilotContext, getPoliticalMaps, upsertPoliticalMap } from "@/lib/db";
import { revalidatePath } from "next/cache";
import CardShell from "@/components/ui/card-shell";
import AskwiseButton from "@/components/ui/button";

export default function PoliticalMapPage() {
  const day = getPilotContext().day;
  const existing = getPoliticalMaps(undefined, day) as Array<{
    id: number;
    topic: string;
    core_concept: string;
    key_point: string;
    connection: string;
    trigger_question: string;
    my_own_explanation: string;
  }>;

  async function saveMap(formData: FormData) {
    "use server";
    upsertPoliticalMap({
      topic: String(formData.get("topic") || ""),
      coreConcept: String(formData.get("coreConcept") || ""),
      keyPoint: String(formData.get("keyPoint") || ""),
      connection: String(formData.get("connection") || ""),
      triggerQuestion: String(formData.get("triggerQuestion") || ""),
      myOwnExplanation: String(formData.get("myOwnExplanation") || ""),
    });
    revalidatePath("/maps/political");
  }

  return (
    <div className="grid">
      <h1>Political Knowledge Map</h1>
      <CardShell title="Add / Update Political Map" description="记录材料→原理→表达的对应关系">
        <form action={saveMap}>
          <label>Topic</label>
          <input name="topic" required />
          <label>Core Concept</label>
          <textarea name="coreConcept" rows={2} required />
          <label>Key Point</label>
          <textarea name="keyPoint" rows={2} required />
          <label>Connection</label>
          <textarea name="connection" rows={2} required />
          <label>Trigger Question</label>
          <textarea name="triggerQuestion" rows={2} required />
          <label>My Own Explanation</label>
          <textarea name="myOwnExplanation" rows={3} required />
          <AskwiseButton type="submit" variant="primary">
            Save Map
          </AskwiseButton>
        </form>
      </CardShell>

      <CardShell title="Saved Maps">
        {existing.length === 0 ? <p>No map saved for this day.</p> : null}
        {existing.map((item) => (
          <article className="timeline-item" key={item.id}>
            <h3>{item.topic}</h3>
            <p>
              <strong>Core Concept:</strong> {item.core_concept}
            </p>
            <p>
              <strong>Key Point:</strong> {item.key_point}
            </p>
            <p>
              <strong>Connection:</strong> {item.connection}
            </p>
            <p>
              <strong>Trigger Question:</strong> {item.trigger_question}
            </p>
            <p>
              <strong>My Explanation:</strong> {item.my_own_explanation}
            </p>
          </article>
        ))}
      </CardShell>
    </div>
  );
}
