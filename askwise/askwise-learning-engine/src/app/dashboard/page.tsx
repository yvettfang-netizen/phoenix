import { getDashboardStats, getPilotContext, getTodayTaskHistory } from "@/lib/db";
import CardShell from "@/components/ui/card-shell";
import Link from "next/link";

export default function DashboardPage() {
  const pilot = getPilotContext();
  const stats = getDashboardStats();
  const todayHistory = getTodayTaskHistory() as Array<{
    id: number;
    subject: string;
    topic: string;
    status: string;
    solved: number;
    hint_count: number;
    retry_count: number;
  }>;

  return (
    <div>
      <h1>Growth Dashboard</h1>
      <CardShell
        title={`Growth Dashboard · Day ${pilot.day}/13`}
        description="Warm-up summary + movement proof points."
      >
        {stats ? (
          <div className="row">
            <span className="status-chip good">01 Completed: {stats.tasksCompleted}</span>
            <span className="status-chip warn">02 Independent Rate: {stats.independentRate}</span>
            <span className="status-chip warn">03 Avg Hint: {stats.avgHintLevel}</span>
            <span className="status-chip">04 Common Diagnosis: {stats.mostCommonDiagnosis}</span>
            <span className="status-chip good">05 Hint Trend: {stats.hintDependencyDownTrend}</span>
            <span className="status-chip">06 Reflection: {stats.reflectionCompletion}</span>
          </div>
        ) : (
          <p>统计数据尚未就绪。</p>
        )}
      </CardShell>

      <CardShell title="Today Task Record">
        {todayHistory.length === 0 ? <p>暂无今日记录。</p> : null}
        {todayHistory.map((task) => (
          <article className="timeline-item" key={task.id}>
            <p>
              {task.subject} - {task.topic}
            </p>
            <p>
              solved: {task.solved ? "yes" : "no"} | hint {task.hint_count}, retry {task.retry_count}
            </p>
            <div className="row">
              <Link className="button button-secondary" href={`/task/${task.id}`}>
                Open Task
              </Link>
              <Link className="button button-ghost" href="/maps/political">
                Update Political Map
              </Link>
            </div>
          </article>
        ))}
      </CardShell>

      <CardShell title="Next Actions">
        <div className="row">
          <Link href="/student-task" className="button button-primary">
            Create Extra Task
          </Link>
          <Link href="/evidence" className="button button-secondary">
            Evidence
          </Link>
          <Link href="/reflection" className="button button-secondary">
            Reflection
          </Link>
        </div>
      </CardShell>
    </div>
  );
}
