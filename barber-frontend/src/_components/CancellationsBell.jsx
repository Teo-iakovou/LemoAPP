import { useCallback, useEffect, useRef, useState } from "react";
import { FaBell } from "react-icons/fa";
import { fetchCancellations, markCancellationsSeen } from "../utils/api";

const POLL_MS = 60 * 1000;
const TZ = "Europe/Athens";

const fmtSlot = (value) =>
  new Date(value).toLocaleString("el-GR", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function timeAgo(value) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (mins < 1) return "μόλις τώρα";
  if (mins < 60) return `πριν ${mins}′`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `πριν ${hours} ώρ${hours === 1 ? "α" : "ες"}`;
  const days = Math.round(hours / 24);
  return `πριν ${days} μέρ${days === 1 ? "α" : "ες"}`;
}

const Tag = ({ className, children }) => (
  <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${className}`}>{children}</span>
);

// Bell in the admin navbar: badge = cancellations this user hasn't seen yet. Opening the
// panel marks them seen. Polls every minute and when the tab regains focus.
export default function CancellationsBell({ className = "" }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef(null);

  // The navbar mounts one bell for desktop and one for mobile (one is CSS-hidden); only the
  // visible one polls. `force` is used when the user opens the panel.
  const load = useCallback(async (force = false) => {
    if (!force && ref.current && ref.current.offsetParent === null) return null;
    try {
      const data = await fetchCancellations();
      setItems(Array.isArray(data?.items) ? data.items : []);
      setUnread(Number(data?.unreadCount) || 0);
      setError("");
      return data;
    } catch {
      setError("Αποτυχία φόρτωσης.");
      return null;
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setLoading(true);
    const data = await load(true);
    setLoading(false);
    if (Number(data?.unreadCount) > 0) {
      // Keep the "new" dots visible while the panel is open; the badge clears now.
      setUnread(0);
      markCancellationsSeen().catch(() => {});
    }
  };

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label={unread ? `Ακυρώσεις: ${unread} νέες` : "Ακυρώσεις"}
        title="Ακυρώσεις ραντεβού"
        className="relative text-white hover:text-blue-500 transition-colors duration-300"
      >
        <FaBell />
        {unread > 0 && (
          <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-2 right-2 top-[72px] z-[1300] max-h-[70vh] overflow-hidden rounded-2xl border border-purple-400/30 bg-[#161a23] text-left text-sm text-gray-100 shadow-2xl md:absolute md:left-auto md:right-0 md:top-10 md:w-[380px]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="font-semibold">Ακυρώσεις ραντεβού</span>
            <span className="text-xs text-gray-400">τελευταίες 60 μέρες</span>
          </div>
          <div className="max-h-[calc(70vh-48px)] overflow-y-auto">
            {loading && !items.length ? (
              <div className="px-4 py-6 text-center text-gray-400">Φόρτωση…</div>
            ) : error && !items.length ? (
              <div className="px-4 py-6 text-center text-rose-300">{error}</div>
            ) : !items.length ? (
              <div className="px-4 py-6 text-center text-gray-400">Καμία ακύρωση.</div>
            ) : (
              <ul className="divide-y divide-white/5">
                {items.map((c) => (
                  <li
                    key={c._id}
                    className={`px-4 py-3 ${c.sameDay && !c.isPast ? "bg-red-500/10" : ""} ${
                      c.isPast ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-semibold">
                          {c.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />}
                          <span className="truncate">
                            {c.customerName || "—"}
                            {c.bookedFor ? ` (για ${c.bookedFor})` : ""}
                          </span>
                        </div>
                        <div className="mt-0.5 text-gray-300">
                          {fmtSlot(c.appointmentDateTime)} · {c.barber}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-gray-400">{timeAgo(c.cancelledAt)}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
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
                    </div>
                    {c.sibling && (
                      <div className="mt-1.5 text-xs text-gray-400">
                        Ισχύει ακόμα το 2ο ραντεβού: {fmtSlot(c.sibling.appointmentDateTime)} ·{" "}
                        {c.sibling.barber}
                        {c.sibling.bookedFor ? ` (για ${c.sibling.bookedFor})` : ""}
                      </div>
                    )}
                    {c.fromAutoCustomer && (
                      <div className="mt-1 text-xs text-amber-200/80">
                        Προσοχή: το επόμενο push της καρτέλας μπορεί να το ξαναδημιουργήσει.
                      </div>
                    )}
                    {c.phoneNumber && (
                      <a
                        href={`tel:${c.phoneNumber}`}
                        className="mt-1 inline-block text-xs text-blue-300 hover:underline"
                      >
                        {c.phoneNumber}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
