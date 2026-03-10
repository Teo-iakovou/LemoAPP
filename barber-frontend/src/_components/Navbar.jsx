import { useState, useRef, useEffect } from "react";
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
  FaMoon,
  FaSun,
  FaRedoAlt,
  FaLock,
} from "react-icons/fa";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import LemoLogo from "../assets/LemoLogo.png";

const Navbar = ({ isAuth, onLogout, calendarDark, onToggleCalendarDark }) => {
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
    <nav className="fixed top-0 left-0 w-full bg-purple-950 flex items-center justify-between px-3 md:px-6 py-3 shadow-md z-50 overflow-x-clip">
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
        <ul className="hidden md:flex items-center space-x-6 text-white text-xl">
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
          <li>
            <Link
              to="/auto-customers"
              className="hover:text-blue-500 transition-colors duration-300"
              title="Recurring Customers"
            >
              <FaRedoAlt />
            </Link>
          </li>
          <li>
            <Link
              to="/bulk-locks"
              className="hover:text-blue-500 transition-colors duration-300"
              title="Μαζικά κλειδώματα"
            >
              <FaLock />
            </Link>
          </li>
          {/* Calendar theme toggle */}
          <li>
            <button
              onClick={onToggleCalendarDark}
              className="flex items-center gap-2 text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg border border-white/20 transition"
              title={calendarDark ? "Switch calendar to light" : "Switch calendar to dark"}
            >
              {calendarDark ? <FaSun className="text-yellow-300" /> : <FaMoon className="text-blue-300" />}
              <span className="hidden sm:inline">
                {calendarDark ? "Light Calendar" : "Dark Calendar"}
              </span>
            </button>
          </li>
        </ul>
      )}

      {isAuth && (
        <ul className="flex md:hidden items-center gap-3 text-white text-lg">
          <li>
            <Link
              to="/"
              className="hover:text-blue-500 transition-colors duration-300"
              aria-label="Αρχική"
            >
              <FaHome />
            </Link>
          </li>
          <li>
            <Link
              to="/calendar"
              className="hover:text-blue-500 transition-colors duration-300"
              aria-label="Ημερολόγιο"
            >
              <FaCalendarAlt />
            </Link>
          </li>
          <li>
            <Link
              to="/customers"
              className="hover:text-blue-500 transition-colors duration-300"
              aria-label="Πελάτες"
            >
              <FaUsers />
            </Link>
          </li>
          <li>
            <button
              onClick={onToggleCalendarDark}
              className="text-white/90 hover:text-white transition-colors duration-300"
              title={calendarDark ? "Switch calendar to light" : "Switch calendar to dark"}
              aria-label={calendarDark ? "Light Calendar" : "Dark Calendar"}
            >
              {calendarDark ? <FaSun className="text-yellow-300" /> : <FaMoon className="text-blue-300" />}
            </button>
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
                to="/"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded md:hidden"
                onClick={() => setIsDropdownOpen(false)}
              >
                ΑΡΧΙΚΗ
              </Link>
              <Link
                to="/calendar"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded md:hidden"
                onClick={() => setIsDropdownOpen(false)}
              >
                ΗΜΕΡΟΛΟΓΙΟ
              </Link>
              <Link
                to="/customers"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded md:hidden"
                onClick={() => setIsDropdownOpen(false)}
              >
                ΠΕΛΑΤΕΣ
              </Link>
              <Link
                to="/CustomerCounts"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                onClick={() => setIsDropdownOpen(false)}
              >
                CUSTOMER COUNTS
              </Link>
              <Link
                to="/NotePage"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                onClick={() => setIsDropdownOpen(false)}
              >
                ΣΗΜΕΙΩΣΕΙΣ
              </Link>
              <Link
                to="/sms-status"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                onClick={() => setIsDropdownOpen(false)}
              >
                SMS STATUS
              </Link>
              <Link
                to="/auto-customers"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                onClick={() => setIsDropdownOpen(false)}
              >
                AUTO CUSTOMERS
              </Link>
              <Link
                to="/bulk-locks"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                onClick={() => setIsDropdownOpen(false)}
              >
                BULK LOCKS
              </Link>
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
