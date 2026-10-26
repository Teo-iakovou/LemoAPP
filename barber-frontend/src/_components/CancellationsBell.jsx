import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaBell } from "react-icons/fa";
import { fetchCancellationsUnreadCount } from "../utils/api";

const POLL_MS = 60 * 1000;

// Navbar bell → links to the Cancellations page. The badge counts cancellations this user
// hasn't seen yet (the page marks them seen and fires "cancellations:seen").
// Owner-only: renders nothing until the first count loads, and stays hidden on 403.
export default function CancellationsBell({ className = "", onNavigate }) {
  const [unread, setUnread] = useState(0);
  const [allowed, setAllowed] = useState(null);
  const allowedRef = useRef(null);
  const ref = useRef(null);
  const location = useLocation();
  const onPage = location.pathname === "/cancellations";

  // The navbar mounts a desktop and a mobile bell (one CSS-hidden); only the visible one polls.
  const load = useCallback(async () => {
    if (allowedRef.current === false) return;
    if (ref.current && ref.current.offsetParent === null) return;
    try {
      const count = await fetchCancellationsUnreadCount();
      allowedRef.current = true;
      setAllowed(true);
      setUnread(count);
    } catch (err) {
      if (err?.status === 403 || err?.status === 401) {
        allowedRef.current = false;
        setAllowed(false);
      }
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    const onFocus = () => load();
    const onSeen = () => setUnread(0);
    window.addEventListener("focus", onFocus);
    window.addEventListener("cancellations:seen", onSeen);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("cancellations:seen", onSeen);
    };
  }, [load]);

  if (allowed === false) return null;

  return (
    <span
      ref={ref}
      className={`relative inline-flex items-center ${allowed ? "" : "invisible"} ${className}`}
    >
      <Link
        to="/cancellations"
        onClick={onNavigate}
        aria-label={unread ? `Ακυρώσεις: ${unread} νέες` : "Ακυρώσεις"}
        title="Ακυρώσεις ραντεβού"
        className={`relative flex items-center transition-colors duration-300 hover:text-blue-500 ${
          onPage ? "text-blue-400" : "text-white"
        }`}
      >
        <FaBell />
        {unread > 0 && (
          <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>
    </span>
  );
}
