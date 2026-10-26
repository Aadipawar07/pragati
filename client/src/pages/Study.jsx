import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import { authService } from "@/services/auth";

function StudySection({ title, children }) {
  return <section className="border border-[#E5E1D8] bg-[#FBFAF7] p-5 md:p-6"><h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#737373]">{title}</h2>{children}</section>;
}

export default function Study() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [subjectName, setSubjectName] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [topicDrafts, setTopicDrafts] = useState({});
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    setError("");
    try {
      const data = await authService.getStudentSubjects();
      setSubjects(data.subjects || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load your study space.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const addSubject = async (event) => {
    event.preventDefault();
    if (!subjectName.trim()) return;
    setSaving(true);
    setError("");
    try {
      await authService.createStudentSubject({ name: subjectName.trim(), description: subjectDescription.trim() });
      setSubjectName("");
      setSubjectDescription("");
      await refresh();
    } catch (requestError) {
      setError(requestError.message || "Unable to add this subject.");
    } finally {
      setSaving(false);
    }
  };

  const addTopic = async (event, subjectId) => {
    event.preventDefault();
    const name = topicDrafts[subjectId]?.trim();
    if (!name) return;
    setSaving(true);
    setError("");
    try {
      await authService.createStudentTopic(subjectId, { name });
      setTopicDrafts((drafts) => ({ ...drafts, [subjectId]: "" }));
      await refresh();
    } catch (requestError) {
      setError(requestError.message || "Unable to add this topic.");
    } finally {
      setSaving(false);
    }
  };

  const saveRename = async (event, subjectId) => {
    event.preventDefault();
    if (!editName.trim()) return;
    setSaving(true);
    setError("");
    try {
      if (editing.type === "subject") await authService.updateStudentSubject(subjectId, { name: editName.trim() });
      else await authService.updateStudentTopic(editing.id, { name: editName.trim() });
      setEditing(null);
      setEditName("");
      await refresh();
    } catch (requestError) {
      setError(requestError.message || "Unable to save this change.");
    } finally {
      setSaving(false);
    }
  };

  const archive = async (kind, id, label) => {
    if (!window.confirm(`Archive ${label}? This hides it from your active study space but preserves your records.`)) return;
    setSaving(true);
    setError("");
    try {
      if (kind === "subject") await authService.archiveStudentSubject(id);
      else await authService.archiveStudentTopic(id);
      await refresh();
    } catch (requestError) {
      setError(requestError.message || `Unable to archive this ${kind}.`);
    } finally {
      setSaving(false);
    }
  };

  const openConcept = (subject, topic) => navigate("/learn", { state: { concept: topic.name, subjectId: subject.id, topicId: topic.id } });

  return <main className="min-h-screen bg-[#F7F5F0] text-[#171717]">
    <Container className="py-8 md:py-14">
      <header className="mb-10 flex flex-col gap-4 border-b border-[#E5E1D8] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#737373]">PRAGATI / STUDY</p><h1 className="mt-4 text-4xl font-black tracking-[-0.05em] md:text-6xl">YOUR STUDY SPACE</h1><p className="mt-4 max-w-2xl text-base leading-7 text-[#737373]">Add the subjects and topics you are studying. They are saved to your account and can be used in Learn and Practice.</p></div>
        <nav className="flex flex-wrap gap-4 text-sm text-[#737373]"><Link to="/learn" className="underline underline-offset-4">Learn</Link><Link to="/practice" className="underline underline-offset-4">Practice</Link><Link to="/roadmap" className="underline underline-offset-4">Roadmap</Link><Link to="/dashboard" className="underline underline-offset-4">← Dashboard</Link></nav>
      </header>

      {error ? <div role="alert" className="mb-6 border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <StudySection title="Add a subject">
        <form onSubmit={addSubject} className="grid gap-3 md:grid-cols-[1fr_1.5fr_auto]">
          <label className="sr-only" htmlFor="study-subject-name">Subject name</label>
          <input id="study-subject-name" value={subjectName} onChange={(event) => setSubjectName(event.target.value)} maxLength={120} required placeholder="e.g. Database Management Systems" className="min-w-0 border border-[#E5E1D8] bg-[#F7F5F0] px-4 py-3 text-sm outline-none focus:border-[#171717]" />
          <label className="sr-only" htmlFor="study-subject-description">Description (optional)</label>
          <input id="study-subject-description" value={subjectDescription} onChange={(event) => setSubjectDescription(event.target.value)} maxLength={1000} placeholder="Course, semester, or a short note (optional)" className="min-w-0 border border-[#E5E1D8] bg-[#F7F5F0] px-4 py-3 text-sm outline-none focus:border-[#171717]" />
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add subject +"}</Button>
        </form>
      </StudySection>

      <div className="mt-6 space-y-5">
        {loading ? <StudySection title="Your subjects"><p className="text-sm text-[#737373]">Loading your saved study space...</p></StudySection> : null}
        {!loading && subjects.length === 0 ? <StudySection title="Your subjects"><p className="text-sm leading-6 text-[#737373]">No subjects yet. Add one above to start building your study space; no sample progress or topics are added automatically.</p></StudySection> : null}
        {subjects.map((subject) => <StudySection key={subject.id} title="Subject">
          <div className="flex flex-col justify-between gap-4 border-b border-[#EEEAE2] pb-5 sm:flex-row sm:items-start">
            {editing?.type === "subject" && editing.id === subject.id
              ? <form onSubmit={(event) => saveRename(event, subject.id)} className="flex flex-1 gap-2"><input aria-label="Subject name" value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={120} required className="min-w-0 flex-1 border border-[#E5E1D8] bg-[#F7F5F0] px-3 py-2" /><Button type="submit" size="sm" disabled={saving}>Save</Button><Button type="button" size="sm" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button></form>
              : <div><h2 className="text-2xl font-black tracking-[-0.04em]">{subject.name}</h2>{subject.description ? <p className="mt-2 text-sm text-[#737373]">{subject.description}</p> : null}</div>}
            <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="secondary" onClick={() => { setEditing({ type: "subject", id: subject.id }); setEditName(subject.name); }}>Rename</Button><Button type="button" size="sm" variant="secondary" disabled={saving} onClick={() => archive("subject", subject.id, subject.name)}>Archive</Button></div>
          </div>
          <div className="mt-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#737373]">Topics ({subject.topics.length})</h3>
            {subject.topics.length ? <ul className="divide-y divide-[#EEEAE2]">{subject.topics.map((topic) => <li key={topic.id} className="flex flex-col gap-3 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
              <div>{editing?.type === "topic" && editing.id === topic.id
                ? <form onSubmit={(event) => saveRename(event, subject.id)} className="flex gap-2"><input aria-label="Topic name" value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={120} required className="min-w-0 border border-[#E5E1D8] bg-[#F7F5F0] px-3 py-2" /><Button type="submit" size="sm" disabled={saving}>Save</Button><Button type="button" size="sm" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button></form>
                : <><p className="font-semibold">{topic.name}</p>{topic.description ? <p className="mt-1 text-xs text-[#737373]">{topic.description}</p> : null}</>}</div>
              <div className="flex flex-wrap gap-2"><Button type="button" size="sm" onClick={() => openConcept(subject, topic)}>Learn</Button><Button as={Link} to={`/practice?topicId=${encodeURIComponent(topic.id)}`} size="sm" variant="secondary">Practice</Button><Button type="button" size="sm" variant="secondary" onClick={() => { setEditing({ type: "topic", id: topic.id }); setEditName(topic.name); }}>Rename</Button><Button type="button" size="sm" variant="secondary" disabled={saving} onClick={() => archive("topic", topic.id, topic.name)}>Archive</Button></div>
            </li>)}</ul> : <p className="text-sm text-[#737373]">No topics added yet.</p>}
            <form onSubmit={(event) => addTopic(event, subject.id)} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor={`topic-${subject.id}`}>New topic for {subject.name}</label>
              <input id={`topic-${subject.id}`} value={topicDrafts[subject.id] || ""} onChange={(event) => setTopicDrafts((drafts) => ({ ...drafts, [subject.id]: event.target.value }))} maxLength={120} required placeholder="Add a topic or unit" className="min-w-0 flex-1 border border-[#E5E1D8] bg-[#F7F5F0] px-4 py-3 text-sm outline-none focus:border-[#171717]" />
              <Button type="submit" variant="secondary" disabled={saving}>Add topic +</Button>
            </form>
          </div>
        </StudySection>)}
      </div>
    </Container>
  </main>;
}
