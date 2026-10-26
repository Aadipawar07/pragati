import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Folder, Plus, Search, X } from "lucide-react";
import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import { authService } from "@/services/auth";

const filters = ["ALL", "PDF"];

function formatSize(bytes) {
  if (!bytes) return "—";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

function statusLabel(status) {
  return { uploaded: "Uploading", processing: "Processing", ready: "Ready", failed: "Failed" }[status] || status;
}

function DocumentRow({ document }) {
  const content = <><FileText size={18} strokeWidth={1.5} className="shrink-0 text-[#737373]" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{document.originalName || document.filename}</p><p className="mt-1 text-xs text-[#737373]">{document.type} · {document.subject || "General"} · Added {formatDate(document.createdAt)}</p></div><span className={`hidden text-xs sm:block ${document.status === "failed" ? "text-red-700" : "text-[#737373]"}`}>{statusLabel(document.status)} · {formatSize(document.size)}</span></>;
  return document.status === "failed" ? <div className="flex items-center gap-4 border-b border-[#EEEAE2] px-2 py-4">{content}</div> : <Link to={`/vault/document/${document.id}`} className="flex items-center gap-4 border-b border-[#EEEAE2] px-2 py-4 transition-colors hover:bg-[#F7F5F0] focus-visible:bg-[#F7F5F0]">{content}</Link>;
}

function AddMaterial({ onClose, onUpload, loading, error }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const submit = async (event) => {
    event.preventDefault();
    if (!file) return;
    await onUpload(file);
  };
  return <div className="fixed inset-0 z-20 flex items-end justify-center bg-[#171717]/30 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="add-material-title"><form onSubmit={submit} className="w-full max-w-lg border border-[#E5E1D8] bg-[#FBFAF7] p-6 shadow-xl"><div className="flex items-center justify-between"><h2 id="add-material-title" className="text-xl font-black">ADD MATERIAL</h2><button type="button" onClick={onClose} aria-label="Close add material dialog" className="p-2 text-[#737373] hover:text-[#171717]"><X size={18} /></button></div><p className="mt-2 text-sm text-[#737373]">Upload a PDF to add it to your academic space.</p><input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-6 block w-full border border-[#E5E1D8] bg-white p-3 text-sm" />{file ? <p className="mt-3 text-xs text-[#737373]">{file.name} · {formatSize(file.size)}</p> : null}{error ? <p className="mt-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}<div className="mt-6 flex justify-end gap-3"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={!file || loading}>{loading ? "Processing..." : "Upload PDF"}</Button></div></form></div>;
}

export default function Vault() {
  const [documents, setDocuments] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [subject, setSubject] = useState("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const loadDocuments = async () => {
    setLoading(true);
    try {
      setDocuments(await authService.getVaultDocuments());
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadDocuments(); }, []);

  const subjects = useMemo(() => [...new Set(documents.map((document) => document.subject).filter(Boolean))], [documents]);
  const visibleDocuments = useMemo(() => documents.filter((document) => (filter === "ALL" || document.type === filter) && (subject === "ALL" || document.subject === subject) && `${document.originalName} ${document.subject || ""} ${document.topic || ""}`.toLowerCase().includes(query.toLowerCase().trim())), [documents, filter, query, subject]);
  const upload = async (file) => {
    setUploading(true);
    setError("");
    try {
      await authService.uploadVaultDocument(file);
      setShowAdd(false);
      await loadDocuments();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
    }
  };

  return <main className="min-h-screen bg-[#F7F5F0] text-[#171717]"><Container className="py-8 md:py-14">
    <header className="mb-10 border-b border-[#E5E1D8] pb-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#737373]">PRAGATI / VAULT</p><h1 className="mt-4 text-4xl font-black tracking-[-0.06em] md:text-6xl">MY VAULT</h1><p className="mt-4 text-base text-[#737373]">Everything you study, organized in one academic space.</p></div><div className="flex gap-4 text-sm text-[#737373]"><Link to="/roadmap" className="underline underline-offset-4">Roadmap</Link><Link to="/study" className="underline underline-offset-4">Study</Link></div></div><div className="mt-8 flex flex-col gap-3 sm:flex-row"><div className="flex flex-1 items-center gap-3 border border-[#171717] bg-[#FBFAF7] px-4 py-3"><Search size={17} className="text-[#737373]" /><label htmlFor="vault-search" className="sr-only">Search your vault</label><input id="vault-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your vault..." className="w-full bg-transparent text-sm outline-none placeholder:text-[#8C8A83]" /></div><Button type="button" onClick={() => setShowAdd(true)}><Plus size={16} className="mr-2" /> Add material</Button></div></header>
    {error && !showAdd ? <p className="mb-6 border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
    <section><h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#737373]">Folders</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="border border-[#E5E1D8] bg-[#FBFAF7] p-5"><Folder size={21} strokeWidth={1.5} /><p className="mt-5 font-semibold">All materials</p><p className="mt-1 text-xs text-[#737373]">{documents.length} items</p></div>{subjects.map((item) => <button type="button" key={item} onClick={() => setSubject(item)} className="border border-[#E5E1D8] bg-[#FBFAF7] p-5 text-left transition-colors hover:border-[#171717]"><Folder size={21} strokeWidth={1.5} /><p className="mt-5 font-semibold">{item}</p><p className="mt-1 text-xs text-[#737373]">{documents.filter((document) => document.subject === item).length} items</p></button>)}</div></section>
    <section className="mt-10"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#737373]">All materials</h2><div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Vault document filters">{filters.map((item) => <button type="button" role="tab" aria-selected={filter === item} key={item} onClick={() => setFilter(item)} className={`shrink-0 border-b-2 px-2 py-2 text-[10px] font-semibold tracking-[0.12em] ${filter === item ? "border-[#171717]" : "border-transparent text-[#737373]"}`}>{item}</button>)}</div></div><div className="mb-4 flex justify-end"><label htmlFor="vault-subject" className="sr-only">Filter by subject</label><select id="vault-subject" value={subject} onChange={(event) => setSubject(event.target.value)} className="border border-[#E5E1D8] bg-[#FBFAF7] px-3 py-2 text-xs outline-none focus:border-[#171717]"><option value="ALL">All subjects</option>{subjects.map((item) => <option key={item} value={item}>{item}</option>)}</select></div><div className="border-y border-[#E5E1D8] bg-[#FBFAF7]">{loading ? <div className="p-10 text-center text-sm text-[#737373]">Loading your vault...</div> : visibleDocuments.length ? visibleDocuments.map((document) => <DocumentRow key={document.id} document={document} />) : <div className="p-10 text-center"><p className="font-black">YOUR VAULT IS EMPTY</p><p className="mt-2 text-sm text-[#737373]">Upload a PDF to begin building your academic space.</p><Button type="button" onClick={() => setShowAdd(true)} variant="secondary" className="mt-5">+ Add material</Button></div>}</div></section>
    {showAdd ? <AddMaterial onClose={() => { setShowAdd(false); setError(""); }} onUpload={upload} loading={uploading} error={error} /> : null}
  </Container></main>;
}
