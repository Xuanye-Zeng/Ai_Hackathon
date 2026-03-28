// P2 — Patient symptom submission form
// TODO: P2 owner implements this

import { useState } from "react";

export default function SubmitPage() {
  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("<1 day");
  const [accompanying, setAccompanying] = useState("");
  const [history, setHistory] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    // TODO: Call analyzeSymptomsV1 serverless function
    // For now, mock result
    setTimeout(() => {
      setResult({
        summary: "AI analysis placeholder — connect to serverless function",
        triage_score: 3,
      });
      setLoading(false);
    }, 1500);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Submit Symptoms</h1>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Main symptoms *</label>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            rows={4}
            required
            placeholder="Describe your symptoms..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
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
          {loading ? "AI is analyzing your symptoms..." : "Submit"}
        </button>
      </form>

      {result && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">Submitted to doctor</p>
          <p className="mt-1 text-sm text-emerald-700">{result.summary}</p>
        </div>
      )}
    </div>
  );
}
