// P1 — Doctor triage queue dashboard
// Pulls pending cases from InsForge DB, sorted by urgency (highest first)

import { useEffect, useState } from "react";
import { insforge } from "../../lib/insforge";

const SCORE_CONFIG = {
  5: { label: "Emergency", color: "bg-rose-600 text-white", card: "border-rose-300 bg-rose-50" },
  4: { label: "Urgent", color: "bg-rose-500 text-white", card: "border-rose-200 bg-rose-50/50" },
  3: { label: "Moderate", color: "bg-amber-500 text-white", card: "border-amber-200 bg-amber-50/50" },
  2: { label: "Non-urgent", color: "bg-emerald-500 text-white", card: "border-emerald-200 bg-emerald-50/50" },
  1: { label: "Routine", color: "bg-emerald-400 text-white", card: "border-emerald-200 bg-emerald-50/30" },
};

function CaseCard({ caseData, isExpanded, onToggle, onReview }) {
  const score = caseData.triage_score || 3;
  const config = SCORE_CONFIG[score] || SCORE_CONFIG[3];
  const summary = caseData.summary_json || {};
  const patient = caseData.patients;

  return (
    <div className={`rounded-xl border p-4 transition ${config.card} ${isExpanded ? "shadow-md" : "hover:shadow-sm"}`}>
      <div className="flex cursor-pointer items-center justify-between gap-4" onClick={onToggle}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-900">{patient?.name || "Unknown"}</p>
            {patient?.age && <span className="text-sm text-slate-500">{patient.age}yo {patient.gender || ""}</span>}
          </div>
          <p className="mt-1 truncate text-sm text-slate-600">
            {summary.chief_complaint || caseData.symptoms_raw?.slice(0, 80) || "No summary"}
          </p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${config.color}`}>
            {score}
          </span>
          <span className="text-[10px] font-medium text-slate-500">{config.label}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 border-t border-slate-200/60 pt-4">
          <div className="grid gap-3 text-sm">
            <div>
              <span className="font-medium text-slate-700">Symptoms:</span>
              <p className="mt-0.5 text-slate-600">{caseData.symptoms_raw}</p>
            </div>

            {summary.symptoms && summary.symptoms.length > 0 && (
              <div>
                <span className="font-medium text-slate-700">Extracted symptoms:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {summary.symptoms.map((s, i) => (
                    <span key={i} className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200">{s}</span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="font-medium text-slate-700">Triage reason:</span>
              <p className="mt-0.5 text-slate-600">{caseData.triage_reason || summary.reason || "N/A"}</p>
            </div>

            {summary.recommended_timeframe && (
              <div>
                <span className="font-medium text-slate-700">Recommended timeframe:</span>
                <span className="ml-1 text-slate-600">{summary.recommended_timeframe}</span>
              </div>
            )}

            {summary.red_flags && summary.red_flags.length > 0 && (
              <div className="rounded-lg bg-rose-100 p-3">
                <span className="font-medium text-rose-800">Red flags:</span>
                <ul className="mt-1 list-disc pl-5 text-rose-700">
                  {summary.red_flags.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}

            <div className="pt-1">
              <span className="text-xs text-slate-400">
                Submitted: {new Date(caseData.created_at).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onReview(caseData.id); }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Mark as Reviewed
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState("pending"); // pending | reviewed | all

  useEffect(() => {
    loadCases();
  }, [filter]);

  async function loadCases() {
    setLoading(true);
    try {
      let query = insforge.database
        .from("cases")
        .select("*, patients(name, age, gender, contact)")
        .order("triage_score", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data } = await query;
      setCases(data || []);
    } catch {
      setCases([]);
    }
    setLoading(false);
  }

  async function markReviewed(caseId) {
    await insforge.database
      .from("cases")
      .update({ status: "reviewed", reviewed_at: new Date().toISOString() })
      .eq("id", caseId);
    setExpandedId(null);
    loadCases();
  }

  const pendingCount = cases.filter((c) => c.status === "pending").length;
  const urgentCount = cases.filter((c) => c.triage_score >= 4).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Triage Queue</h1>
          <p className="mt-1 text-sm text-slate-500">
            {cases.length} case{cases.length !== 1 ? "s" : ""}
            {urgentCount > 0 && <span className="ml-1 font-medium text-rose-600">({urgentCount} urgent)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {["pending", "reviewed", "all"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          Loading triage queue...
        </div>
      ) : cases.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {filter === "pending" ? "No pending cases. All caught up!" : "No cases found."}
        </div>
      ) : (
        <div className="grid gap-3">
          {cases.map((c) => (
            <CaseCard
              key={c.id}
              caseData={c}
              isExpanded={expandedId === c.id}
              onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
              onReview={markReviewed}
            />
          ))}
        </div>
      )}
    </div>
  );
}
