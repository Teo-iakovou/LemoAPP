import React, { useState } from "react";
import { useForm } from "react-hook-form";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";

function AppointmentForm({
  initialDate,
  onClose,
  onSubmit,
  onDelete,
  isEditing,
  appointmentData,
}) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      customerName: appointmentData?.customerName || "",
      phoneNumber: appointmentData?.phoneNumber || "",
    },
  });
  const [appointmentDateTime, setAppointmentDateTime] = useState(
    appointmentData?.appointmentDateTime || initialDate || null
  );

  const [error, setError] = useState(null);

  const submitForm = async (data) => {
    const appointmentDetails = {
      ...data,
      appointmentDateTime,
    };

    try {
      const response = await fetch(
        isEditing
          ? `http://localhost:5001/api/appointments/${appointmentData._id}`
          : "http://localhost:5001/api/appointments",
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(appointmentDetails),
        }
      );

      if (response.ok) {
        const savedAppointment = await response.json();
        onSubmit(savedAppointment.savedAppointment);
        reset();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "An error occurred.");
      }
    } catch (error) {
      setError("Failed to connect to the server. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center">
      <div className="bg-white p-6 rounded-md w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {isEditing ? "Edit Appointment" : "Schedule an Appointment"}
        </h2>
        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(submitForm)}>
          <div className="mb-4">
            <label htmlFor="customerName" className="block text-gray-700">
              Customer Name:
            </label>
            <input
              {...register("customerName")}
              type="text"
              id="customerName"
              placeholder="Enter customer name"
              className="mt-1 block w-full p-2 border border-gray-300 rounded"
              required
            />
          </div>
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
          <div className="mb-4">
            <label
              htmlFor="appointmentDateTime"
              className="block text-gray-700"
            >
              Appointment Date and Time:
            </label>
            <Flatpickr
              value={appointmentDateTime}
              onChange={(date) => setAppointmentDateTime(date[0])}
              options={{
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                minDate: "today", // Restrict past dates
              }}
              className="mt-1 block w-full p-2 border border-gray-300 rounded"
              placeholder="Select a date and time"
            />
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
            onClick={() => {
              console.log("Deleting Appointment ID:", appointmentData?._id);
              onDelete(appointmentData?._id);
              onClose();
            }}
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
      </div>
    </div>
  );
}

export default AppointmentForm;
