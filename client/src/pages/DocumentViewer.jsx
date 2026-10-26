import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Bookmark, FileText } from "lucide-react";
import Container from "@/components/common/Container";
import { authService } from "@/services/auth";

function Panel({ title, children, className = "" }) {
  return <section className={`border border-[#E5E1D8] bg-[#FBFAF7] p-5 md:p-6 ${className}`}><h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#737373]">{title}</h2>{children}</section>;
}

export default function DocumentViewer() {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    authService.getVaultDocument(id).then(setDocument).catch((loadError) => setError(loadError.message)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <main className="min-h-screen bg-[#F7F5F0]"><Container className="py-12 text-sm text-[#737373]">Loading document...</Container></main>;
  if (error || !document) return <main className="min-h-screen bg-[#F7F5F0]"><Container className="py-12"><Link to="/vault" className="text-sm underline underline-offset-4">← Back to vault</Link><p className="mt-8 border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || "Document not found."}</p></Container></main>;

  return <main className="min-h-screen bg-[#F7F5F0] text-[#171717]"><Container className="py-8 md:py-12">
    <header className="mb-8 border-b border-[#E5E1D8] pb-7"><Link to="/vault" className="text-sm text-[#737373] underline underline-offset-4">← Back to vault</Link><div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#737373]">PRAGATI / VAULT / {document.subject || "GENERAL"}</p><h1 className="mt-3 break-words text-3xl font-black tracking-[-0.05em] md:text-5xl">{document.originalName}</h1><p className="mt-3 text-sm text-[#737373]">{document.type} · {document.pageCount || "—"} pages · {document.chunkCount} chunks</p></div><button type="button" aria-pressed={saved} onClick={() => setSaved((value) => !value)} className="inline-flex items-center gap-2 self-start border border-[#E5E1D8] px-4 py-2 text-xs font-semibold hover:border-[#171717]"><Bookmark size={15} /> {saved ? "Saved ✓" : "Save"}</button></div></header>
    <div className="grid gap-6 lg:grid-cols-[1.45fr_0.75fr]"><div className="space-y-6"><Panel title="Extracted text"><article className="min-h-[560px] whitespace-pre-wrap bg-white p-6 text-sm leading-8 text-[#3D3B37] shadow-[0_1px_0_#E5E1D8] md:p-12">{document.previewText || "No extracted text is available."}</article></Panel><Panel title="Document metadata"><div className="grid grid-cols-2 gap-y-5 text-sm sm:grid-cols-4">{[["File type", document.type], ["Subject", document.subject || "General"], ["Pages", document.pageCount || "—"], ["Status", document.status]].map(([label, value]) => <div key={label}><p className="text-[10px] uppercase tracking-[0.12em] text-[#737373]">{label}</p><p className="mt-2 font-semibold">{value}</p></div>)}</div></Panel></div><aside className="space-y-6"><Panel title="Document context" className="border-[#171717]"><div className="flex gap-3"><FileText size={20} strokeWidth={1.5} /><div><p className="break-words font-semibold">{document.originalName}</p><p className="mt-1 text-xs text-[#737373]">{document.chunkCount} stored chunks · {document.extractedTextLength} characters</p></div></div></Panel><Panel title="Pragati AI"><p className="text-sm leading-6 text-[#737373]">Document actions will use this stored material when the future retrieval and RAG phase is enabled.</p></Panel></aside></div>
  </Container></main>;
}
