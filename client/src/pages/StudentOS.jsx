import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import { authService } from "@/services/auth";

function Panel({ title, children, className = "" }) {
  return <section className={`border border-[#E5E1D8] bg-[#FBFAF7] p-5 md:p-6 ${className}`}><h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#737373]">{title}</h2>{children}</section>;
}

function Header({ eyebrow, title, text }) {
  return <header className="mb-10 border-b border-[#E5E1D8] pb-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#737373]">{eyebrow}</p><h1 className="mt-4 text-4xl font-black tracking-[-0.06em] md:text-6xl">{title}</h1><p className="mt-4 max-w-2xl text-base leading-7 text-[#737373]">{text}</p></div><nav className="flex flex-wrap gap-4 text-sm text-[#737373]" aria-label="Student OS navigation"><Link to="/command">Command</Link><Link to="/today">Today</Link><Link to="/notifications">Actions</Link></nav></div></header>;
}

function useRecommendations() {
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    setError("");
    try {
      setRecommendations(await authService.getNextActions());
    } catch (requestError) {
      setError(requestError.message || "Unable to load recommendations.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refresh(); }, []);
  return { recommendations, error, loading, refresh };
}

function Recommendation({ item, onDismiss, dismissing }) {
  return <article className="border-b border-[#EEEAE2] py-4 last:border-0"><div className="flex flex-wrap items-start gap-3"><span className="w-24 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#737373]">{(item.actionType || item.goalType || "ACTION").replaceAll("_", " ")}</span><div className="min-w-0 flex-1"><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-sm leading-6 text-[#737373]">{item.reason}</p><p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[#737373]">{[item.estimatedMinutes ? `${item.estimatedMinutes} min` : null, item.priority, item.context].filter(Boolean).join(" · ") || `${item.confidence || "Available"} confidence`}</p></div><Button as={Link} to={item.route || "/study"} state={item.navigation || undefined} size="sm">{item.actionLabel || "Open"} →</Button></div>{onDismiss ? <button type="button" disabled={dismissing} onClick={() => onDismiss(item.id)} className="ml-24 mt-2 text-xs underline underline-offset-4 disabled:opacity-50">{dismissing ? "Dismissing…" : "Dismiss recommendation"}</button> : null}</article>;
}

function RecommendationList({ data, loading, error, onDismiss, dismissing }) {
  const items = data ? [data.primary, ...(data.alternatives || [])].filter(Boolean) : [];
  if (loading) return <p className="text-sm text-[#737373]">Loading recommendations from your saved records...</p>;
  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  if (!items.length) return <p className="text-sm leading-6 text-[#737373]">{data?.message || "There are no recommendations from your current records. Add study topics or complete a learning activity to build useful context."}</p>;
  return <div className="divide-y divide-[#EEEAE2]">{items.map((item) => <Recommendation key={item.id} item={item} onDismiss={onDismiss} dismissing={dismissing === item.id} />)}</div>;
}

export function CommandCenter() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [subjects, setSubjects] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([authService.getStudentSubjects(), authService.getNextActions()])
      .then(([studyData, actionData]) => {
        setSubjects(studyData.subjects || []);
        setRecommendations([actionData.primary, ...(actionData.alternatives || [])].filter(Boolean));
      })
      .catch((requestError) => setError(requestError.message || "Unable to load your study commands."));
  }, []);
  const commands = useMemo(() => [
    { id: "study", label: "Open study space", route: "/study", category: "NAVIGATION" },
    { id: "practice", label: "Start practice", route: "/practice", category: "NAVIGATION" },
    { id: "learn", label: "Explain a concept", route: "/learn", category: "NAVIGATION" },
    { id: "memory", label: "Review memory", route: "/memory", category: "NAVIGATION" },
    { id: "career", label: "Open career plan", route: "/career", category: "NAVIGATION" },
    ...subjects.map((subject) => ({ id: `subject-${subject.id}`, label: `Study ${subject.name}`, route: "/roadmap", category: "SUBJECTS" })),
    ...subjects.flatMap((subject) => subject.topics.map((topic) => ({
      id: `topic-${topic.id}`,
      label: `Learn ${topic.name}`,
      route: "/learn",
      state: { concept: topic.name, subjectId: subject.id, topicId: topic.id },
      category: "TOPICS"
    }))),
    ...recommendations.map((item) => ({ id: item.id, label: item.title, route: item.route || "/study", state: item.navigation, category: "ACTIONS" }))
  ], [subjects, recommendations]);
  const filtered = useMemo(() => commands.filter((item) => item.label.toLowerCase().includes(query.toLowerCase().trim())), [commands, query]);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }
      if (event.key === "Escape") setOpen(false);
      if (!open || !filtered.length) return;
      if (event.key === "ArrowDown") { event.preventDefault(); setIndex((value) => (value + 1) % filtered.length); }
      if (event.key === "ArrowUp") { event.preventDefault(); setIndex((value) => (value - 1 + filtered.length) % filtered.length); }
      if (event.key === "Enter") { event.preventDefault(); navigate(filtered[index].route, { state: filtered[index].state }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, index, navigate, open]);
  useEffect(() => setIndex(0), [query]);

  return <main className="min-h-screen bg-[#F7F5F0] text-[#171717]"><Container className="py-8 md:py-14"><Header eyebrow="PRAGATI / COMMAND" title="COMMAND CENTER" text="Find your saved subjects, topics, recommendations, and study tools." /><div className="mx-auto max-w-3xl">
    {error ? <p role="alert" className="mb-4 border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
    <Panel title="Search your study space" className="border-[#171717]"><div className="flex items-center gap-3 border border-[#171717] bg-white px-4 py-4"><span className="font-mono text-sm text-[#737373]">⌘ K</span><input ref={inputRef} autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} placeholder="Search subjects, topics, or actions..." aria-label="Search Pragati" className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-[#A3A3A3]" /><kbd className="hidden border border-[#E5E1D8] px-2 py-1 text-[10px] text-[#737373] sm:block">CTRL K</kbd></div><p className="mt-3 text-xs text-[#737373]">Use ↑ ↓ to navigate · Enter to open · Esc to close</p></Panel>
    {open ? <Panel title={query ? "Matching saved items" : "Available actions"} className="mt-4">{filtered.length ? <div>{filtered.map((item) => <button type="button" key={item.id} onClick={() => navigate(item.route, { state: item.state })} className={`flex w-full items-center justify-between border-b border-[#EEEAE2] px-3 py-3 text-left text-sm hover:bg-[#F7F5F0] ${filtered[index]?.id === item.id ? "bg-[#F7F5F0] font-semibold" : ""}`}><span><span className="mr-3 text-[10px] uppercase tracking-[0.12em] text-[#737373]">{item.category}</span>{item.label}</span><span className="text-xs text-[#737373]">Enter ↵</span></button>)}</div> : <p className="text-sm text-[#737373]">No matching saved subjects, topics, or actions.</p>}</Panel> : <Panel title="Search closed" className="mt-4"><button type="button" onClick={() => { setOpen(true); inputRef.current?.focus(); }} className="text-sm underline underline-offset-4">Open command search</button></Panel>}
    <Panel title="Recommended next actions" className="mt-4"><RecommendationList data={recommendations.length ? { primary: recommendations[0], alternatives: recommendations.slice(1) } : null} loading={false} error="" /></Panel>
  </div></Container></main>;
}

export function Notifications() {
  const { recommendations, error, loading, refresh } = useRecommendations();
  const [dismissing, setDismissing] = useState("");
  const [dismissError, setDismissError] = useState("");
  const data = recommendations || null;
  const dismiss = async (id) => {
    setDismissing(id);
    setDismissError("");
    try { await authService.dismissNextAction(id); await refresh(); }
    catch (requestError) { setDismissError(requestError.message || "Unable to dismiss this recommendation."); }
    finally { setDismissing(""); }
  };
  return <main className="min-h-screen bg-[#F7F5F0] text-[#171717]"><Container className="py-8 md:py-14"><Header eyebrow="SYSTEM ACTIONS" title="RECOMMENDATIONS" text="Review actions based on your saved learning, memory, and career records. Dismissing an action is saved to your account." />
    <Panel title="Your current actions" className="border-[#171717]"><RecommendationList data={data} loading={loading} error={error} onDismiss={dismiss} dismissing={dismissing} />{dismissError ? <p role="alert" className="mt-4 text-sm text-red-700">{dismissError}</p> : null}</Panel>
    <div className="mt-6 flex flex-wrap gap-3"><Button as={Link} to="/today" variant="secondary">Open today →</Button><Button as={Link} to="/study" variant="secondary">Manage study space</Button></div>
  </Container></main>;
}

export function Today() {
  const { recommendations, error, loading } = useRecommendations();
  return <main className="min-h-screen bg-[#F7F5F0] text-[#171717]"><Container className="py-8 md:py-14"><Header eyebrow="PRAGATI / TODAY" title="YOUR NEXT STEPS." text="Prioritized actions are derived from your saved study and career records. No study time or completion is assumed." />
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"><Panel title="Recommended actions" className="border-[#171717]"><RecommendationList data={recommendations} loading={loading} error={error} /></Panel><div className="space-y-6"><Panel title="Study space"><p className="text-sm leading-6 text-[#737373]">Manage your manually entered subjects and topics, then open a saved topic in Learn or Practice.</p><Button as={Link} to="/study" className="mt-5 w-full">Open study space →</Button></Panel><Panel title="How recommendations work"><p className="text-sm leading-6 text-[#737373]">{recommendations?.rankingPolicy?.model ? "Recommendations use a deterministic ranking over real study records. The displayed score is a priority ordering, not a probability." : "Recommendations appear when your saved learning, practice, memory, or career records support a useful next step."}</p><Button as={Link} to="/notifications" variant="secondary" className="mt-5 w-full">Review all actions →</Button></Panel></div></div>
  </Container></main>;
}
