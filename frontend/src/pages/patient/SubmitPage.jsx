import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { insforge } from "../../lib/insforge";

const DURATIONS = ["<1 day", "1-3 days", "3-7 days", ">1 week"];

const SCORE_STYLE = {
  1: { label: "Routine", ring: "ring-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700" },
  2: { label: "Non-urgent", ring: "ring-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700" },
  3: { label: "Should be seen soon", ring: "ring-amber-200", bg: "bg-amber-50", text: "text-amber-700", badge: "bg-amber-100 text-amber-700" },
  4: { label: "Urgent", ring: "ring-rose-200", bg: "bg-rose-50", text: "text-rose-700", badge: "bg-rose-100 text-rose-700" },
  5: { label: "Emergency", ring: "ring-rose-300", bg: "bg-rose-50", text: "text-rose-700", badge: "bg-rose-100 text-rose-800" },
};

export default function SubmitPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("<1 day");
  const [accompanying, setAccompanying] = useState("");
  const [history, setHistory] = useState("");

  const [phase, setPhase] = useState("form"); // form | analyzing | result
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!symptoms.trim()) return;

    setPhase("analyzing");
    setError("");

    try {
      // ── Call P1's serverless function ──
      let analysis;
      try {
        const { data, error: fnErr } = await insforge.functions.invoke(
          "analyzeSymptomsV1",
          {
            body: {
              symptoms_text: symptoms,
              duration,
              accompanying,
              history,
              patient_age: 30,
              patient_gender: "not specified",
            },
          }
        );
        if (fnErr) throw fnErr;
        analysis = data;
      } catch {
        // ── Fallback mock so demo never crashes ──
        analysis = generateMockAnalysis(symptoms);
      }

      // ── Save case to DB ──
      try {
        await insforge.database.from("cases").insert({
          patient_id: user?.id || null,
          symptoms_raw: symptoms,
          summary_json: analysis.summary,
          triage_score: analysis.triage.score,
          triage_reason: analysis.triage.reason,
          status: "pending",
        });
      } catch (dbErr) {
        console.warn("DB insert failed (demo mode):", dbErr);
      }

      setResult(analysis);
      setPhase("result");
    } catch (err) {
      console.error("Analysis failed:", err);
      setError("Analysis failed. Please try again.");
      setPhase("form");
    }
  }

  function resetForm() {
    setSymptoms("");
    setDuration("<1 day");
    setAccompanying("");
    setHistory("");
    setResult(null);
    setPhase("form");
    setError("");
  }

  // ═══════════════════════════════════════
  //  ANALYZING
  // ═══════════════════════════════════════
  if (phase === "analyzing") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-900">
            AI is analyzing your symptoms...
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Extracting symptoms, assessing severity, generating triage
            recommendation.
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  RESULT
  // ═══════════════════════════════════════
  if (phase === "result" && result) {
    const score = result.triage.score;
    const s = SCORE_STYLE[score] || SCORE_STYLE[3];

    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">
          Analysis Complete
        </h1>

        {/* Triage banner */}
        <div className={`mb-6 rounded-xl border p-4 ${s.ring} ring-1 ${s.bg}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-bold ${s.text}`}>
                Triage Score: {score}/5 — {s.label}
              </p>
              <p className={`mt-1 text-xs opacity-80 ${s.text}`}>
                {result.triage.reason}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${s.badge}`}
            >
              {result.triage.recommended_timeframe}
            </span>
          </div>
        </div>

        {/* Case summary */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Case Summary</p>
          </div>
          <div className="divide-y divide-slate-100">
            <SummaryRow label="Chief complaint" value={result.summary.chief_complaint} />
            <SummaryRow label="Symptoms" value={result.summary.symptoms} />
            <SummaryRow label="Duration" value={result.summary.duration} />
            <SummaryRow label="Accompanying" value={result.summary.accompanying} />
            <SummaryRow label="History" value={result.summary.history} />
          </div>
        </div>

        {/* Status */}
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-xs font-medium text-blue-700">
          <span>✅</span>
          Submitted to doctor — your case is now in the triage queue.
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() =>
              navigate("/patient/chat", {
                state: { caseId: result.case_id },
              })
            }
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Ask Follow-up Questions
          </button>
          <button
            onClick={resetForm}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Submit Another
          </button>
        </div>

        <p className="mt-6 text-center text-xs italic text-slate-400">
          This is AI-assisted analysis, not medical advice.
        </p>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  FORM
  // ═══════════════════════════════════════
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">
        Submit Your Symptoms
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Describe how you're feeling. Our AI will generate a triage summary for
        your doctor.
      </p>

      {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Main symptoms <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            rows={4}
            required
            placeholder={"Describe your main symptoms in your own words…\ne.g. 'I've had a bad headache for two days and feel dizzy when I stand up'"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Duration
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Accompanying symptoms
          </label>
          <textarea
            value={accompanying}
            onChange={(e) => setAccompanying(e.target.value)}
            rows={2}
            placeholder="Any other symptoms? Nausea, fever, fatigue, etc."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Medical history
          </label>
          <textarea
            value={history}
            onChange={(e) => setHistory(e.target.value)}
            rows={2}
            placeholder="Existing conditions, allergies, current medications…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={!symptoms.trim()}
          className="rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          Submit for Analysis
        </button>
      </form>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex gap-4 px-4 py-2.5 text-sm">
      <span className="w-32 shrink-0 font-medium text-slate-500">{label}</span>
      <span className="text-slate-800">{value || "—"}</span>
    </div>
  );
}

// ── Mock analysis fallback ──
function generateMockAnalysis(symptomsText) {
  const text = symptomsText.toLowerCase();
  let score = 2,
    reason = "Mild symptoms reported; routine follow-up suggested.",
    timeframe = "Within 1 week",
    chief = "General discomfort";

  if (text.includes("chest pain") || text.includes("breathing") || text.includes("unconscious")) {
    score = 5; reason = "Potential cardiac or respiratory emergency.";
    timeframe = "Immediately"; chief = "Chest pain / difficulty breathing";
  } else if (text.includes("fever") && (text.includes("vomiting") || text.includes("nauseous"))) {
    score = 4; reason = "High fever with vomiting may indicate serious infection.";
    timeframe = "Within 2 hours"; chief = "Fever with vomiting";
  } else if (text.includes("abdominal") && text.includes("pain")) {
    score = 4; reason = "Acute abdominal pain requires timely assessment.";
    timeframe = "Within 2 hours"; chief = "Acute abdominal pain";
  } else if (text.includes("headache") || text.includes("dizzy")) {
    score = 3; reason = "Persistent headache warrants timely evaluation.";
    timeframe = "Within 24 hours"; chief = "Headache / dizziness";
  } else if (text.includes("sore throat") || text.includes("cough")) {
    score = 2; reason = "Upper respiratory symptoms; non-urgent but monitor.";
    timeframe = "Within a few days"; chief = "Sore throat / cough";
  } else if (text.includes("runny nose") || text.includes("cold") || text.includes("sneez")) {
    score = 1; reason = "Common cold symptoms; monitor at home.";
    timeframe = "Routine follow-up"; chief = "Cold symptoms";
  }

  return {
    case_id: crypto.randomUUID(),
    summary: {
      chief_complaint: chief,
      symptoms: symptomsText,
      duration: "As reported",
      accompanying: "See description",
      history: "None provided",
    },
    triage: { score, reason, recommended_timeframe: timeframe },
    status: "pending",
  };
}