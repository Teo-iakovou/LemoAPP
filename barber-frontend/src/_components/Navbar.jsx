import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaHome, FaCalendarAlt, FaUsers } from "react-icons/fa"; // Import icons
import LemoLogo from "../assets/LemoLogo.png";
import LemoBlackLogo from "../assets/LemoLogo.JPG";

const Navbar = ({ onThemeToggle, isAuth, onLogout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

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
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (confirmLogout) {
      localStorage.removeItem("token"); // Clear token
      setIsDropdownOpen(false); // Close the dropdown
      navigate("/login"); // Redirect to login page
      onLogout(); // Notify parent
      console.log("User logged out successfully");
    }
  };

  return (
    <nav
      className={`px-6  flex justify-between items-center shadow-sm h-14 ${
        isDarkMode ? "bg-gray-800 text-white" : "bg-purple-950"
      }`}
    >
      {/* Left Section: Logo */}
      <div className="flex items-center space-x-8">
        <div className="py-2">
          <Link to={isAuth ? "/calendar" : "/"}>
            <img
              src={LemoLogo}
              alt="Lemo Barber Shop Logo"
              className="w-16 h-16 mx-5 object-cover"
            />
          </Link>
        </div>
        {isAuth && (
          <ul className="flex items-center space-x-6">
            {/* Home Icon */}
            <li className="hidden sm:block">
              <Link to="/" className="hover:text-blue-500 transition">
                <FaHome
                  className={`text-xl ${
                    isDarkMode ? "text-white" : "text-white"
                  }`}
                />
              </Link>
            </li>
            {/* Calendar Icon */}
            <li className="flex-1 text-center">
              <Link to="/calendar" className="hover:text-blue-500 transition">
                <FaCalendarAlt
                  className={`text-xl ${
                    isDarkMode ? "text-white" : "text-white"
                  }`}
                />
              </Link>
            </li>
            {/* Customers Icon */}
            <li className="flex-1 text-center">
              <Link to="/customers" className="hover:text-blue-500 transition">
                <FaUsers
                  className={`text-xl ${
                    isDarkMode ? "text-white" : "text-white"
                  }`}
                />
              </Link>
            </li>
          </ul>
        )}
      </div>

      {/* Right Section: Profile Avatar and Theme Toggle */}
      <div className="flex items-center space-x-6">
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
        {isAuth ? (
          <div className="relative" ref={dropdownRef}>
            <img
              src={LemoBlackLogo}
              alt="LemoLogo"
              className="w-10 h-10 rounded-full mx-auto cursor-pointer object-cover"
              onClick={toggleDropdown}
            />
            {isDropdownOpen && (
              <div className="absolute right-0 mt-1 bg-white shadow-lg rounded-3xl py-2 w-48 z-50 border border-gray-200">
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-3xl"
                  onClick={() => setIsDropdownOpen(false)} // Close the dropdown when clicked
                >
                  ΠΡΟΦΙΛ
                </Link>
                <button
                  onClick={handleLogout} // Trigger logout
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-3xl"
                >
                  ΕΞΟΔΟΣ
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-4"></div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
