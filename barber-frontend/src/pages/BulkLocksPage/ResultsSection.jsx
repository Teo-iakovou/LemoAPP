import { dateFormatter, timeFormatter } from "./utils";

const ResultsSection = ({ results, onReset }) => {
  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  const renderRow = (entry, index) => {
    const { lock } = entry;
    const start = new Date(lock.date);
    const end = new Date(start.getTime() + lock.duration * 60000);

    const badge =
      entry.status === "success"
        ? "bg-emerald-500/15 text-emerald-200 border border-emerald-400/40"
        : "bg-rose-500/15 text-rose-200 border border-rose-400/40";

    return (
      <div
        key={`${entry.status}-${index}`}
        className="rounded-2xl border border-gray-800 bg-gray-900/60 px-4 py-3 text-sm text-gray-200"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-white">
              {dateFormatter.format(lock.date)}
            </p>
            <p className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
              <span>
                {timeFormatter.format(start)} — {timeFormatter.format(end)}
              </span>
              <span>• {lock.barber}</span>
              {lock.recurring && (
                <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                  Μόνιμο
                </span>
              )}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badge}`}>
            {entry.status === "success"
              ? "✅ Επιτυχία"
              : entry.message?.toLowerCase().includes("already")
              ? "⚠️ Ήδη κλειδωμένο"
              : "❌ Σφάλμα"}
          </span>
        </div>
        {entry.status === "error" && (
          <p className="mt-2 text-xs text-rose-200/80">
            {entry.message || "Άγνωστο σφάλμα."}
          </p>
        )}
        {entry.status === "success" && entry.unlockStatus === "error" && (
          <p className="mt-2 text-xs text-rose-200/80">
            {entry.unlockMessage || "Αποτυχία ξεκλειδώματος."}
          </p>
        )}
        {entry.status === "success" && entry.unlockStatus === "done" && (
          <p className="mt-2 text-xs text-emerald-200/80">Ξεκλειδώθηκε.</p>
        )}
      </div>
    );
  };

  return (
    <section className="rounded-3xl border border-gray-800/80 bg-gray-900/70 p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Αποτελέσματα</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="rounded-2xl border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-violet-500 hover:text-white"
          >
            Νέο batch
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {results.map((entry, index) => renderRow(entry, index))}
      </div>
    </section>
  );
};

export default ResultsSection;
