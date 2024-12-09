import React, { useState } from "react";
import "./index.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home";
import Navbar from "./_components/Navbar";
import Customers from "./pages/CustomersPage";
import Login from "./pages/Login"; // Import Login page

const App = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAuth, setAuth] = useState(!!localStorage.getItem("token")); // Check if token exists

  return (
    <Router>
      <div
        className={`h-screen flex flex-col ${
          isDarkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"
        } transition-colors duration-300`}
      >
        {/* Navbar Section: Only show if authenticated */}
        {isAuth && (
          <header className="h-16">
            <Navbar isDarkMode={isDarkMode} onThemeToggle={setIsDarkMode} />
          </header>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-hidden p-6">
          <Routes>
            {!isAuth ? (
              // Redirect to login if not authenticated
              <Route path="*" element={<Login setAuth={setAuth} />} />
            ) : (
              <>
                <Route path="/" element={<Home isDarkMode={isDarkMode} />} />
                <Route
                  path="/customers"
                  element={<Customers isDarkMode={isDarkMode} />}
                />
              </>
            )}
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
