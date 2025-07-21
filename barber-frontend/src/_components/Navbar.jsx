import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaChartBar,
  FaHome,
  FaCalendarAlt,
  FaUsers,
  FaClipboard,
  FaBars,
  FaSms,
  FaTools,
} from "react-icons/fa";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import LemoLogo from "../assets/LemoLogo.png";

const Navbar = ({ isAuth, onLogout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const MySwal = withReactContent(Swal);

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
    MySwal.fire({
      title: "Are you sure?",
      text: "You will be logged out and redirected to the login page.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, log out!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("token");
        navigate("/");
        onLogout();
        setIsDropdownOpen(false);
        MySwal.fire({
          title: "Logged Out",
          text: "You have successfully logged out.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  };

  const handleRedirectToSmsTo = () => {
    window.open("https://app.sms.to/app#/", "_blank");
  };

  return (
    <nav className="fixed top-0 left-0 w-full bg-purple-950 flex items-center justify-between px-6 py-3 shadow-md z-50">
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

      {/* Navigation Icons - Render only if authenticated */}
      {isAuth && (
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
          <li>
            <button
              onClick={handleRedirectToSmsTo}
              className="hover:text-blue-500 transition-colors duration-300 text-white"
            >
              <FaSms />
            </button>
          </li>
          <li>
            <Link
              to="/sms-status"
              className="hover:text-blue-500 transition-colors duration-300"
              title="SMS Delivery Status"
            >
              <FaTools />
            </Link>
          </li>
        </ul>
      )}

      {/* Profile Dropdown - Render only if authenticated */}
      {isAuth && (
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
      )}
    </nav>
  );
};

export default Navbar;
