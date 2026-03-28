import { useEffect, useState } from "react";
import { insforge } from "../../lib/insforge";
import { useAuth } from "../../lib/auth";

const SCORE_CONFIG = {
  5: { label: "Emergency",  gradient: "from-red-500 to-red-600",       text: "text-rose-700",  pulse: true },
  4: { label: "Urgent",     gradient: "from-rose-400 to-red-500",      text: "text-rose-600",  pulse: false },
  3: { label: "Soon",       gradient: "from-amber-400 to-orange-500",  text: "text-amber-700", pulse: false },
  2: { label: "Non-urgent", gradient: "from-emerald-400 to-green-500", text: "text-emerald-600", pulse: false },
  1: { label: "Routine",    gradient: "from-emerald-400 to-green-500", text: "text-emerald-700", pulse: false },
};

// Generate time slot options for today and tomorrow
function getTimeSlots() {
  const slots = [];
  const now = new Date();
  for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
    const base = new Date(now);
    base.setDate(base.getDate() + dayOffset);
    const startHour = dayOffset === 0 ? Math.max(now.getHours() + 1, 8) : 8;
    for (let h = startHour; h <= 17; h++) {
      for (const m of [0, 30]) {
        const slot = new Date(base);
        slot.setHours(h, m, 0, 0);
        if (slot > now) slots.push(slot);
      }
    }
  }
  return slots;
}

function formatSlot(d) {
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const tmrw = new Date(today); tmrw.setDate(tmrw.getDate() + 1);
  const isTomorrow = d.toDateString() === tmrw.toDateString();
  const prefix = isToday ? "Today" : isTomorrow ? "Tomorrow" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${prefix} ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [scheduling, setScheduling] = useState(null); // case id being scheduled
  const [selectedSlot, setSelectedSlot] = useState("");
  const [saving, setSaving] = useState(false);

  const timeSlots = getTimeSlots();

  useEffect(() => { loadCases(); }, []);

  async function loadCases() {
    setLoading(true);
    try {
      const { data } = await insforge.database
        .from("cases")
        .select("*, patients(name, age, gender)")
        .eq("status", "pending")
        .order("triage_score", { ascending: false });
      setCases(data || []);
    } catch { setCases([]); }
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

  async function scheduleCase(caseId, triageScore) {
    if (!selectedSlot) return;
    setSaving(true);
    try {
      // Insert into schedules table
      await insforge.database.from("schedules").insert({
        doctor_id: user?.id || null,
        case_id: caseId,
        time_slot: selectedSlot,
        priority: triageScore,
        confirmed: false,
      });
      // Update case status to scheduled
      await insforge.database
        .from("cases")
        .update({ status: "scheduled", reviewed_at: new Date().toISOString() })
        .eq("id", caseId);
      setScheduling(null);
      setSelectedSlot("");
      setSelected(null);
      loadCases();
    } catch (e) {
      console.error("Schedule failed:", e);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
        <p className="text-sm text-slate-400">Loading triage queue...</p>
      </div>
    );
  }

  const urgent = cases.filter(c => c.triage_score >= 4).length;
  const moderate = cases.filter(c => c.triage_score === 3).length;
  const low = cases.filter(c => c.triage_score <= 2).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Triage Queue</h1>
          <p className="mt-1 text-sm text-slate-500">
            {cases.length} pending {cases.length === 1 ? "case" : "cases"} — sorted by urgency
          </p>
        </div>
        <button onClick={loadCases}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:shadow-sm">
          Refresh
        </button>
      </div>

      {cases.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatCard label="Urgent / Emergency" count={urgent} color="rose" />
          <StatCard label="Should be seen soon" count={moderate} color="amber" />
          <StatCard label="Low priority" count={low} color="emerald" />
        </div>
      )}

      {cases.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center shadow-sm ring-1 ring-slate-200/60">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">✅</div>
          <p className="text-sm font-semibold text-slate-700">No pending cases</p>
          <p className="mt-1 text-xs text-slate-400">All caught up! Check back later.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {cases.map((c) => {
            const score = c.triage_score || 3;
            const cfg = SCORE_CONFIG[score] || SCORE_CONFIG[3];
            const isOpen = selected?.id === c.id;
            const isScheduling = scheduling === c.id;
            const summary = typeof c.summary_json === "string" ? JSON.parse(c.summary_json) : c.summary_json || {};

            return (
              <div key={c.id}
                onClick={() => { if (!isScheduling) { setSelected(isOpen ? null : c); setScheduling(null); } }}
                className={`glass cursor-pointer rounded-2xl shadow-sm ring-1 ring-slate-200/60 transition-all hover:shadow-md ${isOpen ? "ring-2 ring-blue-300" : ""}`}>
                <div className={`h-1 rounded-t-2xl bg-gradient-to-r ${cfg.gradient}`} />
                <div className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{c.patients?.name || "Unknown patient"}</p>
                        {c.patients?.age && (
                          <span className="text-xs text-slate-400">{c.patients.age}y {c.patients.gender && `/ ${c.patients.gender}`}</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">{summary.chief_complaint || c.symptoms_raw?.slice(0, 80) || "No summary"}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${cfg.gradient} text-base font-bold text-white shadow-md ${cfg.pulse ? "animate-pulse" : ""}`}>
                        {score}
                      </span>
                      <span className={`text-[10px] font-semibold ${cfg.text}`}>{cfg.label}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <div className="grid gap-3 text-sm">
                        <div>
                          <p className="text-xs font-semibold text-slate-400">Symptoms</p>
                          <p className="mt-0.5 text-slate-700">{c.symptoms_raw}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400">AI Triage Reason</p>
                          <p className="mt-0.5 text-slate-700">{c.triage_reason || "N/A"}</p>
                        </div>
                        {summary.symptoms && (
                          <div>
                            <p className="text-xs font-semibold text-slate-400">Extracted Summary</p>
                            <div className="mt-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                              <div className="grid gap-1">
                                {summary.chief_complaint && <p><strong>Chief complaint:</strong> {summary.chief_complaint}</p>}
                                {summary.symptoms && <p><strong>Symptoms:</strong> {summary.symptoms}</p>}
                                {summary.duration && <p><strong>Duration:</strong> {summary.duration}</p>}
                                {summary.accompanying && <p><strong>Accompanying:</strong> {summary.accompanying}</p>}
                                {summary.history && summary.history !== "None provided" && <p><strong>History:</strong> {summary.history}</p>}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Schedule picker */}
                      {isScheduling ? (
                        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4" onClick={(e) => e.stopPropagation()}>
                          <p className="mb-2 text-sm font-semibold text-blue-800">Select appointment time</p>
                          <select
                            value={selectedSlot}
                            onChange={(e) => setSelectedSlot(e.target.value)}
                            className="mb-3 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          >
                            <option value="">Choose a time slot...</option>
                            {timeSlots.map((s) => (
                              <option key={s.toISOString()} value={s.toISOString()}>{formatSlot(s)}</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={() => scheduleCase(c.id, score)}
                              disabled={!selectedSlot || saving}
                              className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-50"
                            >
                              {saving ? "Saving..." : "Confirm Schedule"}
                            </button>
                            <button
                              onClick={() => { setScheduling(null); setSelectedSlot(""); }}
                              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); markReviewed(c.id); }}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:shadow-sm"
                          >
                            Mark as Reviewed
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setScheduling(c.id); }}
                            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200/50 transition hover:shadow-xl hover:brightness-110"
                          >
                            Schedule Appointment
                          </button>
                        </div>
                      )}
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

function StatCard({ label, count, color }) {
  const colors = {
    rose:    "from-rose-500 to-red-500 shadow-rose-200",
    amber:   "from-amber-400 to-orange-500 shadow-amber-200",
    emerald: "from-emerald-400 to-green-500 shadow-emerald-200",
  };
  return (
    <div className="glass rounded-2xl p-4 shadow-sm ring-1 ring-slate-200/60">
      <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${colors[color]} text-base font-bold text-white shadow-md`}>
        {count}
      </div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}
