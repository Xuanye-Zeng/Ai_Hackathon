import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function LoginPage() {
  const { signIn, signUp, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("patient");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, name, role);
        navigate(role === "doctor" ? "/doctor/dashboard" : "/patient/submit");
      } else {
        // Sign in — role is auto-detected from account
        const result = await signIn(email, password);
        const actualRole = result.role;
        navigate(actualRole === "doctor" ? "/doctor/dashboard" : "/patient/submit");
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white shadow-lg shadow-blue-200">
            M
          </div>
          <h1 className="text-2xl font-bold text-slate-900">MedTriage Agent</h1>
          <p className="mt-1 text-sm text-slate-500">AI-powered medical triage assistant</p>
        </div>

        <div className="glass rounded-2xl p-8 shadow-xl shadow-slate-200/50 ring-1 ring-slate-200/60">
          <p className="mb-5 text-center text-sm font-medium text-slate-600">
            {isSignUp ? "Create your account" : "Welcome back"}
          </p>

          <form onSubmit={handleSubmit} className="grid gap-4">
            {isSignUp && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Full Name</label>
                <input type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} required />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Email</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Password</label>
              <input type="password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} required />
            </div>

            {/* Role selector — only on sign up */}
            {isSignUp && (
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-500">I am a...</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setRole("patient")}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all ${role === "patient" ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-100" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                    <span className="text-2xl">🙋</span>
                    <span className={`text-sm font-semibold ${role === "patient" ? "text-blue-700" : "text-slate-600"}`}>Patient</span>
                    <span className="text-[10px] text-slate-400">Submit symptoms</span>
                  </button>
                  <button type="button" onClick={() => setRole("doctor")}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all ${role === "doctor" ? "border-violet-500 bg-violet-50 shadow-md shadow-violet-100" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                    <span className="text-2xl">🩺</span>
                    <span className={`text-sm font-semibold ${role === "doctor" ? "text-violet-700" : "text-slate-600"}`}>Doctor</span>
                    <span className="text-[10px] text-slate-400">Manage triage</span>
                  </button>
                </div>
              </div>
            )}

            {/* Sign in hint */}
            {!isSignUp && (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Your role (Patient / Doctor) is determined by your account registration. You'll be redirected automatically.
              </div>
            )}

            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

            <button type="submit" disabled={loading}
              className="mt-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200/50 transition hover:shadow-xl hover:brightness-110 disabled:opacity-50">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Processing...
                </span>
              ) : isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => { setIsSignUp(!isSignUp); setError(""); }} className="font-semibold text-blue-600 hover:text-blue-700">{isSignUp ? "Sign In" : "Sign Up"}</button>
          </p>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">AI-assisted triage — not a substitute for professional medical advice</p>
      </div>
    </div>
  );
}
