import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCancellations, markCancellationsSeen } from "../utils/api";

const TZ = "Europe/Athens";
const PAGE_SIZE = 50;
const BARBER_FILTERS = [
  ["", "Όλοι"],
  ["ΛΕΜΟ", "ΛΕΜΟ"],
  ["ΦΟΡΟΥ", "ΦΟΡΟΥ"],
  ["ΚΟΥΣΙΗΣ", "ΚΟΥΣΙΗΣ"],
];
const BARBER_TEXT = {
  ΛΕΜΟ: "text-[#a78bfa]",
  ΦΟΡΟΥ: "text-orange-400",
  ΚΟΥΣΙΗΣ: "text-teal-400",
};

const fmtSlot = (value) =>
  new Date(value).toLocaleString("el-GR", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtTime = (value) =>
  new Date(value).toLocaleTimeString("el-GR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

const dayKey = (value) =>
  new Date(value).toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD in Athens

function dayLabel(key) {
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - 86400000));
  if (key === today) return "Σήμερα";
  if (key === yesterday) return "Χθες";
  return new Date(`${key}T12:00:00`).toLocaleDateString("el-GR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const Tag = ({ className, children }) => (
  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${className}`}>{children}</span>
);

// Full cancellation history (owner-only). Opening the page marks everything as seen,
// which clears the navbar bell badge; rows that were new on arrival keep a red dot.
export default function CancellationsPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [barber, setBarber] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const markedRef = useRef(false);

  const load = useCallback(async (nextPage, barberFilter, append) => {
    try {
      const data = await fetchCancellations({ page: nextPage, limit: PAGE_SIZE, barber: barberFilter });
      setItems((prev) => (append ? [...prev, ...(data.items || [])] : data.items || []));
      setTotal(Number(data.total) || 0);
      setPage(nextPage);
      setError("");
      if (!markedRef.current) {
        markedRef.current = true;
        if (Number(data.unreadCount) > 0) {
          markCancellationsSeen()
            .then(() => window.dispatchEvent(new CustomEvent("cancellations:seen")))
            .catch(() => {});
        }
      }
    } catch (err) {
      if (err?.status === 403) setForbidden(true);
      else setError("Αποτυχία φόρτωσης ακυρώσεων.");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(1, barber, false).finally(() => setLoading(false));
  }, [barber, load]);

  const loadMore = async () => {
    setLoadingMore(true);
    await load(page + 1, barber, true);
    setLoadingMore(false);
  };

  if (forbidden) {
    return (
      <div className="p-6 text-center text-gray-300">
        Δεν έχετε πρόσβαση σε αυτή τη σελίδα.
      </div>
    );
  }

  // Group by the (Athens) day the cancellation happened.
  const groups = [];
  items.forEach((c) => {
    const key = dayKey(c.cancelledAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(c);
    else groups.push({ key, items: [c] });
  });

  return (
    <div className="mx-auto w-full max-w-3xl p-2 sm:p-6 text-white">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">
          ΑΚΥΡΩΣΕΙΣ{" "}
          <span className="text-base font-normal text-gray-300">
            ({total.toLocaleString("el-GR")})
          </span>
        </h1>
        <div className="flex flex-wrap gap-2">
          {BARBER_FILTERS.map(([value, label]) => (
            <button
              key={value || "all"}
              type="button"
              onClick={() => setBarber(value)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                barber === value
                  ? "border-[#a78bfa] bg-[#a78bfa]/20 text-white"
                  : "border-white/15 text-gray-300 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-[#a78bfa]">Φόρτωση…</div>
      ) : error && !items.length ? (
        <div className="py-10 text-center text-rose-300">{error}</div>
      ) : !items.length ? (
        <div className="py-10 text-center text-gray-400">Καμία ακύρωση ακόμα.</div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
                {dayLabel(g.key)}
              </h2>
              <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-[#161a23]">
                {g.items.map((c) => (
                  <li
                    key={c._id}
                    className={`px-4 py-3 ${c.sameDay && !c.isPast ? "bg-red-500/10" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-semibold">
                          {c.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />}
                          <span className="truncate">
                            {c.customerName || "—"}
                            {c.bookedFor ? ` (για ${c.bookedFor})` : ""}
                          </span>
                        </div>
                        <div className={`mt-0.5 text-sm ${c.isPast ? "text-gray-500" : "text-gray-200"}`}>
                          Ραντεβού: {fmtSlot(c.appointmentDateTime)} ·{" "}
                          <span className={`font-semibold ${BARBER_TEXT[c.barber] || ""}`}>{c.barber}</span>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-gray-400">
                        Ακυρώθηκε {fmtTime(c.cancelledAt)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {c.sameDay && <Tag className="bg-red-500/20 text-red-300">Ίδια μέρα</Tag>}
                      {c.cancelledBy === "barber" ? (
                        <Tag className="bg-white/10 text-gray-300">
                          Από barber{c.cancelledByName ? ` (${c.cancelledByName})` : ""}
                        </Tag>
                      ) : (
                        <Tag className="bg-purple-500/20 text-purple-200">Από πελάτη</Tag>
                      )}
                      {c.fromAutoCustomer && (
                        <Tag className="bg-amber-500/20 text-amber-200">Σταθερός πελάτης</Tag>
                      )}
                      {c.slotRebooked && (
                        <Tag className="bg-emerald-500/20 text-emerald-300">Η ώρα ξανακλείστηκε</Tag>
                      )}
                      {c.isPast && <Tag className="bg-white/5 text-gray-400">Πέρασε</Tag>}
                    </div>
                    {c.sibling && (
                      <div className="mt-1.5 text-xs text-gray-400">
                        Ισχύει ακόμα το 2ο ραντεβού: {fmtSlot(c.sibling.appointmentDateTime)} ·{" "}
                        {c.sibling.barber}
                        {c.sibling.bookedFor ? ` (για ${c.sibling.bookedFor})` : ""}
                      </div>
                    )}
                    {c.fromAutoCustomer && !c.isPast && (
                      <div className="mt-1 text-xs text-amber-200/80">
                        Προσοχή: το επόμενο push της καρτέλας μπορεί να το ξαναδημιουργήσει.
                      </div>
                    )}
                    {c.phoneNumber && (
                      <a
                        href={`tel:${c.phoneNumber}`}
                        className="mt-1 inline-block text-sm text-blue-300 hover:underline"
                      >
                        {c.phoneNumber}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {items.length < total && (
            <div className="flex justify-center pb-4">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-lg border border-white/20 px-5 py-2 text-sm font-semibold text-gray-200 hover:bg-white/10 disabled:opacity-50"
              >
                {loadingMore ? "Φόρτωση…" : `Φόρτωσε περισσότερα (${total - items.length})`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
