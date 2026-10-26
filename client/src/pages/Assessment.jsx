import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import { authService } from "@/services/auth";
const modes = [
  ["mcq", "MCQ practice"],
  ["short_answer", "Short answer"],
  ["long_answer", "Long answer"],
  ["conceptual", "Conceptual"],
  ["application", "Application-based"],
  ["quick_quiz", "Quick quiz"],
  ["topic_revision", "Topic revision"],
  ["weak_area", "Weak-area practice"],
];

function Panel({ title, children, className = "" }) {
  return <section className={`border border-[#E5E1D8] bg-[#FBFAF7] p-5 md:p-6 ${className}`}><h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#737373]">{title}</h2>{children}</section>;
}

function Header({ eyebrow, title, text, links = true }) {
  return <header className="mb-10 border-b border-[#E5E1D8] pb-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#737373]">{eyebrow}</p><h1 className="mt-4 text-4xl font-black tracking-[-0.06em] md:text-6xl">{title}</h1>{text ? <p className="mt-4 max-w-2xl text-base leading-7 text-[#737373]">{text}</p> : null}</div>{links ? <div className="flex flex-wrap gap-4 text-sm text-[#737373]"><Link to="/study" className="underline underline-offset-4">Study</Link><Link to="/memory" className="underline underline-offset-4">Memory</Link></div> : null}</div></header>;
}

function Metric({ label, value }) {
  return <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#737373]">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>;
}

export function Practice() {
  const navigate = useNavigate();
  const location = useLocation();
  const [subjects, setSubjects] = useState([]);
  const [history, setHistory] = useState([]);
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [mode, setMode] = useState("quick_quiz");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([authService.getPracticeTopics(), authService.getPracticeHistory()])
      .then(([subjectData, sessionData]) => {
        setSubjects(subjectData);
        setHistory(sessionData);
        const params = new URLSearchParams(location.search);
        const state = location.state || {
          subjectId: params.get("subjectId"),
          topicId: params.get("topicId"),
          mode: params.get("mode")
        };
        const subject = subjectData.find((item) => item.id === state.subjectId);
        if (subject) {
          setSubjectId(subject.id);
          setTopicId(subject.topics.find((topic) => topic.id === state.topicId)?.id || "");
        }
        if (modes.some(([value]) => value === state.mode)) setMode(state.mode);
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [location.search, location.state]);

  const selectedSubject = subjects.find((subject) => subject.id === subjectId);
  const start = async () => {
    setStarting(true);
    setError("");
    try {
      const session = await authService.createPracticeSession({ subjectId, topicId, mode, difficulty, questionCount, language: "en" });
      navigate(`/practice/test/${session.id}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setStarting(false);
    }
  };

  return <main className="min-h-screen bg-[#F7F5F0] text-[#171717]"><Container className="py-8 md:py-14"><Header eyebrow="PRAGATI / PRACTICE" title="TEST YOUR UNDERSTANDING." text="Practise syllabus topics, understand mistakes, and choose a useful next step." />
    {error ? <p className="mb-6 border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p> : null}
    {loading ? <p className="border-y border-[#E5E1D8] bg-[#FBFAF7] p-8 text-center text-sm text-[#737373]">Loading your syllabus and practice history…</p> : <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <Panel title="Create a practice session" className="border-[#171717]"><div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">Subject<select value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setTopicId(""); }} className="mt-2 block w-full border border-[#E5E1D8] bg-[#F7F5F0] p-3 text-sm font-normal normal-case tracking-normal text-[#171717]"><option value="">Choose a subject</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">Topic<select value={topicId} onChange={(event) => setTopicId(event.target.value)} disabled={!selectedSubject} className="mt-2 block w-full border border-[#E5E1D8] bg-[#F7F5F0] p-3 text-sm font-normal normal-case tracking-normal text-[#171717]"><option value="">Choose a topic</option>{selectedSubject?.topics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">Practice mode<select value={mode} onChange={(event) => setMode(event.target.value)} className="mt-2 block w-full border border-[#E5E1D8] bg-[#F7F5F0] p-3 text-sm font-normal normal-case tracking-normal text-[#171717]">{modes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">Difficulty<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="mt-2 block w-full border border-[#E5E1D8] bg-[#F7F5F0] p-3 text-sm font-normal normal-case tracking-normal text-[#171717]"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737373] sm:col-span-2">Questions<select value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))} className="mt-2 block w-full border border-[#E5E1D8] bg-[#F7F5F0] p-3 text-sm font-normal normal-case tracking-normal text-[#171717]"><option value={5}>5 questions</option><option value={10}>10 questions</option><option value={15}>15 questions</option><option value={20}>20 questions</option></select></label>
        </div><Button type="button" disabled={!subjectId || !topicId || starting} onClick={start} className="mt-6 w-full">{starting ? "Preparing questions…" : "Start practice →"}</Button>
        {mode === "weak_area" ? <p className="mt-4 text-xs leading-5 text-[#737373]">Weak-area practice is available after this topic has enough recorded incorrect answers.</p> : null}
        {!subjects.length ? <p className="mt-4 text-sm text-[#737373]">No active topics are available to practice yet. Add subjects and topics to your academic profile first.</p> : null}
        </Panel>
        <Panel title="Practice history">{history.length ? <div className="divide-y divide-[#EEEAE2]">{history.slice(0, 8).map((item) => <Link key={item.id} to={item.status === "completed" ? `/practice/results/${item.id}` : `/practice/test/${item.id}`} className="flex items-center justify-between gap-4 py-3 first:pt-0"><div><p className="text-sm font-semibold">{item.topic}</p><p className="mt-1 text-xs text-[#737373]">{item.subject} · {item.mode.replaceAll("_", " ")} · {item.status}</p></div><span className="text-xs text-[#737373]">{item.accuracy === null ? "Not graded" : `${item.accuracy}% accuracy`}</span></Link>)}</div> : <p className="text-sm text-[#737373]">No practice sessions yet. Your history will appear here after your first session.</p>}</Panel>
      </div>
      <Panel title="Available practice modes"><div className="space-y-3">{modes.map(([, label]) => <p key={label} className="border-b border-[#EEEAE2] pb-3 text-sm last:border-0">{label}</p>)}<p className="pt-2 text-xs leading-5 text-[#737373]">Code execution is not enabled. Code questions are not included in this practice engine.</p></div></Panel>
    </div>}
  </Container></main>;
}

export function Test() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    authService.getPracticeSession(id).then((value) => setSession(value)).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setAnswer("");
    setFeedback(null);
    setError("");
  }, [id, index]);

  useEffect(() => {
    if (!session) return;
    setAnswer(session.questions[index]?.submittedAnswer || "");
    setFeedback(session.questions[index]?.feedback || null);
  }, [session, index]);

  const question = session?.questions[index];
  const questionFeedback = feedback || question?.feedback || null;
  const answeredCount = session?.questions.filter((item) => item.answered).length || 0;
  const checkAnswer = async () => {
    if (!answer.trim() || !question) return;
    setChecking(true);
    setError("");
    try {
      const graded = await authService.answerPracticeQuestion(id, { questionId: question.id, answer });
      setFeedback(graded);
      const next = await authService.getPracticeSession(id);
      setSession(next);
    } catch (requestError) {
      setError(requestError.message);
      try {
        const currentSession = await authService.getPracticeSession(id);
        setSession(currentSession);
      } catch {
        setError(requestError.message);
      }
    } finally {
      setChecking(false);
    }
  };
  const submit = async () => {
    setChecking(true);
    setError("");
    try {
      const results = await authService.submitPracticeSession(id);
      navigate(`/practice/results/${id}`, { state: { results } });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setChecking(false);
    }
  };

  if (loading) return <main className="min-h-screen bg-[#F7F5F0]"><Container className="py-12 text-sm text-[#737373]">Loading practice session…</Container></main>;
  if (!session) return <main className="min-h-screen bg-[#F7F5F0]"><Container className="py-12"><Header eyebrow="PRAGATI / PRACTICE" title="SESSION UNAVAILABLE" /><p className="text-sm text-red-700">{error || "Practice session not found."}</p><Link to="/practice" className="mt-6 inline-block text-sm underline">Back to practice</Link></Container></main>;
  if (session.status === "completed") return <main className="min-h-screen bg-[#F7F5F0]"><Container className="py-12"><Header eyebrow="PRAGATI / PRACTICE" title="SESSION COMPLETE" /><Button type="button" onClick={() => navigate(`/practice/results/${id}`)}>View results →</Button></Container></main>;

  return <main className="min-h-screen bg-[#F7F5F0] text-[#171717]"><Container className="py-8 md:py-12"><header className="mb-8 border-b border-[#E5E1D8] pb-6"><Link to="/practice" className="text-sm text-[#737373] underline">← Practice</Link><div className="mt-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#737373]">{session.subject} / {session.topic}</p><h1 className="mt-2 text-2xl font-black md:text-4xl">{session.mode.replaceAll("_", " ").toUpperCase()}</h1></div><p className="text-xs text-[#737373]">{answeredCount} / {session.questions.length} answered</p></div><div className="mt-5 h-1 bg-[#E5E1D8]"><div className="h-full bg-[#171717]" style={{ width: `${(answeredCount / session.questions.length) * 100}%` }} /></div></header>
    {error ? <p className="mb-5 border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p> : null}
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]"><Panel title={`Question ${index + 1} / ${session.questions.length}`} className="min-h-[420px]"><p className="mb-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#737373]">{question.topicName} · {question.type.replaceAll("_", " ")} · {question.difficulty}</p><h2 className="max-w-3xl text-2xl font-black leading-tight tracking-[-0.04em] md:text-4xl">{question.prompt}</h2>{question.type === "mcq" ? <div className="mt-8 space-y-3">{question.options.map((option) => <button type="button" key={option.id} disabled={question.answered || Boolean(questionFeedback)} onClick={() => setAnswer(option.id)} aria-pressed={answer === option.id} className={`flex w-full items-center gap-4 border p-4 text-left disabled:opacity-70 ${answer === option.id ? "border-[#171717] bg-[#171717] text-[#F7F5F0]" : "border-[#E5E1D8] hover:border-[#171717]"}`}><span className="font-mono text-xs">{option.id.toUpperCase()}</span><span className="font-semibold">{option.text}</span></button>)}</div> : <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={(question.answered && !question.gradingPending) || Boolean(questionFeedback)} maxLength={5000} placeholder="Write your answer…" className="mt-8 min-h-40 w-full border border-[#E5E1D8] bg-[#F7F5F0] p-4 text-sm leading-6 outline-none focus:border-[#171717] disabled:opacity-70" />}
      {questionFeedback ? <div className="mt-7 border-l-2 border-[#171717] bg-[#F7F5F0] p-5"><p className="font-semibold">{questionFeedback.isCorrect === null ? `${questionFeedback.awardedMarks} / ${questionFeedback.maximumMarks} marks` : questionFeedback.isCorrect ? "Correct" : "Review this answer"}</p><p className="mt-2 text-sm leading-6">{questionFeedback.feedback}</p><p className="mt-3 text-xs leading-5 text-[#737373]">Expected answer: {questionFeedback.correctAnswer}</p><p className="mt-2 text-xs leading-5 text-[#737373]">{questionFeedback.explanation}</p>{questionFeedback.missingConcepts?.length ? <p className="mt-2 text-xs text-[#737373]">Review: {questionFeedback.missingConcepts.join(", ")}</p> : null}</div> : null}
      {(!question.answered || question.gradingPending) && !questionFeedback ? <Button type="button" disabled={!answer.trim() || checking} onClick={checkAnswer} className="mt-7">{checking ? "Checking answer…" : question.gradingPending ? "Retry grading" : "Check answer"}</Button> : null}
    </Panel><aside className="space-y-6"><Panel title="Session questions"><div className="grid grid-cols-5 gap-2">{session.questions.map((item, itemIndex) => <button type="button" key={item.id} onClick={() => setIndex(itemIndex)} aria-label={`Question ${itemIndex + 1}`} className={`h-9 border text-xs ${index === itemIndex ? "border-[#171717] bg-[#171717] text-[#F7F5F0]" : item.answered ? "border-[#171717]" : "border-[#E5E1D8]"}`}>{String(itemIndex + 1).padStart(2, "0")}</button>)}</div></Panel><Button type="button" disabled={checking} onClick={submit} className="w-full">Finish practice →</Button></aside></div>
    <div className="mt-6 flex justify-between border-t border-[#E5E1D8] pt-5"><button type="button" disabled={index === 0} onClick={() => setIndex((value) => value - 1)} className="text-sm underline disabled:opacity-40">← Previous</button><button type="button" disabled={index === session.questions.length - 1} onClick={() => setIndex((value) => value + 1)} className="text-sm underline disabled:opacity-40">Next →</button></div>
  </Container></main>;
}

export function Results() {
  const { id } = useParams();
  const location = useLocation();
  const [results, setResults] = useState(location.state?.results || null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!location.state?.results);
  const [memoryItemIds, setMemoryItemIds] = useState(() => new Set());
  const [savingQuestionId, setSavingQuestionId] = useState("");
  const [memoryError, setMemoryError] = useState("");
  useEffect(() => {
    if (results) return;
    authService.getPracticeResults(id).then(setResults).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, [id, results]);

  async function saveQuestionToMemory(question) {
    setSavingQuestionId(question.id);
    setMemoryError("");
    try {
      await authService.createMemoryItemFromPractice(id, question.id);
      setMemoryItemIds((current) => new Set(current).add(question.id));
    } catch (requestError) {
      setMemoryError(requestError.message || "Unable to save this question to memory.");
    } finally {
      setSavingQuestionId("");
    }
  }

  if (loading) return <main className="min-h-screen bg-[#F7F5F0]"><Container className="py-12 text-sm text-[#737373]">Loading results…</Container></main>;
  if (error || !results) return <main className="min-h-screen bg-[#F7F5F0]"><Container className="py-12"><Header eyebrow="PRAGATI / RESULTS" title="RESULTS UNAVAILABLE" /><p className="text-sm text-red-700">{error || "No results are available."}</p><Link to="/practice" className="mt-6 inline-block text-sm underline">Back to practice</Link></Container></main>;
  return <main className="min-h-screen bg-[#F7F5F0] text-[#171717]"><Container className="py-8 md:py-14"><Header eyebrow="PRAGATI / RESULTS" title="PRACTICE COMPLETE" text={`${results.subject} · ${results.topic}`} /><div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"><Panel title="Session results"><div className="flex flex-wrap items-end gap-8"><p className="text-6xl font-black tracking-[-0.08em]">{results.accuracy === null ? "—" : `${results.accuracy}%`}</p><div className="pb-2 text-sm text-[#737373]"><p>{results.marksEarned} / {results.maximumMarks} marks</p><p className="mt-2">{results.totalQuestions} questions · {results.correctAnswers} correct · {results.incorrectAnswers} incorrect</p><p className="mt-1">{results.answeredQuestions} answered · {results.pendingGrading} pending grading</p></div></div></Panel><Panel title="Topic feedback">{results.topicResults.map((item) => <div key={item.topic} className="border-b border-[#EEEAE2] py-3 last:border-0"><div className="flex justify-between text-sm"><span>{item.topic}</span><span>{item.accuracy === null ? "Not graded" : `${item.accuracy}%`}</span></div><p className="mt-1 text-xs text-[#737373]">{item.followUpRecommended ? "More practice may help based on this session." : `${item.graded} of ${item.total} graded`}</p></div>)}</Panel></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]"><Panel title="Question review">{memoryError ? <p role="alert" className="mb-4 text-sm text-red-700">{memoryError}</p> : null}<div className="space-y-4">{results.questions.map((question, index) => <div key={question.id} className="border-b border-[#EEEAE2] pb-4 last:border-0"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">Question {index + 1} · {question.topicName}</p><p className="mt-2 text-sm font-semibold">{question.prompt}</p><p className="mt-2 text-xs text-[#737373]">Your answer: {question.answer || "Not answered"}</p><p className="mt-1 text-xs text-[#737373]">Expected: {question.correctAnswer}</p>{question.feedback ? <p className="mt-2 text-sm leading-6">{question.feedback}</p> : null}{question.explanation ? <p className="mt-1 text-xs leading-5 text-[#737373]">{question.explanation}</p> : null}{question.gradingStatus === "graded" ? <button type="button" disabled={savingQuestionId === question.id || memoryItemIds.has(question.id)} onClick={() => saveQuestionToMemory(question)} className="mt-3 text-sm font-semibold underline underline-offset-4 disabled:opacity-50">{savingQuestionId === question.id ? "Saving…" : memoryItemIds.has(question.id) ? "Saved to Memory" : "Save for spaced recall →"}</button> : <p className="mt-3 text-xs text-[#737373]">Save to Memory is available after grading is complete.</p>}</div>)}</div></Panel><Panel title="What to do next">{results.followUp ? <><p className="text-sm leading-6">{results.followUp.recommendation}</p><Button as={Link} to="/practice" state={{ mode: "topic_revision", subjectId: results.subjectId, topicId: results.topicId }} className="mt-5 w-full">Practise this topic again →</Button></> : <p className="text-sm leading-6 text-[#737373]">No incorrect graded answers in this session. Continue to another syllabus topic when ready.</p>}<Button as={Link} to="/learn" variant="secondary" className="mt-3 w-full">Review a concept →</Button><Button as={Link} to="/practice" variant="secondary" className="mt-3 w-full">New practice session</Button></Panel></div>
  </Container></main>;
}

export function Exam() {
  const [exam, setExam] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [performanceError, setPerformanceError] = useState("");
  const [performanceLoaded, setPerformanceLoaded] = useState(false);

  useEffect(() => {
    Promise.all([authService.getDashboard(), authService.getStudentContext()])
      .then(([dashboard, context]) => {
        setPerformance(dashboard.performance);
        const syllabus = context.academic?.syllabus;
        if (!syllabus?.examDate) return;
        const date = new Date(syllabus.examDate);
        const today = new Date();
        const daysLeft = Math.ceil((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) / 86400000);
        setExam({ title: syllabus.title || "Saved exam", date, daysLeft });
      })
      .catch((error) => setPerformanceError(error.message || "Unable to load assessment performance."))
      .finally(() => setPerformanceLoaded(true));
  }, []);

  const topicsNeedingPractice = performance?.topicsNeedingPractice || [];
  const scoreLabel = performance?.scorePercentage == null ? "—" : `${performance.scorePercentage}%`;
  const accuracyLabel = performance?.accuracy == null ? "—" : `${performance.accuracy}%`;

  return <main className="min-h-screen bg-[#F7F5F0] text-[#171717]"><Container className="py-8 md:py-14">
    <Header eyebrow="PRAGATI / EXAM" title="EXAM PREPARATION" text="Review your saved exam date and assessment evidence, then choose a topic to practice." />
    <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
      <Panel title="Exam status" className="bg-[#171717] text-[#F7F5F0]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>{exam ? <><p className="text-4xl font-black">{exam.daysLeft >= 0 ? `${exam.daysLeft} DAYS LEFT` : "DATE PASSED"}</p><p className="mt-3 text-sm text-[#D8D0C1]">{exam.title} · {exam.date.toLocaleDateString()}</p></> : <><p className="text-2xl font-black">NO EXAM DATE SAVED</p><p className="mt-3 text-sm text-[#D8D0C1]">Add a real exam date to your academic record when available.</p></>}</div>
          <div><p className="text-xs uppercase tracking-[0.14em] text-[#B8AEA0]">Assessment score</p><p className="mt-2 text-4xl font-black">{scoreLabel}</p></div>
        </div>
        <Button as={Link} to="/study" className="mt-7 !bg-[#F7F5F0] !text-[#171717]">Start today&apos;s plan →</Button>
      </Panel>
      <Panel title="Assessment performance">
        {performanceError ? <p role="alert" className="text-sm text-[#737373]">{performanceError}</p> : !performanceLoaded ? <p className="text-sm text-[#737373]">Loading assessment performance...</p> : <div className="grid grid-cols-2 gap-5">
          <Metric label="Completed" value={performance?.completedAssessments ?? "—"} />
          <Metric label="Score" value={scoreLabel} />
          <Metric label="Accuracy" value={accuracyLabel} />
          <Metric label="Graded questions" value={performance?.totalGradedQuestions ?? "—"} />
        </div>}
      </Panel>
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <Panel title="Topics needing practice">
        {topicsNeedingPractice.length ? <div className="divide-y divide-[#EEEAE2]">{topicsNeedingPractice.map((topic) => <div key={topic.id} className="flex items-center justify-between gap-4 py-4 first:pt-0"><div><p className="font-semibold">{topic.name}</p><p className="mt-1 text-xs text-[#737373]">{topic.sessionCount} assessments · {topic.scorePercentage}% score</p></div><Link to="/practice" className="text-sm underline underline-offset-4">Practice</Link></div>)}</div> : <p className="text-sm text-[#737373]">{performanceError || (performanceLoaded ? "No topic has enough completed-attempt evidence for a review recommendation." : "Loading performance data...")}</p>}
      </Panel>
      <Panel title="Recurring concepts">
        {performance?.recurringMistakes?.length ? <div className="space-y-4 text-sm">{performance.recurringMistakes.map((mistake) => <p key={mistake.concept} className="border-b border-[#EEEAE2] pb-3"><b>{mistake.concept}</b><span className="ml-3 text-[#737373]">Seen in {mistake.sessionCount} assessments</span></p>)}</div> : <p className="text-sm text-[#737373]">{performanceError || (performanceLoaded ? "No recurring concept gaps are supported by the current assessment history." : "Loading performance data...")}</p>}
      </Panel>
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <Panel title="Exam question patterns"><p className="text-sm text-[#737373]">No persisted exam-pattern data is available yet.</p></Panel>
      <Panel title="Recommended practice">
        {topicsNeedingPractice.length ? <div className="space-y-3 text-sm">{topicsNeedingPractice.slice(0, 3).map((topic, index) => <p key={topic.id}>{String(index + 1).padStart(2, "0")} · Practice {topic.name}</p>)}</div> : <p className="text-sm text-[#737373]">{performanceLoaded ? "Complete more assessments to get evidence-based practice recommendations." : "Loading performance data..."}</p>}
        <Button as={Link} to="/practice" className="mt-5 w-full">Start practice →</Button>
      </Panel>
    </div>
  </Container></main>;
}
