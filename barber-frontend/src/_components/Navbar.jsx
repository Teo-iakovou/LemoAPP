import React from "react";
import { NavLink } from "react-router-dom";
import { FaHome, FaUser, FaSignInAlt } from "react-icons/fa"; // Import icons

const Navbar = () => {
  return (
    <div className="fixed top-0 left-0 h-screen w-1/5 bg-gray-800 text-white flex flex-col">
      <nav className="flex-grow">
        <p className="flex flex-col space-y-4 p-4">
          <p>
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center space-x-2 p-2 rounded ${
                  isActive ? "bg-gray-700" : ""
                }`
              }
            >
              <FaHome size={20} />
            </NavLink>
          </p>
          <p>
            <NavLink
              to="/customers"
              className={({ isActive }) =>
                `flex items-center space-x-2 p-2 rounded ${
                  isActive ? "bg-gray-700" : ""
                }`
              }
            >
              <FaUser size={20} />
            </NavLink>
          </p>
          <p>
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `flex items-center space-x-2 p-2 rounded ${
                  isActive ? "bg-gray-700" : ""
                }`
              }
            >
              <FaSignInAlt size={20} />
            </NavLink>
          </p>
        </p>
      </nav>
    </div>
  );
};

export default Navbar;
