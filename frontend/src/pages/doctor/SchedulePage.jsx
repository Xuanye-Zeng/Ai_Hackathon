// P3 — Doctor schedule view

import { useEffect, useState } from "react";
import { insforge } from "../../lib/insforge";
import { useAuth } from "../../lib/auth";

const SCORE_COLORS = {
  5: "bg-rose-100 text-rose-700 border-rose-200",
  4: "bg-rose-50 text-rose-600 border-rose-200",
  3: "bg-amber-100 text-amber-700 border-amber-200",
  2: "bg-emerald-50 text-emerald-600 border-emerald-200",
  1: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function SchedulePage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function loadSchedules() {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const startOfDay = new Date(today + "T00:00:00");
      const endOfDay = new Date(today + "T23:59:59");

      const { data } = await insforge.database
        .from("schedules")
        .select("*, cases(*, patients(name, age, gender))")
        .eq("doctor_id", user.id)
        .gte("time_slot", startOfDay.toISOString())
        .lte("time_slot", endOfDay.toISOString())
        .order("time_slot", { ascending: true });
      setSchedules(data || []);
    } catch {
      // Fallback: show empty state
      setSchedules([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadSchedules();
  }, []);

  async function generateSchedule() {
    setGenerating(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await insforge.functions.invoke("generateSchedule", {
        body: { doctor_id: user.id, date: today },
      });
      await loadSchedules();
    } catch {
      // Failures return mock data, not errors
      setSchedules([]);
    }
    setGenerating(false);
  }

  async function confirmAll() {
    setConfirming(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const startOfDay = new Date(today + "T00:00:00");
      const endOfDay = new Date(today + "T23:59:59");

      await insforge.database
        .from("schedules")
        .update({ confirmed: true })
        .eq("doctor_id", user.id)
        .gte("time_slot", startOfDay.toISOString())
        .lte("time_slot", endOfDay.toISOString())
        .eq("confirmed", false);
      await loadSchedules();
    } catch {
      // Graceful failure
    }
    setConfirming(false);
  }

  async function confirmOne(scheduleId) {
    try {
      await insforge.database
        .from("schedules")
        .update({ confirmed: true })
        .eq("id", scheduleId);
      await loadSchedules();
    } catch {
      // Graceful failure
    }
  }

  const unconfirmedCount = schedules.filter((s) => !s.confirmed).length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        Loading schedule...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Schedule</h1>
          <p className="text-sm text-slate-500">{formatDate(new Date())}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={generateSchedule}
            disabled={generating}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate Schedule"}
          </button>
          {unconfirmedCount > 0 && (
            <button
              onClick={confirmAll}
              disabled={confirming}
              className="rounded-lg border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {confirming ? "Confirming..." : "Confirm All"}
            </button>
          )}
        </div>
      </div>

      {/* Schedule List */}
      {schedules.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No appointments scheduled. Click "Generate Schedule" to create today's schedule.
        </div>
      ) : (
        <div className="grid gap-3">
          {schedules.map((schedule) => {
            const caseData = schedule.cases;
            const patient = caseData?.patients;
            const chiefComplaint =
              caseData?.summary_json?.chief_complaint ||
              caseData?.symptoms_raw?.slice(0, 80) ||
              "No details";

            return (
              <div
                key={schedule.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Time */}
                  <div className="w-24 flex-shrink-0">
                    <p className="text-lg font-bold text-slate-900">
                      {formatTime(schedule.time_slot)}
                    </p>
                  </div>

                  {/* Patient info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">
                      {patient?.name || "Unknown patient"}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {chiefComplaint}
                    </p>
                  </div>

                  {/* Triage score badge */}
                  <span
                    className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      SCORE_COLORS[caseData?.triage_score] ||
                      "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {caseData?.triage_score || "-"}
                  </span>

                  {/* Confirm button or checkmark */}
                  <div className="w-24 flex-shrink-0 text-right">
                    {schedule.confirmed ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-700">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Confirmed
                      </span>
                    ) : (
                      <button
                        onClick={() => confirmOne(schedule.id)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Confirm
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
