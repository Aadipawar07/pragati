import React, { useState } from 'react';
import {
  ArrowRight,
  Compass,
  Layers,
  Brain,
  CheckCircle2,
  Terminal,
  ShieldCheck,
  Zap,
  BookOpen,
  Clock,
  Activity,
  ArrowUpRight,
  ChevronRight,
  Sparkles,
  Menu,
  X,
  Cpu,
  GitBranch,
  Database,
  Target,
  Award,
} from 'lucide-react';

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#171717] font-sans antialiased selection:bg-[#171717] selection:text-[#F7F5F0] relative overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none z-0 opacity-40 bg-[linear-gradient(to_right,#E5E1D8_1px,transparent_1px),linear-gradient(to_bottom,#E5E1D8_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-[#EAE4D9]/50 to-transparent rounded-full blur-3xl pointer-events-none z-0" />

      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#F7F5F0]/80 border-b border-[#E5E1D8] transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 rounded bg-[#171717] text-[#F7F5F0] flex items-center justify-center font-bold tracking-tighter text-sm shadow-sm">P</div>
            <div>
              <span className="font-semibold tracking-tight text-lg block leading-none">PRAGATI AI</span>
              <span className="text-[10px] tracking-widest text-[#737373] uppercase font-mono mt-0.5 block">STUDENT STUDY OS</span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-[#737373]">
            <button onClick={() => scrollToSection('problem')} className="hover:text-[#171717] transition-colors">The Problem</button>
            <button onClick={() => scrollToSection('shift')} className="hover:text-[#171717] transition-colors">The Shift</button>
            <button onClick={() => scrollToSection('os-section')} className="hover:text-[#171717] transition-colors">The OS</button>
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-[#171717] transition-colors">How it works</button>
            <button onClick={() => scrollToSection('ecosystem')} className="hover:text-[#171717] transition-colors">Ecosystem</button>
            <button onClick={() => scrollToSection('vision')} className="hover:text-[#171717] transition-colors">Vision</button>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <button onClick={() => alert('Pragati AI is currently in private preview. Request access via the journey button!')} className="text-sm font-medium text-[#171717] px-4 py-2 hover:opacity-75 transition-opacity">Login</button>
            <button onClick={() => scrollToSection('cta')} className="text-xs uppercase font-mono tracking-wider bg-[#171717] text-[#F7F5F0] px-5 py-2.5 rounded hover:bg-black transition-all flex items-center space-x-2 shadow-sm">
              <span>Start Journey</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="md:hidden">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-[#171717]">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-[#F7F5F0] border-b border-[#E5E1D8] px-6 py-6 flex flex-col space-y-4 shadow-lg z-50">
            <button onClick={() => scrollToSection('problem')} className="text-left font-medium py-2">The Problem</button>
            <button onClick={() => scrollToSection('shift')} className="text-left font-medium py-2">The Shift</button>
            <button onClick={() => scrollToSection('os-section')} className="text-left font-medium py-2">The OS</button>
            <button onClick={() => scrollToSection('how-it-works')} className="text-left font-medium py-2">How it works</button>
            <button onClick={() => scrollToSection('ecosystem')} className="text-left font-medium py-2">Ecosystem</button>
            <button onClick={() => scrollToSection('vision')} className="text-left font-medium py-2">Vision</button>
            <hr className="border-[#E5E1D8]" />
            <button onClick={() => scrollToSection('cta')} className="w-full bg-[#171717] text-[#F7F5F0] py-3 rounded text-center font-medium">Start Journey →</button>
          </div>
        )}
      </nav>

      <section className="relative z-10 pt-20 pb-32 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#FBFAF7] border border-[#E5E1D8] text-[11px] font-mono uppercase tracking-widest text-[#737373] mb-8 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          <span>PRAGATI AI / STUDENT STUDY OS</span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-[#171717] max-w-5xl leading-[1.05] mb-8">
          YOUR LEARNING, <br />
          <span className="font-serif italic font-normal text-[#404040]">CONNECTED.</span>
        </h1>

        <p className="text-lg md:text-xl text-[#737373] max-w-2xl font-normal leading-relaxed mb-12">
          Your study material, learning, memory, exams, skills and career — connected by one intelligent system.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-20">
          <button onClick={() => scrollToSection('cta')} className="w-full sm:w-auto bg-[#171717] text-[#F7F5F0] px-8 py-4 rounded-lg font-medium text-sm hover:bg-black transition-all flex items-center justify-center space-x-3 shadow-md group">
            <span>START YOUR JOURNEY</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button onClick={() => scrollToSection('os-section')} className="w-full sm:w-auto bg-[#FBFAF7] text-[#171717] border border-[#E5E1D8] px-8 py-4 rounded-lg font-medium text-sm hover:bg-[#F2EFE9] transition-all flex items-center justify-center space-x-2 shadow-2xs">
            <span>EXPLORE PRAGATI OS</span>
          </button>
        </div>

        <div className="relative w-full max-w-5xl h-[340px] md:h-[400px] mt-4 pointer-events-none">
          <div className="absolute top-4 left-2 md:left-12 bg-[#FBFAF7] border border-[#E5E1D8] p-4 rounded-xl shadow-xl w-64 text-left transform -rotate-2 animate-bounce-slow z-25">
            <div className="flex items-center justify-between text-[10px] font-mono text-[#737373] uppercase mb-2">
              <span>Next Best Action</span>
              <span className="text-emerald-600 font-bold">Priority</span>
            </div>
            <p className="text-xs font-bold text-[#171717] mb-1">Normalization (DBMS)</p>
            <div className="flex items-center justify-between text-[11px] text-[#737373] mt-3 pt-2 border-t border-[#EEEAE2]">
              <span>45 min session</span>
              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">Weak prerequisite</span>
            </div>
          </div>

          <div className="absolute top-16 right-4 md:right-12 bg-[#FBFAF7] border border-[#E5E1D8] p-4 rounded-xl shadow-xl w-56 text-left transform rotate-3 animate-float-delayed z-20">
            <div className="flex items-center justify-between text-[10px] font-mono text-[#737373] uppercase mb-2">
              <span>Roadmap Status</span>
              <span className="text-blue-600 font-bold">Active</span>
            </div>
            <p className="text-xs font-bold text-[#171717] mb-2">B.Tech CS Semester 5</p>
            <div className="w-full bg-[#E5E1D8] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#171717] h-full w-[72%]" />
            </div>
            <div className="flex justify-between items-center mt-2 text-[10px] text-[#737373] font-mono">
              <span>72% COMPLETE</span>
              <span>18 topics left</span>
            </div>
          </div>

          <div className="absolute bottom-6 left-12 md:left-36 bg-[#FBFAF7] border border-[#E5E1D8] p-4 rounded-xl shadow-xl w-52 text-left transform rotate-1 animate-float z-30">
            <div className="flex items-center justify-between text-[10px] font-mono text-[#737373] uppercase mb-2">
              <span>Memory Engine</span>
              <span className="text-rose-600 font-bold">Due</span>
            </div>
            <p className="text-xs font-bold text-[#171717] mb-1">3 Reviews Due Today</p>
            <p className="text-[11px] text-[#737373]">Spaced repetition active for OS & Networks.</p>
          </div>

          <div className="absolute bottom-2 right-16 md:right-32 bg-[#FBFAF7] border border-[#E5E1D8] p-4 rounded-xl shadow-xl w-60 text-left transform -rotate-2 animate-float-delayed z-20">
            <div className="flex items-center justify-between text-[10px] font-mono text-[#737373] uppercase mb-2">
              <span>Career Alignment</span>
              <span className="text-purple-600 font-bold">Mapped</span>
            </div>
            <p className="text-xs font-bold text-[#171717] mb-1">Full Stack Engineer</p>
            <div className="flex items-center justify-between text-[11px] text-[#737373] mt-2">
              <span>Skill Gap: SQL Joins</span>
              <span className="font-mono font-bold text-[#171717]">43%</span>
            </div>
          </div>
        </div>
      </section>

      <section id="problem" className="py-28 px-6 border-t border-[#E5E1D8] bg-[#FBFAF7] relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-[#737373] mb-6">
            <span>THE PROBLEM / 01</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#171717] leading-[1.1] mb-8">
                STUDENTS DON'T HAVE <br />
                A LACK OF CONTENT. <br />
                <span className="font-serif italic font-normal text-[#525252]">THEY HAVE A LACK OF DIRECTION.</span>
              </h2>
              <p className="text-lg text-[#737373] leading-relaxed mb-6">
                Students already have notes, PDFs, videos, question banks, AI tools and courses. The problem is never finding more material—it is knowing what to study, when to study it, how to understand it, how to remember it, and where it actually leads.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4">
                {['What to study first?', 'Which topics matter?', 'How to understand this?', 'Am I falling behind?', 'What to revise today?', 'What career path?'].map((q, idx) => (
                  <div key={idx} className="p-3 bg-[#F7F5F0] border border-[#E5E1D8] rounded text-xs text-[#171717] font-medium flex items-center space-x-2">
                    <span className="w-1 h-1 rounded-full bg-[#737373]" />
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#F7F5F0] border border-[#E5E1D8] rounded-2xl p-8 relative overflow-hidden shadow-sm">
              <div className="text-[11px] font-mono uppercase text-[#737373] tracking-wider mb-6 flex justify-between items-center">
                <span>FRAGMENTED TOOLS</span>
                <span className="text-rose-600">Cognitive Overload</span>
              </div>
              <div className="flex flex-wrap gap-2.5 mb-8">
                {['PDFs', 'YouTube', 'Lecture Notes', 'PYQs', 'ChatGPT', 'Flashcards', 'Question Banks', 'Courses'].map((tool, i) => (
                  <span key={i} className="px-3 py-1.5 bg-[#FBFAF7] border border-[#E5E1D8] rounded-md text-xs font-mono text-[#737373]">{tool}</span>
                ))}
              </div>
              <div className="p-4 bg-[#171717] text-[#F7F5F0] rounded-xl text-center shadow-md">
                <p className="text-xs font-mono uppercase tracking-widest text-[#B8AEA0] mb-1">Connected by</p>
                <p className="text-base font-bold tracking-tight">PRAGATI OS INTELLIGENCE</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="shift" className="py-28 px-6 border-t border-[#E5E1D8] bg-[#F7F5F0] relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-[#737373] mb-6">
            <span>THE SHIFT / 02</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#171717] mb-16">
            FROM MORE INFORMATION <br />
            <span className="font-serif italic font-normal text-[#525252]">TO BETTER DIRECTION.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#FBFAF7] border border-[#E5E1D8] rounded-2xl p-8 shadow-2xs">
              <div className="inline-block px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-mono uppercase tracking-wider rounded mb-4">Fragmented State</div>
              <h3 className="text-xl font-bold text-[#171717] mb-6">Unconnected Learning Artifacts</h3>
              <ul className="space-y-3 text-sm text-[#737373]">
                {['Study resources are scattered across folders', 'Notes are difficult to search and connect', 'Videos watched without retention planning', 'Tests taken without gap analysis', 'Career goals disconnected from semester subjects'].map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-3">
                    <span className="text-rose-600 font-bold mt-0.5">×</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#171717] text-[#F7F5F0] border border-[#171717] rounded-2xl p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              <div className="inline-block px-2.5 py-1 bg-emerald-950 border border-emerald-800 text-emerald-400 text-[10px] font-mono uppercase tracking-wider rounded mb-4">Connected OS State</div>
              <h3 className="text-xl font-bold text-[#F7F5F0] mb-6">PRAGATI OS Architecture</h3>
              <ul className="space-y-3 text-sm text-[#D8D0C1]">
                {['Study Vault indexes and connects all materials', 'Roadmap adapts daily based on exam timelines', 'Memory engine schedules spaced repetition automatically', 'Exam intelligence prioritizes high-yield concepts', 'Academics flow seamlessly into project portfolios'].map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-3">
                    <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="os-section" className="py-28 px-6 border-t border-[#E5E1D8] bg-[#FBFAF7] relative z-10">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 text-xs font-mono uppercase tracking-widest text-[#737373] mb-6">
            <span>INTRODUCING / 03</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#171717] mb-6">
            AN OPERATING SYSTEM <br />
            <span className="font-serif italic font-normal text-[#525252]">FOR YOUR LEARNING.</span>
          </h2>

          <p className="text-lg text-[#737373] max-w-2xl mx-auto mb-20">
            Pragati doesn't treat learning as a collection of disconnected tasks. It connects your academic journey into one continuously evolving system.
          </p>

          <div className="relative max-w-4xl mx-auto h-[480px] bg-[#F7F5F0] border border-[#E5E1D8] rounded-3xl p-8 flex items-center justify-center shadow-sm overflow-hidden">
            <div className="absolute z-30 bg-[#171717] text-[#F7F5F0] px-8 py-6 rounded-2xl shadow-2xl text-center border border-[#333]">
              <div className="w-3 h-3 rounded-full bg-emerald-500 mx-auto mb-2 animate-ping" />
              <span className="text-xs font-mono tracking-widest text-[#B8AEA0] block mb-1">INTELLIGENCE CORE</span>
              <span className="text-lg font-black tracking-tight block">PRAGATI OS</span>
            </div>

            <div className="absolute top-12 left-12 bg-[#FBFAF7] border border-[#E5E1D8] px-4 py-3 rounded-xl shadow-md text-xs font-mono text-[#171717] flex items-center space-x-2">
              <Database className="w-4 h-4 text-[#737373]" />
              <span>STUDY VAULT</span>
            </div>

            <div className="absolute top-12 right-12 bg-[#FBFAF7] border border-[#E5E1D8] px-4 py-3 rounded-xl shadow-md text-xs font-mono text-[#171717] flex items-center space-x-2">
              <GitBranch className="w-4 h-4 text-[#737373]" />
              <span>ROADMAP</span>
            </div>

            <div className="absolute top-1/2 left-6 -translate-y-1/2 bg-[#FBFAF7] border border-[#E5E1D8] px-4 py-3 rounded-xl shadow-md text-xs font-mono text-[#171717] flex items-center space-x-2">
              <Brain className="w-4 h-4 text-[#737373]" />
              <span>KNOWLEDGE GRAPH</span>
            </div>

            <div className="absolute top-1/2 right-6 -translate-y-1/2 bg-[#FBFAF7] border border-[#E5E1D8] px-4 py-3 rounded-xl shadow-md text-xs font-mono text-[#171717] flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#737373]" />
              <span>MEMORY ENGINE</span>
            </div>

            <div className="absolute bottom-12 left-12 bg-[#FBFAF7] border border-[#E5E1D8] px-4 py-3 rounded-xl shadow-md text-xs font-mono text-[#171717] flex items-center space-x-2">
              <Target className="w-4 h-4 text-[#737373]" />
              <span>EXAM INTEL</span>
            </div>

            <div className="absolute bottom-12 right-12 bg-[#FBFAF7] border border-[#E5E1D8] px-4 py-3 rounded-xl shadow-md text-xs font-mono text-[#171717] flex items-center space-x-2">
              <Award className="w-4 h-4 text-[#737373]" />
              <span>CAREER & PROJECTS</span>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#FBFAF7] border border-[#E5E1D8] px-4 py-3 rounded-xl shadow-md text-xs font-mono text-[#171717] flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#737373]" />
              <span>AI MENTOR</span>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-28 px-6 border-t border-[#E5E1D8] bg-[#F7F5F0] relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-[#737373] mb-6">
            <span>HOW IT WORKS / 04</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#171717] mb-20">
            YOUR JOURNEY. <br />
            <span className="font-serif italic font-normal text-[#525252]">ONE SYSTEM.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[
              { num: '01', title: 'UPLOAD', desc: 'Your lecture notes, reading material and past papers.' },
              { num: '02', title: 'UNDERSTAND', desc: 'Learn concepts, explore your subjects and connect useful ideas.' },
              { num: '03', title: 'PERSONALIZE', desc: 'Your goals, available time and current knowledge shape the roadmap.' },
              { num: '04', title: 'ADAPT', desc: 'Your tests, progress and weaknesses continuously update the system.' },
              { num: '05', title: 'GROW', desc: 'Connect academics directly to skills, projects and career direction.' },
            ].map((step, idx) => (
              <div key={idx} className="bg-[#FBFAF7] border border-[#E5E1D8] p-6 rounded-2xl flex flex-col justify-between shadow-2xs relative">
                <span className="text-5xl font-black text-[#D8D0C1]/60 font-mono mb-4 block">{step.num}</span>
                <div>
                  <h3 className="text-base font-bold text-[#171717] mb-2">{step.title}</h3>
                  <p className="text-xs text-[#737373] leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-28 px-6 border-t border-[#E5E1D8] bg-[#FBFAF7] relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-[#737373] mb-6">
            <span>THE INTELLIGENCE LOOP / 05</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#171717] mb-6">
                PRAGATI DOESN'T JUST GIVE YOU A PLAN. <br />
                <span className="font-serif italic font-normal text-[#525252]">IT LEARNS FROM WHAT HAPPENS NEXT.</span>
              </h2>
              <p className="text-lg text-[#737373] leading-relaxed mb-8">
                Traditional study apps give you a static checklist. Pragati creates a continuous feedback loop that recalibrates your roadmap based on your test performance, cognitive load, and revision intervals.
              </p>
              <div className="p-6 bg-[#F7F5F0] border border-[#E5E1D8] rounded-2xl font-mono text-xs text-[#171717]">
                <p className="font-bold mb-1 text-[#171717]">"The roadmap isn't fixed. It evolves with you."</p>
                <p className="text-[#737373]">Every quiz attempt and flashcard review refines your personalized learning trajectory in real-time.</p>
              </div>
            </div>

            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-md bg-[#F7F5F0] border border-[#E5E1D8] rounded-3xl p-8 shadow-sm flex flex-col space-y-4">
                {['STUDENT', 'LEARN', 'PRACTICE', 'TEST', 'MEASURE', 'IDENTIFY GAPS', 'ADAPT', 'NEXT BEST ACTION'].map((node, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[#FBFAF7] border border-[#E5E1D8] rounded-xl text-xs font-mono">
                    <span className="font-bold text-[#171717]">{node}</span>
                    <span className="text-[#737373]">0{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="ecosystem" className="py-28 px-6 border-t border-[#E5E1D8] bg-[#F7F5F0] relative z-10">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 text-xs font-mono uppercase tracking-widest text-[#737373] mb-6">
            <span>THE ECOSYSTEM / 06</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#171717] mb-16">
            EVERYTHING YOU NEED. <br />
            <span className="font-serif italic font-normal text-[#525252]">CONNECTED.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { num: '01', title: 'STUDY VAULT', desc: 'Your PDFs, lecture notes, PYQs and study material indexed into one searchable brain.' },
              { num: '02', title: 'ROADMAP', desc: 'Dynamic study paths telling you precisely what to learn next.' },
              { num: '03', title: 'MEMORY', desc: 'Automated spaced repetition to permanently retain what you study.' },
              { num: '04', title: 'EXAM INTELLIGENCE', desc: 'Use your study and practice history to focus revision.' },
              { num: '05', title: 'KNOWLEDGE GRAPH', desc: 'Visual map of what you have mastered and where your blind spots lie.' },
              { num: '06', title: 'CAREER', desc: 'Connect college subjects directly to industry skills and career roles.' },
              { num: '07', title: 'PROJECTS', desc: 'Turn academic theories into concrete projects you can build and showcase.' },
              { num: '08', title: 'AI MENTOR', desc: 'Your contextual learning guide that knows your exact academic standing.' },
            ].map((card, i) => (
              <div key={i} className="bg-[#FBFAF7] border border-[#E5E1D8] p-8 rounded-2xl shadow-2xs hover:border-[#171717] transition-all flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono text-[#737373] mb-3 block">{card.num}</span>
                  <h3 className="text-lg font-bold text-[#171717] mb-3">{card.title}</h3>
                  <p className="text-sm text-[#737373] leading-relaxed">{card.desc}</p>
                </div>
                <div className="mt-8 pt-4 border-t border-[#EEEAE2] flex items-center justify-between text-xs font-mono text-[#737373]">
                  <span>EXPLORE MODULE</span>
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-28 px-6 border-t border-[#E5E1D8] bg-[#FBFAF7] relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-[#737373] mb-6">
            <span>EXAM INTELLIGENCE / 07</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#171717] mb-6">
                DON'T JUST STUDY. <br />
                <span className="font-serif italic font-normal text-[#525252]">KNOW WHAT TO FOCUS ON.</span>
              </h2>
              <p className="text-lg text-[#737373] leading-relaxed mb-6">
                Use your exam schedule and practice history to make more focused revision choices.
              </p>
              <div className="p-4 bg-[#F7F5F0] border border-[#E5E1D8] rounded-xl text-xs text-[#737373] font-mono">
                * Note: Recommendations reflect available study records and are not predictions of exam questions.
              </div>
            </div>

            <div className="lg:col-span-6 bg-[#F7F5F0] border border-[#E5E1D8] rounded-3xl p-8 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E1D8] mb-6">
                <span className="font-mono text-xs font-bold text-[#171717]">DBMS — SEMESTER EXAM INTEL</span>
                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-mono rounded border border-rose-200">HIGH PRIORITY</span>
              </div>
              <div className="space-y-4 font-mono text-xs">
                <div>
                  <div className="flex justify-between mb-1 text-[#171717] font-bold">
                    <span>Normalization (1NF to BCNF)</span>
                    <span>94% Weight</span>
                  </div>
                  <div className="w-full bg-[#E5E1D8] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#171717] h-full w-[94%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1 text-[#171717] font-bold">
                    <span>Transactions & ACID Properties</span>
                    <span>88% Weight</span>
                  </div>
                  <div className="w-full bg-[#E5E1D8] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#171717] h-full w-[88%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1 text-[#737373]">
                    <span>B+ Trees & Indexing</span>
                    <span>65% Weight</span>
                  </div>
                  <div className="w-full bg-[#E5E1D8] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#737373] h-full w-[65%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-28 px-6 border-t border-[#E5E1D8] bg-[#F7F5F0] relative z-10">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 text-xs font-mono uppercase tracking-widest text-[#737373] mb-6">
            <span>UNDERSTAND / REMEMBER / 08</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#171717] mb-16">
            UNDERSTAND IT. SEE IT. <br />
            <span className="font-serif italic font-normal text-[#525252]">REMEMBER IT.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 max-w-5xl mx-auto">
            {[
              { step: '01', title: 'CONCEPT', desc: 'Database Indexing' },
              { step: '02', title: 'SIMPLE EXPLANATION', desc: 'Like an index at the back of a textbook.' },
              { step: '03', title: 'REAL ANALOGY', desc: 'Phonebook sorted alphabetically.' },
              { step: '04', title: 'VISUAL DIAGRAM', desc: 'B+ Tree pointer hierarchy.' },
              { step: '05', title: 'MEMORY HOOK', desc: 'O(log n) lookup speed.' },
              { step: '06', title: 'EXAM ANSWER', desc: 'Structured markdown output.' },
            ].map((item, i) => (
              <div key={i} className="bg-[#FBFAF7] border border-[#E5E1D8] p-6 rounded-2xl text-left shadow-2xs flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-[#737373] block mb-2">{item.step}</span>
                  <h3 className="text-sm font-bold text-[#171717] mb-2">{item.title}</h3>
                  <p className="text-xs text-[#737373]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-28 px-6 border-t border-[#E5E1D8] bg-[#FBFAF7] relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-[#737373] mb-6">
            <span>BEYOND THE CLASSROOM / 09</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#171717] mb-16">
            KNOW WHY <br />
            <span className="font-serif italic font-normal text-[#525252]">YOU'RE LEARNING IT.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#F7F5F0] border border-[#E5E1D8] p-8 rounded-3xl">
              <span className="text-xs font-mono text-[#737373] uppercase mb-4 block">Pathway Example A</span>
              <div className="space-y-3 font-mono text-xs text-[#171717]">
                <div className="p-3 bg-[#FBFAF7] border border-[#E5E1D8] rounded-xl font-bold">DBMS (Course subject)</div>
                <div className="text-center text-[#737373]">↓</div>
                <div className="p-3 bg-[#FBFAF7] border border-[#E5E1D8] rounded-xl font-bold">SQL Optimization & Indexing</div>
                <div className="text-center text-[#737373]">↓</div>
                <div className="p-3 bg-[#FBFAF7] border border-[#E5E1D8] rounded-xl font-bold">Backend Architecture</div>
                <div className="text-center text-[#737373]">↓</div>
                <div className="p-3 bg-[#171717] text-[#F7F5F0] rounded-xl font-bold">Backend Developer Role & Project</div>
              </div>
            </div>

            <div className="bg-[#F7F5F0] border border-[#E5E1D8] p-8 rounded-3xl">
              <span className="text-xs font-mono text-[#737373] uppercase mb-4 block">Pathway Example B</span>
              <div className="space-y-3 font-mono text-xs text-[#171717]">
                <div className="p-3 bg-[#FBFAF7] border border-[#E5E1D8] rounded-xl font-bold">Data Structures (Semester 3)</div>
                <div className="text-center text-[#737373]">↓</div>
                <div className="p-3 bg-[#FBFAF7] border border-[#E5E1D8] rounded-xl font-bold">Graph Algorithms & Search</div>
                <div className="text-center text-[#737373]">↓</div>
                <div className="p-3 bg-[#FBFAF7] border border-[#E5E1D8] rounded-xl font-bold">Problem Solving Mastery</div>
                <div className="text-center text-[#737373]">↓</div>
                <div className="p-3 bg-[#171717] text-[#F7F5F0] rounded-xl font-bold">Software Engineering Career</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-28 px-6 border-t border-[#E5E1D8] bg-[#F7F5F0] relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-[#737373] mb-6">
            <span>AI MENTOR / 10</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#171717] mb-6">
                NOT ANOTHER <br />
                <span className="font-serif italic font-normal text-[#525252]">CHATBOT.</span>
              </h2>
              <p className="text-lg text-[#737373] leading-relaxed mb-6">
                Pragati AI mentor understands your exact learning context, recent test performance, and exam dates. It guides you with precise next steps rather than generic summaries.
              </p>
            </div>

            <div className="lg:col-span-7 bg-[#FBFAF7] border border-[#E5E1D8] rounded-3xl p-8 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E1D8] mb-6">
                <span className="font-mono text-xs font-bold text-[#171717]">PRAGATI AI MENTOR SESSION</span>
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
              </div>
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-[#F7F5F0] border border-[#E5E1D8] rounded-2xl text-xs text-[#171717] font-mono leading-relaxed">
                  "I've looked at your roadmap, recent test performance and revision schedule. You should focus on <span className="font-bold underline">Normalization</span> today."
                </div>
                <div className="p-4 bg-[#F7F5F0] border border-[#E5E1D8] rounded-2xl text-xs text-[#737373] font-mono leading-relaxed">
                  <span className="font-bold text-[#171717] block mb-1">Why?</span>
                  "Your recent quiz attempts show a gap in Functional Dependencies, which is a core prerequisite for this topic."
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="px-4 py-2 bg-[#171717] text-[#F7F5F0] rounded-lg text-xs font-mono font-medium">Start Learning</button>
                <button className="px-4 py-2 bg-[#F7F5F0] border border-[#E5E1D8] text-[#171717] rounded-lg text-xs font-mono font-medium">Practice Quiz</button>
                <button className="px-4 py-2 bg-[#F7F5F0] border border-[#E5E1D8] text-[#737373] rounded-lg text-xs font-mono font-medium">Revise Later</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="vision" className="py-28 px-6 border-t border-[#E5E1D8] bg-[#FBFAF7] relative z-10">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 text-xs font-mono uppercase tracking-widest text-[#737373] mb-6">
            <span>THE FUTURE / 11</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#171717] mb-6">
            YOUR LEARNING SHOULD <br />
            <span className="font-serif italic font-normal text-[#525252]">EVOLVE WITH YOU.</span>
          </h2>
          <p className="text-lg text-[#737373] max-w-xl mx-auto mb-16">
            We are building toward an ambient intelligence layer for every student.
          </p>

          <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
            {['Adaptive AI', 'Offline Intelligence', 'Personal Knowledge Graph', 'Hybrid AI', 'Immersive Learning'].map((feat, idx) => (
              <div key={idx} className="px-6 py-4 bg-[#F7F5F0] border border-[#E5E1D8] rounded-2xl text-sm font-mono font-medium text-[#171717] shadow-2xs">{feat}</div>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="py-32 px-6 border-t border-[#E5E1D8] bg-[#171717] text-[#F7F5F0] relative z-10 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="text-xs font-mono uppercase tracking-widest text-[#B8AEA0] mb-6 block">PRAGATI AI / THE STUDENT STUDY OS</span>

          <h2 className="text-4xl md:text-7xl font-black tracking-tight mb-8 leading-[1.1]">
            STOP ASKING <br />
            <span className="font-serif italic font-normal text-[#D8D0C1]">"WHAT SHOULD I STUDY?"</span> <br />
            START KNOWING <span className="underline decoration-[#737373]">"WHAT'S NEXT."</span>
          </h2>

          <p className="text-lg text-[#B8AEA0] max-w-xl mx-auto mb-12">
            Pragati AI is building a smarter way to navigate college, learning and the future.
          </p>

          <button onClick={() => alert('Thank you for your interest in Pragati AI! Private preview access invitations are rolling out weekly.')} className="bg-[#F7F5F0] text-[#171717] px-8 py-4 rounded-xl font-medium text-sm hover:bg-white transition-all inline-flex items-center space-x-3 shadow-xl">
            <span>START YOUR JOURNEY</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="mt-12 text-xs font-mono text-[#B8AEA0] uppercase tracking-widest">
            "Because Direction Drives Success."
          </div>
        </div>
      </section>

      <footer className="py-12 px-6 bg-[#0D0D0D] text-[#737373] border-t border-[#262626] font-mono text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded bg-[#F7F5F0] text-[#0D0D0D] flex items-center justify-center font-bold text-xs">P</div>
            <span className="text-[#F7F5F0] font-sans font-bold">PRAGATI AI</span>
            <span>— The Student Study OS.</span>
          </div>

          <div className="flex items-center space-x-6 text-[#B8AEA0]">
            <button onClick={() => scrollToSection('problem')} className="hover:text-[#F7F5F0] transition-colors">Product</button>
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-[#F7F5F0] transition-colors">How it works</button>
            <button onClick={() => scrollToSection('vision')} className="hover:text-[#F7F5F0] transition-colors">Vision</button>
            <button onClick={() => alert('Contact: support@pragati.ai')} className="hover:text-[#F7F5F0] transition-colors">Contact</button>
          </div>

          <div>© {new Date().getFullYear()} Pragati AI. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
