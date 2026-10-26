import Container from "@/components/common/Container";
import { Link } from "react-router-dom";

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <main className="min-h-screen bg-[#F7F5F0] text-[#171717]">
      <Container className="flex min-h-screen items-center justify-center py-12">
        <div className="w-full max-w-5xl overflow-hidden rounded-[28px] border border-[#E5E1D8] bg-[#FBFAF7] shadow-[0_20px_60px_rgba(23,23,23,0.05)]">
          <div className="grid min-h-[760px] md:grid-cols-[1.1fr_1.3fr]">
            <aside className="hidden border-r border-[#E5E1D8] bg-[#F7F5F0] p-10 md:flex md:flex-col md:justify-between">
              <div>
                <Link to="/" className="inline-flex items-center gap-3 text-left">
                  <div className="flex h-9 w-9 items-center justify-center rounded bg-[#171717] text-sm font-bold text-[#F7F5F0]">P</div>
                  <div>
                    <div className="text-lg font-semibold tracking-tight">PRAGATI AI</div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#737373]">Student Study OS</div>
                  </div>
                </Link>

                <div className="mt-16 space-y-6">
                  <div className="inline-flex rounded-full border border-[#E5E1D8] bg-[#FBFAF7] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#737373]">Because Direction Drives Success.</div>
                  <h1 className="max-w-xs text-4xl font-black leading-[1.05] tracking-[-0.05em] text-[#171717]">Your learning, connected.</h1>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-[#E5E1D8] bg-[#FBFAF7] p-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#737373]">System status</div>
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-sm text-[#171717]">Study plan sync active</span>
                </div>
              </div>
            </aside>

            <section className="bg-[#FBFAF7] p-6 sm:p-10 lg:p-12">
              <div className="mx-auto max-w-xl">
                <div className="mb-8 md:hidden">
                  <Link to="/" className="inline-flex items-center gap-3 text-left">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-[#171717] text-xs font-bold text-[#F7F5F0]">P</div>
                    <div>
                      <div className="text-base font-semibold tracking-tight">PRAGATI AI</div>
                      <div className="text-[9px] uppercase tracking-[0.2em] text-[#737373]">Student Study OS</div>
                    </div>
                  </Link>
                </div>

                <div className="mb-8">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#737373]">PRAGATI AI</p>
                  <h2 className="text-3xl font-black tracking-[-0.05em] text-[#171717] md:text-4xl">{title}</h2>
                  {subtitle ? <p className="mt-3 max-w-md text-base leading-7 text-[#737373]">{subtitle}</p> : null}
                </div>

                {children}

                {footer ? <div className="mt-8 text-sm text-[#737373]">{footer}</div> : null}
              </div>
            </section>
          </div>
        </div>
      </Container>
    </main>
  );
}
