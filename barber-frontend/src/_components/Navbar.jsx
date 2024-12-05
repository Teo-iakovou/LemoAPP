import React, { useState } from "react";
import { Link } from "react-router-dom";
import LemoLogo from "../assets/LemoLogo.JPG";

const Navbar = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    // Apply the theme to the document body
    document.body.className = isDarkMode ? "light-theme" : "dark-theme";
  };

  return (
    <nav className="bg-gray-100 shadow-lg px-6 py-3 flex justify-between items-center">
      {/* Left Section: Logo and Links */}
      <div className="flex items-center space-x-8">
        <div className="py-4">
          <img
            src={LemoLogo}
            alt="Lemo Barber Shop Logo"
            className="w-20 h-20 rounded-full mx-auto object-cover" // Adjusted size and object-cover for better fit
          />
        </div>{" "}
        <ul className="flex items-center space-x-6">
          <li>
            <Link
              to="/"
              className="text-gray-700 hover:text-blue-500 transition"
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              to="/customers"
              className="text-gray-700 hover:text-blue-500 transition"
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
          className="p-2 bg-gray-200 rounded-full hover:bg-gray-300"
          aria-label="Toggle Theme"
        >
          {isDarkMode ? (
            <span role="img" aria-label="light mode">
              🌞
            </span>
          ) : (
            <span role="img" aria-label="dark mode">
              🌙
            </span>
          )}
        </button>

        {/* Profile Avatar */}
        <div className="relative">
          <img
            src="https://via.placeholder.com/40"
            alt="Profile Avatar"
            className="w-10 h-10 rounded-full cursor-pointer"
            onClick={toggleDropdown}
          />
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md py-2 w-48">
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
