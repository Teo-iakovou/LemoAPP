import { useEffect, useState, useRef } from "react";
import { fetchCustomers } from "../utils/api";
import Select from "react-select";
import CustomerDetailsDrawer from "../_components/CustomerDetailsDrawer";

import { FaTrash, FaEdit, FaEye } from "react-icons/fa";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

// Base API URL

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedCustomerOption, setSelectedCustomerOption] = useState(null);
  const [editMode, setEditMode] = useState(null); // Track the customer being edited
  const [editData, setEditData] = useState({
    name: "",
    phoneNumber: "",
    barber: "",
  });
  const [isLoading, setIsLoading] = useState(true); // Loading state
  const editRef = useRef(null); // Ref to track clicks outside the edit form

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

  // Click outside handler to exit edit mode
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (editRef.current && !editRef.current.contains(event.target)) {
        setEditMode(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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
              value={selectedCustomerOption}
              onChange={(option) => {
                setSelectedCustomerOption(option);
                setSelectedCustomerId(option ? option.value : null); // Open the drawer for this customer!
              }}
              styles={{
                control: (base) => ({
                  ...base,
                  backgroundColor: "#1e293b", // Dark background
                  borderColor: "#3b82f6", // Blue border
                  color: "white", // Ensure text color is white
                  borderRadius: "8px", // Rounded corners
                  padding: "5px",
                  fontSize: "14px",
                }),
                menu: (base) => ({
                  ...base,
                  backgroundColor: "#1e293b", // Dark dropdown menu background
                  color: "white", // White text for options
                  borderRadius: "8px",
                }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isFocused ? "#3b82f6" : "#1e293b", // Blue on hover
                  color: "white", // White text for options
                  padding: "10px",
                }),
                singleValue: (base) => ({
                  ...base,
                  color: "white", // White text for the selected value
                }),
                placeholder: (base) => ({
                  ...base,
                  color: "#9ca3af", // Light gray placeholder
                }),
                input: (base) => ({
                  ...base,
                  color: "white", // White text while typing in the search bar
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
                  <div className="flex-grow" ref={editRef}>
                    <input
                      type="text"
                      name="name"
                      value={editData.name}
                      onChange={handleEditChange}
                      className="p-2 rounded border bg-white text-black"
                    />
                    <input
                      type="text"
                      name="phoneNumber"
                      value={editData.phoneNumber}
                      onChange={handleEditChange}
                      className="p-2 rounded border ml-2 bg-white text-black"
                    />
                    <Select
                      options={barberOptions}
                      placeholder="Επιλέξτε Barber"
                      value={barberOptions.find(
                        (option) => option.value === editData.barber
                      )}
                      onChange={handleBarberChange}
                      styles={{
                        control: (base) => ({
                          ...base,
                          backgroundColor: "#1e293b", // Dark background
                          color: "white", // White text for better contrast
                          borderColor: "#3b82f6", // Blue border
                          borderRadius: "8px", // Rounded corners
                          padding: "5px",
                          fontSize: "14px",
                          width: "200px",
                        }),
                        menu: (base) => ({
                          ...base,
                          backgroundColor: "#1e293b", // Dark dropdown menu background
                          color: "white", // White text
                          borderRadius: "8px",
                          width: "200px",
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isFocused
                            ? "#3b82f6"
                            : "#1e293b", // Blue on hover
                          color: "white", // White text
                          padding: "10px",
                        }),
                        singleValue: (base) => ({
                          ...base,
                          color: "white", // White text for selected value
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: "#9ca3af", // Light gray for placeholder text
                        }),
                      }}
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
                    onClick={() => setSelectedCustomerId(customer._id)}
                    className="text-cyan-400 hover:text-cyan-600"
                    title="View Details"
                  >
                    <FaEye size={20} />
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
      {selectedCustomerId && (
        <CustomerDetailsDrawer
          customerId={selectedCustomerId}
          onClose={() => {
            setSelectedCustomerId(null);
            setSelectedCustomerOption(null); // Clear the Select when closing drawer
          }}
        />
      )}
    </div>
  );
};

export default CustomersPage;
