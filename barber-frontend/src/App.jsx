import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import "./index.css";
import CalendarPage from "./pages/CalendarPage";
import Navbar from "./_components/Navbar";
import Profile from "./pages/Profile";
import Customers from "./pages/CustomersPage";
import Login from "./pages/Login";

const App = () => {
  const [isDarkMode, setIsDarkMode] = useState(false); // Dark mode state
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
      <div
        className={`h-screen flex flex-col ${
          isDarkMode ? "bg-gray-900 text-black" : "bg-gray-100 text-gray-900"
        } transition-colors duration-300`}
      >
        {/* Navbar Section */}
        <header className="h-16">
          <Navbar
            isDarkMode={isDarkMode}
            onThemeToggle={setIsDarkMode}
            isAuth={isAuth} // Pass authentication state
            onLogout={handleLogout} // Pass logout function
          />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden p-6">
          {isAuth ? (
            <Routes>
              <Route path="/" element={<Home isDarkMode={isDarkMode} />} />
              <Route
                path="/calendar"
                element={<CalendarPage isDarkMode={isDarkMode} />}
              />
              <Route
                path="/customers"
                element={<Customers isDarkMode={isDarkMode} />}
              />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          ) : (
            <Routes>
              <Route path="*" element={<Login setAuth={setAuth} />} />
            </Routes>
          )}
        </main>
      </div>
    </Router>
  );
};

export default App;
