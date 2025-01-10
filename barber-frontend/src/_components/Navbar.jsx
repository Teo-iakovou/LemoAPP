import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaChartBar, FaHome, FaCalendarAlt, FaUsers } from "react-icons/fa"; // Import icons
import LemoLogo from "../assets/LemoLogo.png";
import LemoBlackLogo from "../assets/LemoLogo.JPG";

const Navbar = ({ isAuth, onLogout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
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
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-10 bg-purple-950 flex justify-between items-center px-6 py-[-2] shadow-md">
      {" "}
      {/* Left Section: Logo */}
      <div className="flex items-center">
        <Link to={isAuth ? "/calendar" : "/"}>
          <img
            src={LemoLogo}
            alt="Lemo Barber Shop Logo"
            className="w-16 h-16 mx-5 object-cover"
          />
        </Link>
        {isAuth && (
          <ul className="flex items-center space-x-6 hover:text-blue-500 transition">
            {/* Home Icon */}
            <li>
              <Link to="/" className="hover:text-blue-500 transition">
                <FaHome className="text-xl text-white hover:text-blue-500 transition" />
              </Link>
            </li>
            {/* Calendar Icon */}
            <li>
              <Link to="/calendar">
                <FaCalendarAlt className="text-xl text-white hover:text-blue-500 transition " />
              </Link>
            </li>
            {/* Customers Icon */}
            <li>
              <Link to="/customers" className="hover:text-blue-500 transition">
                <FaUsers className="text-xl text-white hover:text-blue-500 transition" />
              </Link>
            </li>
            <li>
              <Link
                to="/CustomerCounts"
                className="text-white hover:text-blue-500 transition"
              >
                <FaChartBar className="text-xl text-white hover:text-blue-500 transition" />
              </Link>
            </li>
          </ul>
        )}
      </div>
      {/* Right Section: Profile Avatar */}
      <div className="flex items-center space-x-6">
        {isAuth ? (
          <div className="relative" ref={dropdownRef}>
            <img
              src={LemoBlackLogo}
              alt="LemoLogo"
              className="w-10 h-10 rounded-full mx-auto cursor-pointer object-cover"
              onClick={toggleDropdown}
            />
            {isDropdownOpen && (
              <div className="absolute right-0 mt-1 bg-white shadow-lg rounded-3xl py-4 px-4 w-48 z-50 border border-gray-200">
                {/* Profile Link */}
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-3xl"
                  onClick={() => setIsDropdownOpen(false)} // Close dropdown on click
                >
                  ΠΡΟΦΙΛ
                </Link>
                {/* Update Password Link */}
                <Link
                  to="/update-password"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-3xl"
                  onClick={() => setIsDropdownOpen(false)} // Close dropdown on click
                >
                  ΑΛΛΑΓΗ ΚΩΔΙΚΟΥ
                </Link>
                {/* Logout Button */}
                <button
                  onClick={handleLogout}
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
