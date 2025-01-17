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
      barber: appointmentData?.barber || "ΛΕΜΟ", // Default barber is Lemo
    },
  });
  const defaultDate = new Date();
  defaultDate.setHours(7, 0, 0, 0); // Set time to 07:00
  const [appointmentDateTime, setAppointmentDateTime] = useState(
    appointmentData?.appointmentDateTime || initialDate || new Date()
  );
  const [recurrence, setRecurrence] = useState("none");
  const [weeksOption, setWeeksOption] = useState("1");
  const [monthsOption, setMonthsOption] = useState("1");
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

  const submitForm = (data) => {
    const formattedAppointmentDateTime = appointmentDateTime
      ? new Date(appointmentDateTime).toISOString()
      : null;

    const appointmentDetails = {
      ...appointmentData, // Preserve existing data (e.g., `_id`) for editing
      customerName: data.customerName,
      phoneNumber: data.phoneNumber,
      barber: data.barber,
      duration: 40, // Fixed duration
      appointmentDateTime: formattedAppointmentDateTime, // Ensure new date-time is sent
      recurrence: recurrence !== "none" ? recurrence : null,
      repeatWeeks: recurrence === "weekly" ? parseInt(weeksOption) : null,
      repeatMonths: recurrence === "monthly" ? parseInt(monthsOption) : null,
    };

    console.log("Submitting Appointment Data:", appointmentDetails);

    if (isEditing) {
      setActionType("edit"); // Set action type to "edit"
      setShowPasswordForm(true); // Show the password confirmation form
    } else {
      // For new appointments, submit immediately
      onSubmit(appointmentDetails);
      reset(); // Clear the form fields
    }
  };

  const handleDelete = () => {
    setActionType("delete");
    setShowPasswordForm(true);
  };

  const handlePasswordSubmit = async (enteredPassword) => {
    setShowPasswordForm(false); // Hide the password form after submission

    if (!enteredPassword || enteredPassword.trim() === "") {
      console.error("Password is required for this action.");
      return;
    }

    if (actionType === "edit") {
      // Ensure all required fields are included for the update
      const appointmentDetails = {
        ...appointmentData, // Preserve existing data
        appointmentDateTime, // Use the current state value
        recurrence: recurrence !== "none" ? recurrence : null,
        password: enteredPassword, // Add the entered password
      };

      console.log(
        "Submitting Payload for Edit with Password:",
        appointmentDetails
      );
      onSubmit(appointmentDetails); // Send the updated data after password confirmation
    } else if (actionType === "delete") {
      // Pass the appointment ID and password for deletion
      onDelete(appointmentData?._id, enteredPassword);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center">
      <div ref={formRef} className="bg-white p-6 rounded-md w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {isEditing ? "ΕΠΕΞΕΡΓΑΣΙΑ ΡΑΝΤΕΒΟΥ" : "ΚΛΕΙΣΤΕ ΕΝΑ ΡΑΝΤΕΒΟΥ"}
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
                  ΟΝΟΜΑ ΠΕΛΑΤΗ:
                </label>
                <input
                  {...register("customerName")}
                  list="customerNameList"
                  onChange={handleCustomerSelect}
                  type="text"
                  id="customerName"
                  placeholder="Όνομα πελάτη"
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
                  ΤΗΛΕΦΩΝΟ:
                </label>
                <input
                  {...register("phoneNumber")}
                  type="text"
                  id="phoneNumber"
                  placeholder="Τηλέφωνο πελάτη"
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
                  ΗΜΕΡΑ ΚΑΙ ΩΡΑ ΡΑΝΤΕΒΟΥ:
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
                  ΕΠΙΛΟΓΗ:
                </label>
                <select
                  {...register("barber")}
                  id="barber"
                  className="mt-1 block w-full p-2 border border-gray-300 rounded"
                >
                  <option value="ΛΕΜΟ">ΛΕΜΟ</option>
                  <option value="ΦΟΡΟΥ">ΦΟΡΟΥ</option>
                </select>
              </div>
              {/* Recurrence */}
              <div className="mb-4">
                <label htmlFor="recurrence" className="block text-gray-700">
                  ΕΠΑΝΑΛΗΨΗ ΡΑΝΤΕΒΟΥ:
                </label>
                <select
                  id="recurrence"
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded"
                >
                  <option value="none">ΚΑΝΕΝΑ</option>
                  <option value="weekly">ΕΒΔΟΜΑΔΙΑΙΟ</option>
                  <option value="monthly">ΜΗΝΙΑΙΟ</option>
                </select>
                {repeatOption === "Weekly" && (
                  <>
                    <label>ΕΠΑΝΑΛΗΨΗ ΓΙΑ ΠΟΣΕΣ ΕΒΔΟΜΑΔΕΣ:</label>
                    <select
                      value={weeksOption}
                      onChange={(e) => setWeeksOption(e.target.value)}
                    >
                      <option value="1">1 ΕΒΔΟΜΑΔΑ</option>
                      <option value="2">2 ΕΒΔΟΜΑΔΕΣ</option>
                      <option value="3">3 ΕΒΔΟΜΑΔΕΣ</option>
                      <option value="4">4 ΕΒΔΟΜΑΔΕΣ</option>
                      <option value="5">5 ΕΒΔΟΜΑΔΕΣ</option>
                    </select>
                  </>
                )}
                {recurrence === "weekly" && (
                  <div className="mt-4">
                    <label className="block text-gray-700">
                      ΕΠΑΝΑΛΗΨΗ ΓΙΑ ΠΟΣΕΣ ΕΒΔΟΜΑΔΕΣ:
                    </label>
                    <select
                      value={weeksOption}
                      onChange={(e) => setWeeksOption(e.target.value)}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="1">1 ΕΒΔΟΜΑΔΑ</option>
                      <option value="2">2 ΕΒΔΟΜΑΔΕΣ</option>
                      <option value="3">3 ΕΒΔΟΜΑΔΕΣ</option>
                      <option value="4">4 ΕΒΔΟΜΑΔΕΣ</option>
                      <option value="5">5 ΕΒΔΟΜΑΔΕΣ</option>
                    </select>
                  </div>
                )}
                {recurrence === "monthly" && (
                  <div className="mt-4">
                    <label className="block text-gray-700">
                      ΕΠΑΝΑΛΗΨΗ ΓΙΑ ΠΟΣΟΥΣ ΜΗΝΕΣ:
                    </label>
                    <select
                      value={monthsOption}
                      onChange={(e) => setMonthsOption(e.target.value)}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="1">1 ΜΗΝΑΣ</option>
                      <option value="2">2 ΜΗΝΕΣ</option>
                      <option value="3">3 ΜΗΝΕΣ</option>
                      <option value="4">4 ΜΗΝΕΣ</option>
                      <option value="5">5 ΜΗΝΕΣ</option>
                      <option value="6">6 ΜΗΝΕΣ</option>
                    </select>
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="w-full bg-green-500 text-white py-2 rounded"
              >
                {isEditing ? "ΕΝΗΜΕΡΩΣΗ ΡΑΝΤΕΒΟΥ" : "ΠΡΟΣΘΗΚΗ ΡΑΝΤΕΒΟΥ"}
              </button>
            </form>
            {isEditing && (
              <button
                className="mt-4 w-full bg-red-500 text-white py-2 rounded"
                onClick={handleDelete}
              >
                ΔΙΑΓΡΑΦΗ ΡΑΝΤΕΒΟΥ
              </button>
            )}
            <button
              className="mt-4 w-full bg-gray-500 text-white py-2 rounded"
              onClick={onClose}
            >
              ΑΚΥΡΩΣΗ
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default AppointmentForm;
