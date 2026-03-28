// Patient history page — view past submissions
// TODO: Query cases from InsForge DB by patient_id

export default function HistoryPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">My Records</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        No records yet. Submit your symptoms to get started.
      </div>
    </div>
  );
}
