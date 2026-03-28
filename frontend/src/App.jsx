import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth";
import LoginPage from "./pages/LoginPage";
import SubmitPage from "./pages/patient/SubmitPage";
import ChatPage from "./pages/patient/ChatPage";
import HistoryPage from "./pages/patient/HistoryPage";
import DashboardPage from "./pages/doctor/DashboardPage";
import SchedulePage from "./pages/doctor/SchedulePage";
import PatientSchedulePage from "./pages/patient/SchedulePage";

function NavBar() {
  const { user, role, signOut } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const links =
    role === "doctor"
      ? [
          { to: "/doctor/dashboard", label: "Triage Queue", icon: "🏥" },
          { to: "/doctor/schedule", label: "Schedule", icon: "📅" },
        ]
      : [
          { to: "/patient/submit", label: "Submit Symptoms", icon: "📝" },
          { to: "/patient/chat", label: "Q&A", icon: "💬" },
          { to: "/patient/history", label: "My Records", icon: "📋" },
          { to: "/patient/schedule", label: "Appointments", icon: "📅" },
        ];

  return (
    <nav className="glass sticky top-0 z-50 border-b border-white/60 shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <Link to={role === "doctor" ? "/doctor/dashboard" : "/patient/submit"} className="mr-2 flex items-center gap-2 sm:mr-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-md shadow-blue-500/20">
              M
            </div>
            <span className="hidden text-sm font-bold text-slate-800 sm:block">MedTriage</span>
          </Link>
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all sm:px-3 sm:text-sm ${
                location.pathname === l.to
                  ? "bg-blue-50 text-blue-700 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              <span className="hidden sm:inline">{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
            role === "doctor"
              ? "bg-violet-100 text-violet-700"
              : "bg-sky-100 text-sky-700"
          }`}>
            {role}
          </span>
          <button
            onClick={signOut}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-red-50 hover:text-red-500 sm:text-sm"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
        <p className="text-sm font-medium text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="bg-mesh">
        <div className="blob-1" />
        <div className="blob-2" />
        <div className="bg-grid" />
      </div>

      <div className="relative z-10">
        <NavBar />
        <main className="page-enter">
          <Routes>
            <Route path="/login" element={user ? <Navigate to={role === "doctor" ? "/doctor/dashboard" : "/patient/submit"} /> : <LoginPage />} />
            <Route path="/patient/submit" element={user ? <SubmitPage /> : <Navigate to="/login" />} />
            <Route path="/patient/chat" element={user ? <ChatPage /> : <Navigate to="/login" />} />
            <Route path="/patient/history" element={user ? <HistoryPage /> : <Navigate to="/login" />} />
            <Route path="/patient/schedule" element={user ? <PatientSchedulePage /> : <Navigate to="/login" />} />
            <Route path="/doctor/dashboard" element={user ? <DashboardPage /> : <Navigate to="/login" />} />
            <Route path="/doctor/schedule" element={user ? <SchedulePage /> : <Navigate to="/login" />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
