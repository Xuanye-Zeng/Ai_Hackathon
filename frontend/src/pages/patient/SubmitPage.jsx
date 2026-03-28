// P2 — Patient symptom submission form
// Calls analyze-symptoms serverless function on InsForge

import { useState } from "react";
import { insforge } from "../../lib/insforge";

const SCORE_LABELS = {
  1: { text: "Routine", color: "bg-emerald-100 text-emerald-700" },
  2: { text: "Non-urgent", color: "bg-emerald-50 text-emerald-600" },
  3: { text: "Moderate", color: "bg-amber-100 text-amber-700" },
  4: { text: "Urgent", color: "bg-rose-100 text-rose-700" },
  5: { text: "Emergency", color: "bg-rose-200 text-rose-800" },
};

export default function SubmitPage() {
  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("<1 day");
  const [accompanying, setAccompanying] = useState("");
  const [history, setHistory] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [name, setName] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const fullSymptoms = [
      symptoms,
      `Duration: ${duration}`,
      accompanying ? `Also experiencing: ${accompanying}` : "",
      history ? `Medical history: ${history}` : "",
    ].filter(Boolean).join(". ");

    try {
      const { data, error: fnError } = await insforge.functions.invoke("analyze-symptoms", {
        body: {
          symptoms_text: fullSymptoms,
          patient_age: age ? parseInt(age) : null,
          patient_gender: gender || null,
          patient_name: name || "Anonymous",
        },
      });

      if (fnError) throw fnError;
      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to analyze symptoms. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const scoreInfo = result ? SCORE_LABELS[result.scoring?.score] || SCORE_LABELS[3] : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Submit Symptoms</h1>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Age</label>
            <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Main symptoms *</label>
          <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={4} required placeholder="Describe your symptoms in your own words..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Duration</label>
          <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option>&lt;1 day</option>
            <option>1-3 days</option>
            <option>3-7 days</option>
            <option>&gt;1 week</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Accompanying symptoms</label>
          <textarea value={accompanying} onChange={(e) => setAccompanying(e.target.value)} rows={2} placeholder="Any other symptoms..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Medical history</label>
          <textarea value={history} onChange={(e) => setHistory(e.target.value)} rows={2} placeholder="Past medical history..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
        <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {loading ? "AI is analyzing your symptoms..." : "Submit for Triage"}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 grid gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">Triage Result</h2>
              {scoreInfo && (
                <span className={`rounded-full px-3 py-1 text-sm font-bold ${scoreInfo.color}`}>
                  Score: {result.scoring?.score} — {scoreInfo.text}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 mb-2"><strong>Chief complaint:</strong> {result.extraction?.chief_complaint}</p>
            <p className="text-sm text-slate-600 mb-2"><strong>Reason:</strong> {result.scoring?.reason}</p>
            <p className="text-sm text-slate-600 mb-2"><strong>Recommended timeframe:</strong> {result.scoring?.recommended_timeframe}</p>
            {result.scoring?.red_flags?.length > 0 && (
              <div className="mt-2 rounded-lg bg-rose-50 p-3">
                <p className="text-sm font-medium text-rose-700">Red flags:</p>
                <ul className="mt-1 list-disc pl-5 text-sm text-rose-600">
                  {result.scoring.red_flags.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-400">{result.disclaimer}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <p className="text-sm font-medium text-emerald-800">Submitted to doctor's triage queue</p>
          </div>
        </div>
      )}
    </div>
  );
}
