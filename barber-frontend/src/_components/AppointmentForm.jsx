import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PasswordForm from "./PasswordForm";

function AppointmentForm({
  initialDate,
  onClose,
  onSubmit,
  onDelete,
  isEditing,
  repeatOption,
  appointmentData,
  customers = [], // Default to an empty array if undefined
}) {
  const formRef = useRef(null);
  const flatpickrRef = useRef(null);
  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      customerName: appointmentData?.customerName || "",
      phoneNumber: appointmentData?.phoneNumber || "",
      barber: appointmentData?.barber || "Lemo", // Default barber is Lemo
    },
  });
  const defaultDate = new Date();
  defaultDate.setHours(7, 0, 0, 0); // Set time to 07:00
  const [appointmentDateTime, setAppointmentDateTime] = useState(
    appointmentData?.appointmentDateTime || initialDate || new Date()
  );
  const [recurrence, setRecurrence] = useState("none");
  const [weeksOption, setWeeksOption] = useState("1");
  const [error, setError] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [actionType, setActionType] = useState(null); // Tracks "edit" or "delete"

  // Handle click outside the form to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        formRef.current &&
        !formRef.current.contains(event.target) &&
        (!flatpickrRef.current ||
          !flatpickrRef.current.flatpickr.calendarContainer.contains(
            event.target
          ))
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleCustomerSelect = (e) => {
    const selectedName = e.target.value.trim(); // Remove leading/trailing spaces

    // Find customer
    const selectedCustomer = customers.find(
      (customer) => customer.name.toLowerCase() === selectedName.toLowerCase()
    );

    console.log("Selected Customer:", selectedCustomer);

    if (selectedCustomer) {
      setValue("customerName", selectedCustomer.name);
      setValue("phoneNumber", selectedCustomer.phoneNumber || ""); // Set phone number or fallback
    } else {
      console.warn("No matching customer found for:", selectedName);
      setValue("phoneNumber", ""); // Clear phone number if no match
    }
  };

  const submitForm = async (data) => {
    const formattedAppointmentDateTime = appointmentDateTime
      ? new Date(appointmentDateTime).toISOString()
      : null;

    const appointmentDetails = {
      customerName: data.customerName,
      phoneNumber: data.phoneNumber,
      barber: data.barber,
      appointmentDateTime: formattedAppointmentDateTime,
      recurrence: recurrence !== "none" ? recurrence : null,
      repeatWeeks: recurrence === "weekly" ? parseInt(weeksOption) : null, // Pass weeksOption for weekly recurrence
      repeatMonths: recurrence === "monthly" ? parseInt(monthsOption) : null, // Optional for monthly recurrence
    };

    console.log("Submitting Appointment Data:", appointmentDetails); // Debug log

    if (isEditing) {
      setActionType("edit");
      setShowPasswordForm(true);
    } else {
      onSubmit(appointmentDetails);
      reset();
    }
  };

  const handleDelete = () => {
    setActionType("delete");
    setShowPasswordForm(true);
  };

  const handlePasswordSubmit = async (enteredPassword) => {
    setShowPasswordForm(false);

    if (!enteredPassword || enteredPassword.trim() === "") {
      console.error("Password is required for this action.");
      return;
    }

    if (actionType === "edit") {
      // Ensure all required fields are included
      const appointmentDetails = {
        customerName: appointmentData?.customerName || "", // Include customerName
        phoneNumber: appointmentData?.phoneNumber || "", // Include phoneNumber
        barber: appointmentData?.barber || "Lemo",
        appointmentDateTime: appointmentDateTime, // Use current state value
        recurrence: recurrence !== "none" ? recurrence : null,
        password: enteredPassword, // Send the entered password
      };

      console.log("Submitting Payload for Edit:", appointmentDetails); // Debug log
      onSubmit(appointmentDetails); // Send the updated data
    } else if (actionType === "delete") {
      onDelete(appointmentData?._id, enteredPassword);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center">
      <div ref={formRef} className="bg-white p-6 rounded-md w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {isEditing ? "Edit Appointment" : "Schedule an Appointment"}
        </h2>
        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        {showPasswordForm ? (
          <PasswordForm
            onPasswordSubmit={handlePasswordSubmit}
            onCancel={() => setShowPasswordForm(false)}
          />
        ) : (
          <>
            <form onSubmit={handleSubmit(submitForm)}>
              {/* Customer Name */}
              <div className="mb-4">
                <label htmlFor="customerName" className="block text-gray-700">
                  Customer Name:
                </label>
                <input
                  {...register("customerName")}
                  list="customerNameList"
                  onChange={handleCustomerSelect}
                  type="text"
                  id="customerName"
                  placeholder="Enter customer name"
                  className="mt-1 block w-full p-2 border border-gray-300 rounded"
                  required
                />
                <datalist id="customerNameList">
                  {customers.map((customer) => (
                    <option key={customer.phoneNumber} value={customer.name} />
                  ))}
                </datalist>
              </div>
              {/* Phone Number */}
              <div className="mb-4">
                <label htmlFor="phoneNumber" className="block text-gray-700">
                  Phone Number:
                </label>
                <input
                  {...register("phoneNumber")}
                  type="text"
                  id="phoneNumber"
                  placeholder="Enter phone number"
                  className="mt-1 block w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              {/* Appointment Date and Time */}
              <div className="mb-4">
                <label
                  htmlFor="appointmentDateTime"
                  className="block text-gray-700"
                >
                  Appointment Date and Time:
                </label>
                <Flatpickr
                  ref={flatpickrRef}
                  value={appointmentDateTime}
                  onChange={(date) => setAppointmentDateTime(date[0])}
                  options={{
                    enableTime: true,
                    dateFormat: "d/m/Y H:i",
                    time_24hr: true,
                  }}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded"
                />
              </div>
              {/* Barber Selection */}
              <div className="mb-4">
                <label htmlFor="barber" className="block text-gray-700">
                  Select Barber:
                </label>
                <select
                  {...register("barber")}
                  id="barber"
                  className="mt-1 block w-full p-2 border border-gray-300 rounded"
                >
                  <option value="Lemo">Lemo</option>
                  <option value="Assistant">Forou</option>
                </select>
              </div>
              {/* Recurrence */}
              <div className="mb-4">
                <label htmlFor="recurrence" className="block text-gray-700">
                  Repeat Appointment:
                </label>
                <select
                  id="recurrence"
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded"
                >
                  <option value="none">None</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                {repeatOption === "Weekly" && (
                  <>
                    <label>Repeat for How Many Weeks:</label>
                    <select
                      value={weeksOption}
                      onChange={(e) => setWeeksOption(e.target.value)}
                    >
                      <option value="1">1 Week</option>
                      <option value="2">2 Weeks</option>
                      <option value="3">3 Weeks</option>
                      <option value="4">4 Weeks</option>
                      <option value="5">5 Weeks</option>
                    </select>
                  </>
                )}
                {recurrence === "weekly" && (
                  <div className="mt-4">
                    <label className="block text-gray-700">
                      Repeat for How Many Weeks:
                    </label>
                    <select
                      value={weeksOption}
                      onChange={(e) => setWeeksOption(e.target.value)}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="1">1 Week</option>
                      <option value="2">2 Weeks</option>
                      <option value="3">3 Weeks</option>
                      <option value="4">4 Weeks</option>
                      <option value="5">5 Weeks</option>
                    </select>
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="w-full bg-green-500 text-white py-2 rounded"
              >
                {isEditing ? "Update Appointment" : "Add Appointment"}
              </button>
            </form>
            {isEditing && (
              <button
                className="mt-4 w-full bg-red-500 text-white py-2 rounded"
                onClick={handleDelete}
              >
                Delete Appointment
              </button>
            )}
            <button
              className="mt-4 w-full bg-gray-500 text-white py-2 rounded"
              onClick={onClose}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default AppointmentForm;
