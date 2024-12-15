import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import LemoLogo from "../assets/LemoLogo.png";
import LemoBlackLogo from "../assets/LemoLogo.JPG";

const Navbar = ({ onThemeToggle }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    onThemeToggle(!isDarkMode); // Notify the parent to toggle the background
  };

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsDropdownOpen(false);
    }
  };

  useEffect(() => {
    // Add event listener to detect clicks outside
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Cleanup event listener
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <nav
      className={`px-6 flex justify-between items-center shadow-sm ${
        isDarkMode ? "bg-gray-800 text-white" : "bg-purple-950"
      }`}
    >
      {/* Left Section: Logo and Links */}
      <div className="flex items-center space-x-8">
        <div className="py-4">
          <Link to={"/calendar"}>
            <img
              src={LemoLogo}
              alt="Lemo Barber Shop Logo"
              className="w-16 h-16 mx-auto object-cover"
            />
          </Link>
        </div>
        <ul className="flex items-center space-x-6">
          <li>
            <Link
              to="/"
              className={`hover:text-blue-500 transition ${
                isDarkMode ? "text-white" : "text-white"
              }`}
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              to="/calendar"
              className={`hover:text-blue-500 transition ${
                isDarkMode ? "text-white" : "text-white"
              }`}
            >
              Calendar
            </Link>
          </li>
          <li>
            <Link
              to="/customers"
              className={`hover:text-blue-500 transition ${
                isDarkMode ? "text-white" : "text-white"
              }`}
            >
              Customers
            </Link>
          </li>
        </ul>
      </div>

      {/* Right Section: Profile Avatar and Theme Toggle */}
      <div className="flex items-center space-x-6">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`p-1 rounded-full ${
            isDarkMode
              ? "bg-gray-700 hover:bg-gray-600"
              : "bg-purple-900 hover:bg-purple-950"
          }`}
          aria-label="Toggle Theme"
        >
          {isDarkMode ? (
            <span role="img" aria-label="light mode">
              🌙
            </span>
          ) : (
            <span role="img" aria-label="dark mode">
              🌞
            </span>
          )}
        </button>

        {/* Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <img
            src={LemoBlackLogo}
            alt="LemoLogo"
            className="w-10 h-10 rounded-full mx-auto cursor-pointer object-cover"
            onClick={toggleDropdown}
          />
          {isDropdownOpen && (
            <div className="absolute right-0 mt-1 bg-white shadow-lg rounded-3xl py-2 w-48 z-50 border border-gray-200">
              <button
                onClick={() => alert("Logging out...")}
                className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-3xl"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
