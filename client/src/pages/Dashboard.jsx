import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import { useStudent } from "@/context/StudentContext";
import { authService } from "@/services/auth";

function Section({ title, children, className = "" }) {
  return <section className={`rounded-2xl border border-[#E5E1D8] bg-[#FBFAF7] p-5 md:p-6 ${className}`}><h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.16em] text-[#737373]">{title}</h2>{children}</section>;
}

function Empty({ children = "Not available yet." }) {
  return <p className="rounded-xl border border-dashed border-[#D8D0C1] p-4 text-sm text-[#737373]">{children}</p>;
}

export default function Dashboard() {
  const { user } = useStudent();
  const [dashboard, setDashboard] = useState(null);
  const [state, setState] = useState({ loading: true, error: "" });
  const [actionError, setActionError] = useState("");
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    authService.getDashboard()
      .then(setDashboard)
      .catch((error) => setState({ loading: false, error: error.message || "Unable to load your dashboard." }))
      .finally(() => setState((current) => ({ ...current, loading: false })));
  }, []);

  const dismissPrimaryAction = async () => {
    if (!dashboard?.nextActions?.primary?.id) return;
    setDismissing(true);
    setActionError("");
    try {
      await authService.dismissNextAction(dashboard.nextActions.primary.id);
      setDashboard(await authService.getDashboard());
    } catch (error) {
      setActionError(error.message || "Unable to dismiss this recommendation.");
    } finally {
      setDismissing(false);
    }
  };

  if (state.loading) return <main className="min-h-screen bg-[#F7F5F0]"><Container className="py-14"><p className="text-sm text-[#737373]">Loading your student system...</p></Container></main>;
  if (state.error) return <main className="min-h-screen bg-[#F7F5F0]"><Container className="py-14"><Empty>{state.error}</Empty></Container></main>;

  const roadmap = dashboard?.roadmap;
  const academic = dashboard?.academic;
  const performance = dashboard?.performance;
  const greeting = dashboard?.user?.name || user?.name || "Student";

  return <main className="min-h-screen bg-[#F7F5F0] text-[#171717]"><Container className="py-8 md:py-14">
    <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#737373]">Pragati OS / home</p><h1 className="mt-3 text-3xl font-black tracking-[-0.05em] md:text-5xl">GOOD EVENING, {greeting.toUpperCase()}</h1><p className="mt-3 text-[#737373]">Here&apos;s what matters right now.</p></div><div className="flex flex-wrap gap-4 text-sm text-[#737373]"><Link to="/learn" className="underline underline-offset-4">Learn</Link><Link to="/roadmap" className="underline underline-offset-4">Roadmap</Link><Link to="/vault" className="underline underline-offset-4">Vault</Link></div></div>
    <div className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
      <Section title="Next best action" className="bg-[#171717] text-[#F7F5F0]">
        {dashboard?.nextActions?.primary ? <div>
          <div className="flex flex-col justify-between gap-8 md:flex-row">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#B8AEA0]">{dashboard.nextActions.primary.goalType} · {dashboard.nextActions.primary.confidence}-confidence evidence</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">{dashboard.nextActions.primary.title}</h2>
              {dashboard.nextActions.primary.estimatedDurationMinutes ? <p className="mt-3 text-sm text-[#D8D0C1]">{dashboard.nextActions.primary.estimatedDurationMinutes} minutes</p> : null}
              <p className="mt-6 max-w-xl leading-7 text-[#D8D0C1]">{dashboard.nextActions.primary.reason}</p>
              <ul className="mt-4 space-y-1 text-xs text-[#D8D0C1]">{dashboard.nextActions.primary.evidence?.slice(0, 3).map((item, index) => <li key={`${item.type}-${index}`}>Evidence: {item.type.replaceAll("_", " ")}</li>)}</ul>
              <p className="mt-4 text-xs text-[#B8AEA0]">{dashboard.nextActions.primary.rankingReasons?.join(" ")}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-3">
              <Button as={Link} to={dashboard.nextActions.primary.route} state={dashboard.nextActions.primary.navigation || undefined} className="!bg-[#F7F5F0] !text-[#171717] hover:!bg-white">Open action →</Button>
              <button type="button" onClick={dismissPrimaryAction} disabled={dismissing} className="px-4 py-2 text-left text-xs text-[#D8D0C1] underline underline-offset-4 disabled:opacity-50">{dismissing ? "Dismissing…" : "Not now · dismiss"}</button>
            </div>
          </div>
          {dashboard.nextActions.alternatives?.length ? <div className="mt-8 border-t border-[#404040] pt-5"><p className="text-xs uppercase tracking-[0.16em] text-[#B8AEA0]">Other useful actions</p><div className="mt-3 space-y-3">{dashboard.nextActions.alternatives.map((action) => <div key={action.id} className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">{action.title}</p><p className="mt-1 text-xs text-[#D8D0C1]">{action.reason}</p></div><Button as={Link} to={action.route} state={action.navigation || undefined} variant="secondary" size="sm">Open</Button></div>)}</div></div> : null}
          {actionError ? <p className="mt-4 text-sm text-red-300" role="alert">{actionError}</p> : null}
        </div> : <div><Empty>{dashboard?.nextActions?.message || "No eligible action is available from your current records."}</Empty></div>}
      </Section>
      <Section title="Current study">{dashboard?.currentStudy ? <><p className="text-2xl font-black">{dashboard.currentStudy.title}</p><p className="mt-2 text-sm text-[#737373]">{dashboard.currentStudy.estimatedMinutes ? `${dashboard.currentStudy.estimatedMinutes} minute planning estimate · ` : ""}{dashboard.currentStudy.status}</p></> : <Empty>No active study item yet.</Empty>}</Section>
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <Section title="Roadmap progress">{roadmap ? <><div className="flex items-end justify-between"><p className="text-5xl font-black">{roadmap.progress}%</p><p className="text-sm text-[#737373]">{roadmap.title}</p></div><div className="mt-5 h-2 rounded-full bg-[#E5E1D8]"><div className="h-full rounded-full bg-[#171717]" style={{ width: `${roadmap.progress}%` }} /></div><p className="mt-4 text-sm text-[#737373]">{roadmap.currentItem ? `Next: ${roadmap.currentItem.title}` : "All roadmap items are complete."}</p></> : <Empty>No roadmap has been generated yet.</Empty>}</Section>
      <Section title="Academic context">{academic?.syllabus ? <><p className="text-2xl font-black">{academic.syllabus.title}</p><p className="mt-2 text-sm text-[#737373]">{academic.subjects.length} subjects · {academic.syllabus.status}</p></> : <Empty>Academic context will appear here when available.</Empty>}</Section>
    </div>
    <div className="mt-6 grid gap-6 md:grid-cols-3">
      <Section title="Performance & weak areas">
        {performance?.state === "unavailable" ? <Empty>Performance history is temporarily unavailable.</Empty> : performance?.completedAssessments ? <div>
          <p className="text-2xl font-black">{performance.completedAssessments} completed</p>
          <p className="mt-3 text-sm text-[#737373]">Score: {performance.scorePercentage === null ? "—" : `${performance.scorePercentage}%`}</p>
          <p className="mt-1 text-sm text-[#737373]">Accuracy: {performance.accuracy === null ? "—" : `${performance.accuracy}%`}</p>
          <p className="mt-3 text-xs text-[#737373]">{performance.trendState === "available" ? `Recent trend: ${performance.trendDirection}` : "Not enough recent assessments to show a trend."}</p>
          {dashboard.weakAreas?.length ? <div className="mt-4">{dashboard.weakAreas.map((area) => <span key={area} className="mr-2 mt-2 inline-flex rounded-full border border-[#E5E1D8] px-3 py-1.5 text-xs">{area}</span>)}</div> : <p className="mt-3 text-xs text-[#737373]">No topics meet the review evidence threshold yet.</p>}
          {performance.recurringMistakes?.length ? <p className="mt-3 text-xs text-[#737373]">Recurring concept to review: {performance.recurringMistakes[0].concept}</p> : null}
          <Link to="/practice" className="mt-4 inline-block text-sm underline underline-offset-4">Practice now</Link>
        </div> : <Empty>Complete a practice session to see evidence-based performance.</Empty>}
      </Section>
      <Section title="Memory reviews">
        {dashboard?.memory?.state === "unavailable" ? <Empty>Memory review information is temporarily unavailable.</Empty> : dashboard?.memory?.activeItems ? <>
          <p>{dashboard.memory.dueItems} due · {dashboard.memory.overdueItems} overdue</p>
          <p className="mt-2 text-xs text-[#737373]">{dashboard.memory.reviewsCompletedToday} reviews completed today (UTC)</p>
          {dashboard.memory.selfReportedRecallRate === null
            ? <p className="mt-2 text-xs text-[#737373]">Recall insights will appear after saved reviews.</p>
            : <p className="mt-2 text-xs text-[#737373]">Self-reported Good/Easy: {dashboard.memory.selfReportedRecallRate}% (last 30 days)</p>}
          <Link to="/memory" className="mt-3 inline-block text-sm underline underline-offset-4">Open memory reviews</Link>
        </> : <Empty>Create a memory item to start building your review schedule.</Empty>}
      </Section>
      <Section title="Career & projects">{dashboard?.career?.state === "unavailable" ? <Empty>Career information is temporarily unavailable.</Empty> : dashboard?.career?.goal ? <>
        <p className="text-xl font-black">{dashboard.career.goal.title}</p>
        <p className="mt-2 text-sm text-[#737373]">{dashboard.career.priorityGap ? `Next skill gap: ${dashboard.career.priorityGap.name} · ${dashboard.career.priorityGap.state.replaceAll("_", " ")}` : "No current priority skill gap in configured guidance."}</p>
        {dashboard.career.roadmap ? <p className="mt-2 text-xs text-[#737373]">Career roadmap · {dashboard.career.roadmap.progress}% recorded</p> : null}
        {dashboard.projects?.length ? <p className="mt-2 text-xs text-[#737373]">{dashboard.projects.length} in-progress or completed career-linked project records.</p> : <p className="mt-2 text-xs text-[#737373]">No career-linked project evidence recorded yet.</p>}
        <Link to="/career" className="mt-4 inline-block text-sm underline underline-offset-4">Review career analysis</Link>
      </> : <><Empty>{dashboard?.career?.state === "no_goal" ? "No career goal selected. Pragati will not infer one from your studies." : "Career analysis is waiting for a configured path."}</Empty><Link to="/career" className="mt-3 inline-block text-sm underline underline-offset-4">Choose a career direction</Link></>}</Section>
    </div>
  </Container></main>;
}
