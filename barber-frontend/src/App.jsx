import React from "react";
import "./index.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Navbar from "./_components/Navbar";
import Customers from "./pages/CustomersPage";

const App = () => {
  return (
    <Router>
      <div className="h-screen flex flex-col">
        {/* Navbar Section */}
        <header className="h-16">
          <Navbar />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden p-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/customers" element={<Customers />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
