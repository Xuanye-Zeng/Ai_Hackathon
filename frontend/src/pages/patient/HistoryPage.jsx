import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { insforge } from "../../lib/insforge";

const SCORE_STYLE = {
  1: { label: "Routine",    bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  2: { label: "Non-urgent", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  3: { label: "Soon",       bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
  4: { label: "Urgent",     bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200" },
  5: { label: "Emergency",  bg: "bg-rose-50",    text: "text-rose-800",    border: "border-rose-300" },
};

const STATUS_STYLE = {
  pending:   "text-amber-600",
  reviewed:  "text-blue-600",
  scheduled: "text-emerald-600",
};

// ── Demo data so the page is never empty during the presentation ──
const MOCK_CASES = [
  {
    id: "m1",
    symptoms_raw: "Severe headache for two days, dizziness when standing up, light sensitivity",
    triage_score: 3,
    triage_reason: "Persistent headache warrants timely evaluation.",
    status: "reviewed",
    created_at: "2026-03-27T09:15:00Z",
    summary_json: { chief_complaint: "Headache / dizziness" },
  },
  {
    id: "m2",
    symptoms_raw: "Mild cough and runny nose for three days, no fever, still eating normally",
    triage_score: 1,
    triage_reason: "Common cold symptoms; monitor at home.",
    status: "scheduled",
    created_at: "2026-03-25T14:30:00Z",
    summary_json: { chief_complaint: "Cold / cough" },
  },
  {
    id: "m3",
    symptoms_raw: "Sharp chest pain and trouble breathing after exercise, lasted about 15 minutes",
    triage_score: 5,
    triage_reason: "Potential cardiac or respiratory emergency.",
    status: "reviewed",
    created_at: "2026-03-20T08:00:00Z",
    summary_json: { chief_complaint: "Chest pain / difficulty breathing" },
  },
];

export default function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCases();
  }, []);

  async function loadCases() {
    setLoading(true);
    try {
      const { data } = await insforge.database
        .from("cases")
        .select("*")
        .eq("patient_id", user?.id)
        .order("created_at", { ascending: false });
      setCases(data && data.length > 0 ? data : MOCK_CASES);
    } catch {
      setCases(MOCK_CASES);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        Loading records...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">My Records</h1>
      <p className="mb-6 text-sm text-slate-500">
        Your past submissions and triage results
      </p>

      {cases.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-3xl">📋</p>
          <p className="mt-2 text-sm text-slate-500">
            No records yet. Submit your symptoms to get started.
          </p>
          <button
            onClick={() => navigate("/patient/submit")}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Submit Symptoms
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {cases.map((c) => {
            const score = c.triage_score || 2;
            const s = SCORE_STYLE[score] || SCORE_STYLE[2];
            const summary =
              typeof c.summary_json === "string"
                ? JSON.parse(c.summary_json)
                : c.summary_json || {};

            return (
              <div
                key={c.id}
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {summary.chief_complaint || "Case"}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                      {c.symptoms_raw?.length > 120
                        ? c.symptoms_raw.slice(0, 120) + "…"
                        : c.symptoms_raw}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${s.bg} ${s.text} ${s.border}`}
                  >
                    {score}/5 — {s.label}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    {new Date(c.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span
                    className={`font-semibold capitalize ${STATUS_STYLE[c.status] || "text-slate-500"}`}
                  >
                    {c.status}
                  </span>
                </div>

                {/* Triage reason (expandable detail) */}
                {c.triage_reason && (
                  <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-400">
                    {c.triage_reason}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}