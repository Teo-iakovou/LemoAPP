import React, { useState } from "react";
import "./index.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Navbar from "./_components/Navbar";
import Customers from "./pages/CustomersPage";

const App = () => {
  const [isDarkMode, setIsDarkMode] = useState(false); // Global dark mode state

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
          <Routes>
            <Route path="/" element={<Home isDarkMode={isDarkMode} />} />
            <Route path="/customers" element={<Customers />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
