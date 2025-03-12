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
  const { register, handleSubmit, reset, setValue, getValues } = useForm({
    defaultValues: {
      customerName: appointmentData?.customerName || "",
      phoneNumber: appointmentData?.phoneNumber || "",
      barber: appointmentData?.barber || "ΛΕΜΟ", // Default barber is ΛΕΜΟ
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

  useEffect(() => {
    if (appointmentData) {
      console.log(
        "🛠 Updating Form State from appointmentData:",
        appointmentData
      );
      setValue("customerName", appointmentData.customerName);
      setValue("phoneNumber", appointmentData.phoneNumber);
      setValue("barber", appointmentData.barber || "ΛΕΜΟ"); // ✅ Keep selected barber
    }
  }, [appointmentData, setValue]);
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

    const isPastDate = new Date(appointmentDateTime) < new Date();
    const appointmentDetails = {
      ...appointmentData,
      customerName: data.customerName,
      phoneNumber: data.phoneNumber,
      barber: data.barber || appointmentData?.barber || "ΛΕΜΟ",
      duration: 40,
      appointmentDateTime: formattedAppointmentDateTime,
      recurrence: recurrence !== "none" ? recurrence : null,
      repeatWeeks: recurrence === "weekly" ? parseInt(weeksOption) : null,
      isPastDate,
    };

    console.log(
      "🟢 Prepared Appointment Data for Submission:",
      appointmentDetails
    );

    onSubmit(appointmentDetails);
    reset(); // ✅ Clear the form fields
    onClose(); // ✅ Close the form after submission
  };

  // const handleDelete = () => {
  //   setActionType("delete");
  //   setShowPasswordForm(true);
  // };
  const handleDelete = () => {
    onDelete(appointmentData?._id);
    onClose(); // ✅ Close the form after deleting an appointment
  };
  // const handlePasswordSubmit = async (enteredPassword) => {
  //   setShowPasswordForm(false); // Hide the password form after submission

  //   if (!enteredPassword || enteredPassword.trim() === "") {
  //     console.error("Password is required for this action.");
  //     return;
  //   }

  //   if (actionType === "edit") {
  //     const latestBarber = getValues("barber"); // ✅ Now correctly extracting barber from the form

  //     console.log(
  //       "🔍 Before Constructing Payload - appointmentData:",
  //       appointmentData
  //     );
  //     console.log(
  //       "🔍 Before Constructing Payload - Selected Barber from Form:",
  //       latestBarber
  //     );

  //     const appointmentDetails = {
  //       ...appointmentData,
  //       barber: latestBarber, // ✅ Use the correct barber selection
  //       appointmentDateTime,
  //       recurrence: recurrence !== "none" ? recurrence : null,
  //       password: enteredPassword,
  //     };

  //     console.log(
  //       "Submitting Payload for Edit with Password:",
  //       appointmentDetails
  //     );
  //     onSubmit(appointmentDetails); // Send the updated data after password confirmation
  //   } else if (actionType === "delete") {
  //     // Pass the appointment ID and password for deletion
  //     onDelete(appointmentData?._id, enteredPassword);
  //   }
  // };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4">
      <div
        ref={formRef}
        className="bg-white p-6 rounded-lg w-full max-w-lg sm:max-w-md shadow-lg overflow-y-auto mt-14"
      >
        <h2 className="text-xl font-bold mb-4 text-center">
          {isEditing ? "ΕΠΕΞΕΡΓΑΣΙΑ ΡΑΝΤΕΒΟΥ" : "ΚΛΕΙΣΤΕ ΕΝΑ ΡΑΝΤΕΒΟΥ"}
        </h2>

        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* {showPasswordForm ? (
          <PasswordForm
            onPasswordSubmit={handlePasswordSubmit}
            onCancel={() => setShowPasswordForm(false)}
          />
        ) : ( */}
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
                onChange={(e) => {
                  setValue("barber", e.target.value); // ✅ Make sure barber updates correctly
                  console.log("✏️ Barber Changed:", e.target.value); // Log barber changes
                }}
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
              </select>
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
                    {[1, 2, 3, 4, 5].map((week) => (
                      <option key={week} value={week}>
                        {week} ΕΒΔΟΜΑΔΕΣ
                      </option>
                    ))}
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
        {/* )} */}
      </div>
    </div>
  );
}

export default AppointmentForm;
