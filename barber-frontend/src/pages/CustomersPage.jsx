import React, { useEffect, useState, useRef } from "react";
import { fetchCustomers } from "../utils/api";

const CustomersPage = ({ isDarkMode }) => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const searchBarRef = useRef(null);

  useEffect(() => {
    const loadCustomers = async () => {
      const customerData = await fetchCustomers();
      setCustomers(customerData.sort((a, b) => a.name.localeCompare(b.name)));
    };
    loadCustomers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setFilteredCustomers(
        customers.filter((customer) =>
          customer.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredCustomers([]);
    }
  }, [searchTerm, customers]);

  const handleSelectCustomer = (customer) => {
    const targetElement = document.getElementById(
      `customer-${customer.phoneNumber}`
    );
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setSearchTerm("");
    setFilteredCustomers([]);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchBarRef.current &&
        !searchBarRef.current.contains(event.target)
      ) {
        setFilteredCustomers([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const deleteAllCustomers = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete all customers? This action cannot be undone."
    );
    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch("http://localhost:5001/api/customers", {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete customers");
      }
      setCustomers([]);
      setFilteredCustomers([]);
      alert("All customers have been deleted successfully.");
    } catch (error) {
      console.error("Error deleting customers:", error);
      alert("Failed to delete customers.");
    }
  };

  const deleteCustomer = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this customer? This action cannot be undone."
    );
    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5001/api/customers/${id}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to delete customer");
      }
      setCustomers((prevCustomers) =>
        prevCustomers.filter((customer) => customer._id !== id)
      );
      alert("Customer deleted successfully.");
    } catch (error) {
      console.error("Error deleting customer:", error);
      alert("Failed to delete customer.");
    }
  };

  return (
    <div className="p-6 relative">
      <h1
        className={`text-2xl font-bold mb-4 ${
          isDarkMode ? "text-white" : "text-black"
        }`}
      >
        Customers
      </h1>
      <div className="relative">
        <input
          ref={searchBarRef}
          type="text"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`mb-4 p-2 border rounded w-full ${
            isDarkMode
              ? "bg-gray-800 text-white border-gray-600"
              : "bg-white text-black"
          }`}
        />
        {filteredCustomers.length > 0 && (
          <ul
            className={`absolute border rounded max-h-40 overflow-y-auto shadow-md w-full z-10 ${
              isDarkMode
                ? "bg-gray-800 text-white border-gray-600"
                : "bg-white text-black"
            }`}
          >
            {filteredCustomers.map((customer) => (
              <li
                key={customer.phoneNumber}
                onClick={() => handleSelectCustomer(customer)}
                className="p-2 hover:bg-gray-700 cursor-pointer"
              >
                {customer.name} - {customer.phoneNumber}
              </li>
            ))}
          </ul>
        )}
      </div>
      {customers.length === 0 ? (
        <p className={isDarkMode ? "text-white" : "text-black"}>
          No customers found.
        </p>
      ) : (
        <ul className="space-y-2">
          {customers.map((customer) => (
            <li
              id={`customer-${customer.phoneNumber}`}
              key={customer._id}
              className={`flex justify-between items-center border-b pb-2 ${
                isDarkMode
                  ? "border-gray-600 text-white"
                  : "border-gray-300 text-black"
              }`}
            >
              <div>
                <span className="font-medium">{customer.name}</span>
                <span className="ml-4">{customer.phoneNumber}</span>
              </div>
              <button
                onClick={() => deleteCustomer(customer._id)}
                className={`px-4 py-2 rounded hover:bg-red-600 ${
                  isDarkMode ? "bg-red-500 text-white" : "bg-red-500 text-white"
                }`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end mt-6">
        <button
          onClick={deleteAllCustomers}
          className={`px-4 py-2 rounded hover:bg-red-600 ${
            isDarkMode ? "bg-red-500 text-white" : "bg-red-500 text-white"
          }`}
        >
          Delete All Customers
        </button>
      </div>
    </div>
  );
};

export default CustomersPage;
