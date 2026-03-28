import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import { insforge } from "../../lib/insforge";

const SCORE_STYLE = {
  5: { color: "bg-rose-100 text-rose-700" },
  4: { color: "bg-rose-50 text-rose-600" },
  3: { color: "bg-amber-100 text-amber-700" },
  2: { color: "bg-emerald-50 text-emerald-600" },
  1: { color: "bg-emerald-100 text-emerald-700" },
};

export default function PatientSchedulePage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSchedules(); }, []);

  async function loadSchedules() {
    setLoading(true);
    try {
      // Get all cases for this patient, then find their schedules
      const { data: cases } = await insforge.database
        .from("cases")
        .select("id")
        .eq("status", "scheduled");

      if (cases && cases.length > 0) {
        const caseIds = cases.map(c => c.id);
        const { data } = await insforge.database
          .from("schedules")
          .select("*, cases(*, patients(name, age, gender))")
          .in("case_id", caseIds)
          .order("time_slot", { ascending: true });
        setSchedules(data || []);
      } else {
        setSchedules([]);
      }
    } catch {
      setSchedules([]);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
        <p className="text-sm text-slate-400">Loading your appointments...</p>
      </div>
    );
  }

  // Group by date
  const grouped = {};
  schedules.forEach((s) => {
    const date = new Date(s.time_slot).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(s);
  });

  const upcoming = schedules.filter(s => new Date(s.time_slot) > new Date());
  const confirmed = schedules.filter(s => s.confirmed).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Appointments</h1>
          <p className="mt-1 text-sm text-slate-500">
            {schedules.length === 0
              ? "No appointments yet"
              : `${upcoming.length} upcoming — ${confirmed} confirmed`}
          </p>
        </div>
        <button onClick={loadSchedules}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:shadow-sm">
          Refresh
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center shadow-sm ring-1 ring-slate-200/60">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">📅</div>
          <p className="text-sm font-semibold text-slate-700">No appointments scheduled</p>
          <p className="mt-1 text-xs text-slate-400">
            Your doctor will schedule an appointment after reviewing your case.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <h2 className="mb-3 text-sm font-semibold text-slate-500">{date}</h2>
              <div className="grid gap-2">
                {items.map((s) => {
                  const c = s.cases || {};
                  const summary = typeof c.summary_json === "string" ? JSON.parse(c.summary_json) : c.summary_json || {};
                  const score = c.triage_score || 3;
                  const scoreStyle = SCORE_STYLE[score] || SCORE_STYLE[3];
                  const time = new Date(s.time_slot).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                  const isPast = new Date(s.time_slot) < new Date();

                  return (
                    <div key={s.id} className={`glass rounded-2xl shadow-sm ring-1 transition-all ${isPast ? "opacity-60 ring-slate-200/40" : s.confirmed ? "ring-emerald-200" : "ring-slate-200/60"}`}>
                      <div className="flex items-center gap-4 p-4">
                        {/* Time */}
                        <div className={`flex shrink-0 flex-col items-center rounded-xl px-3 py-2 text-center ring-1 ${
                          s.confirmed ? "bg-emerald-50 ring-emerald-200" : "bg-blue-50 ring-blue-100"
                        }`}>
                          <span className={`text-[10px] font-medium ${s.confirmed ? "text-emerald-500" : "text-blue-400"}`}>
                            {isPast ? "PAST" : s.confirmed ? "CONFIRMED" : "PENDING"}
                          </span>
                          <span className={`text-sm font-bold ${s.confirmed ? "text-emerald-700" : "text-blue-700"}`}>{time}</span>
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">
                            {summary.chief_complaint || "Appointment"}
                          </p>
                          <p className="text-sm text-slate-500">
                            {s.confirmed ? "Your appointment is confirmed" : "Waiting for doctor confirmation"}
                          </p>
                        </div>

                        {/* Score */}
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${scoreStyle.color}`}>
                          Score {score}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
