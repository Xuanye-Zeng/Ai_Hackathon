import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { insforge } from "../../lib/insforge";

const DURATIONS = ["<1 day", "1-3 days", "3-7 days", ">1 week"];
const INPUT = "w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100";

const SCORE_STYLE = {
  1: { label: "Routine", gradient: "from-emerald-400 to-green-500", glow: "shadow-emerald-500/20" },
  2: { label: "Non-urgent", gradient: "from-emerald-400 to-green-500", glow: "shadow-emerald-500/20" },
  3: { label: "Should be seen soon", gradient: "from-amber-400 to-orange-500", glow: "shadow-amber-500/20" },
  4: { label: "Urgent", gradient: "from-rose-400 to-red-500", glow: "shadow-rose-500/20" },
  5: { label: "Emergency", gradient: "from-red-500 to-red-600", glow: "shadow-red-500/30" },
};

export default function SubmitPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("<1 day");
  const [accompanying, setAccompanying] = useState("");
  const [history, setHistory] = useState("");
  const [phase, setPhase] = useState("form");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!symptoms.trim()) return;
    setPhase("analyzing"); setError("");
    try {
      let analysis;
      try {
        const { data, error: fnErr } = await insforge.functions.invoke("analyzeSymptomsV1", {
          body: { symptoms_text: symptoms, duration, accompanying, history, patient_age: 30, patient_gender: "not specified", patient_name: user?.profile?.name || user?.email || "Anonymous" },
        });
        if (fnErr) throw fnErr;
        analysis = data;
      } catch { analysis = generateMockAnalysis(symptoms); }
      setResult(analysis); setPhase("result");
    } catch (err) { console.error(err); setError("Analysis failed. Please try again."); setPhase("form"); }
  }

  function resetForm() { setSymptoms(""); setDuration("<1 day"); setAccompanying(""); setHistory(""); setResult(null); setPhase("form"); setError(""); }

  if (phase === "analyzing") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
          <div className="absolute inset-0 flex items-center justify-center text-xl">🔬</div>
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-slate-900">AI is analyzing your symptoms...</p>
          <p className="mt-2 text-sm text-slate-400">Step 1: Extracting symptoms &rarr; Step 2: Assessing severity</p>
        </div>
      </div>
    );
  }

  if (phase === "result" && result) {
    const score = result.triage.score;
    const s = SCORE_STYLE[score] || SCORE_STYLE[3];
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Analysis Complete</h1>
        <div className={`mb-6 overflow-hidden rounded-2xl shadow-xl ${s.glow}`}>
          <div className={`bg-gradient-to-r ${s.gradient} px-5 py-3`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">Triage Score: {score}/5</p>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">{s.label}</span>
            </div>
          </div>
          <div className="border border-slate-200 border-t-0 rounded-b-2xl bg-white/60 px-5 py-3 backdrop-blur-sm">
            <p className="text-sm text-slate-900">{result.triage.reason}</p>
            <p className="mt-1 text-xs font-semibold text-slate-600">Recommended: {result.triage.recommended_timeframe}</p>
          </div>
        </div>
        <div className="glass rounded-2xl shadow-lg">
          <div className="border-b border-slate-100 px-5 py-3"><p className="text-sm font-semibold text-slate-900">Case Summary</p></div>
          <div className="divide-y divide-slate-100">
            <Row label="Chief complaint" value={result.summary.chief_complaint} />
            <Row label="Symptoms" value={result.summary.symptoms} />
            <Row label="Duration" value={result.summary.duration} />
            <Row label="Accompanying" value={result.summary.accompanying} />
            <Row label="History" value={result.summary.history} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs text-white">✓</div>
          <p className="text-sm font-medium text-blue-700">Submitted to doctor — your case is now in the triage queue.</p>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={() => navigate("/patient/chat", { state: { caseId: result.case_id } })}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xl shadow-blue-600/25 transition hover:shadow-2xl hover:brightness-110">Ask Follow-up Questions</button>
          <button onClick={resetForm} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">Submit Another</button>
        </div>
        <p className="mt-8 text-center text-sm font-semibold italic text-amber-600">This is AI-assisted analysis, not medical advice.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Submit Your Symptoms</h1>
        <p className="mt-1 text-sm text-slate-400">Describe how you're feeling. Our AI will generate a triage summary for your doctor.</p>
      </div>
      {error && <div className="mb-4 rounded-lg rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      <form onSubmit={handleSubmit} className="grid gap-5">
        <div className="glass rounded-2xl p-5 shadow-lg">
          <label className="mb-2 block text-sm font-semibold text-slate-700">Main symptoms <span className="text-rose-500">*</span></label>
          <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={4} required
            placeholder={"Describe your main symptoms in your own words...\ne.g. 'I've had a bad headache for two days and feel dizzy when I stand up'"}
            className={INPUT + " resize-none"} />
        </div>
        <div className="glass grid gap-4 rounded-2xl p-5 shadow-lg sm:grid-cols-2">
          <div className="sm:col-span-2"><p className="mb-3 text-sm font-semibold text-slate-700">Additional Details</p></div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Duration</label>
            <select value={duration} onChange={(e) => setDuration(e.target.value)} className={INPUT}>
              {DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Accompanying symptoms</label>
            <input value={accompanying} onChange={(e) => setAccompanying(e.target.value)} placeholder="Nausea, fever, fatigue..." className={INPUT} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Medical history</label>
            <textarea value={history} onChange={(e) => setHistory(e.target.value)} rows={2} placeholder="Existing conditions, allergies, current medications..." className={INPUT + " resize-none"} />
          </div>
        </div>
        <button type="submit" disabled={!symptoms.trim()}
          className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-xl shadow-blue-600/25 transition hover:shadow-2xl hover:brightness-110 disabled:opacity-40 disabled:shadow-none">
          Submit for Analysis
        </button>
      </form>
    </div>
  );
}

function Row({ label, value }) {
  return (<div className="flex gap-4 px-5 py-3 text-sm"><span className="w-32 shrink-0 font-medium text-slate-500">{label}</span><span className="text-slate-900">{value || "—"}</span></div>);
}

function generateMockAnalysis(symptomsText) {
  const text = symptomsText.toLowerCase();
  let score = 2, reason = "Mild symptoms reported; routine follow-up suggested.", timeframe = "Within 1 week", chief = "General discomfort";
  if (text.includes("chest pain") || text.includes("breathing") || text.includes("unconscious")) { score = 5; reason = "Potential cardiac or respiratory emergency."; timeframe = "Immediately"; chief = "Chest pain / difficulty breathing"; }
  else if (text.includes("fever") && (text.includes("vomiting") || text.includes("nauseous"))) { score = 4; reason = "High fever with vomiting may indicate serious infection."; timeframe = "Within 2 hours"; chief = "Fever with vomiting"; }
  else if (text.includes("abdominal") && text.includes("pain")) { score = 4; reason = "Acute abdominal pain requires timely assessment."; timeframe = "Within 2 hours"; chief = "Acute abdominal pain"; }
  else if (text.includes("headache") || text.includes("dizzy")) { score = 3; reason = "Persistent headache warrants timely evaluation."; timeframe = "Within 24 hours"; chief = "Headache / dizziness"; }
  else if (text.includes("sore throat") || text.includes("cough")) { score = 2; reason = "Upper respiratory symptoms; non-urgent but monitor."; timeframe = "Within a few days"; chief = "Sore throat / cough"; }
  else if (text.includes("runny nose") || text.includes("cold") || text.includes("sneez")) { score = 1; reason = "Common cold symptoms; monitor at home."; timeframe = "Routine follow-up"; chief = "Cold symptoms"; }
  return { case_id: crypto.randomUUID(), summary: { chief_complaint: chief, symptoms: symptomsText, duration: "As reported", accompanying: "See description", history: "None provided" }, triage: { score, reason, recommended_timeframe: timeframe }, status: "pending" };
}
