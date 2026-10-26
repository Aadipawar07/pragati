import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import { authService } from "@/services/auth";

const ratings = [
  { id: "again", label: "Again", note: "Could not recall" },
  { id: "hard", label: "Hard", note: "Difficult to recall" },
  { id: "good", label: "Good", note: "Recalled with effort" },
  { id: "easy", label: "Easy", note: "Recalled easily" }
];

function Panel({ title, children, className = "" }) {
  return <section className={`rounded-2xl border border-[#E5E1D8] bg-[#FBFAF7] p-5 md:p-6 ${className}`}><h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.16em] text-[#737373]">{title}</h2>{children}</section>;
}

function Empty({ children }) {
  return <p className="rounded-xl border border-dashed border-[#D8D0C1] p-4 text-sm leading-6 text-[#737373]">{children}</p>;
}

function Metric({ label, value, detail }) {
  return <div className="border-y border-[#E5E1D8] py-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#737373]">{label}</p><p className="mt-2 text-3xl font-black">{value}</p>{detail ? <p className="mt-1 text-xs text-[#737373]">{detail}</p> : null}</div>;
}

function formatDate(value) {
  if (!value) return "Not reviewed yet";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatRating(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "—";
}

export default function Memory() {
  const [summary, setSummary] = useState(null);
  const [topics, setTopics] = useState([]);
  const [queue, setQueue] = useState([]);
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [revealed, setRevealed] = useState(null);
  const [savedReview, setSavedReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [revealLoading, setRevealLoading] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [archivingId, setArchivingId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [form, setForm] = useState({ front: "", back: "", topicId: "", memoryType: "concept" });
  const requestIds = useRef(new Map());

  const loadData = useCallback(async () => {
    const [nextSummary, nextQueue, nextItems, nextHistory, nextTopics] = await Promise.all([
      authService.getMemorySummary(),
      authService.getDueMemoryItems(),
      authService.getMemoryItems({ limit: 30 }),
      authService.getMemoryReviewHistory({ limit: 10 }),
      authService.getMemoryTopics()
    ]);
    setSummary(nextSummary);
    setQueue(nextQueue.items);
    setItems(nextItems.items);
    setHistory(nextHistory.reviews);
    setTopics(nextTopics);
    setSelectedId((current) => nextQueue.items.some((item) => item.id === current) ? current : nextQueue.items[0]?.id || "");
  }, []);

  useEffect(() => {
    loadData()
      .catch((requestError) => setError(requestError.message || "Unable to load memory reviews."))
      .finally(() => setLoading(false));
  }, [loadData]);

  const currentItem = queue.find((item) => item.id === selectedId) || null;
  async function revealAnswer() {
    if (!currentItem) return;
    setError("");
    setRevealLoading(true);
    try {
      const detail = await authService.getMemoryItem(currentItem.id);
      setRevealed(detail);
      setSavedReview(null);
      if (!requestIds.current.has(currentItem.id)) requestIds.current.set(currentItem.id, crypto.randomUUID());
    } catch (requestError) {
      setError(requestError.message || "Unable to reveal this answer.");
    } finally {
      setRevealLoading(false);
    }
  }

  async function saveReview(rating) {
    if (!currentItem || !revealed || savingReview) return;
    setError("");
    setSavingReview(true);
    const requestId = requestIds.current.get(currentItem.id) || crypto.randomUUID();
    requestIds.current.set(currentItem.id, requestId);
    try {
      const result = await authService.reviewMemoryItem(currentItem.id, { rating, requestId });
      setSavedReview(result);
      setQueue((current) => current.filter((item) => item.id !== currentItem.id));
      setItems((current) => current.map((item) => item.id === currentItem.id ? { ...item, intervalDays: result.nextIntervalDays, nextReviewAt: result.nextReviewAt, lastReviewedAt: result.reviewedAt, lastRecallRating: result.rating } : item));
      setSelectedId(queue.find((item) => item.id !== currentItem.id)?.id || "");
      setRevealed(null);
      setRefreshError("");
      try {
        const [nextSummary, nextHistory] = await Promise.all([
          authService.getMemorySummary(),
          authService.getMemoryReviewHistory({ limit: 10 })
        ]);
        setSummary(nextSummary);
        setHistory(nextHistory.reviews);
      } catch (requestError) {
        setRefreshError(`Review saved. Summary refresh failed: ${requestError.message}`);
      }
    } catch (requestError) {
      setError(`${requestError.message || "Unable to save this review."} Your rating has not been confirmed as saved. You can retry safely.`);
    } finally {
      setSavingReview(false);
    }
  }

  async function createItem(event) {
    event.preventDefault();
    setFormError("");
    setCreating(true);
    try {
      await authService.createMemoryItem({
        front: form.front,
        back: form.back,
        topicId: form.topicId || undefined,
        memoryType: form.memoryType
      });
      setForm({ front: "", back: "", topicId: "", memoryType: "concept" });
      await loadData();
    } catch (requestError) {
      setFormError(requestError.message || "Unable to create this memory item.");
    } finally {
      setCreating(false);
    }
  }

  async function archiveItem(itemId) {
    setFormError("");
    setArchivingId(itemId);
    try {
      await authService.archiveMemoryItem(itemId);
      setItems((current) => current.filter((item) => item.id !== itemId));
      setQueue((current) => current.filter((item) => item.id !== itemId));
      if (selectedId === itemId) {
        setSelectedId(queue.find((item) => item.id !== itemId)?.id || "");
        setRevealed(null);
      }
      const [nextSummary, nextQueue] = await Promise.all([
        authService.getMemorySummary(),
        authService.getDueMemoryItems()
      ]);
      setSummary(nextSummary);
      setQueue(nextQueue.items);
    } catch (requestError) {
      setFormError(requestError.message || "Unable to archive this item.");
    } finally {
      setArchivingId("");
    }
  }

  if (loading) return <main className="min-h-screen bg-[#F7F5F0]"><Container className="py-14"><p className="text-sm text-[#737373]">Loading your memory schedule...</p></Container></main>;
  if (error && !summary) return <main className="min-h-screen bg-[#F7F5F0]"><Container className="py-14"><Empty>{error}</Empty></Container></main>;

  return <main className="min-h-screen bg-[#F7F5F0] text-[#171717]">
    <Container className="py-8 md:py-14">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#737373]">Pragati OS / memory</p>
      <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] md:text-5xl">REMEMBER WHAT YOU LEARN.</h1>
      <p className="mt-3 max-w-2xl text-[#737373]">Recall first, reveal when you are ready, then choose how well it came back. Your schedule updates only after the review is saved.</p>

      {error ? <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
      {refreshError ? <p role="status" className="mt-4 text-sm text-amber-800">{refreshError}</p> : null}

      <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-5">
        <Metric label="Active items" value={summary?.activeItems ?? "—"} />
        <Metric label="Due now" value={summary?.dueItems ?? "—"} detail={`${summary?.overdueItems ?? 0} overdue`} />
        <Metric label="Later" value={summary?.scheduledLater ?? "—"} />
        <Metric label="Reviews today" value={summary?.reviewsCompletedToday ?? "—"} detail="UTC day boundary" />
        <Metric label="Self-reported Good/Easy" value={summary?.selfReportedRecallRate === null ? "—" : `${summary?.selfReportedRecallRate}%`} detail={summary?.insufficientRecallData ? "No review evidence yet" : "Last 30 days"} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <Panel title={`Due queue · ${queue.length} shown of ${summary?.dueItems ?? queue.length}`}>
            {queue.length ? <div className="max-h-[28rem] divide-y divide-[#EEEAE2] overflow-y-auto">
              {queue.map((item) => <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setRevealed(null); setSavedReview(null); setError(""); }} className={`w-full py-4 text-left first:pt-0 ${selectedId === item.id ? "text-[#171717]" : "text-[#737373]"}`}>
                <span className="flex items-start justify-between gap-3"><span className="font-semibold">{item.front}</span><span className="shrink-0 text-xs">{item.repetitionCount ? `${item.repetitionCount} reviews` : "New"}</span></span>
                <span className="mt-1 block text-xs text-[#737373]">Due {formatDate(item.nextReviewAt)} · {item.memoryType}</span>
              </button>)}
            </div> : <Empty>{summary?.activeItems ? "Nothing is due right now. Your next scheduled reviews will appear here." : "No memory items yet. Add a recall prompt below, or link a new item to one of your syllabus topics."}</Empty>}
          </Panel>

          <Panel title="Create a memory item">
            <form className="space-y-4" onSubmit={createItem}>
              <label className="block text-sm font-medium">Recall prompt
                <textarea required maxLength={1200} rows={2} value={form.front} onChange={(event) => setForm({ ...form, front: event.target.value })} className="mt-2 w-full rounded-xl border border-[#D8D0C1] bg-white p-3 text-sm outline-none focus:border-[#171717]" placeholder="What do you want to be able to recall?" />
              </label>
              <label className="block text-sm font-medium">Expected answer
                <textarea required maxLength={3000} rows={3} value={form.back} onChange={(event) => setForm({ ...form, back: event.target.value })} className="mt-2 w-full rounded-xl border border-[#D8D0C1] bg-white p-3 text-sm outline-none focus:border-[#171717]" placeholder="Write a concise answer or explanation." />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">Syllabus topic (optional)
                  <select value={form.topicId} onChange={(event) => setForm({ ...form, topicId: event.target.value })} className="mt-2 w-full rounded-xl border border-[#D8D0C1] bg-white p-3 text-sm">
                    <option value="">No topic link</option>
                    {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.subject} · {topic.name}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium">Item type
                  <select value={form.memoryType} onChange={(event) => setForm({ ...form, memoryType: event.target.value })} className="mt-2 w-full rounded-xl border border-[#D8D0C1] bg-white p-3 text-sm">
                    {["concept", "definition", "formula", "process", "example", "question"].map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
              </div>
              {formError ? <p role="alert" className="text-sm text-red-700">{formError}</p> : null}
              <Button type="submit" disabled={creating}>{creating ? "Saving..." : "Save memory item"}</Button>
            </form>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Recall card">
            {savedReview ? <div role="status" className="rounded-xl border border-[#D8D0C1] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#737373]">Review saved · {formatRating(savedReview.rating)}</p>
              <p className="mt-4 text-sm leading-6">This was recorded as a self-reported recall rating, not an objectively graded answer.</p>
              <p className="mt-3 text-sm font-semibold">Next review: {formatDate(savedReview.nextReviewAt)}</p>
              {savedReview.idempotent ? <p className="mt-2 text-xs text-[#737373]">This was already saved; no duplicate review was created.</p> : null}
              <Button type="button" onClick={() => { setSavedReview(null); setRevealed(null); setError(""); }} className="mt-5" variant="secondary">Continue to next due item</Button>
            </div> : currentItem ? <>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#737373]">Recall prompt</p>
              <p className="mt-4 text-2xl font-black leading-tight">{currentItem.front}</p>
              {revealed ? <>
                <div className="my-6 border-t border-[#E5E1D8]" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#737373]">Expected answer</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{revealed.back}</p>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">How well did you recall it?</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ratings.map((rating) => <button key={rating.id} type="button" disabled={savingReview} onClick={() => saveReview(rating.id)} className="rounded-xl border border-[#D8D0C1] bg-white px-3 py-3 text-left transition hover:border-[#171717] disabled:opacity-50">
                    <span className="block text-sm font-semibold">{savingReview ? "Saving..." : rating.label}</span><span className="mt-1 block text-[10px] text-[#737373]">{rating.note}</span>
                  </button>)}
                </div>
              </> : <Button type="button" disabled={revealLoading} onClick={revealAnswer} className="mt-7">{revealLoading ? "Loading answer..." : "Reveal answer"}</Button>}
            </> : <Empty>{summary?.activeItems ? "All items in the current queue have been reviewed. Return later when more reviews are due." : "Create your first item above to start a personal review schedule."}</Empty>}
            {queue.length && !savedReview ? <p className="mt-5 text-xs text-[#737373]">{queue.length} items remain in this due queue.</p> : null}
          </Panel>

          <Panel title="Recently difficult">
            {summary?.recentlyDifficultItems?.length ? <div className="divide-y divide-[#EEEAE2]">{summary.recentlyDifficultItems.map((item) => <div key={item.id} className="py-3 first:pt-0"><p className="text-sm font-semibold">{item.front}</p><p className="mt-1 text-xs text-[#737373]">{formatRating(item.lastRating)} on the latest difficult recall · {item.difficultReviews} difficult reviews</p></div>)}</div> : <Empty>{summary?.insufficientRecallData ? "No saved review evidence yet. Difficult areas will be shown only when they come from actual reviews." : "No recent Again/Hard ratings in the last 30 days."}</Empty>}
          </Panel>

          <Panel title="Your active items">
            {items.length ? <div className="max-h-72 divide-y divide-[#EEEAE2] overflow-y-auto">{items.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
              <div><p className="text-sm font-semibold">{item.front}</p><p className="mt-1 text-xs text-[#737373]">Next review {formatDate(item.nextReviewAt)} · {item.intervalDays} day interval</p></div>
              <button type="button" disabled={archivingId === item.id} onClick={() => archiveItem(item.id)} className="shrink-0 text-xs underline underline-offset-4 disabled:opacity-50">{archivingId === item.id ? "Archiving..." : "Archive"}</button>
            </div>)}</div> : <Empty>No active items yet.</Empty>}
          </Panel>
        </div>
      </div>

      <Panel title="Recent persisted reviews" className="mt-6">
        {history.length ? <div className="divide-y divide-[#EEEAE2]">{history.map((review) => <div key={review.id} className="flex flex-col justify-between gap-1 py-3 text-sm sm:flex-row"><span>{review.front}</span><span className="text-xs text-[#737373]">{formatRating(review.rating)} · self-reported · {formatDate(review.reviewedAt)}</span></div>)}</div> : <Empty>Reviews will appear here after a saved recall session.</Empty>}
      </Panel>
      <p className="mt-4 text-xs text-[#737373]">Scheduling uses a deterministic SM-2-inspired rule with UTC day increments. It is a practical heuristic, not a guarantee of forgetting or retention.</p>
    </Container>
  </main>;
}
