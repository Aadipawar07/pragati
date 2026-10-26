import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "@/components/common/Button";
import AuthShell from "@/components/common/AuthShell";
import { authService } from "@/services/auth";
import { useStudent } from "@/context/StudentContext";

const initialState = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  careerGoal: "",
};

export default function Signup() {
  const navigate = useNavigate();
  const [values, setValues] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [submitState, setSubmitState] = useState({ loading: false, serverError: "", success: false });
  const { setUser } = useStudent();

  const validate = () => {
    const nextErrors = {};

    if (!values.fullName.trim()) {
      nextErrors.fullName = "Full name is required.";
    }

    if (!values.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!values.password) {
      nextErrors.password = "Password is required.";
    } else if (values.password.length < 8) {
      nextErrors.password = "Use at least 8 characters.";
    }
    if (values.password !== values.confirmPassword) nextErrors.confirmPassword = "Passwords do not match.";

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
      const data = await authService.signUp({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        password: values.password,
      });

      setUser(data.user);
      setSubmitState({ loading: false, serverError: "", success: true });
      navigate("/onboarding");
    } catch (error) {
      setSubmitState({ loading: false, serverError: error.message || "Signup failed.", success: false });
    }
  };

  return (
    <AuthShell
      title="Build your Pragati."
      subtitle="Create your student profile and begin connecting your academic system."
      footer={
        <span>
          Already have an account? <Link to="/login" className="font-semibold text-[#171717] underline decoration-[#737373] underline-offset-4">Sign in →</Link>
        </span>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium text-[#171717]">Full name</label>
          <input
            id="fullName"
            type="text"
            value={values.fullName}
            onChange={(event) => setValues((current) => ({ ...current, fullName: event.target.value }))}
            placeholder="Your name"
            className={`w-full rounded-xl border bg-[#F7F5F0] px-4 py-3 text-sm text-[#171717] placeholder:text-[#8C8A83] ${errors.fullName ? "border-red-400" : "border-[#E5E1D8]"}`}
          />
          {errors.fullName ? <p className="text-xs text-red-600">{errors.fullName}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-[#171717]">Confirm password</label>
          <input id="confirmPassword" type="password" value={values.confirmPassword} onChange={(event) => setValues((current) => ({ ...current, confirmPassword: event.target.value }))} placeholder="Repeat your password" className={`w-full rounded-xl border bg-[#F7F5F0] px-4 py-3 text-sm text-[#171717] placeholder:text-[#8C8A83] ${errors.confirmPassword ? "border-red-400" : "border-[#E5E1D8]"}`} />
          {errors.confirmPassword ? <p className="text-xs text-red-600">{errors.confirmPassword}</p> : null}
        </div>

        <div className="rounded-xl border border-[#E5E1D8] bg-[#F7F5F0] px-4 py-3 text-xs text-[#737373]">
          Password strength: <span className={values.password.length >= 12 ? "font-semibold text-emerald-700" : values.password.length >= 8 ? "font-semibold text-amber-700" : "text-red-600"}>{values.password.length >= 12 ? "Strong" : values.password.length >= 8 ? "Good" : "Use 8+ characters"}</span>
        </div>

        <div className="space-y-2">
          <label htmlFor="signupEmail" className="text-sm font-medium text-[#171717]">Email</label>
          <input
            id="signupEmail"
            type="email"
            value={values.email}
            onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
            placeholder="you@college.edu"
            className={`w-full rounded-xl border bg-[#F7F5F0] px-4 py-3 text-sm text-[#171717] placeholder:text-[#8C8A83] ${errors.email ? "border-red-400" : "border-[#E5E1D8]"}`}
          />
          {errors.email ? <p className="text-xs text-red-600">{errors.email}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="signupPassword" className="text-sm font-medium text-[#171717]">Password</label>
          <input
            id="signupPassword"
            type="password"
            value={values.password}
            onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
            placeholder="Create a password"
            className={`w-full rounded-xl border bg-[#F7F5F0] px-4 py-3 text-sm text-[#171717] placeholder:text-[#8C8A83] ${errors.password ? "border-red-400" : "border-[#E5E1D8]"}`}
          />
          {errors.password ? <p className="text-xs text-red-600">{errors.password}</p> : null}
        </div>

        {submitState.serverError ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitState.serverError}</div> : null}
        {submitState.success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Registration request accepted. Continue to onboarding.</div> : null}

        <Button type="submit" className="w-full rounded-xl !bg-[#171717] !py-3.5 text-sm uppercase tracking-[0.12em] text-[#F7F5F0] hover:!bg-black" disabled={submitState.loading}>
          {submitState.loading ? "Creating account..." : "Create account →"}
        </Button>
      </form>
    </AuthShell>
  );
}
