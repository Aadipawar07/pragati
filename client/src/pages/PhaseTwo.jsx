import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import { authService } from "@/services/auth";

function Panel({ title, children, className = "" }) {
  return <section className={`border border-[#E5E1D8] bg-[#FBFAF7] p-5 md:p-6 ${className}`}><h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#737373]">{title}</h2>{children}</section>;
}

function Header({ eyebrow, title, text }) {
  return <header className="mb-10 border-b border-[#E5E1D8] pb-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#737373]">{eyebrow}</p><h1 className="mt-4 text-4xl font-black tracking-[-0.06em] md:text-6xl">{title}</h1><p className="mt-4 max-w-2xl text-base leading-7 text-[#737373]">{text}</p></div><nav className="flex flex-wrap gap-4 text-sm text-[#737373]" aria-label="Learning tools"><Link to="/mentor">Mentor</Link><Link to="/knowledge">Knowledge</Link><Link to="/mindmap">Mind map</Link><Link to="/resources">Resources</Link></nav></div></header>;
}

const mentorPrompts = ["Why is this my recommended next action?", "Help me plan a study session around my available time.", "How can I use my practice results to decide what to review?"];

export function Mentor() {
  const [mode, setMode] = useState("TODAY");
  const [why, setWhy] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [mentorResponse, setMentorResponse] = useState(null);
  const [mentorError, setMentorError] = useState("");
  const [mentorLoading, setMentorLoading] = useState(false);
  const [careerContext, setCareerContext] = useState(null);
  const [nextActions, setNextActions] = useState(null);
  const [contextError, setContextError] = useState("");

  useEffect(() => {
    authService.getCareerContext().then(setCareerContext).catch((error) => setContextError(error.message || "Career context is unavailable."));
    authService.getNextActions().then(setNextActions).catch((error) => setContextError(error.message || "Next action is unavailable."));
  }, []);

  const ask = async (message) => {
    const nextMessage = message.trim();
    if (!nextMessage) return;
    setPrompt(nextMessage);
    setMentorLoading(true);
    setMentorError("");
    try {
      const response = await authService.askMentor(`${nextMessage}\n\nMentor focus: ${mode}. Explain the selected next action without changing its ranking.`);
      setMentorResponse(response);
      setNextActions((current) => current ? {
        ...current,
        state: response.nextAction ? "available" : "no_action",
        primary: response.nextAction,
        alternatives: response.alternatives,
        message: response.nextAction ? null : response.message
      } : current);
    } catch (error) {
      setMentorError(error.message || "Mentor is unavailable.");
    } finally {
      setMentorLoading(false);
    }
  };

  const primary = nextActions?.primary;
  return <main className="min-h-screen bg-[#F7F5F0] text-[#171717]"><Container className="py-8 md:py-14">
    <Header eyebrow="AI MENTOR" title="WHAT SHOULD YOU DO NEXT?" text="Pragati explains recommendations grounded in your saved learning, memory, and career records." />
    <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
      <Panel title="Recommended next action" className="bg-[#171717] text-[#F7F5F0]">
        {primary ? <><p className="text-xs uppercase tracking-[0.16em] text-[#B8AEA0]">{primary.goalType} · {primary.confidence}-confidence evidence</p><h2 className="mt-4 text-3xl font-black">{primary.title}</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-[#D8D0C1]">{mentorResponse?.message || primary.reason}</p><div className="mt-7 flex flex-wrap gap-3"><Button as={Link} to={primary.route} state={primary.navigation || undefined} className="!bg-[#F7F5F0] !text-[#171717]">Open this action →</Button><button type="button" onClick={() => ask("Why is this the recommended next action?")} className="border border-[#737373] px-4 py-2 text-sm">{mentorLoading ? "Thinking…" : "Ask why"}</button><button type="button" onClick={() => setWhy((value) => !value)} className="border border-[#737373] px-4 py-2 text-sm">{why ? "Hide evidence" : "Show evidence"}</button></div>{mentorResponse?.aiStatus === "unavailable" ? <p className="mt-4 text-xs text-[#D8D0C1]">AI is unavailable; this deterministic recommendation is still available.</p> : null}{why ? <div className="mt-6 border-t border-[#404040] pt-5 text-sm text-[#D8D0C1]"><p>{primary.rankingReasons?.join(" ")}</p><ul className="mt-3 space-y-1">{primary.evidence?.map((item, index) => <li key={`${item.type}-${index}`}>Evidence: {item.type.replaceAll("_", " ")}</li>)}</ul></div> : null}</> : <p className="text-sm leading-7 text-[#D8D0C1]">{nextActions?.message || "Loading recommendations from your saved records…"}</p>}
        {contextError ? <p className="mt-4 text-xs text-red-200" role="alert">{contextError}</p> : null}
      </Panel>
      <Panel title="Career context">{careerContext?.goal ? <><p className="text-lg font-black">{careerContext.goal.title}</p><p className="mt-2 text-sm text-[#737373]">{careerContext.priorityGap ? `Priority gap · ${careerContext.priorityGap.name} · ${careerContext.priorityGap.state.replaceAll("_", " ")}` : careerContext.state === "insufficient_data" ? "Configured skill requirements are unavailable for this custom career." : "No current configured priority gap."}</p><p className="mt-2 text-xs text-[#737373]">{careerContext.projects?.length || 0} saved career-linked projects</p></> : <p className="text-sm text-[#737373]">{careerContext?.state === "no_goal" ? "No career direction selected." : careerContext?.state === "unavailable" ? "Career context is temporarily unavailable." : "Loading career context…"}</p>}<Link to="/career" className="mt-3 inline-block text-sm underline underline-offset-4">Open career analysis</Link></Panel>
    </div>
    {nextActions?.alternatives?.length ? <Panel title="Other ranked actions" className="mt-6"><div className="divide-y divide-[#EEEAE2]">{nextActions.alternatives.map((action) => <div key={action.id} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div><p className="font-semibold">{action.title}</p><p className="mt-1 text-xs text-[#737373]">{action.reason}</p></div><Button as={Link} to={action.route} state={action.navigation || undefined} variant="secondary" size="sm">Open</Button></div>)}</div></Panel> : null}
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <Panel title="Ask the mentor"><div className="flex gap-2 border border-[#E5E1D8] px-3 py-2"><input value={prompt} maxLength={1800} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") ask(prompt); }} placeholder="Ask about your saved study records..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" /><button type="button" onClick={() => ask(prompt)} disabled={mentorLoading} className="text-xs font-semibold disabled:opacity-50">{mentorLoading ? "Thinking…" : "Ask"}</button></div><div className="mt-4 flex flex-wrap gap-2">{mentorPrompts.map((item) => <button type="button" key={item} onClick={() => ask(item)} className="border border-[#E5E1D8] px-2 py-1.5 text-xs">{item}</button>)}</div>{mentorError ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{mentorError}</p> : null}{mentorResponse ? <div className="mt-5 border-l-2 border-[#171717] bg-[#F7F5F0] p-4 text-sm leading-6"><p className="font-semibold">MENTOR RESPONSE</p><p className="mt-3">{mentorResponse.message}</p><p className="mt-3 text-xs text-[#737373]">The mentor explains the deterministic recommendation; it does not select or complete tasks.</p></div> : null}</Panel>
      <Panel title="Available context"><ul className="space-y-3 text-sm">{Object.entries({ "Academic syllabus": nextActions?.capabilities?.syllabus || "Loading", "Knowledge": nextActions?.capabilities?.knowledge || "Loading", "Performance": nextActions?.capabilities?.performance || "Loading", "Memory reviews": nextActions?.capabilities?.memory || "Loading", "Career guidance": nextActions?.capabilities?.career || "Loading", "AI explanation": mentorResponse?.aiStatus === "unavailable" ? "Unavailable" : "Configured AI gateway" }).map(([label, value]) => <li key={label} className="flex justify-between gap-4 border-b border-[#EEEAE2] pb-2"><span>{label}</span><span className="text-right text-[#737373]">{value.replaceAll("_", " ")}</span></li>)}</ul><p className="mt-4 text-xs leading-5 text-[#737373]">Unavailable or missing information is not treated as zero progress.</p></Panel>
    </div>
  </Container></main>;
}

export function Knowledge() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    authService.getStudentSubjects()
      .then(({ subjects: records = [] }) => { setSubjects(records); setSelectedSubjectId(records[0]?.id || ""); })
      .catch((requestError) => setError(requestError.message || "Unable to load your saved topics."))
      .finally(() => setLoading(false));
  }, []);
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId);
  return <main className="min-h-screen bg-[#F7F5F0] text-[#171717]"><Container className="py-8 md:py-14"><Header eyebrow="KNOWLEDGE" title="YOUR TOPICS, CONNECTED." text="Explore the subjects and topics you have saved. Relationships shown here reflect their subject membership, not inferred mastery." />
    {error ? <p role="alert" className="mb-6 border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
    {loading ? <p className="text-sm text-[#737373]">Loading your saved study structure...</p> : !subjects.length ? <Panel title="No saved topics"><p className="text-sm text-[#737373]">Add a subject and topics to see your own knowledge structure here.</p><Button as={Link} to="/study" className="mt-4">Set up study space →</Button></Panel> : <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <Panel title="Subjects"><div className="space-y-2">{subjects.map((subject) => <button type="button" key={subject.id} onClick={() => setSelectedSubjectId(subject.id)} className={`w-full border px-3 py-3 text-left text-sm ${selectedSubjectId === subject.id ? "border-[#171717] bg-[#F7F5F0] font-semibold" : "border-[#E5E1D8]"}`}>{subject.name}<span className="mt-1 block text-xs font-normal text-[#737373]">{subject.topics.length} saved topics</span></button>)}</div></Panel>
      {selectedSubject ? <Panel title={`Structure · ${selectedSubject.name}`}><p className="text-sm leading-6 text-[#737373]">Each topic below is associated with this saved subject. Pragati does not assign mastery labels without sufficient recorded learning evidence.</p>{selectedSubject.topics.length ? <ul className="mt-5 divide-y divide-[#EEEAE2] border-t border-[#EEEAE2]">{selectedSubject.topics.map((topic, index) => <li key={topic.id} className="flex flex-wrap items-center gap-3 py-4"><span className="font-mono text-xs text-[#737373]">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1 font-semibold">{topic.name}</span><Button as={Link} to="/learn" state={{ concept: topic.name, subjectId: selectedSubject.id, topicId: topic.id }} size="sm">Study this topic</Button></li>)}</ul> : <p className="mt-5 text-sm text-[#737373]">No topics saved for this subject yet.</p>}</Panel> : null}
    </div>}
  </Container></main>;
}

export function MindMap() {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    authService.getStudentSubjects()
      .then(({ subjects: records = [] }) => { setSubjects(records); setSubjectId(records[0]?.id || ""); })
      .catch((requestError) => setError(requestError.message || "Unable to load your subjects."))
      .finally(() => setLoading(false));
  }, []);
  const subject = subjects.find((item) => item.id === subjectId);
  const nodes = useMemo(() => subject ? [{ id: subject.id, name: subject.name, kind: "Subject" }, ...subject.topics.map((topic) => ({ ...topic, kind: "Topic" }))] : [], [subject]);
  return <main className="min-h-screen bg-[#F7F5F0] text-[#171717]"><Container className="py-8 md:py-14"><Header eyebrow="MIND MAP" title="MAP YOUR STUDY STRUCTURE." text="See the subjects and topics you have entered, grouped by their saved parent subject. No prerequisite relationships are assumed." />
    {error ? <p role="alert" className="mb-6 border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
    {loading ? <p className="text-sm text-[#737373]">Loading your saved study structure...</p> : !subjects.length ? <Panel title="No saved subjects"><p className="text-sm text-[#737373]">Add subjects and topics to build a mind map from your own study structure.</p><Button as={Link} to="/study" className="mt-4">Set up study space →</Button></Panel> : <>
      <label htmlFor="mindmap-subject" className="sr-only">Choose a subject</label><select id="mindmap-subject" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="mb-6 border border-[#E5E1D8] bg-[#FBFAF7] px-3 py-2 text-sm">{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      {subject ? <Panel title={subject.name}><div className="mx-auto max-w-3xl"><div className="mx-auto w-fit border-2 border-[#171717] bg-[#171717] px-5 py-3 text-center font-black text-[#F7F5F0]">{subject.name}</div>{nodes.length > 1 ? <ul className="mt-8 grid gap-3 sm:grid-cols-2">{subject.topics.map((topic) => <li key={topic.id} className="relative border border-[#E5E1D8] bg-white p-4"><span aria-hidden="true" className="absolute -top-4 left-1/2 h-4 border-l border-[#D8D0C1]" /><p className="font-semibold">{topic.name}</p><p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#737373]">Topic in {subject.name}</p><Button as={Link} to="/learn" state={{ concept: topic.name, subjectId: subject.id, topicId: topic.id }} size="sm" className="mt-3">Learn →</Button></li>)}</ul> : <p className="mt-6 text-center text-sm text-[#737373]">Add topics to this subject to expand the map.</p>}</div></Panel> : null}
    </>}
  </Container></main>;
}

export function Resources() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    authService.getVaultDocuments()
      .then(setDocuments)
      .catch((requestError) => setError(requestError.message || "Unable to load your saved resources."))
      .finally(() => setLoading(false));
  }, []);
  return <main className="min-h-screen bg-[#F7F5F0] text-[#171717]"><Container className="py-8 md:py-14"><Header eyebrow="RESOURCE HUB" title="YOUR SAVED RESOURCES." text="Find materials you have uploaded to your Vault. This page does not invent recommendations or external resources." />
    <div className="mb-6 flex flex-wrap gap-3"><Button as={Link} to="/vault">Open Vault →</Button><Button as={Link} to="/study" variant="secondary">Manage study topics</Button><Button as={Link} to="/practice" variant="secondary">Practice</Button></div>
    {error ? <p role="alert" className="mb-6 border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
    {loading ? <p className="text-sm text-[#737373]">Loading your Vault materials...</p> : documents.length ? <div className="grid gap-3 sm:grid-cols-2">{documents.map((document) => <article key={document.id} className="border border-[#E5E1D8] bg-[#FBFAF7] p-5">{document.status !== "failed" ? <Link to={`/vault/document/${document.id}`} className="hover:underline"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#737373]">{document.type} · {document.status}</p><h2 className="mt-2 font-semibold">{document.originalName || document.filename}</h2></Link> : <><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-700">{document.type} · processing failed</p><h2 className="mt-2 font-semibold">{document.originalName || document.filename}</h2></>}<p className="mt-2 text-xs text-[#737373]">{document.subject || "No subject"} · {document.topic || "No topic"}</p></article>)}</div> : <Panel title="No saved resources"><p className="text-sm leading-6 text-[#737373]">No materials are saved in your Vault yet. Upload a PDF there to keep it with your study records.</p><Button as={Link} to="/vault" className="mt-4">Go to Vault →</Button></Panel>}
  </Container></main>;
}
