import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./_components/Navbar";
import { Toaster, toast } from "react-hot-toast";
import "./index.css";
import UpdatePasswordForm from "./pages/UpdatePasswordForm";
import { setOn401Handler, isTokenExpired, decodeJwt, fetchMe } from "./utils/api";

// Read the role straight off the stored JWT so the first render is already
// correct (no flash of admin nav for a limited user). This is a UX hint only —
// the server re-checks the DB role on every protected route.
const readRoleFromToken = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token || isTokenExpired(token)) return null;
    return decodeJwt(token)?.role || null;
  } catch {
    return null;
  }
};

// Lazy load pages
// const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const Home = lazy(() => import("./pages/Home"));
const SmsStatusPage = lazy(() => import("./pages/SmsStatusPage"));
const NotePage = lazy(() => import("./pages/NotePage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const Profile = lazy(() => import("./pages/Profile"));
const Customers = lazy(() => import("./pages/CustomersPage"));
const Login = lazy(() => import("./pages/Login"));
const CustomerCounts = lazy(() => import("./pages/CustomerCounts"));
const AutoCustomersPage = lazy(() => import("./pages/AutoCustomersPage"));
const BulkLocksPage = lazy(() => import("./pages/BulkLocksPage"));

const App = () => {
  const [isAuth, setAuth] = useState(false); // Authentication state
  const [role, setRole] = useState(readRoleFromToken); // 'admin' | 'calendar' | null
  // Which barber the signed-in user IS. Used only to preselect the barber on a new
  // appointment (Phase B); access control never depends on it.
  const [barberName, setBarberName] = useState(null);
  const [calendarDark, setCalendarDark] = useState(() => {
    try {
      const saved = localStorage.getItem("calendarDark");
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  // Check authentication on page load — proactively expire a lapsed token instead
  // of leaving the admin silently degraded (public routes never return 401).
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && isTokenExpired(token)) {
      localStorage.removeItem("token");
      setAuth(false);
      toast.error("Η συνεδρία έληξε, συνδεθείτε ξανά.");
    } else {
      setAuth(!!token);
    }
  }, []);

  useEffect(() => {
    setOn401Handler(() => {
      localStorage.removeItem("token");
      setAuth(false);
      setRole(null);
      setBarberName(null);
      toast.error("Η συνεδρία έληξε, συνδεθείτε ξανά.");
    });
  }, []);

  // Resolve the signed-in user's role. Seeded from the token for an instant
  // render, then confirmed against /auth/me (the authoritative DB value).
  useEffect(() => {
    if (!isAuth) {
      setRole(null);
      setBarberName(null);
      return;
    }
    setRole(readRoleFromToken());
    let cancelled = false;
    fetchMe()
      .then((user) => {
        if (!cancelled && user) {
          setRole(user.role || "admin");
          setBarberName(user.barberName || null);
        }
      })
      .catch(() => {
        // 401s are handled globally by the on401Handler above.
      });
    return () => {
      cancelled = true;
    };
  }, [isAuth]);

  // Catch a session that expires mid-use (before the next authenticated action),
  // so we log out cleanly rather than firing requests with a stale token.
  useEffect(() => {
    const check = () => {
      const token = localStorage.getItem("token");
      if (token && isTokenExpired(token)) {
        localStorage.removeItem("token");
        setAuth(false);
        toast.error("Η συνεδρία έληξε, συνδεθείτε ξανά.");
      }
    };
    const id = setInterval(check, 30000);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Persist calendar dark mode
  useEffect(() => {
    localStorage.setItem("calendarDark", JSON.stringify(calendarDark));
  }, [calendarDark]);

  // Handle logout function
  const handleLogout = () => {
    localStorage.removeItem("token"); // Clear the token
    setAuth(false); // Set authentication to false
    setRole(null);
    setBarberName(null);
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-900 transition-colors duration-300 overflow-x-hidden">
        {/* Toasts show up globally */}
        <Toaster position="top-center" reverseOrder={false} />
        {/* Navbar Section */}
        <header className="h-16 shrink-0 bg-purple-950">
          <Navbar
            isAuth={isAuth}
            role={role}
            onLogout={handleLogout}
            calendarDark={calendarDark}
            onToggleCalendarDark={() => setCalendarDark((v) => !v)}
          />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 sm:px-4 sm:py-4 lg:p-6">
          <Suspense fallback={<div>Loading...</div>}>
            {isAuth && role === "calendar" ? (
              // Limited role: Calendar only (plus their own profile, so they can
              // change their password). Every other path redirects to /calendar.
              // This is convenience/UX — the backend independently enforces access.
              <Routes>
                <Route
                  path="/calendar"
                  element={
                    <CalendarPage
                      darkCalendar={calendarDark}
                      defaultBarber={barberName}
                    />
                  }
                />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<Navigate to="/calendar" replace />} />
              </Routes>
            ) : isAuth ? (
              <Routes>
                <Route path="/" element={<Home />} />
                <Route
                  path="/calendar"
                  element={
                    <CalendarPage
                      darkCalendar={calendarDark}
                      defaultBarber={barberName}
                    />
                  }
                />
                <Route path="/customers" element={<Customers />} />
                <Route path="/CustomerCounts" element={<CustomerCounts />} />
                <Route
                  path="/update-password"
                  element={<UpdatePasswordForm />}
                />
                <Route path="/profile" element={<Profile />} />
                <Route path="/NotePage" element={<NotePage />} />
                <Route path="/sms-status" element={<SmsStatusPage />} />
                <Route path="/auto-customers" element={<AutoCustomersPage />} />
                <Route path="/bulk-locks" element={<BulkLocksPage />} />
              </Routes>
            ) : (
              <Routes>
                <Route path="*" element={<Login setAuth={setAuth} />} />
              </Routes>
            )}
          </Suspense>
        </main>
      </div>
    </Router>
  );
};

export default App;
