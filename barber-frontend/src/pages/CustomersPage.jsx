import { useEffect, useState, useRef } from "react";
import { fetchCustomers, addCustomer } from "../utils/api";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import el from "date-fns/locale/el";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

registerLocale("el", el);

import CustomerDetailsDrawer from "../_components/CustomerDetailsDrawer";
import { FaTrash, FaEdit, FaEye, FaPlus, FaTimes } from "react-icons/fa";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const barberOptions = [
  { value: "ΛΕΜΟ", label: "ΛΕΜΟ" },
  { value: "ΦΟΡΟΥ", label: "ΦΟΡΟΥ" },
];
 const barberColors = {
    ΛΕΜΟ: "text-purple-600",
    ΦΟΡΟΥ: "text-orange-500",
  };
const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedCustomerOption, setSelectedCustomerOption] = useState(null);
  const [editMode, setEditMode] = useState(null);
  const [editData, setEditData] = useState({
    name: "",
    phoneNumber: "",
    barber: "",
    dateOfBirth: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [addMode, setAddMode] = useState(false);
  const [addData, setAddData] = useState({
    name: "",
    phoneNumber: "",
    barber: "",
    dateOfBirth: "",
  });
  const [adding, setAdding] = useState(false);

  const editRef = useRef(null);
 

  // Fetch customers from backend
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const customerData = await fetchCustomers();
        const updatedCustomers = customerData.map((customer) => ({
          ...customer,
          barberColor: barberColors[customer.barber] || "text-white",
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
    "Θέλετε σίγουρα να διαγράψετε τον πελάτη; Η ενέργεια δεν αναιρείται."
  );
  if (!confirmDelete) return;

  try {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete customer");
    setCustomers((prev) => prev.filter((customer) => customer._id !== id));
    toast.success("Ο πελάτης διαγράφηκε!");
  } catch (error) {
    toast.error("Αποτυχία διαγραφής πελάτη.");
    console.error("Error deleting customer:", error);
  }
};


  // Enable edit mode for a specific customer
  const handleEditClick = (customer) => {
    setEditMode(customer._id);
    setEditData({
      name: customer.name,
      phoneNumber: customer.phoneNumber,
      barber: customer.barber || "",
      dateOfBirth: customer.dateOfBirth || "",
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editData),
    });

    if (!response.ok) {
      // 409 = Duplicate phone number (if handled in backend)
      if (response.status === 409) {
        toast.error("Υπάρχει ήδη πελάτης με αυτό το τηλέφωνο.");
      } else {
        toast.error("Αποτυχία ενημέρωσης πελάτη.");
      }
      return;
    }

    const updatedCustomer = await response.json();
    const updatedCustomerWithColor = {
      ...updatedCustomer,
      barberColor: barberColors[updatedCustomer.barber] || "text-white",
    };

    setCustomers((prev) =>
      prev.map((customer) =>
        customer._id === id ? updatedCustomerWithColor : customer
      )
    );
    setEditMode(null);
    toast.success("Επιτυχής ενημέρωση πελάτη!");
  } catch (er) {
    toast.error("Αποτυχία ενημέρωσης πελάτη.");
    console.error("Error updating customer:", er);

  }
};



  // ADD CUSTOMER
  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setAddData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddBarberChange = (selectedOption) => {
    setAddData((prev) => ({ ...prev, barber: selectedOption.value }));
  };

 const handleAddSubmit = async (e) => {
  e.preventDefault();
  if (!addData.name || !addData.phoneNumber) {
    toast.error("Το όνομα και το τηλέφωνο είναι υποχρεωτικά πεδία.");
    return;
  }
  setAdding(true);
  try {
    const newCustomer = await addCustomer(addData); // Use your util
   setCustomers((prev) =>
  [...prev, {
    ...newCustomer,
    barberColor: barberColors[newCustomer.barber] || "text-white",
  }].sort((a, b) => a.name.localeCompare(b.name))
);

    setAddMode(false);
    setAddData({
      name: "",
      phoneNumber: "",
      barber: "",
      dateOfBirth: "",
    });
    toast.success("Ο πελάτης προστέθηκε!");
  } catch (err) {
    // 👇 Add this check for duplicate phone number (from backend)
    if (err && err.message && err.message.includes("already exists")) {
      toast.error("Υπάρχει ήδη πελάτης με αυτό το τηλέφωνο.");
    } else {
      toast.error("Αποτυχία προσθήκης πελάτη.");
    }
    console.error("Error adding customer:", err);
  } finally {
    setAdding(false);
  }
};




  const customerOptions = customers.map((customer) => ({
    value: customer._id,
    label: `${customer.name} - ${customer.phoneNumber}`,
  }));

  // -----
  return (
    <div className="p-6 relative">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-white">ΠΕΛΑΤΕΣ</h1>
        <button
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 shadow font-semibold"
          onClick={() => setAddMode((prev) => !prev)}
        >
          <FaPlus /> Προσθήκη Πελάτη
        </button>
      </div>
      {addMode && (
     <form
  onSubmit={handleAddSubmit}
  className="flex flex-wrap items-end gap-4 bg-[#1e293b] border border-[#3b82f6] p-4 rounded-xl mb-6"
>
  <input
    type="text"
    name="name"
    placeholder="Όνομα"
    value={addData.name}
    onChange={handleAddChange}
className="w-44 bg-[#181c2b] text-[#ede9fe] border border-[#a78bfa] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[#a78bfa]"
    autoFocus
  />
  <input
    type="text"
    name="phoneNumber"
    placeholder="Τηλέφωνο"
    value={addData.phoneNumber}
    onChange={handleAddChange}
className="w-44 bg-[#181c2b] text-[#ede9fe] border border-[#a78bfa] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[#a78bfa]"
  />
  <Select
    options={barberOptions}
    placeholder="Επιλέξτε Barber"
    value={barberOptions.find((option) => option.value === addData.barber)}
    onChange={handleAddBarberChange}
    className="w-44"
    styles={{
      control: (base, state) => ({
        ...base,
        backgroundColor: "#181c2b",
        borderColor: "#a78bfa",
        color: "#ede9fe",
        borderRadius: "8px",
        padding: "2px 0px",
        fontSize: "15px",
        boxShadow: state.isFocused ? "0 0 0 2px #a78bfa55" : undefined,
      }),
      menu: (base) => ({
        ...base,
        backgroundColor: "#161a23",
        color: "#ede9fe",
        borderRadius: "8px",
      }),
      option: (base, state) => ({
        ...base,
        backgroundColor: state.isFocused ? "#3b82f6" : "#161a23",
        color: "#ede9fe",
        padding: "10px",
      }),
      singleValue: (base) => ({
        ...base,
        color: "#ede9fe",
      }),
      placeholder: (base) => ({
        ...base,
        color: "#9ca3af",
      }),
      input: (base) => ({
        ...base,
        color: "#ede9fe",
      }),
    }}
  />
  <DatePicker
    selected={addData.dateOfBirth ? new Date(addData.dateOfBirth) : null}
    onChange={(date) =>
      setAddData((prev) => ({
        ...prev,
        dateOfBirth: date ? date.toISOString().slice(0, 10) : "",
      }))
    }
    dateFormat="dd/MM/yyyy"
    placeholderText="Ημερ. Γέννησης"
className="w-44 bg-[#181c2b] text-[#ede9fe] border border-[#a78bfa] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[#a78bfa]"
    calendarClassName="!bg-[#161a23] !text-[#ede9fe]"
    locale="el"
    yearDropdownItemNumber={100}
    showYearDropdown
    scrollableYearDropdown
    maxDate={new Date()}
  />
  <button
    type="submit"
    disabled={adding}
    className="bg-[#a78bfa] hover:bg-[#ede9fe] hover:text-[#161a23] text-[#161a23] font-bold px-6 py-2 rounded-lg shadow transition"
    style={{ height: "44px" }}
  >
    {adding ? "Προσθήκη..." : "Αποθήκευση"}
  </button>
  <button
    type="button"
    onClick={() => setAddMode(false)}
    className="bg-red-500 text-white px-3 py-2 rounded shadow font-semibold"
    style={{ height: "44px" }}
  >
    <FaTimes />
  </button>
</form>

      )}

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
                setSelectedCustomerId(option ? option.value : null);
              }}
              styles={{
                control: (base) => ({
                  ...base,
                  backgroundColor: "#1e293b",
                  borderColor: "#3b82f6",
                  color: "white",
                  borderRadius: "8px",
                  padding: "5px",
                  fontSize: "14px",
                }),
                menu: (base) => ({
                  ...base,
                  backgroundColor: "#1e293b",
                  color: "white",
                  borderRadius: "8px",
                }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isFocused ? "#3b82f6" : "#1e293b",
                  color: "white",
                  padding: "10px",
                }),
                singleValue: (base) => ({
                  ...base,
                  color: "white",
                }),
                placeholder: (base) => ({
                  ...base,
                  color: "#9ca3af",
                }),
                input: (base) => ({
                  ...base,
                  color: "white",
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
                          backgroundColor: "#1e293b",
                          color: "white",
                          borderColor: "#3b82f6",
                          borderRadius: "8px",
                          padding: "5px",
                          fontSize: "14px",
                          width: "200px",
                        }),
                        menu: (base) => ({
                          ...base,
                          backgroundColor: "#1e293b",
                          color: "white",
                          borderRadius: "8px",
                          width: "200px",
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isFocused
                            ? "#3b82f6"
                            : "#1e293b",
                          color: "white",
                          padding: "10px",
                        }),
                        singleValue: (base) => ({
                          ...base,
                          color: "white",
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: "#9ca3af",
                        }),
                      }}
                    />
                    <DatePicker
                      selected={
                        editData.dateOfBirth
                          ? new Date(editData.dateOfBirth)
                          : null
                      }
                      onChange={(date) =>
                        setEditData((prev) => ({
                          ...prev,
                          dateOfBirth: date
                            ? date.toISOString().slice(0, 10)
                            : "",
                        }))
                      }
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Ημερ. Γέννησης"
                      className="w-44 bg-[#181c2b] text-[#ede9fe] border-b border-[#a78bfa] px-3 py-2 rounded"
                      calendarClassName="!bg-[#161a23] !text-[#ede9fe]"
                      locale="el"
                      yearDropdownItemNumber={100}
                      showYearDropdown
                      scrollableYearDropdown
                      maxDate={new Date()}
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
            setSelectedCustomerOption(null);
          }}
        />
      )}
      <ToastContainer position="top-right" autoClose={2500} />

    </div>
  );
};

export default CustomersPage;
