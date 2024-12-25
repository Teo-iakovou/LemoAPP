import React, { useEffect, useState, useRef } from "react";
import { fetchCustomers } from "../utils/api";
import { FaTrash, FaEdit } from "react-icons/fa";

// Base API URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const CustomersPage = ({ isDarkMode }) => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [editMode, setEditMode] = useState(null); // Track the customer being edited
  const [editData, setEditData] = useState({ name: "", phoneNumber: "" });
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

  const deleteCustomer = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this customer? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete customer");
      }
      setCustomers((prev) => prev.filter((customer) => customer._id !== id));
      alert("Customer deleted successfully.");
    } catch (error) {
      console.error("Error deleting customer:", error);
      alert("Failed to delete customer.");
    }
  };

  const handleEditClick = (customer) => {
    setEditMode(customer._id); // Enable edit mode for this customer
    setEditData({ name: customer.name, phoneNumber: customer.phoneNumber });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editData),
      });
      if (!response.ok) {
        throw new Error("Failed to update customer");
      }
      const updatedCustomer = await response.json();
      setCustomers((prev) =>
        prev.map((customer) =>
          customer._id === id ? updatedCustomer : customer
        )
      );
      setEditMode(null); // Exit edit mode
      alert("Customer updated successfully.");
    } catch (error) {
      console.error("Error updating customer:", error);
      alert("Failed to update customer.");
    }
  };

  return (
    <div className="p-6 relative ">
      <h1
        className={`text-2xl font-bold mb-4 ${
          isDarkMode ? "text-white" : "text-white"
        }`}
      >
        ΠΕΛΑΤΕΣ
      </h1>
      {customers.length === 0 ? (
        <p className={isDarkMode ? "text-white" : "text-white"}>
          ΔΕΝ ΒΡΕΘΗΚΑΝ ΠΕΛΑΤΕΣ.
        </p>
      ) : (
        <ul className="space-y-2">
          {customers.map((customer) => (
            <li
              key={customer._id}
              className={`flex justify-between items-center border-b pb-2 ${
                isDarkMode
                  ? "border-gray-600 text-white"
                  : "border-gray-300 text-white"
              }`}
            >
              {editMode === customer._id ? (
                <div className="flex-grow">
                  <input
                    type="text"
                    name="name"
                    value={editData.name}
                    onChange={handleEditChange}
                    className={`p-1 rounded border ${
                      isDarkMode
                        ? "bg-gray-800 text-white border-gray-600"
                        : "bg-white text-black"
                    }`}
                  />
                  <input
                    type="text"
                    name="phoneNumber"
                    value={editData.phoneNumber}
                    onChange={handleEditChange}
                    className={`p-1 rounded border ml-2 ${
                      isDarkMode
                        ? "bg-gray-800 text-white border-gray-600"
                        : "bg-white text-black"
                    }`}
                  />
                  <button
                    onClick={() => handleEditSubmit(customer._id)}
                    className="ml-2 px-2 py-1 bg-green-500 text-white rounded"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex-grow">
                  <span className="font-medium">{customer.name}</span>
                  <span className="ml-4">{customer.phoneNumber}</span>
                </div>
              )}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditClick(customer)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <FaEdit size={20} />
                </button>
                <button
                  onClick={() => deleteCustomer(customer._id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash size={20} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CustomersPage;
