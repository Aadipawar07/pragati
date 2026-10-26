import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import { useStudent } from "@/context/StudentContext";
import { authService } from "@/services/auth";

const steps = ["Academic profile", "Study profile", "Goals", "Career profile"];
const languages = ["English", "Marathi", "Hindi", "English + Marathi", "English + Hindi"];
const preferences = ["Reading", "Watching", "Practicing", "Visual", "Mixed"];
const focusOptions = ["Improve marks", "Build fundamentals", "Prepare for exams", "Explore career path", "Build projects"];
const fields = ["Software Development", "AI / ML", "Data Science", "Cybersecurity", "Design", "Business", "Entrepreneurship", "Not sure yet"];
const roles = ["Frontend Developer", "Backend Developer", "Full Stack Developer", "Data Analyst", "ML Engineer", "Cybersecurity Analyst", "Other", "Not sure yet"];

function Choice({ children, selected, onClick, multi = false }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${selected ? "border-[#171717] bg-[#171717] text-[#F7F5F0]" : "border-[#E5E1D8] bg-[#F7F5F0] text-[#171717] hover:border-[#171717]"}`}>{multi && <span className="mr-2">{selected ? "✓" : "○"}</span>}{children}</button>;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { studentContext, setStudentContext, setFlags } = useStudent();
  const [step, setStep] = useState(0);
  const [subjectDraft, setSubjectDraft] = useState("");
  const [error, setError] = useState("");
  const [context, setContext] = useState(studentContext);

  const update = (section, key, value) => setContext((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
  const toggle = (section, key, value) => update(section, key, context[section][key].includes(value) ? context[section][key].filter((item) => item !== value) : [...context[section][key], value]);

  const addSubject = () => {
    const name = subjectDraft.trim();
    if (!name) return;
    if (!context.academic.subjects.some((subject) => subject.name === name)) {
      update("academic", "subjects", [...context.academic.subjects, { name, code: "", semester: context.academic.semester }]);
    }
    setSubjectDraft("");
  };

  const validate = () => {
    if (step === 0 && (!context.academic.college || !context.academic.course || !context.academic.year || !context.academic.semester || !context.academic.subjects.length)) return "Add your college, course, year, semester, and at least one subject.";
    if (step === 2 && (!context.goal.primaryGoal || !context.goal.focusAreas.length)) return "Choose one primary goal and at least one focus area.";
    if (step === 3 && (!context.career.interestedField || !context.career.targetRole || !context.career.skillLevel || (context.career.targetRole === "Other" && !context.career.customTargetRole?.trim()))) return "Complete your career preferences, enter your custom role, or choose “Not sure yet”.";
    return "";
  };

  const next = async () => {
    const validationError = validate();
    setError(validationError);
    if (validationError) return;
    if (step < 3) setStep((current) => current + 1);
    else {
      try {
        const targetRole = context.career.targetRole === "Other"
          ? context.career.customTargetRole.trim()
          : context.career.targetRole;
        let existingCareerGoals = [];
        let careerPath = null;
        if (targetRole !== "Not sure yet") {
          const [paths, goals] = await Promise.all([authService.getCareerPaths(), authService.getCareerGoals()]);
          careerPath = paths.find((path) => path.title.toLowerCase() === targetRole.toLowerCase()) || null;
          existingCareerGoals = goals;
        }
        await authService.updateStudentProfile({
          college: context.academic.college,
          course: context.academic.course,
          year: context.academic.year,
          semester: context.academic.semester,
          preferredLanguage: context.study.preferredLanguages[0] || "English",
          studyPreferences: {
            preferredLanguages: context.study.preferredLanguages,
            learningPreferences: context.study.learningPreferences,
          },
          availability: {
            hoursPerDay: context.study.hoursPerDay,
            daysPerWeek: context.study.daysPerWeek,
          },
          careerPreferences: {
            interestedField: context.career.interestedField,
            targetRole,
            skillLevel: context.career.skillLevel
          },
          onboardingComplete: false,
          goals: [
            { type: "academic", title: context.goal.primaryGoal },
            ...context.goal.focusAreas.map((title) => ({ type: "skill", title })),
          ],
        });
        const savedSubjects = await authService.getStudentSubjects();
        const existingNames = new Set((savedSubjects.subjects || []).map((subject) => subject.name.trim().toLowerCase()));
        for (const subject of context.academic.subjects) {
          const name = subject.name.trim();
          if (name && !existingNames.has(name.toLowerCase())) {
            await authService.createStudentSubject({ name });
            existingNames.add(name.toLowerCase());
          }
        }
        await authService.updateStudentProfile({ onboardingComplete: true });
        if (targetRole !== "Not sure yet" && !existingCareerGoals.some((goal) => goal.status === "active" && goal.title.toLowerCase() === targetRole.toLowerCase())) {
          const experienceLevel = { Beginner: "beginner", Intermediate: "intermediate", Advanced: "experienced", Exploring: "exploring" }[context.career.skillLevel] || "exploring";
          await authService.createCareerGoal({
            title: targetRole,
            careerPathId: careerPath?.id,
            category: context.career.interestedField,
            experienceLevel,
            availableHoursPerWeek: context.study.hoursPerDay * context.study.daysPerWeek
          });
        }
        setStudentContext({
          ...context,
          career: {
            interestedField: context.career.interestedField,
            targetRole,
            skillLevel: context.career.skillLevel
          }
        });
        setFlags({ onboardingComplete: true });
        navigate("/dashboard");
      } catch (requestError) {
        setError(requestError.message || "Unable to save your student profile.");
      }
    }
  };

  return (
    <main className="min-h-screen bg-[#F7F5F0] text-[#171717]">
      <Container className="py-8 md:py-14">
        <div className="mx-auto max-w-5xl rounded-[28px] border border-[#E5E1D8] bg-[#FBFAF7] p-6 shadow-[0_20px_60px_rgba(23,23,23,0.04)] sm:p-10">
          <div className="mb-10 flex items-start justify-between gap-4">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#737373]">Onboarding / 0{step + 1} / 04</p><h1 className="mt-4 text-3xl font-black tracking-[-0.05em] md:text-5xl">{["LET'S START WITH WHERE YOU ARE.", "HOW DO YOU LIKE TO LEARN?", "WHAT ARE YOU WORKING TOWARD?", "WHERE DO YOU WANT YOUR LEARNING TO TAKE YOU?"][step]}</h1></div>
            <Link to="/" className="hidden text-sm text-[#737373] underline underline-offset-4 sm:inline-flex">Back home</Link>
          </div>
          <div className="mb-10 grid grid-cols-4 gap-2">{steps.map((label, index) => <div key={label}><div className={`h-1.5 rounded-full ${index <= step ? "bg-[#171717]" : "bg-[#E5E1D8]"}`} /><p className="mt-2 hidden text-[10px] uppercase tracking-[0.12em] text-[#737373] sm:block">{label}</p></div>)}</div>

          {step === 0 && <div className="space-y-7">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["college", "College / University", "e.g. Savitribai Phule Pune University"],
                ["course", "Course", "e.g. BCA"],
              ].map(([key, label, placeholder]) => <label key={key} className="space-y-2 text-sm font-medium">{label}<input value={context.academic[key]} onChange={(event) => update("academic", key, event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-[#E5E1D8] bg-[#F7F5F0] px-4 py-3 font-normal" /></label>)}
            </div>
            <div><p className="mb-3 text-sm font-semibold">Year</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{["1st", "2nd", "3rd", "4th"].map((year) => <Choice key={year} selected={context.academic.year === year} onClick={() => update("academic", "year", year)}>{year}</Choice>)}</div></div>
            <label className="block space-y-2 text-sm font-medium">Semester<select value={context.academic.semester} onChange={(event) => update("academic", "semester", event.target.value)} className="w-full rounded-xl border border-[#E5E1D8] bg-[#F7F5F0] px-4 py-3 font-normal"><option value="">Select semester</option>{Array.from({ length: 8 }, (_, i) => <option key={i + 1} value={String(i + 1)}>Semester {i + 1}</option>)}</select></label>
            <div><p className="mb-3 text-sm font-semibold">Your subjects</p><div className="mb-3 flex flex-wrap gap-2">{context.academic.subjects.map((subject) => <span key={subject.name} className="rounded-full border border-[#E5E1D8] bg-[#F7F5F0] px-3 py-2 text-sm">{subject.name}</span>)}</div><div className="flex gap-2"><input value={subjectDraft} onChange={(event) => setSubjectDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addSubject()} placeholder="Add a subject" className="min-w-0 flex-1 rounded-xl border border-[#E5E1D8] bg-[#F7F5F0] px-4 py-3" /><Button type="button" variant="secondary" onClick={addSubject}>+ Add subject</Button></div></div>
          </div>}

          {step === 1 && <div className="space-y-8">
            <div><div className="mb-3 flex justify-between text-sm font-semibold"><span>Realistic study time each day</span><span>{context.study.hoursPerDay} HOURS / DAY</span></div><input aria-label="Study hours per day" type="range" min="1" max="8" value={context.study.hoursPerDay} onChange={(event) => update("study", "hoursPerDay", Number(event.target.value))} className="w-full accent-[#171717]" /><div className="flex justify-between text-xs text-[#737373]"><span>1</span><span>8 HOURS</span></div></div>
            <div><p className="mb-3 text-sm font-semibold">Days you can study each week</p><div className="grid grid-cols-7 gap-2">{Array.from({ length: 7 }, (_, i) => i + 1).map((day) => <Choice key={day} selected={context.study.daysPerWeek === day} onClick={() => update("study", "daysPerWeek", day)}>{day}</Choice>)}</div></div>
            <div><p className="mb-3 text-sm font-semibold">Preferred language</p><div className="grid gap-3 sm:grid-cols-2">{languages.map((language) => <Choice key={language} multi selected={context.study.preferredLanguages.includes(language)} onClick={() => toggle("study", "preferredLanguages", language)}>{language}</Choice>)}</div></div>
            <div><p className="mb-3 text-sm font-semibold">How do you learn best?</p><div className="grid gap-3 sm:grid-cols-3">{preferences.map((preference) => <Choice key={preference} multi selected={context.study.learningPreferences.includes(preference)} onClick={() => toggle("study", "learningPreferences", preference)}>{preference}</Choice>)}</div></div>
          </div>}

          {step === 2 && <div className="space-y-8"><div><p className="mb-3 text-sm font-semibold">Primary goal · choose one</p><div className="grid gap-3 md:grid-cols-2">{[["SCORE", "Maximize exam performance."], ["CONCEPT", "Understand deeply, not memorize."], ["CAREER", "Build future-ready skills."], ["BALANCED", "Balance academics and career."]].map(([title, description]) => <Choice key={title} selected={context.goal.primaryGoal === title} onClick={() => update("goal", "primaryGoal", title)}><span className="block font-bold">{title}</span><span className="mt-1 block text-xs opacity-70">{description}</span></Choice>)}</div></div><div><p className="mb-3 text-sm font-semibold">Focus areas · choose any</p><div className="grid gap-3 sm:grid-cols-2">{focusOptions.map((focus) => <Choice key={focus} multi selected={context.goal.focusAreas.includes(focus)} onClick={() => toggle("goal", "focusAreas", focus)}>{focus}</Choice>)}</div></div></div>}

          {step === 3 && <div className="space-y-7"><div><p className="mb-3 text-sm font-semibold">Interested field</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{fields.map((field) => <Choice key={field} selected={context.career.interestedField === field} onClick={() => update("career", "interestedField", field)}>{field}</Choice>)}</div></div><div><p className="mb-3 text-sm font-semibold">Target role</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{roles.map((role) => <Choice key={role} selected={context.career.targetRole === role} onClick={() => update("career", "targetRole", role)}>{role}</Choice>)}</div>{context.career.targetRole === "Other" ? <label className="mt-4 block space-y-2 text-sm font-medium">Your career title<input required maxLength={120} value={context.career.customTargetRole || ""} onChange={(event) => update("career", "customTargetRole", event.target.value)} placeholder="Enter any career direction" className="w-full rounded-xl border border-[#E5E1D8] bg-[#F7F5F0] px-4 py-3 font-normal" /></label> : null}<p className="mt-3 text-xs text-[#737373]">Your career choice records an ambition; it does not imply that you already have its skills.</p></div><div><p className="mb-3 text-sm font-semibold">Current skill level</p><div className="grid gap-3 sm:grid-cols-4">{["Beginner", "Intermediate", "Advanced", "Exploring"].map((level) => <Choice key={level} selected={context.career.skillLevel === level} onClick={() => update("career", "skillLevel", level)}>{level}</Choice>)}</div></div></div>}

          {error ? <p role="alert" className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><Button type="button" variant="secondary" onClick={() => step ? setStep((current) => current - 1) : navigate("/signup")} className="rounded-xl px-5 py-3 text-sm uppercase tracking-[0.12em]">Back</Button><Button type="button" onClick={next} className="rounded-xl px-5 py-3 text-sm uppercase tracking-[0.12em] text-[#F7F5F0]">{step === 3 ? "Build my Pragati →" : "Continue →"}</Button></div>
        </div>
      </Container>
    </main>
  );
}
