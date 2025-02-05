import React, { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./_components/Navbar";
import "./index.css";
import UpdatePasswordForm from "./pages/UpdatePasswordForm";

// Lazy load pages
// const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const Home = lazy(() => import("./pages/Home"));
const NotePage = lazy(() => import("./pages/NotePage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const Profile = lazy(() => import("./pages/Profile"));
const Customers = lazy(() => import("./pages/CustomersPage"));
const Login = lazy(() => import("./pages/Login"));
const CustomerCounts = lazy(() => import("./pages/CustomerCounts"));

const App = () => {
  const [isAuth, setAuth] = useState(false); // Authentication state

  // Check authentication on page load
  useEffect(() => {
    const token = localStorage.getItem("token");
    setAuth(!!token); // Set auth state based on token existence
  }, []);

  // Handle logout function
  const handleLogout = () => {
    localStorage.removeItem("token"); // Clear the token
    setAuth(false); // Set authentication to false
  };

  return (
    <Router>
      <div className="h-screen flex flex-col bg-gray-900 transition-colors duration-300">
        {/* Navbar Section */}
        <header className="h-16 bg-purple-950">
          <Navbar isAuth={isAuth} onLogout={handleLogout} />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden p-6">
          <Suspense fallback={<div>Loading...</div>}>
            {isAuth ? (
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/CustomerCounts" element={<CustomerCounts />} />
                <Route
                  path="/update-password"
                  element={<UpdatePasswordForm />}
                />
                <Route path="/profile" element={<Profile />} />
                <Route path="/NotePage" element={<NotePage />} />
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
