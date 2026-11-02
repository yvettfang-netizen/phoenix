import { listLearningEvidence } from "@/lib/db";
import CardShell from "@/components/ui/card-shell";
import StructuredAnswer from "@/components/task-flow/structured-answer";

export default function EvidencePage() {
  const evidences = listLearningEvidence() as Array<{
    id: number;
    date: string;
    subject: string;
    topic: string;
    question: string;
    final_result: string;
    independence: string;
    hint_level: number;
    hint_count: number;
    retry_count: number;
    diagnosis: string;
    initial_attempt: string;
  }>;

  return (
    <div className="grid">
      <h1>Learning Evidence</h1>
      {evidences.length === 0 ? (
        <p>No evidence generated yet.</p>
      ) : (
        <div className="grid">
          {evidences.map((item) => (
            <CardShell key={item.id} title={`${item.date} | ${item.subject} / ${item.topic}`}>
              <p>{item.question}</p>
              <div className="row">
                <span className="status-chip good">Independent: {item.independence}</span>
                <span className="status-chip warn">Hint {item.hint_count}</span>
                <span className="status-chip warn">Retry {item.retry_count}</span>
                <span className="status-chip">Hint Level {item.hint_level}</span>
              </div>
              <p>
                <strong>Final:</strong> {item.final_result}
              </p>
              <p className="muted">Diagnosis: {item.diagnosis}</p>
              <strong>Initial Attempt:</strong><StructuredAnswer value={item.initial_attempt} />
            </CardShell>
          ))}
        </div>
      )}
    </div>
  );
}
