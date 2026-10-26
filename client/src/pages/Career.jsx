import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import { authService } from "@/services/auth";

const pageClass = "min-h-screen bg-[#F7F5F0] text-[#171717]";

function Panel({ title, children, className = "" }) {
  return <section className={`border border-[#E5E1D8] bg-[#FBFAF7] p-5 md:p-6 ${className}`}><h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#737373]">{title}</h2>{children}</section>;
}

function Header({ eyebrow, title, text }) {
  return <header className="mb-10 border-b border-[#E5E1D8] pb-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#737373]">{eyebrow}</p><h1 className="mt-4 text-4xl font-black tracking-[-0.06em] md:text-6xl">{title}</h1><p className="mt-4 max-w-2xl text-base leading-7 text-[#737373]">{text}</p></div><nav className="flex flex-wrap gap-4 text-sm text-[#737373]" aria-label="Career navigation"><Link to="/career">Career</Link><Link to="/career/roadmap">Roadmap</Link><Link to="/projects">Projects</Link></nav></div></header>;
}

function Notice({ children, error = false }) {
  return <p role={error ? "alert" : "status"} className={`border p-4 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-[#E5E1D8] bg-[#FBFAF7] text-[#737373]"}`}>{children}</p>;
}

function useCareerSetup(preferredGoalId = "") {
  const [paths, setPaths] = useState([]);
  const [goals, setGoals] = useState([]);
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    setError("");
    try {
      const [nextPaths, nextGoals] = await Promise.all([authService.getCareerPaths(), authService.getCareerGoals()]);
      setPaths(nextPaths);
      setGoals(nextGoals);
      setSelectedGoalId((current) => nextGoals.some((goal) => goal.id === preferredGoalId)
        ? preferredGoalId
        : nextGoals.some((goal) => goal.id === current) ? current : nextGoals.find((goal) => goal.status === "active")?.id || nextGoals[0]?.id || "");
    } catch (requestError) {
      setError(requestError.message || "Unable to load career information.");
    } finally {
      setLoading(false);
    }
  }, [preferredGoalId]);
  useEffect(() => { reload(); }, [reload]);
  return { paths, goals, selectedGoalId, setSelectedGoalId, loading, error, reload };
}

function GoalSelector({ goals, value, onChange }) {
  if (!goals.length) return null;
  return <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">Career goal
    <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 block w-full border border-[#E5E1D8] bg-[#F7F5F0] px-3 py-2 text-sm font-normal normal-case tracking-normal text-[#171717] outline-none focus:border-[#171717]">
      {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}{goal.status !== "active" ? ` · ${goal.status}` : ""}</option>)}
    </select>
  </label>;
}

function EvidenceState({ state }) {
  const labels = {
    demonstrated: "Demonstrated · student-recorded",
    developing: "Learning/practice evidence",
    self_reported: "Self-reported",
    not_yet_demonstrated: "No evidence recorded",
    insufficient_evidence: "Insufficient evidence"
  };
  return <span className="inline-flex border border-[#D8D0C1] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5E5A52]">{labels[state] || state}</span>;
}

export function Career() {
  const location = useLocation();
  const setup = useCareerSetup(location.state?.goalId || "");
  const [analysis, setAnalysis] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [form, setForm] = useState({ title: "", careerPathId: "", category: "", experienceLevel: "exploring", preferredIndustries: "", shortTermGoal: "", longTermGoal: "", availableHoursPerWeek: "", targetMilestone: "", preferredProjectTypes: "", existingExperience: "", deadline: "" });
  const [creating, setCreating] = useState(false);
  const [savingEvidence, setSavingEvidence] = useState("");
  const [evidenceDetails, setEvidenceDetails] = useState({});
  const [evidenceSource, setEvidenceSource] = useState("self_reported");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!setup.selectedGoalId) {
      setAnalysis(null);
      setRoadmap(null);
      return;
    }
    let cancelled = false;
    Promise.all([
      authService.getCareerAnalysis(setup.selectedGoalId),
      authService.getCareerRoadmap(setup.selectedGoalId)
    ]).then(([nextAnalysis, nextRoadmap]) => {
      if (!cancelled) {
        setAnalysis(nextAnalysis);
        setRoadmap(nextRoadmap);
      }
    }).catch((requestError) => {
      if (!cancelled) setError(requestError.message || "Unable to load this career analysis.");
    });
    return () => { cancelled = true; };
  }, [setup.selectedGoalId]);

  async function createGoal(event) {
    event.preventDefault();
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const goal = await authService.createCareerGoal({
        ...form,
        availableHoursPerWeek: form.availableHoursPerWeek ? Number(form.availableHoursPerWeek) : undefined,
        preferredIndustries: form.preferredIndustries.split(",").map((value) => value.trim()).filter(Boolean),
        preferredProjectTypes: form.preferredProjectTypes.split(",").map((value) => value.trim()).filter(Boolean),
        careerPathId: form.careerPathId || undefined,
        deadline: form.deadline || undefined
      });
      await setup.reload();
      setup.setSelectedGoalId(goal.id);
      setForm({ title: "", careerPathId: "", category: "", experienceLevel: "exploring", preferredIndustries: "", shortTermGoal: "", longTermGoal: "", availableHoursPerWeek: "", targetMilestone: "", preferredProjectTypes: "", existingExperience: "", deadline: "" });
      setNotice("Career goal saved. Its requirements remain separate from your skill evidence.");
    } catch (requestError) {
      setError(requestError.message || "Unable to save this career goal.");
    } finally {
      setCreating(false);
    }
  }

  async function recordEvidence(skillId, detail) {
    setSavingEvidence(skillId);
    setError("");
    setNotice("");
    try {
      await authService.addCareerSkillEvidence({ skillId, source: evidenceSource, detail });
      setAnalysis(await authService.getCareerAnalysis(setup.selectedGoalId));
      setNotice("Your skill record was saved as student-provided evidence.");
    } catch (requestError) {
      setError(requestError.message || "Unable to save skill evidence.");
    } finally {
      setSavingEvidence("");
    }
  }

  async function pauseGoal(goal) {
    setError("");
    try {
      await authService.pauseCareerGoal(goal.id);
      await setup.reload();
      setNotice("Career goal paused. Its roadmap progress has been retained.");
    } catch (requestError) {
      setError(requestError.message || "Unable to pause this goal.");
    }
  }

  async function activateGoal(goal) {
    setError("");
    try {
      await authService.updateCareerGoal(goal.id, { status: "active" });
      await setup.reload();
      setNotice("Career goal reactivated. Its roadmap progress has been retained.");
    } catch (requestError) {
      setError(requestError.message || "Unable to reactivate this goal.");
    }
  }

  const selectedGoal = setup.goals.find((goal) => goal.id === setup.selectedGoalId);
  return <main className={pageClass}><Container className="py-8 md:py-14">
    <Header eyebrow="CAREER INTELLIGENCE" title="YOUR CAREER PATH" text="Connect a career direction you choose to real skill records, learning actions, and project evidence." />
    {(setup.loading) ? <Notice>Loading career goals and configured guidance…</Notice> : null}
    {setup.error ? <Notice error>{setup.error}</Notice> : null}
    {error ? <div className="mb-5"><Notice error>{error}</Notice></div> : null}
    {notice ? <div className="mb-5"><Notice>{notice}</Notice></div> : null}

    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Panel title="Set a career direction">
        <form className="space-y-4" onSubmit={createGoal}>
          <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">Career title
            <input required minLength={2} maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="For example, Product Designer" className="mt-2 w-full border border-[#E5E1D8] bg-[#F7F5F0] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#171717] outline-none focus:border-[#171717]" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">Configured guidance
              <select value={form.careerPathId} onChange={(event) => {
                const path = setup.paths.find((item) => item.id === event.target.value);
                setForm({ ...form, careerPathId: event.target.value, category: path?.category || form.category, title: form.title || path?.title || "" });
              }} className="mt-2 w-full border border-[#E5E1D8] bg-[#F7F5F0] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#171717] outline-none focus:border-[#171717]">
                <option value="">Custom career direction</option>
                {setup.paths.map((path) => <option key={path.id} value={path.id}>{path.title}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">Current stage
              <select value={form.experienceLevel} onChange={(event) => setForm({ ...form, experienceLevel: event.target.value })} className="mt-2 w-full border border-[#E5E1D8] bg-[#F7F5F0] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#171717] outline-none focus:border-[#171717]">
                <option value="exploring">Exploring</option><option value="beginner">Beginning</option><option value="intermediate">Intermediate</option><option value="experienced">Experienced</option>
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">Career category
              <input maxLength={80} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Optional, for example Design" className="mt-2 w-full border border-[#E5E1D8] bg-[#F7F5F0] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#171717] outline-none focus:border-[#171717]" />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">Preferred industries
              <input maxLength={500} value={form.preferredIndustries} onChange={(event) => setForm({ ...form, preferredIndustries: event.target.value })} placeholder="Comma-separated, optional" className="mt-2 w-full border border-[#E5E1D8] bg-[#F7F5F0] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#171717] outline-none focus:border-[#171717]" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">Available hours / week
              <input type="number" min="1" max="112" value={form.availableHoursPerWeek} onChange={(event) => setForm({ ...form, availableHoursPerWeek: event.target.value })} placeholder="Optional" className="mt-2 w-full border border-[#E5E1D8] bg-[#F7F5F0] px-3 py-3 text-sm font-normal text-[#171717] outline-none focus:border-[#171717]" />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">Target date
              <input type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} className="mt-2 w-full border border-[#E5E1D8] bg-[#F7F5F0] px-3 py-3 text-sm font-normal text-[#171717] outline-none focus:border-[#171717]" />
            </label>
          </div>
          <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">Short-term milestone
            <input maxLength={200} value={form.targetMilestone} onChange={(event) => setForm({ ...form, targetMilestone: event.target.value })} placeholder="Optional milestone you want to reach" className="mt-2 w-full border border-[#E5E1D8] bg-[#F7F5F0] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#171717] outline-none focus:border-[#171717]" />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">Short-term goal
            <textarea maxLength={500} rows={2} value={form.shortTermGoal} onChange={(event) => setForm({ ...form, shortTermGoal: event.target.value })} placeholder="What would meaningful progress look like next?" className="mt-2 w-full border border-[#E5E1D8] bg-[#F7F5F0] p-3 text-sm font-normal normal-case tracking-normal text-[#171717] outline-none focus:border-[#171717]" />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">Long-term goal
            <textarea maxLength={500} rows={2} value={form.longTermGoal} onChange={(event) => setForm({ ...form, longTermGoal: event.target.value })} placeholder="Optional longer-range direction" className="mt-2 w-full border border-[#E5E1D8] bg-[#F7F5F0] p-3 text-sm font-normal normal-case tracking-normal text-[#171717] outline-none focus:border-[#171717]" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">Preferred project types
              <input maxLength={500} value={form.preferredProjectTypes} onChange={(event) => setForm({ ...form, preferredProjectTypes: event.target.value })} placeholder="Comma-separated, optional" className="mt-2 w-full border border-[#E5E1D8] bg-[#F7F5F0] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#171717] outline-none focus:border-[#171717]" />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">Existing skills / experience
              <textarea maxLength={1000} rows={2} value={form.existingExperience} onChange={(event) => setForm({ ...form, existingExperience: event.target.value })} placeholder="Your description; not verified skill evidence" className="mt-2 w-full border border-[#E5E1D8] bg-[#F7F5F0] p-3 text-sm font-normal normal-case tracking-normal text-[#171717] outline-none focus:border-[#171717]" />
            </label>
          </div>
          <Button type="submit" disabled={creating}>{creating ? "Saving goal…" : "Save career goal →"}</Button>
        </form>
      </Panel>

      <Panel title="Configured career paths">
        <p className="mb-4 text-sm leading-6 text-[#737373]">A transparent Pragati learning guide, not a verified industry standard or live job-market source. A custom title is valid; without configured requirements, analysis will say so.</p>
        <div className="space-y-3">{setup.paths.map((path) => <div key={path.id} className="border-b border-[#EEEAE2] pb-3 last:border-0"><p className="font-semibold">{path.title}</p><p className="mt-1 text-sm leading-6 text-[#737373]">{path.description}</p><p className="mt-2 text-[10px] uppercase tracking-[0.1em] text-[#737373]">{path.skills.length} configured skills · {path.version}</p></div>)}</div>
      </Panel>
    </div>

    {setup.goals.length ? <section className="mt-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <GoalSelector goals={setup.goals} value={setup.selectedGoalId} onChange={setup.setSelectedGoalId} />
        {selectedGoal?.status === "active" ? <button type="button" onClick={() => pauseGoal(selectedGoal)} className="text-sm text-[#737373] underline underline-offset-4">Pause this goal</button> : selectedGoal ? <button type="button" onClick={() => activateGoal(selectedGoal)} className="text-sm text-[#737373] underline underline-offset-4">Reactivate this goal</button> : null}
      </div>
      {selectedGoal ? <p className="text-xs leading-5 text-[#737373]">Stage recorded: {selectedGoal.careerDetails?.experienceLevel || "exploring"}{selectedGoal.careerDetails?.availableHoursPerWeek ? ` · ${selectedGoal.careerDetails.availableHoursPerWeek} hours/week available` : ""}{selectedGoal.deadline ? ` · target date ${new Date(selectedGoal.deadline).toLocaleDateString()}` : ""}{selectedGoal.careerDetails?.existingExperience ? " · experience description is self-reported, not skill evidence" : ""}</p> : null}
      {analysis ? <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <Panel title={`Skill evidence · ${selectedGoal?.title || "Career goal"}`}>
          <p className="mb-5 text-sm leading-6 text-[#737373]">{analysis.message}</p>
          {analysis.state === "insufficient_data" ? <Notice>{analysis.message}</Notice> : <>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Count label="Demonstrated" value={analysis.summary.demonstrated} />
              <Count label="Developing" value={analysis.summary.developing} />
              <Count label="Insufficient evidence" value={analysis.summary.insufficientEvidence} />
              <Count label="Self-reported" value={analysis.summary.selfReported} />
              <Count label="No evidence" value={analysis.summary.notYetDemonstrated} />
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <label className="text-xs text-[#737373]">Record as
                <select value={evidenceSource} onChange={(event) => setEvidenceSource(event.target.value)} className="ml-2 border border-[#E5E1D8] bg-[#F7F5F0] px-2 py-1 text-xs text-[#171717]">
                  <option value="self_reported">Self-reported</option><option value="learning">Learning recorded</option><option value="practice">Practice recorded</option>
                </select>
              </label>
              <span className="text-[10px] text-[#737373]">Student-provided records; not independently verified.</span>
            </div>
            <div className="space-y-4">{analysis.requiredSkills.map((skill) => <article key={skill.id} className="border-b border-[#EEEAE2] pb-4 last:border-0">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">{skill.name}</h3><p className="mt-1 text-xs text-[#737373]">{skill.category} · {skill.importance} configured requirement{skill.priority ? ` · ${skill.priority} priority` : ""}</p></div><EvidenceState state={skill.state} /></div>
              <p className="mt-3 text-sm leading-6 text-[#737373]">{skill.explanation}</p>
              <p className="mt-2 text-xs leading-5"><b>Suggested action:</b> {skill.recommendedAction}</p>
              <p className="mt-1 text-xs leading-5"><b>Progress measure:</b> {skill.measurement}</p>
              {skill.evidence.length ? <ul className="mt-3 space-y-1 text-xs text-[#737373]">{skill.evidence.map((item, index) => <li key={`${skill.id}-${item.source}-${index}`}>{item.source.replaceAll("_", " ")}{item.detail ? ` · ${item.detail}` : ""}{item.repositoryUrl ? <> · <a className="underline" href={item.repositoryUrl} target="_blank" rel="noreferrer">recorded repository</a></> : ""}</li>)}</ul> : null}
              {skill.state !== "demonstrated" ? <div className="mt-3 flex flex-wrap items-center gap-3">
                <input maxLength={500} value={evidenceDetails[skill.id] || ""} onChange={(event) => setEvidenceDetails((current) => ({ ...current, [skill.id]: event.target.value }))} placeholder="Optional note or evidence reference" className="min-w-48 flex-1 border border-[#E5E1D8] bg-[#F7F5F0] px-3 py-2 text-xs outline-none focus:border-[#171717]" />
                <button type="button" disabled={savingEvidence === skill.id} onClick={() => recordEvidence(skill.id, evidenceDetails[skill.id] || "")} className="text-xs font-semibold underline underline-offset-4 disabled:opacity-50">{savingEvidence === skill.id ? "Saving…" : "Record evidence for this skill"}</button>
              </div> : null}
            </article>)}</div>
          </>}
        </Panel>
        <div className="space-y-6">
          <Panel title="Next career action" className="border-[#171717]">
            {analysis.nextAction ? <><h2 className="text-2xl font-black">{analysis.nextAction.title}</h2><p className="mt-3 text-sm leading-6 text-[#737373]">{analysis.nextAction.reason}</p><p className="mt-3 text-xs leading-5 text-[#737373]">{analysis.nextAction.action}</p><Button as={Link} to={analysis.nextAction.route} className="mt-5 w-full">Explore supporting action →</Button></> : <p className="text-sm leading-6 text-[#737373]">No configured skill gaps remain. This is not a job-readiness certification.</p>}
          </Panel>
          {roadmap ? <Panel title="Career roadmap progress">
            <p className="text-3xl font-black">{roadmap.progress}%</p>
            <p className="mt-2 text-sm text-[#737373]">{roadmap.items.filter((item) => item.status === "completed").length} of {roadmap.items.length} recorded milestones completed.</p>
            <p className="mt-3 text-xs text-[#737373]">Progress reflects roadmap task status only; it does not automatically demonstrate a skill.</p>
            <Button as={Link} to="/career/roadmap" variant="secondary" className="mt-5 w-full">View roadmap →</Button>
          </Panel> : null}
          <Panel title="What this analysis means"><p className="text-sm leading-6 text-[#737373]">A missing record means “not yet demonstrated here,” not “does not know.” One learning/practice record is insufficient evidence; two or more student-recorded entries are labeled developing, not expert. Student-reported claims, learning records, and completed project evidence remain distinct. Completed project evidence is not independently verified.</p><p className="mt-3 text-xs text-[#737373]">{analysis.provenance || "Configured Pragati educational guidance."}</p><p className="mt-3 text-xs leading-5 text-[#737373]">Available hours and target dates are stored, but this roadmap does not estimate durations or claim a deadline is achievable where no reviewed estimates exist.</p></Panel>
        </div>
      </div> : <Notice>Loading your career evidence…</Notice>}
      <div className="flex flex-wrap gap-3"><Button as={Link} to="/career/roadmap" variant="secondary">Open career roadmap</Button><Button as={Link} to="/projects" variant="secondary">View project suggestions</Button></div>
    </section> : <Panel title="Start with a goal" className="mt-8"><p className="text-sm leading-6 text-[#737373]">Choose or enter a career direction above. Pragati will not infer a career ambition from your academic record.</p></Panel>}
  </Container></main>;
}

function Count({ label, value }) {
  return <div className="border border-[#E5E1D8] p-3"><p className="text-2xl font-black">{value}</p><p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-[#737373]">{label}</p></div>;
}

export function CareerRoadmap() {
  const location = useLocation();
  const setup = useCareerSetup(location.state?.goalId || "");
  const [data, setData] = useState(null);
  const [busyItem, setBusyItem] = useState("");
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState("");

  const loadRoadmap = useCallback(async (goalId = setup.selectedGoalId) => {
    if (!goalId) { setData(null); return; }
    setError("");
    try { setData(await authService.getCareerRoadmap(goalId)); }
    catch (requestError) { setError(requestError.message || "Unable to load the career roadmap."); }
  }, [setup.selectedGoalId]);
  useEffect(() => { loadRoadmap(); }, [loadRoadmap]);

  async function updateItem(item, status) {
    setBusyItem(item.id);
    setError("");
    try {
      await authService.updateCareerRoadmapItem(item.id, status);
      await loadRoadmap();
    } catch (requestError) {
      setError(requestError.message || "Unable to update this roadmap milestone.");
    } finally {
      setBusyItem("");
    }
  }

  async function recalculate() {
    setRecalculating(true);
    setError("");
    try { setData(await authService.recalculateCareerRoadmap(setup.selectedGoalId)); }
    catch (requestError) { setError(requestError.message || "Unable to recalculate the roadmap."); }
    finally { setRecalculating(false); }
  }

  return <main className={pageClass}><Container className="py-8 md:py-14"><Header eyebrow="CAREER ROADMAP" title="MILESTONES THAT BUILD EVIDENCE" text="Each task is tied to a configured skill. Recalculation adds missing future work without deleting completed milestones." />
    {setup.loading ? <Notice>Loading career goals…</Notice> : null}
    {setup.error ? <Notice error>{setup.error}</Notice> : null}
    {error ? <div className="mb-5"><Notice error>{error}</Notice></div> : null}
    {setup.goals.length ? <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><GoalSelector goals={setup.goals} value={setup.selectedGoalId} onChange={setup.setSelectedGoalId} /><Button type="button" variant="secondary" disabled={!setup.selectedGoalId || recalculating} onClick={recalculate}>{recalculating ? "Recalculating…" : "Recalculate future milestones"}</Button></div> : null}
    {!setup.loading && !setup.goals.length ? <Notice>Create a career goal to generate a personalized roadmap.</Notice> : null}
    {data?.state === "insufficient_data" ? <Notice>{data.message}</Notice> : null}
    {data?.state === "available" ? <>
      <Panel title={data.goal.title}>
        <p className="text-3xl font-black">{data.roadmap.progress}%</p>
        <p className="mt-2 text-sm text-[#737373]">{data.items.filter((item) => item.status === "completed").length} of {data.items.length} milestone statuses recorded complete.</p>
        {data.items.length ? <div className="mt-6 space-y-3">{data.items.map((item, index) => <article key={item.id} className="border border-[#E5E1D8] p-4">
          <div className="flex flex-wrap items-center gap-3"><span className="font-mono text-xs text-[#737373]">{String(index + 1).padStart(2, "0")}</span><h2 className="flex-1 font-semibold">{item.title}</h2><span className="text-[10px] uppercase tracking-[0.1em] text-[#737373]">{item.status.replaceAll("_", " ")}</span></div>
          <p className="mt-2 text-sm leading-6 text-[#737373]">{item.rationale}</p>
          <div className="mt-4 flex flex-wrap gap-3">{item.actionRoute ? <Link to={item.actionRoute} className="text-xs font-semibold underline underline-offset-4">Open supporting action →</Link> : null}
            {item.status !== "completed" ? <button type="button" disabled={busyItem === item.id} onClick={() => updateItem(item, item.status === "in_progress" ? "completed" : "in_progress")} className="text-xs font-semibold underline underline-offset-4 disabled:opacity-50">{busyItem === item.id ? "Saving…" : item.status === "in_progress" ? "Mark milestone complete" : "Start milestone"}</button> : <span className="text-xs text-[#737373]">Completed status retained; does not itself demonstrate the skill.</span>}
          </div>
        </article>)}</div> : <p className="mt-5 text-sm text-[#737373]">No milestones need to be added for the current configured requirements.</p>}
      </Panel>
      <p className="mt-4 text-xs leading-5 text-[#737373]">Time estimates and academic resource links are omitted when Pragati has no supported source for them. Roadmap completion is not a certification.</p>
    </> : null}
  </Container></main>;
}

export function Projects() {
  const location = useLocation();
  const setup = useCareerSetup(location.state?.goalId || "");
  const [data, setData] = useState(null);
  const [busyTemplate, setBusyTemplate] = useState("");
  const [notes, setNotes] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadProjects = useCallback(async (goalId = setup.selectedGoalId) => {
    if (!goalId) { setData(null); return; }
    setError("");
    try { setData(await authService.getCareerProjects(goalId)); }
    catch (requestError) { setError(requestError.message || "Unable to load career-linked projects."); }
  }, [setup.selectedGoalId]);
  useEffect(() => { loadProjects(); }, [loadProjects]);

  async function startProject(template) {
    setBusyTemplate(template.id);
    setError("");
    setNotice("");
    try {
      await authService.startCareerProject(setup.selectedGoalId, template.id);
      await loadProjects();
      setNotice("Project added to your career goal. It is not counted as skill evidence until you record completion.");
    } catch (requestError) {
      setError(requestError.message || "Unable to start this project.");
    } finally {
      setBusyTemplate("");
    }
  }

  async function updateProject(project, status) {
    const note = notes[project.id]?.evidence ?? project.completionEvidence;
    setBusyTemplate(project.id);
    setError("");
    setNotice("");
    try {
      await authService.updateCareerProject(project.id, {
        status,
        completionEvidence: status === "completed" ? note : undefined,
        repositoryUrl: notes[project.id]?.url ?? project.repositoryUrl
      });
      await loadProjects();
      setNotice(status === "completed" ? "Completion recorded as student-provided project evidence; it is not independently verified." : "Project progress saved.");
    } catch (requestError) {
      setError(requestError.message || "Unable to update this project.");
    } finally {
      setBusyTemplate("");
    }
  }

  const savedTemplateIds = new Set(data?.projects.map((project) => project.templateId) || []);
  return <main className={pageClass}><Container className="py-8 md:py-14"><Header eyebrow="CAREER PROJECTS" title="BUILD EVIDENCE, NOT CLAIMS" text="Project suggestions are connected to the gaps in your selected career goal. Starting a suggestion does not record a skill as demonstrated." />
    {setup.loading ? <Notice>Loading career goals…</Notice> : null}
    {setup.error ? <Notice error>{setup.error}</Notice> : null}
    {error ? <div className="mb-5"><Notice error>{error}</Notice></div> : null}
    {notice ? <div className="mb-5"><Notice>{notice}</Notice></div> : null}
    {setup.goals.length ? <div className="mb-6"><GoalSelector goals={setup.goals} value={setup.selectedGoalId} onChange={setup.setSelectedGoalId} /></div> : null}
    {!setup.loading && !setup.goals.length ? <Notice>Create a career goal to see relevant project suggestions.</Notice> : null}
    {data?.state === "insufficient_data" ? <Notice>{data.message}</Notice> : null}
    {data?.state === "available" ? <>
      <p className="mb-5 text-sm text-[#737373]">Goal: <b className="text-[#171717]">{data.goal.title}</b></p>
      {data.suggestions.length ? <div className="grid gap-5 lg:grid-cols-2">{data.suggestions.map((project) => <Panel key={project.id} title={`${project.level} configured suggestion`}>
        <h2 className="text-2xl font-black">{project.title}</h2><p className="mt-3 text-sm leading-6 text-[#737373]">{project.problem}</p>
        <p className="mt-4 text-sm leading-6">{project.rationale}</p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-[#737373]">Skills practised</p>
        <div className="mt-2 flex flex-wrap gap-2">{project.skillIds.map((skillId) => <span key={skillId} className="border border-[#E5E1D8] px-2 py-1 text-xs">{skillId.replaceAll("-", " ")}</span>)}</div>
        <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.1em] text-[#737373]">Deliverables</h3><ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[#737373]">{project.deliverables.map((item) => <li key={item}>{item}</li>)}</ul>
        <p className="mt-4 text-xs leading-5"><b>Completion criterion:</b> {project.completionCriteria}</p>
        <Button type="button" disabled={savedTemplateIds.has(project.id) || busyTemplate === project.id} onClick={() => startProject(project)} className="mt-5">{savedTemplateIds.has(project.id) ? "Added to projects" : busyTemplate === project.id ? "Adding…" : "Start this project →"}</Button>
      </Panel>)}</div> : <Panel title="No current project suggestion"><p className="text-sm leading-6 text-[#737373]">No configured project matches your recorded gaps and stated experience stage. You can review your skill evidence or choose another career direction; Pragati will not invent a project fit.</p></Panel>}
      {data.projects.length ? <section className="mt-8"><h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#737373]">Your recorded projects</h2><div className="grid gap-5 lg:grid-cols-2">{data.projects.map((project) => <Panel key={project.id} title={`Project · ${project.status.replaceAll("_", " ")}`}>
        <h3 className="text-xl font-black">{project.title}</h3><p className="mt-3 text-sm leading-6 text-[#737373]">{project.problem}</p>
        <Link to={`/projects/${project.id}`} className="mt-3 inline-block text-xs font-semibold underline underline-offset-4">Open workspace →</Link>
        <p className="mt-4 text-xs leading-5"><b>Completion criterion:</b> {project.completionCriteria}</p>
        <div className="mt-4 space-y-3">
          <label className="block text-xs text-[#737373]">Completion note (required to record completion)
            <textarea value={notes[project.id]?.evidence ?? project.completionEvidence} onChange={(event) => setNotes((current) => ({ ...current, [project.id]: { ...current[project.id], evidence: event.target.value } }))} maxLength={1000} rows={3} className="mt-1 w-full border border-[#E5E1D8] bg-[#F7F5F0] p-3 text-sm text-[#171717] outline-none focus:border-[#171717]" placeholder="Describe what you completed and the outcome." />
          </label>
          <label className="block text-xs text-[#737373]">Repository or portfolio URL (optional)
            <input value={notes[project.id]?.url ?? project.repositoryUrl} onChange={(event) => setNotes((current) => ({ ...current, [project.id]: { ...current[project.id], url: event.target.value } }))} maxLength={500} type="url" className="mt-1 w-full border border-[#E5E1D8] bg-[#F7F5F0] p-3 text-sm text-[#171717] outline-none focus:border-[#171717]" placeholder="https://…" />
          </label>
        </div>
        {project.status !== "completed" ? <Button type="button" disabled={busyTemplate === project.id} onClick={() => updateProject(project, project.status === "planned" ? "in_progress" : "completed")} className="mt-4">{busyTemplate === project.id ? "Saving…" : project.status === "planned" ? "Mark in progress" : "Record completion"}</Button> : <p className="mt-4 text-xs leading-5 text-[#737373]">Completion is student-recorded, not independently verified. Related skills show this evidence source separately.</p>}
      </Panel>)}</div></section> : null}
    </> : null}
  </Container></main>;
}

export function ProjectWorkspace() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completionEvidence, setCompletionEvidence] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const goals = await authService.getCareerGoals();
        const projectLists = await Promise.all(goals.map((goal) => authService.getCareerProjects(goal.id)));
        const match = projectLists.flatMap((list, index) => list.projects.map((item) => ({ ...item, goalTitle: goals[index].title }))).find((item) => item.id === id);
        if (!cancelled) {
          setProject(match || null);
          setCompletionEvidence(match?.completionEvidence || "");
          setRepositoryUrl(match?.repositoryUrl || "");
          if (!match) setError("This project is unavailable for your account.");
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError.message || "Unable to load this project.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  async function save(status) {
    setSaving(true);
    setError("");
    try {
      setProject(await authService.updateCareerProject(id, {
        status,
        completionEvidence: status === "completed" ? completionEvidence : undefined,
        repositoryUrl
      }));
    } catch (requestError) {
      setError(requestError.message || "Unable to update this project.");
    } finally {
      setSaving(false);
    }
  }

  return <main className={pageClass}><Container className="py-8 md:py-14"><Header eyebrow="PROJECT / WORKSPACE" title={project?.title || "PROJECT WORKSPACE"} text="Record real work and outcomes. A project suggestion is not evidence of completion or skill." />
    {loading ? <Notice>Loading project…</Notice> : null}
    {error ? <div className="mb-5"><Notice error>{error}</Notice></div> : null}
    {project ? <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <Panel title="Project brief"><p className="text-sm leading-7 text-[#737373]">{project.problem}</p><p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">Skills practised</p><div className="mt-2 flex flex-wrap gap-2">{project.skillIds.map((skill) => <span key={skill} className="border border-[#E5E1D8] px-3 py-2 text-xs">{skill.replaceAll("-", " ")}</span>)}</div><h2 className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">Expected deliverables</h2><ul className="mt-3 list-inside list-disc space-y-2 text-sm text-[#737373]">{project.deliverables.map((item) => <li key={item}>{item}</li>)}</ul><p className="mt-5 text-sm leading-6"><b>Completion criterion:</b> {project.completionCriteria}</p></Panel>
        <Panel title="Completion evidence"><label className="block text-sm text-[#737373]">What did you complete? Describe the outcome.
          <textarea value={completionEvidence} onChange={(event) => setCompletionEvidence(event.target.value)} maxLength={1000} rows={5} className="mt-2 w-full border border-[#E5E1D8] bg-[#F7F5F0] p-3 text-sm text-[#171717] outline-none focus:border-[#171717]" placeholder="Student-recorded completion notes…" />
        </label><label className="mt-4 block text-sm text-[#737373]">Repository or portfolio URL (optional)
          <input type="url" maxLength={500} value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} className="mt-2 w-full border border-[#E5E1D8] bg-[#F7F5F0] p-3 text-sm text-[#171717] outline-none focus:border-[#171717]" placeholder="https://…" />
        </label><div className="mt-5 flex flex-wrap gap-3">{project.status === "planned" ? <Button type="button" disabled={saving} onClick={() => save("in_progress")}>{saving ? "Saving…" : "Start project"}</Button> : null}{project.status !== "completed" ? <Button type="button" disabled={saving} onClick={() => save("completed")}>{saving ? "Saving…" : "Record completion"}</Button> : <p className="text-xs leading-5 text-[#737373]">This is student-recorded evidence and is not independently verified.</p>}</div></Panel>
      </div>
      <Panel title="Project status"><p className="text-2xl font-black">{project.status.replaceAll("_", " ")}</p><p className="mt-3 text-sm leading-6 text-[#737373]">{project.rationale}</p><p className="mt-4 text-xs text-[#737373]">Career goal: {project.goalTitle || project.goalId}</p><Button as={Link} to="/projects" variant="secondary" className="mt-5">Back to career projects</Button></Panel>
    </div> : null}
  </Container></main>;
}
