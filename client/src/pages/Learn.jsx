import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import { authService } from "@/services/auth";

const modes = [
  ["beginner", "BEGINNER"],
  ["simple", "SIMPLE"],
  ["analogy", "REAL-WORLD ANALOGY"],
  ["technical", "TECHNICAL"],
  ["exam", "EXAM"],
  ["interview", "INTERVIEW"],
  ["example", "EXAMPLE-BASED"],
  ["diagram", "DIAGRAM"],
  ["revision", "QUICK REVISION"],
];
const languages = [["en", "English"], ["mr", "Marathi"], ["hi", "Hindi"]];

function Panel({ title, children, className = "" }) {
  return <section className={`border border-[#E5E1D8] bg-[#FBFAF7] p-5 md:p-7 ${className}`}><h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#737373]">{title}</h2>{children}</section>;
}

function TextList({ title, items }) {
  if (!items?.length) return null;
  return <Panel title={title}><ul className="space-y-3 text-sm leading-7">{items.map((item, index) => <li key={`${index}-${item}`} className="flex gap-3"><span className="font-mono text-xs text-[#737373]">{String(index + 1).padStart(2, "0")}</span><span>{item}</span></li>)}</ul></Panel>;
}

export default function Learn() {
  const location = useLocation();
  const [concept, setConcept] = useState("");
  const [mode, setMode] = useState("simple");
  const [language, setLanguage] = useState("en");
  const [detailLevel, setDetailLevel] = useState("medium");
  const [includeExamples, setIncludeExamples] = useState(true);
  const [includeAnalogy, setIncludeAnalogy] = useState(false);
  const [includeExamAnswer, setIncludeExamAnswer] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [contextError, setContextError] = useState("");

  useEffect(() => {
    const initial = location.state;
    if (!initial) return;
    if (initial.concept) setConcept(initial.concept);
    if (initial.subjectId) setSubjectId(initial.subjectId);
    if (initial.topicId) setTopicId(initial.topicId);
  }, [location.state]);

  useEffect(() => {
    authService.getStudentContext()
      .then((context) => {
        setSubjects(context.academic?.subjects || []);
        const preferred = (context.profile?.preferredLanguage || context.profile?.studyPreferences?.preferredLanguages?.[0] || "").toLowerCase();
        if (preferred.startsWith("marathi")) setLanguage("mr");
        else if (preferred.startsWith("hindi")) setLanguage("hi");
      })
      .catch((loadError) => setContextError(loadError.message));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!concept.trim()) {
      setError("Enter a concept to explain.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const explanation = await authService.explainConcept({
        concept: concept.trim(),
        ...(subjectId ? { subjectId } : {}),
        ...(subjectId && topicId ? { topicId } : {}),
        mode,
        language,
        detailLevel,
        includeExamples: includeExamples || mode === "example",
        includeAnalogy: includeAnalogy || mode === "analogy",
        includeExamAnswer: includeExamAnswer || mode === "exam",
      });
      setResult(explanation);
    } catch (requestError) {
      setError(requestError.message || "Could not generate an explanation.");
    } finally {
      setLoading(false);
    }
  };

  return <main className="min-h-screen bg-[#F7F5F0] text-[#171717]">
    <Container className="py-8 md:py-14">
      <div className="mb-10 flex flex-col gap-4 border-b border-[#E5E1D8] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#737373]">PRAGATI / LEARN</p><h1 className="mt-4 text-4xl font-black tracking-[-0.05em] md:text-6xl">UNDERSTAND ANYTHING.</h1><p className="mt-4 max-w-2xl text-base leading-7 text-[#737373]">Learn a concept through a personalized explanation, examples, diagrams, and exam-ready answers.</p></div>
        <Link to="/study" className="text-sm text-[#737373] underline underline-offset-4">← Study space</Link>
      </div>

      <div className="mx-auto max-w-5xl">
        <form onSubmit={submit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-[1fr_260px]">
            <label className="sr-only" htmlFor="concept-input">Concept to explain</label>
            <input id="concept-input" value={concept} onChange={(event) => { setConcept(event.target.value); setTopicId(""); }} maxLength={200} placeholder="What do you want to understand?" className="min-w-0 border border-[#171717] bg-[#FBFAF7] px-5 py-4 text-lg outline-none placeholder:text-[#8C8A83]" />
            <label className="sr-only" htmlFor="concept-subject">Align to subject</label>
            <select id="concept-subject" value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setTopicId(""); }} className="border border-[#E5E1D8] bg-[#FBFAF7] px-4 py-3 text-sm outline-none focus:border-[#171717]">
              <option value="">No subject selected</option>
              {subjects.map((subject) => <option key={subject._id || subject.id} value={subject._id || subject.id}>{subject.name}</option>)}
            </select>
          </div>
          {contextError ? <p className="text-xs text-[#737373]">Subject alignment is unavailable: {contextError}</p> : null}
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#737373]">Choose a teaching mode</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Explanation mode">
              {modes.map(([value, label]) => <button type="button" key={value} aria-pressed={mode === value} onClick={() => setMode(value)} className={`border px-3 py-2 text-[10px] font-semibold tracking-[0.1em] ${mode === value ? "border-[#171717] bg-[#171717] text-[#F7F5F0]" : "border-[#E5E1D8] bg-[#FBFAF7] hover:border-[#171717]"}`}>{label}</button>)}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">Language
              <select value={language} onChange={(event) => setLanguage(event.target.value)} className="mt-2 block w-full border border-[#E5E1D8] bg-[#FBFAF7] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#171717]">{languages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">Detail level
              <select value={detailLevel} onChange={(event) => setDetailLevel(event.target.value)} className="mt-2 block w-full border border-[#E5E1D8] bg-[#FBFAF7] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#171717]"><option value="short">Short</option><option value="medium">Medium</option><option value="detailed">Detailed</option></select>
            </label>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {[[includeExamples, setIncludeExamples, "Include examples"], [includeAnalogy, setIncludeAnalogy, "Include analogy"], [includeExamAnswer, setIncludeExamAnswer, "Include exam answer"]].map(([checked, setter, label]) => <label key={label} className="inline-flex items-center gap-2"><input type="checkbox" checked={checked} onChange={(event) => setter(event.target.checked)} className="accent-[#171717]" />{label}</label>)}
          </div>
          <Button type="submit" disabled={loading}>{loading ? "Teaching..." : "Explain this concept →"}</Button>
        </form>
      </div>

      {error ? <div className="mx-auto mt-8 max-w-5xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div> : null}
      {!result && !loading && !error ? <div className="mx-auto mt-14 max-w-3xl border-t border-[#E5E1D8] pt-8 text-center"><p className="text-xl font-black tracking-[-0.04em]">WHAT DO YOU WANT TO UNDERSTAND?</p><p className="mt-3 text-sm text-[#737373]">Enter a concept and choose how Pragati should teach it. Your explanation will appear here.</p></div> : null}
      {loading ? <div className="mx-auto mt-10 max-w-5xl border border-[#E5E1D8] bg-[#FBFAF7] p-8 text-center text-sm text-[#737373]" role="status">Building your explanation with your selected learning mode…</div> : null}

      {result ? <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-[1.5fr_0.75fr]">
        <div className="space-y-6">
          <section className="border-b border-[#E5E1D8] pb-7"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#737373]">{result.mode} · {languages.find(([value]) => value === result.language)?.[1] || result.language}</p><h2 className="mt-4 break-words text-4xl font-black tracking-[-0.06em] md:text-6xl">{result.concept}</h2><p className="mt-4 max-w-2xl text-base leading-7 text-[#737373]">{result.summary}</p></section>
          <Panel title="Explanation"><div className="space-y-6">{result.explanation.map((section, index) => <section key={`${section.heading}-${index}`}><h3 className="font-bold">{section.heading}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#3D3B37]">{section.content}</p></section>)}</div></Panel>
          <TextList title="Key points" items={result.keyPoints} />
          <TextList title="Worked examples" items={result.examples} />
          {result.analogy ? <Panel title="Real-world analogy"><p className="text-sm leading-7">{result.analogy.description}</p><p className="mt-4 border-l-2 border-[#D8D0C1] bg-[#F7F5F0] p-4 text-sm leading-6"><span className="font-semibold">Where it differs: </span>{result.analogy.limitations}</p></Panel> : null}
          {result.examAnswer ? <Panel title="Exam-ready answer"><p className="whitespace-pre-wrap text-sm leading-7">{result.examAnswer}</p></Panel> : null}
          <TextList title="Common mistakes" items={result.commonMistakes} />
          <TextList title="Quick revision" items={result.quickRevision} />
          {result.diagram ? <Panel title="Diagram structure (text representation)"><div className="space-y-3">{result.diagram.nodes.map((node) => <div key={node.id} className="border border-[#E5E1D8] bg-[#F7F5F0] p-3 text-sm font-semibold">{node.label}</div>)}<ul className="space-y-2 border-l border-[#D8D0C1] pl-4 text-xs text-[#737373]">{result.diagram.edges.map((edge, index) => <li key={`${edge.from}-${edge.to}-${index}`}>{result.diagram.nodes.find((node) => node.id === edge.from)?.label} — {edge.label} → {result.diagram.nodes.find((node) => node.id === edge.to)?.label}</li>)}</ul><p className="text-xs text-[#737373]">This is a structured text diagram, not a generated image.</p></div></Panel> : mode === "diagram" ? <Panel title="Diagram"><p className="text-sm text-[#737373]">A structured diagram was not available for this explanation. You can retry or choose another teaching mode.</p></Panel> : null}
          <div className="flex flex-wrap gap-3"><Button as={Link} to="/practice">Practice →</Button><Button as={Link} to="/study" variant="secondary">Study space</Button><Button as={Link} to="/roadmap" variant="secondary">Roadmap</Button></div>
        </div>
        <aside className="space-y-6">
          <Panel title="Syllabus alignment"><p className="text-sm leading-6 text-[#737373]">{result.syllabusAlignment === "matched" ? "This explanation is aligned to the selected syllabus item." : result.syllabusAlignment === "not_matched" ? "The concept could not be matched to the selected syllabus item; this is a general explanation." : "No syllabus item was selected; this is a general explanation."}</p></Panel>
          {result.sourceReferences?.length ? <Panel title="Sources"><ul className="space-y-3 text-sm">{result.sourceReferences.map((source, index) => <li key={`${source.type}-${source.topicId || source.subjectId}-${index}`} className="border-b border-[#EEEAE2] pb-3 last:border-0"><p className="font-semibold">{source.syllabus || "Student syllabus"}</p><p className="mt-1 text-xs text-[#737373]">{[source.subject, source.unit, source.topic].filter(Boolean).join(" · ")}</p></li>)}</ul></Panel> : null}
          <Panel title="Learning lens"><p className="text-sm leading-6 text-[#737373]">Select another teaching mode above and generate again to explore the same concept differently.</p></Panel>
        </aside>
      </div> : null}
    </Container>
  </main>;
}
