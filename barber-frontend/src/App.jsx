import React, { useState, useEffect } from "react";
import "./index.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Navbar from "./_components/Navbar";
import Customers from "./pages/CustomersPage";
import Login from "./pages/Login";

const App = () => {
  const [isDarkMode, setIsDarkMode] = useState(false); // Dark mode state
  const [isAuth, setAuth] = useState(false); // Authentication state

  // Clear token and force login on page load
  useEffect(() => {
    localStorage.removeItem("token"); // Clear the token from localStorage
    setAuth(true); // Ensure the user is not authenticated
  }, []);

  return (
    <Router>
      <div
        className={`h-screen flex flex-col ${
          isDarkMode ? "bg-gray-900 text-black" : "bg-gray-100 text-gray-900"
        } transition-colors duration-300`}
      >
        {/* Navbar Section */}
        <header className="h-16">
          <Navbar isDarkMode={isDarkMode} onThemeToggle={setIsDarkMode} />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden p-6">
          {isAuth ? (
            // Render the platform if authenticated
            <Routes>
              <Route path="/" element={<Home isDarkMode={isDarkMode} />} />
              <Route
                path="/customers"
                element={<Customers isDarkMode={isDarkMode} />}
              />
            </Routes>
          ) : (
            // Show login form if not authenticated
            <Login setAuth={setAuth} />
          )}
        </main>
      </div>
    </Router>
  );
};

export default App;
