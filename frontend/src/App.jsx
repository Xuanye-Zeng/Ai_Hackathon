import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth";
import LoginPage from "./pages/LoginPage";
import SubmitPage from "./pages/patient/SubmitPage";
import ChatPage from "./pages/patient/ChatPage";
import HistoryPage from "./pages/patient/HistoryPage";
import DashboardPage from "./pages/doctor/DashboardPage";
import SchedulePage from "./pages/doctor/SchedulePage";

function NavBar() {
  const { user, role, signOut } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const links =
    role === "doctor"
      ? [
          { to: "/doctor/dashboard", label: "Triage Queue" },
          { to: "/doctor/schedule", label: "Schedule" },
        ]
      : [
          { to: "/patient/submit", label: "Submit Symptoms" },
          { to: "/patient/chat", label: "Q&A" },
          { to: "/patient/history", label: "My Records" },
        ];

  return (
    <nav className="border-b border-slate-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-sm font-bold text-blue-600">MedTriage</span>
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-sm font-medium transition ${
                location.pathname === l.to
                  ? "text-slate-900"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {role}
          </span>
          <button onClick={signOut} className="text-sm text-slate-400 hover:text-slate-600">
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
      <div className="flex h-screen items-center justify-center text-sm text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/login" element={user ? <Navigate to={role === "doctor" ? "/doctor/dashboard" : "/patient/submit"} /> : <LoginPage />} />

        {/* Patient routes */}
        <Route path="/patient/submit" element={user ? <SubmitPage /> : <Navigate to="/login" />} />
        <Route path="/patient/chat" element={user ? <ChatPage /> : <Navigate to="/login" />} />
        <Route path="/patient/history" element={user ? <HistoryPage /> : <Navigate to="/login" />} />

        {/* Doctor routes */}
        <Route path="/doctor/dashboard" element={user ? <DashboardPage /> : <Navigate to="/login" />} />
        <Route path="/doctor/schedule" element={user ? <SchedulePage /> : <Navigate to="/login" />} />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </>
  );
}
