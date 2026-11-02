import StructuredAnswer from "./structured-answer";

type AttemptRecord = {
  attempt_number: number;
  student_response: string;
  is_correct: number | boolean;
  hint_level: number;
  timestamp: string;
};

type Props = {
  attempts: AttemptRecord[];
};

export default function AttemptHistory({ attempts }: Props) {
  return (
    <div className="evidence-list">
      {attempts.length === 0 ? <p>No attempts yet.</p> : null}
      {attempts.map((attempt) => (
        <article className="timeline-item" key={`${attempt.attempt_number}-${attempt.timestamp}`}>
          <p>
            Attempt {attempt.attempt_number} · Hint {attempt.hint_level}
          </p>
          <StructuredAnswer value={attempt.student_response} />
          <p className={attempt.is_correct ? "status-good" : "status-bad"}>
            {attempt.is_correct ? "Rule-recognized response" : "Needs retry"}
          </p>
        </article>
      ))}
    </div>
  );
}
