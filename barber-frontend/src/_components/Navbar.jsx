import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import LemoLogo from "../assets/LemoLogo.JPG";

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
        isDarkMode ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700"
      }`}
    >
      {/* Left Section: Logo and Links */}
      <div className="flex items-center space-x-8">
        <div className="py-4">
          <img
            src={LemoLogo}
            alt="Lemo Barber Shop Logo"
            className="w-14 h-14 rounded-full mx-auto object-cover"
          />
        </div>
        <ul className="flex items-center space-x-6">
          <li>
            <Link
              to="/"
              className={`hover:text-blue-500 transition ${
                isDarkMode ? "text-white" : "text-gray-700"
              }`}
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              to="/customers"
              className={`hover:text-blue-500 transition ${
                isDarkMode ? "text-white" : "text-gray-700"
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
          className={`p-2 rounded-full ${
            isDarkMode
              ? "bg-gray-700 hover:bg-gray-600"
              : "bg-gray-200 hover:bg-gray-300"
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
            src="https://via.placeholder.com/40"
            alt="Profile Avatar"
            className="w-10 h-10 rounded-full cursor-pointer"
            onClick={toggleDropdown}
          />
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md py-2 w-48 z-50 border border-gray-200">
              <Link
                to="/profile"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
              >
                Profile
              </Link>
              <Link
                to="/settings"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
              >
                Settings
              </Link>
              <button
                onClick={() => alert("Logging out...")}
                className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
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
