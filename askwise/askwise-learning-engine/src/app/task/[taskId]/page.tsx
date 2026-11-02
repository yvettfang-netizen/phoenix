import { createHash, randomUUID } from "node:crypto";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { retryStructuredTask } from "@/lib/pilot/task-service";
import { requirePilotStudent } from "@/lib/pilot/request";
import { performOnce } from "@/lib/pilot/idempotency";
import { listPhotos, savePhoto } from "@/lib/pilot/uploads";
import { getEvidenceForTask, getLatestHintLevel, getSessionByTask, getSessionSnapshot, getTaskById } from "@/lib/db";
import type { Subject } from "@/lib/engine/engine-types";
import type { Attempt } from "@/lib/types";

import AoyuCompanion from "@/components/aoyu/aoyu-companion";
import CardShell from "@/components/ui/card-shell";
import AskwiseButton from "@/components/ui/button";
import AttemptHistory from "@/components/task-flow/attempt-history";

type FlowState = "initial" | "diagnosis" | "hint-retry" | "solved";

function getFlowState(solved: boolean, attempts: Array<unknown>, hasDiagnosis: boolean, hasHint: boolean): FlowState {
  if (solved) return "solved";
  if (attempts.length === 0 || !hasDiagnosis) return "initial";
  if (hasDiagnosis && !hasHint) return "diagnosis";
  if (hasDiagnosis && hasHint) return "hint-retry";
  return "initial";
}

export default function TaskPage({ params }: { params: { taskId: string } }) {
  const taskId = Number(params.taskId);
  const requestId = randomUUID();
  const task = getTaskById(taskId) as
    | {
        id: number;
        subject: Subject;
        topic: string;
        question: string;
        status: string;
      }
    | undefined;
  if (!task) {
    return <div className="askwise-card">Task not found.</div>;
  }

  const taskSession = getSessionByTask(task.id) as {
    id: number;
    solved: number;
    hint_count: number;
    retry_count: number;
    final_result: string;
    independent: number;
  } | undefined;
  if (!taskSession) {
    return <div className="askwise-card">Learning session unavailable.</div>;
  }

  const snapshot = getSessionSnapshot(taskSession.id);
  const attempts = (snapshot?.attempts ?? []) as Attempt[];
  const latestHint = snapshot?.latestHint;
  const latestDiagnosis = snapshot?.diagnosis;
  const solved = taskSession.solved === 1;

  const evidence = getEvidenceForTask(task.id) as
    | {
        final_result: string;
        independence: string;
        hint_count: number;
        retry_count: number;
        hint_level: number;
      }
    | undefined;

  const flowState = getFlowState(solved, attempts, Boolean(latestDiagnosis), Boolean(latestHint));

  const photos = listPhotos(requirePilotStudent()).filter(photo => photo.task_id === taskId);

  const companionState =
    flowState === "solved"
      ? "celebrating"
      : flowState === "initial"
        ? "listening"
        : flowState === "diagnosis"
          ? "thinking"
          : "guiding";

  async function submitAttempt(formData: FormData) {
    "use server";
    retryStructuredTask(taskId, { request_id: requestId, answer: {
      conditions: String(formData.get("conditions") || ""), method: String(formData.get("method") || ""),
      work: String(formData.get("studentAttempt") || ""), conclusion: String(formData.get("conclusion") || ""),
    } });
    revalidatePath(`/task/${taskId}`);
    revalidatePath("/evidence");
    revalidatePath("/");
    revalidatePath("/dashboard");
  }

  async function uploadPhoto(form: FormData) {
    "use server";
    getTaskById(taskId);
    const file = form.get("photo");
    if (!file || typeof file === "string" || file.size > 5 * 1024 * 1024) throw new Error("INVALID_UPLOAD");
    const bytes = new Uint8Array(await file.arrayBuffer());
    performOnce(requirePilotStudent(), "upload:" + taskId, requestId, createHash("sha256").update(bytes).digest("hex"), () => savePhoto(requirePilotStudent(), taskId, bytes));
    revalidatePath(`/task/${taskId}`);
  }

  return (
    <div className="grid">
      <h1>Learning Flow</h1>
      <p>Rule-based diagnosis for the pilot; not AI semantic grading.</p>
      <CardShell title="Task" description={`Flow State: ${flowState}`}>
        <div className="task-header">
          <p>
            <strong>Subject:</strong> {task.subject}
          </p>
          <p>
            <strong>Topic:</strong> {task.topic}
          </p>
          <p>
            <strong>Question:</strong> {task.question || "Awaiting historical data"}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            <span className={solved ? "status-good" : "status-bad"}>
              {solved ? "Solved" : "In Progress"}
            </span>
          </p>
        </div>
      </CardShell>

      <CardShell title="Photo evidence" description="Private attachment, max 5 MB PNG/JPEG/WebP. No automatic OCR grading.">
        <form action={uploadPhoto}><input type="file" name="photo" accept="image/png,image/jpeg,image/webp" required /><button type="submit">Upload photo</button></form>
        {photos.map(photo => <p key={photo.id}><a href={`/api/pilot/v1/uploads/${photo.id}`}>Download my photo</a></p>)}
      </CardShell>
      <AoyuCompanion
        state={companionState}
        message={
          companionState === "celebrating"
            ? "Great, finish and review evidence."
            : companionState === "thinking"
              ? "I can see the error type. Let&apos;s move to a focused hint."
              : "Share your thought first, then we'll guide the next move."
        }
      />

      <CardShell
        title="Learning Metrics"
        description="Track hint + retry progress for this task."
      >
        <div className="row">
          <span className="status-chip good">Attempts: {attempts.length}</span>
          <span className="status-chip warn">Hint Count: {taskSession.hint_count}</span>
          <span className="status-chip warn">Retry Count: {taskSession.retry_count}</span>
          <span className="status-chip good">Hint Level: {getLatestHintLevel(taskSession.id)}</span>
        </div>
      </CardShell>

      {!solved ? (
        <CardShell
          title={flowState === "initial" ? "Initial Attempt" : "Retry Attempt"}
          description={flowState === "initial" ? "First step is diagnostic, not answer-dictating." : "Use one concise retry."}
        >
          <form action={submitAttempt}>
            <label htmlFor="conditions">Conditions / material signals</label>
            <textarea id="conditions" name="conditions" rows={2} maxLength={2000} />
            <label htmlFor="method">Proposed method / principle</label>
            <textarea id="method" name="method" rows={2} maxLength={2000} />
            <label htmlFor="studentAttempt">
              {flowState === "initial" ? "Initial Attempt" : "Retry Attempt"}
            </label>
            <textarea
              id="studentAttempt"
              name="studentAttempt"
              rows={4}
              required
              placeholder="Write your next reasoning step."
            />
            <label htmlFor="conclusion">Conclusion / uncertainty</label>
            <textarea id="conclusion" name="conclusion" rows={2} maxLength={2000} />
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="firstStepMs" value={Date.now()} />
            <AskwiseButton type="submit" variant="primary">
              Submit
            </AskwiseButton>
          </form>
        </CardShell>
      ) : null}

      {!solved ? (
        <>
          <CardShell title="Diagnosis" description="Diagnose first, then guide the next step">
            {latestDiagnosis ? (
              <div>
                <p>{latestDiagnosis.type}</p>
                <p>{latestDiagnosis.reason}</p>
              </div>
            ) : (
              <p className="muted">No diagnosis yet. Submit your attempt first.</p>
            )}
          </CardShell>

          <CardShell title="Hint + Retry" description="Minimum necessary hint for the current step">
            {latestHint?.content ? (
              <div>
                <p>
                  <strong>Hint Level {latestHint.hint_level}</strong>
                </p>
                <p>{latestHint.content}</p>
              </div>
            ) : (
              <p className="muted">No hint yet.</p>
            )}
          </CardShell>
        </>
      ) : null}

      <CardShell title="Attempt Timeline" description="Actual student interaction records (not chat log)">
        <AttemptHistory attempts={attempts} />
      </CardShell>

      {solved ? (
        <CardShell
          title="Solved & Learning Evidence"
          description="Proceed to Evidence and close the cycle with map + reflection."
        >
          <p className="status-good">Solved. Keep the reflection and evidence consistency.</p>
          <p>
            <strong>Final Result:</strong> {taskSession.final_result}
          </p>
          <p>
            <strong>Independence:</strong> {taskSession.independent ? "Independent" : "Assisted"}
          </p>
          <div className="row">
            <Link className="button button-secondary" href="/evidence">
              Open Learning Evidence
            </Link>
            <Link className="button button-secondary" href="/maps/political">
              Update Knowledge Map
            </Link>
            <Link className="button button-secondary" href="/reflection">
              Daily Reflection
            </Link>
          </div>
          {evidence ? (
            <div className="evidence-list" style={{ marginTop: "10px" }}>
              <article className="timeline-item">
                <p>
                  <strong>Evidence Key:</strong> {evidence.final_result}
                </p>
                <p>Hint Level {evidence.hint_level}</p>
                <p>Retries {evidence.retry_count}, Hints {evidence.hint_count}</p>
              </article>
            </div>
          ) : null}
        </CardShell>
      ) : null}
    </div>
  );
}
