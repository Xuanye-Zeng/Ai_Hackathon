// P1 — Doctor triage queue dashboard
// TODO: P1 owner implements full dashboard with case cards

import { useEffect, useState } from "react";
import { insforge } from "../../lib/insforge";

const SCORE_COLORS = {
  5: "bg-rose-100 text-rose-700 border-rose-200",
  4: "bg-rose-50 text-rose-600 border-rose-200",
  3: "bg-amber-100 text-amber-700 border-amber-200",
  2: "bg-emerald-50 text-emerald-600 border-emerald-200",
  1: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default function DashboardPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    loadCases();
  }, []);

  async function loadCases() {
    setLoading(true);
    try {
      const { data } = await insforge.database
        .from("cases")
        .select("*, patients(name, age, gender)")
        .eq("status", "pending")
        .order("triage_score", { ascending: false });
      setCases(data || []);
    } catch {
      // Fallback: show empty state
      setCases([]);
    }
    setLoading(false);
  }

  async function markReviewed(caseId) {
    await insforge.database
      .from("cases")
      .update({ status: "reviewed", reviewed_at: new Date().toISOString() })
      .eq("id", caseId);
    setSelected(null);
    loadCases();
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        Loading triage queue...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Triage Queue</h1>

      {cases.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No pending cases. All caught up!
        </div>
      ) : (
        <div className="grid gap-3">
          {cases.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelected(selected?.id === c.id ? null : c)}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900">
                    {c.patients?.name || "Unknown patient"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {c.summary_json?.chief_complaint || c.symptoms_raw?.slice(0, 80) || "No summary"}
                  </p>
                </div>
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${SCORE_COLORS[c.triage_score] || "bg-slate-100 text-slate-600"}`}>
                  {c.triage_score}
                </span>
              </div>

              {selected?.id === c.id && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="grid gap-2 text-sm text-slate-700">
                    <p><strong>Symptoms:</strong> {c.symptoms_raw}</p>
                    <p><strong>Triage reason:</strong> {c.triage_reason || "N/A"}</p>
                    {c.summary_json && (
                      <pre className="rounded-lg bg-slate-50 p-3 text-xs">
                        {JSON.stringify(c.summary_json, null, 2)}
                      </pre>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); markReviewed(c.id); }}
                    className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Mark as Reviewed
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
