import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaChartBar,
  FaHome,
  FaCalendarAlt,
  FaUsers,
  FaClipboard,
  FaBars,
} from "react-icons/fa"; // Import icons
import LemoLogo from "../assets/LemoLogo.png";

const Navbar = ({ isAuth, onLogout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // Dropdown inside logo
  const dropdownRef = useRef(null); // Ref for dropdown
  const navigate = useNavigate();

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleClickOutside = (event) => {
    // Close dropdown if clicking outside
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target) &&
      !event.target.closest(".logo-button")
    ) {
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
      navigate("/login"); // Redirect to login page
      onLogout(); // Notify parent
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-10 bg-purple-950 flex justify-between items-center px-6 py-3 shadow-md">
      {/* Logo */}
      <div>
        <Link to="/">
          <img
            src={LemoLogo}
            alt="Lemo Barber Shop Logo"
            className="w-12 h-12 object-cover"
          />
        </Link>
      </div>

      {/* Navigation Icons */}
      <ul className="flex space-x-6 text-white text-xl">
        <li>
          <Link
            to="/"
            className="hover:text-blue-500 transition-colors duration-300"
          >
            <FaHome />
          </Link>
        </li>
        <li>
          <Link
            to="/calendar"
            className="hover:text-blue-500 transition-colors duration-300"
          >
            <FaCalendarAlt />
          </Link>
        </li>
        <li>
          <Link
            to="/customers"
            className="hover:text-blue-500 transition-colors duration-300"
          >
            <FaUsers />
          </Link>
        </li>
        <li>
          <Link
            to="/CustomerCounts"
            className="hover:text-blue-500 transition-colors duration-300"
          >
            <FaChartBar />
          </Link>
        </li>
        <li>
          <Link
            to="/NotePage"
            className="hover:text-blue-500 transition-colors duration-300"
          >
            <FaClipboard />
          </Link>
        </li>
      </ul>

      {/* Profile Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          className="menu-button text-white text-2xl hover:text-blue-500 transition-colors duration-300"
          onClick={toggleDropdown}
        >
          <FaBars />
        </button>
        {isDropdownOpen && (
          <div className="absolute top-12 right-0 bg-white shadow-lg rounded-3xl py-3 px-4 w-40 z-50 border border-gray-200">
            <Link
              to="/profile"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
              onClick={() => setIsDropdownOpen(false)}
            >
              ΠΡΟΦΙΛ
            </Link>
            <Link
              to="/update-password"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
              onClick={() => setIsDropdownOpen(false)}
            >
              ΑΛΛΑΓΗ ΚΩΔΙΚΟΥ
            </Link>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
            >
              ΕΞΟΔΟΣ
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
