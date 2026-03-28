import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { insforge } from "../../lib/insforge";

const SCORE_STYLE = {
  1: { label: "Routine",    gradient: "from-emerald-400 to-green-500", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  2: { label: "Non-urgent", gradient: "from-emerald-400 to-green-500", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  3: { label: "Soon",       gradient: "from-amber-400 to-orange-500",  bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
  4: { label: "Urgent",     gradient: "from-rose-400 to-red-500",      bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200" },
  5: { label: "Emergency",  gradient: "from-red-500 to-red-600",       bg: "bg-rose-50",    text: "text-rose-800",    border: "border-rose-300" },
};

const STATUS_STYLE = {
  pending:   { label: "Pending",   dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50" },
  reviewed:  { label: "Reviewed",  dot: "bg-blue-400",    text: "text-blue-700",    bg: "bg-blue-50" },
  scheduled: { label: "Scheduled", dot: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50" },
};

export default function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { loadCases(); }, []);

  async function loadCases() {
    setLoading(true);
    try {
      // Get patient name from user profile
      const patientName = user?.profile?.name || user?.user_metadata?.name || "";

      if (patientName) {
        // Find patient records by name, then get their cases
        const { data: patients } = await insforge.database
          .from("patients")
          .select("id")
          .eq("name", patientName);

        if (patients && patients.length > 0) {
          const patientIds = patients.map(p => p.id);
          const { data } = await insforge.database
            .from("cases")
            .select("*")
            .in("patient_id", patientIds)
            .order("created_at", { ascending: false });
          setCases(data || []);
        } else {
          setCases([]);
        }
      } else {
        // Fallback: try to load all cases (for demo)
        const { data } = await insforge.database
          .from("cases")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);
        setCases(data || []);
      }
    } catch {
      setCases([]);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
        <p className="text-sm text-slate-400">Loading records...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Records</h1>
          <p className="mt-1 text-sm text-slate-500">Your past submissions and triage results</p>
        </div>
        <button onClick={loadCases}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:shadow-sm">
          Refresh
        </button>
      </div>

      {cases.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center shadow-sm ring-1 ring-slate-200/60">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">📋</div>
          <p className="text-sm font-medium text-slate-600">No records yet</p>
          <p className="mt-1 text-xs text-slate-400">Submit your symptoms to get started.</p>
          <button
            onClick={() => navigate("/patient/submit")}
            className="mt-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200/50 transition hover:shadow-xl hover:brightness-110"
          >
            Submit Symptoms
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {cases.map((c) => {
            const score = c.triage_score || 2;
            const s = SCORE_STYLE[score] || SCORE_STYLE[2];
            const st = STATUS_STYLE[c.status] || STATUS_STYLE.pending;
            const summary = typeof c.summary_json === "string" ? JSON.parse(c.summary_json) : c.summary_json || {};
            const isOpen = expanded === c.id;

            return (
              <div
                key={c.id}
                onClick={() => setExpanded(isOpen ? null : c.id)}
                className="glass cursor-pointer rounded-2xl shadow-sm ring-1 ring-slate-200/60 transition-all hover:shadow-md"
              >
                <div className={`h-1 rounded-t-2xl bg-gradient-to-r ${s.gradient}`} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {summary.chief_complaint || "Case"}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                        {c.symptoms_raw?.length > 120 ? c.symptoms_raw.slice(0, 120) + "..." : c.symptoms_raw}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${s.gradient} text-sm font-bold text-white shadow-sm`}>
                        {score}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">{s.label}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.bg} ${st.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </div>

                  {isOpen && c.triage_reason && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <p className="text-xs font-medium text-slate-500">AI Assessment</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{c.triage_reason}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
