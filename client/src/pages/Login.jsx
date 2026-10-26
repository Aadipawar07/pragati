import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "@/components/common/Button";
import AuthShell from "@/components/common/AuthShell";
import { authService } from "@/services/auth";
import { useStudent } from "@/context/StudentContext";

const initialState = { email: "", password: "" };

export default function Login() {
  const navigate = useNavigate();
  const [values, setValues] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [submitState, setSubmitState] = useState({ loading: false, serverError: "", success: false });
  const { flags, setUser } = useStudent();

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()), [values.email]);

  const validate = () => {
    const nextErrors = {};

    if (!values.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!emailValid) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!values.password) {
      nextErrors.password = "Password is required.";
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      setSubmitState({ loading: false, serverError: "", success: false });
      return;
    }

    setSubmitState({ loading: true, serverError: "", success: false });

    try {
      const data = await authService.signIn({ email: values.email.trim(), password: values.password });
      setUser(data.user);
      setSubmitState({ loading: false, serverError: "", success: true });
      if (!flags.onboardingComplete) navigate("/onboarding");
      else navigate("/dashboard");
    } catch (error) {
      setSubmitState({ loading: false, serverError: error.message || "Authentication failed.", success: false });
    }
  };

  return (
    <AuthShell
      title="Welcome back."
      subtitle="Continue building your path with Pragati."
      footer={
        <span>
          Don&apos;t have an account? <Link to="/signup" className="font-semibold text-[#171717] underline decoration-[#737373] underline-offset-4">Create account →</Link>
        </span>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-[#171717]">Email</label>
          <input
            id="email"
            type="email"
            value={values.email}
            onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
            placeholder="you@college.edu"
            className={`w-full rounded-xl border bg-[#F7F5F0] px-4 py-3 text-sm text-[#171717] placeholder:text-[#8C8A83] transition-colors ${errors.email ? "border-red-400 focus:border-red-500" : "border-[#E5E1D8] focus:border-[#171717]"}`}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email ? <p className="text-xs text-red-600">{errors.email}</p> : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-[#171717]">Password</label>
            <button type="button" className="text-xs font-medium text-[#737373] underline decoration-[#737373]/50 underline-offset-4">Forgot password?</button>
          </div>
          <input
            id="password"
            type="password"
            value={values.password}
            onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
            placeholder="••••••••"
            className={`w-full rounded-xl border bg-[#F7F5F0] px-4 py-3 text-sm text-[#171717] placeholder:text-[#8C8A83] transition-colors ${errors.password ? "border-red-400 focus:border-red-500" : "border-[#E5E1D8] focus:border-[#171717]"}`}
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password ? <p className="text-xs text-red-600">{errors.password}</p> : null}
        </div>

        {submitState.serverError ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitState.serverError}</div> : null}
        {submitState.success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Authentication request accepted. Continue to your dashboard.</div> : null}

        <Button type="submit" className="w-full rounded-xl !bg-[#171717] !py-3.5 text-sm uppercase tracking-[0.12em] text-[#F7F5F0] hover:!bg-black" disabled={submitState.loading}>
          {submitState.loading ? "Signing in..." : "Sign in →"}
        </Button>

        <button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E5E1D8] bg-[#F7F5F0] px-4 py-3 text-sm font-medium text-[#171717] transition-colors hover:border-[#171717]">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#171717] text-[10px] font-bold">G</span>
          Continue with Google
        </button>
      </form>
    </AuthShell>
  );
}
