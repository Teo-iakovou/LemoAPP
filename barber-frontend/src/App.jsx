import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./_components/Navbar";
import { Toaster, toast } from "react-hot-toast";
import "./index.css";
import UpdatePasswordForm from "./pages/UpdatePasswordForm";
import { setOn401Handler, isTokenExpired } from "./utils/api";

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
      toast.error("Η συνεδρία έληξε, συνδεθείτε ξανά.");
    });
  }, []);

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
            onLogout={handleLogout}
            calendarDark={calendarDark}
            onToggleCalendarDark={() => setCalendarDark((v) => !v)}
          />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 sm:px-4 sm:py-4 lg:p-6">
          <Suspense fallback={<div>Loading...</div>}>
            {isAuth ? (
              <Routes>
                <Route path="/" element={<Home />} />
                <Route
                  path="/calendar"
                  element={<CalendarPage darkCalendar={calendarDark} />}
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
