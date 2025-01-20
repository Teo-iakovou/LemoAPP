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

  // Mapping barbers to their corresponding text colors
  const barberColors = {
    ΛΕΜΟ: "text-purple-600", // Barber ΛΕΜΟ gets purple text
    ΦΟΡΟΥ: "text-orange-500", // Barber ΦΟΡΟΥ gets orange text
  };

  // Fetch customers from backend
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const customerData = await fetchCustomers();

        // Assign barberColor dynamically based on barber value
        const updatedCustomers = customerData.map((customer) => ({
          ...customer,
          barberColor: barberColors[customer.barber] || "text-white", // Default to white if barber is not set
        }));

        setCustomers(
          updatedCustomers.sort((a, b) => a.name.localeCompare(b.name))
        );
      } catch (error) {
        console.error("Error fetching customers:", error);
      } finally {
        setIsLoading(false);
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

  // Enable edit mode for a specific customer
  const handleEditClick = (customer) => {
    setEditMode(customer._id);
    setEditData({
      name: customer.name,
      phoneNumber: customer.phoneNumber,
      barber: customer.barber || "",
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBarberChange = (selectedOption) => {
    setEditData((prev) => ({ ...prev, barber: selectedOption.value }));
  };

  // Submit the edited customer data
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

      // Assign the correct barberColor dynamically based on the updated barber
      const updatedCustomerWithColor = {
        ...updatedCustomer,
        barberColor: barberColors[updatedCustomer.barber] || "text-white",
      };

      setCustomers((prev) =>
        prev.map((customer) =>
          customer._id === id ? updatedCustomerWithColor : customer
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
  }));

  const barberOptions = [
    { value: "ΛΕΜΟ", label: "ΛΕΜΟ" },
    { value: "ΦΟΡΟΥ", label: "ΦΟΡΟΥ" },
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
          <div className="mb-4 w-full max-w-md">
            <Select
              options={customerOptions}
              placeholder="Αναζήτηση Πελάτη"
              isClearable
              isSearchable
              styles={{
                menu: (provided) => ({
                  ...provided,
                  maxHeight: "400px",
                  overflowY: "auto",
                }),
              }}
            />
          </div>

          <ul
            className="space-y-2 overflow-y-auto"
            style={{ maxHeight: "400px" }}
          >
            {customers.map((customer) => (
              <li
                key={customer._id}
                className={`flex justify-between items-center border-b pb-2 ${customer.barberColor}`}
              >
                {editMode === customer._id ? (
                  <div className="flex-grow">
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
                      className="h-10 w-48"
                    />
                    <button
                      onClick={() => handleEditSubmit(customer._id)}
                      className="px-2 py-1 bg-green-500 text-white rounded"
                    >
                      ΑΠΟΘΗΚΕΥΣΗ
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
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
