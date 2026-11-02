import { createStructuredTask } from "@/lib/pilot/task-service";
import { randomUUID } from "node:crypto";
import { requirePilotStudent } from "@/lib/pilot/request";
import AoyuCompanion from "@/components/aoyu/aoyu-companion";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import CardShell from "@/components/ui/card-shell";
import AskwiseButton from "@/components/ui/button";
import ConfidenceSelector from "@/components/task-flow/confidence-selector";

export default function StudentTaskPage({
  searchParams,
}: {
  searchParams?: { subject?: string; topic?: string };
}) {
  const requestId = randomUUID();
  requirePilotStudent();
  async function createTaskAction(formData: FormData) {
    "use server";
    const subject = String(formData.get("subject") || "Mathematics");
    const topic = String(formData.get("topic") || "line intersects ellipse with Vieta");
    const question = String(formData.get("question") || "");
    const confidence = String(formData.get("confidence") || "I know how to solve it");
    const initialAttempt = String(formData.get("initialAttempt") || "");

    const result = createStructuredTask({
      subject, topic, question, request_id: requestId,
      answer: { conditions: String(formData.get("conditions") || ""), method: String(formData.get("method") || ""), work: initialAttempt, conclusion: String(formData.get("conclusion") || "") },
    });

    revalidatePath("/");
    revalidatePath("/student-task");
    redirect(`/task/${result.taskId}`);
  }

  return (
    <div className="grid">
      <h1>Student Task</h1>
      <AoyuCompanion state="listening" message="Start with your own conditions, method and reasoning." />
      <CardShell
        title="Create Initial Attempt"
        description="Do not paste full answers. Keep concise and directional."
      >
        <form action={createTaskAction}>
          <label htmlFor="subject">Subject</label>
          <select id="subject" name="subject">
            <option value="Politics">Politics</option>
            <option value="Mathematics">Mathematics</option>
          </select>

          <label htmlFor="topic">Topic</label>
          <input id="topic" name="topic" defaultValue={searchParams?.topic ?? ""} />

          <label htmlFor="question">Question</label>
          <textarea id="question" name="question" rows={3} placeholder="Paste or write the problem statement" />

          <label htmlFor="conditions">Conditions / material signals</label>
          <textarea id="conditions" name="conditions" rows={2} maxLength={2000} />
          <label htmlFor="method">Proposed method / principle</label>
          <textarea id="method" name="method" rows={2} maxLength={2000} />
          <label htmlFor="initialAttempt">Student Initial Attempt</label>
          <textarea
            id="initialAttempt"
            name="initialAttempt"
            rows={4}
            placeholder="Do not give the full answer yet."
            required
          />

          <label htmlFor="conclusion">Conclusion / current uncertainty</label>
          <textarea id="conclusion" name="conclusion" rows={2} maxLength={2000} />
          <ConfidenceSelector required />

          <AskwiseButton type="submit" variant="primary">
            Start Task
          </AskwiseButton>
        </form>
      </CardShell>
    </div>
  );
}
