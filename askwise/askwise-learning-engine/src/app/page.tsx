import Link from "next/link";
import { getPilotContext } from "@/lib/db";
import CardShell from "@/components/ui/card-shell";

export default function TodayPage() {
  const context = getPilotContext();
  const totalDone = context.completedToday;
  const totalTasks = context.totalTasksToday;
  const todayTasks = context.todayTasks as Array<{
    id: number;
    subject: string;
    topic: string;
    question: string;
    status: string;
    is_placeholder: number;
  }>;

  return (
    <div className="grid">
      <h1>ASKWISE 13-Day Learning Experiment</h1>
      <CardShell title={`Today Dashboard (Day ${context.day}/13)`} description="Task-first progress gate">
        <p>
          Day {context.day}/13 | Date: {context.todayDate}
        </p>
        <div className="row">
          <span className="status-chip good">Completed {totalDone}/{totalTasks}</span>
          <span className="status-chip warn">Carry-over from yesterday {context.yesterdayCarryOver.length}</span>
        </div>
      </CardShell>

      <CardShell title="Today&apos;s Learning Flow" description="Today / Dashboard path">
        <p>
          Today&apos;s Tasks: {todayTasks.length}
        </p>
        {todayTasks.length === 0 ? (
          <p>No tasks available.</p>
        ) : (
          <div className="grid">
            {todayTasks.map((task) => (
              <article key={task.id} className="askwise-card">
                <div className="row">
                  <strong>{task.subject}</strong>
                  <span>-</span>
                  <span>{task.topic}</span>
                  <span className={task.is_placeholder ? "status-bad" : "status-good"}>
                    {task.is_placeholder ? "Awaiting historical data" : task.status}
                  </span>
                </div>
                <p>{task.question}</p>
                <Link className="button button-primary" href={`/task/${task.id}`}>
                  Start Task
                </Link>
              </article>
            ))}
          </div>
        )}
      </CardShell>

      <CardShell title="Manual entry" description="Use this flow when you need an ad-hoc task">
        <p>
          Need a manual task? Go to <Link href="/student-task">Student Task</Link> to create one.
        </p>
      </CardShell>
    </div>
  );
}
