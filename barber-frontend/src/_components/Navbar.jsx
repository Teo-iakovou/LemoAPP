import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaChartBar,
  FaHome,
  FaCalendarAlt,
  FaUsers,
  FaClipboard,
  FaBars,
  FaTimes,
} from "react-icons/fa"; // Import icons
import LemoLogo from "../assets/LemoLogo.png";

const Navbar = ({ isAuth, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // For sidebar toggle
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // Dropdown inside logo
  const sidebarRef = useRef(null); // Ref for sidebar
  const dropdownRef = useRef(null); // Ref for dropdown
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleClickOutside = (event) => {
    // Close sidebar if clicking outside
    if (
      sidebarRef.current &&
      !sidebarRef.current.contains(event.target) &&
      !event.target.closest(".hamburger-button")
    ) {
      setIsSidebarOpen(false);
    }

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
      setIsSidebarOpen(false); // Close sidebar
      navigate("/login"); // Redirect to login page
      onLogout(); // Notify parent
    }
  };

  return (
    <>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full z-10 bg-purple-950 flex justify-between items-center px-4 py-2 shadow-md">
        {/* Hamburger Menu */}
        <button
          className="hamburger-button text-white text-2xl"
          onClick={toggleSidebar}
        >
          {isSidebarOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* Logo with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            className="logo-button flex items-center"
            onClick={toggleDropdown}
          >
            <img
              src={LemoLogo}
              alt="Lemo Barber Shop Logo"
              className="w-12 h-12 object-cover"
            />
          </button>
          {isDropdownOpen && (
            <div className="absolute top-14 right-0 bg-white shadow-lg rounded-3xl py-4 px-4 w-48 z-50 border border-gray-200">
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
      </nav>

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full bg-purple-900 w-40 rounded-xl transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 z-50`}
      >
        <ul className="flex flex-col p-4 space-y-6 text-white ">
          <li>
            <Link
              to="/"
              onClick={() => setIsSidebarOpen(false)}
              className=" hover:text-blue-700"
            >
              <FaHome className="inline-block mr-2  hover:text-blue-700" />{" "}
              Αρχική
            </Link>
          </li>
          <li>
            <Link
              to="/calendar"
              onClick={() => setIsSidebarOpen(false)}
              className=" hover:text-blue-700"
            >
              <FaCalendarAlt className="inline-block mr-2 hover:text-blue-700" />{" "}
              Ημερολόγιο
            </Link>
          </li>
          <li>
            <Link
              to="/customers"
              onClick={() => setIsSidebarOpen(false)}
              className=" hover:text-blue-700"
            >
              <FaUsers className="inline-block mr-2 hover:text-blue-700" />{" "}
              Πελάτες
            </Link>
          </li>
          <li>
            <Link
              to="/CustomerCounts"
              onClick={() => setIsSidebarOpen(false)}
              className=" hover:text-blue-700"
            >
              <FaChartBar className="inline-block mr-2 hover:text-blue-700" />{" "}
              Στατιστικά
            </Link>
          </li>
          <li>
            <Link
              to="/NotePage"
              onClick={() => setIsSidebarOpen(false)}
              className=" hover:text-blue-700"
            >
              <FaClipboard className="inline-block mr-2 hover:text-blue-700" />{" "}
              Σημειώσεις
            </Link>
          </li>
        </ul>
      </div>
    </>
  );
};

export default Navbar;
