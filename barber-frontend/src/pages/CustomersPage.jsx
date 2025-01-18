import React, { useEffect, useState } from "react";
import { fetchCustomers } from "../utils/api";
import Select from "react-select";
import { FaTrash, FaEdit } from "react-icons/fa";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

// Base API URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [editMode, setEditMode] = useState(null); // Track the customer being edited
  const [editData, setEditData] = useState({
    name: "",
    phoneNumber: "",
    barber: "",
  });
  const [isLoading, setIsLoading] = useState(true); // Loading state

  // Fetch customers from backend
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const customerData = await fetchCustomers();
        console.log("Fetched customers:", customerData); // Verify barber field

        setCustomers(customerData.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Error fetching customers:", error);
      } finally {
        setIsLoading(false); // Set loading to false after fetching
      }
    };
    loadCustomers();
  }, []);

  // Delete customer
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

  // Edit customer
  const handleEditClick = (customer) => {
    setEditMode(customer._id); // Enable edit mode for this customer
    setEditData({
      name: customer.name,
      phoneNumber: customer.phoneNumber,
      barber: customer.barber || "", // Set barber if it exists
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBarberChange = (selectedOption) => {
    setEditData((prev) => ({ ...prev, barber: selectedOption.value }));
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

  const customerOptions = customers.map((customer) => ({
    value: customer._id,
    label: `${customer.name} - ${customer.phoneNumber}`,
    copyText: `${customer.name} - ${customer.phoneNumber}`, // Copyable text
  }));

  const barberOptions = [
    { value: "ΛΕΜΟ", label: "ΛΕΜΟ", color: "#7C3AED" },
    { value: "ΦΟΡΟΥ", label: "ΦΟΡΟΥ", color: "orange" },
  ];

  return (
    <div className="p-6 relative">
      <h1 className="text-2xl font-bold mb-4 text-white">ΠΕΛΑΤΕΣ</h1>

      {isLoading ? (
        <Skeleton count={5} height={30} className="mb-4" />
      ) : customers.length === 0 ? (
        <p className="text-white">ΔΕΝ ΒΡΕΘΗΚΑΝ ΠΕΛΑΤΕΣ.</p>
      ) : (
        <div>
          {/* Scrollable Dropdown */}
          <div className="mb-4 w-full max-w-md">
            {isLoading ? (
              <Skeleton height={30} />
            ) : (
              <Select
                options={customerOptions}
                placeholder="Αναζήτηση Πελάτη"
                isClearable
                isSearchable
                styles={{
                  menu: (provided) => ({
                    ...provided,
                    maxHeight: "400px",
                    overflowY: "auto", // Fix overflow behavior
                  }),
                }}
              />
            )}
          </div>

          {/* List of all customers */}
          <ul
            className="space-y-2 overflow-y-auto"
            style={{ maxHeight: "400px" }}
          >
            {isLoading
              ? Array(5)
                  .fill()
                  .map((_, index) => (
                    <Skeleton
                      key={index}
                      height={30}
                      className="rounded mb-2"
                    />
                  ))
              : customers.map((customer) => (
                  <li
                    key={customer._id}
                    className={`flex justify-between items-center text-black border-b pb-2 ${
                      customer.barber === "ΛΕΜΟ"
                        ? "text-purple-600"
                        : customer.barber === "ΦΟΡΟΥ"
                        ? "text-orange-500"
                        : "text-white"
                    }`}
                  >
                    {editMode === customer._id ? (
                      <div className="flex-grow">
                        {/* Edit Mode */}
                        <input
                          type="text"
                          name="name"
                          value={editData.name}
                          onChange={handleEditChange}
                          className="p-1 rounded border bg-white text-black"
                        />
                        <input
                          type="text"
                          name="phoneNumber"
                          value={editData.phoneNumber}
                          onChange={handleEditChange}
                          className="p-1 rounded border ml-2 bg-white text-black"
                        />
                        <Select
                          options={barberOptions}
                          placeholder="Επιλέξτε Barber"
                          value={barberOptions.find(
                            (option) => option.value === editData.barber
                          )}
                          onChange={handleBarberChange}
                          className="ml-2"
                          styles={{
                            control: (provided) => ({
                              ...provided,
                              borderColor:
                                editData.barber === "ΛΕΜΟ"
                                  ? "#7C3AED"
                                  : editData.barber === "ΦΟΡΟΥ"
                                  ? "orange"
                                  : "#ccc",
                            }),
                            singleValue: (provided, state) => ({
                              ...provided,
                              color:
                                state.data.value === "ΛΕΜΟ"
                                  ? "#7C3AED"
                                  : state.data.value === "ΦΟΡΟΥ"
                                  ? "orange"
                                  : "#000",
                            }),
                            option: (provided, state) => ({
                              ...provided,
                              color:
                                state.data.value === "ΛΕΜΟ"
                                  ? "#7C3AED"
                                  : state.data.value === "ΦΟΡΟΥ"
                                  ? "orange"
                                  : "#000",
                              backgroundColor: state.isFocused
                                ? state.data.value === "ΛΕΜΟ"
                                  ? "#E9D5FF"
                                  : state.data.value === "ΦΟΡΟΥ"
                                  ? "#FFDAB9"
                                  : "#f3f3f3"
                                : "#fff",
                            }),
                          }}
                        />
                        <button
                          onClick={() => handleEditSubmit(customer._id)}
                          className="ml-2 px-2 py-1 bg-green-500 text-white rounded"
                        >
                          ΑΠΟΘΗΚΕΥΣΗ
                        </button>
                      </div>
                    ) : (
                      <div className="flex-grow">
                        {/* Display Mode */}
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
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
