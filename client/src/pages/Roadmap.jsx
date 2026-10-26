import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import { authService } from "@/services/auth";

export default function Roadmap() {
  const [subjects, setSubjects] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    authService.getStudentSubjects()
      .then((data) => setSubjects(data.subjects || []))
      .catch((requestError) => setError(requestError.message || "Unable to load your study roadmap."))
      .finally(() => setLoading(false));
  }, []);

  const visibleSubjects = useMemo(
    () => subjects.filter((subject) => filter === "all" || subject.id === filter),
    [filter, subjects]
  );
  const topicCount = subjects.reduce((total, subject) => total + subject.topics.length, 0);

  return <main className="min-h-screen bg-[#F7F5F0] text-[#171717]"><Container className="py-8 md:py-14">
    <header className="mb-10 border-b border-[#E5E1D8] pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#737373]">PRAGATI / ROADMAP</p><h1 className="mt-4 text-4xl font-black tracking-[-0.06em] md:text-6xl">YOUR STUDY ROADMAP</h1><p className="mt-4 text-base text-[#737373]">Your manually added subjects and topics, ready to study at your pace.</p></div>
        <div className="flex gap-4 text-sm text-[#737373]"><Link to="/vault" className="underline underline-offset-4">Vault</Link><Link to="/study" className="underline underline-offset-4">Study space</Link></div>
      </div>
      <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-xs font-semibold tracking-[0.12em] text-[#737373]"><span>{subjects.length} SAVED SUBJECTS</span><span>{topicCount} SAVED TOPICS</span><span>TOPIC COMPLETION IS NOT TRACKED</span></div>
    </header>

    {error ? <p role="alert" className="mb-6 border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
    {loading ? <p className="border-y border-[#E5E1D8] bg-[#FBFAF7] p-8 text-center text-sm text-[#737373]">Loading your saved subjects and topics...</p> : null}
    {!loading && !error && !subjects.length ? <section className="border border-[#E5E1D8] bg-[#FBFAF7] p-8 text-center"><h2 className="text-xl font-black">Your roadmap starts with your subjects</h2><p className="mt-3 text-sm text-[#737373]">Add a subject and its topics to create a roadmap from your real study materials.</p><Button as={Link} to="/study" className="mt-5">Set up my study space →</Button></section> : null}
    {subjects.length ? <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <label htmlFor="roadmap-subject" className="sr-only">Filter roadmap by subject</label>
        <select id="roadmap-subject" value={filter} onChange={(event) => setFilter(event.target.value)} className="border border-[#E5E1D8] bg-[#FBFAF7] px-3 py-2 text-sm"><option value="all">All subjects</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
        {visibleSubjects.map((subject) => <section key={subject.id} className="border border-[#E5E1D8] bg-[#FBFAF7] p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.16em] text-[#737373]">SUBJECT</p><h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">{subject.name}</h2>{subject.description ? <p className="mt-2 text-sm text-[#737373]">{subject.description}</p> : null}</div><span className="text-xs text-[#737373]">{subject.topics.length} topics</span></div>
          {subject.topics.length ? <ol className="mt-5 divide-y divide-[#EEEAE2] border-t border-[#EEEAE2]">{subject.topics.map((topic, index) => <li key={topic.id} className="flex flex-wrap items-center gap-3 py-4"><span className="font-mono text-xs text-[#737373]">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1 font-semibold">{topic.name}</span><Button as={Link} to="/learn" state={{ concept: topic.name, subjectId: subject.id, topicId: topic.id }} size="sm">Learn</Button><Button as={Link} to={`/practice?subjectId=${encodeURIComponent(subject.id)}&topicId=${encodeURIComponent(topic.id)}`} variant="secondary" size="sm">Practice</Button></li>)}</ol> : <p className="mt-5 border-t border-[#EEEAE2] pt-4 text-sm text-[#737373]">Add topics to this subject from your study space.</p>}
        </section>)}
      </div>
      <aside className="h-fit border border-[#E5E1D8] bg-[#FBFAF7] p-5 md:p-6"><h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#737373]">Progress tracking</h2><p className="mt-4 text-sm leading-6 text-[#737373]">This roadmap reflects your saved academic structure. Practice and memory records are kept in their respective areas, but topic completion is not inferred here.</p><Button as={Link} to="/study" variant="secondary" className="mt-5 w-full">Manage subjects and topics</Button><Button as={Link} to="/practice" variant="secondary" className="mt-3 w-full">View practice history</Button></aside>
    </div> : null}
  </Container></main>;
}
