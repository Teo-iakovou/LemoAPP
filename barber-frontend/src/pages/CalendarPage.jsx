import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CalendarComponent from "../_components/CalendarComponent";
import AppointmentForm from "../_components/AppointmentForm";
import { createAppointment } from "../utils/api";
import { updateAppointment } from "../utils/api";
// Base API URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const CalendarPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]); // Add customers state
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Fetch appointments from the backend
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/appointments`);
        const data = await response.json();

        const events = data.map((appointment) => {
          const appointmentDate = new Date(appointment.appointmentDateTime);
          const duration = 40; // Dynamic duration

          return {
            id: appointment._id,
            title: appointment.customerName,
            start: appointmentDate,
            end: new Date(appointmentDate.getTime() + duration * 60 * 1000), // Calculate dynamic end time
            barber: appointment.barber,
          };
        });
        setAppointments(events);
      } catch (error) {
        console.error("Error fetching appointments:", error);
      }
    };

    fetchAppointments();
  }, []);

  // Fetch customers from the backend
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/customers`);
        const data = await response.json();
        setCustomers(data); // Store customer data
      } catch (error) {
        console.error("Error fetching customers:", error);
      }
    };

    fetchCustomers();
  }, []);

  useEffect(() => {
    // Include all appointments, no filtering for past dates
    setFilteredAppointments(appointments);
    console.log("All Appointments for Calendar:", appointments); // Debug all appointments
  }, [appointments]);
  const handleSelectSlot = (slotInfo) => {
    const selectedStartDate = new Date(slotInfo.start);
    if (selectedStartDate.getHours() === 0) {
      selectedStartDate.setHours(7, 0, 0, 0); // Default to 7:00 AM
    }
    console.log("Clicked Hour:", selectedStartDate);
    setSelectedDate(selectedStartDate);
    setSelectedAppointment(null);
    setShowForm(true);
  };

  const handleSelectEvent = (event) => {
    const appointment = appointments.find((appt) => appt.id === event.id);

    console.log("Selected Appointment for Edit/Delete:", appointment);

    setSelectedAppointment({
      _id: appointment.id,
      customerName: appointment.title,
      phoneNumber:
        customers.find((customer) => customer.name === appointment.title)
          ?.phoneNumber || "",
      barber: appointment.barber || "ΛΕΜΟ",
      appointmentDateTime: appointment.start,
    });

    setShowForm(true);
  };

  const handleFormSubmit = async (appointmentData) => {
    try {
      console.log("🔄 Sending Updated Appointment Data:", appointmentData); // Debugging

      let response;
      if (appointmentData._id) {
        const updatedAppointmentData = {
          ...appointmentData,
          barber: appointmentData.barber || "ΛΕΜΟ", // ✅ Ensure barber change is saved
          currentPassword: "apoel",
        };

        console.log(
          "🚀 Final Payload Before API Request:",
          updatedAppointmentData
        ); // 🔥 Debugging

        response = await updateAppointment(
          appointmentData._id,
          updatedAppointmentData
        );
      } else {
        response = await createAppointment(appointmentData);
      }

      console.log("✅ API Response:", response); // Log full API response

      if (response?.updatedAppointment || response?.initialAppointment) {
        const createdAppointments = [
          response.updatedAppointment || response.initialAppointment,
          ...(response.recurringAppointments || []),
        ];

        const newEvents = createdAppointments.map((appointment) => ({
          id: appointment._id,
          title: appointment.customerName,
          start: new Date(appointment.appointmentDateTime),
          end: new Date(
            new Date(appointment.appointmentDateTime).getTime() + 40 * 60 * 1000
          ),
          barber: appointment.barber,
          backgroundColor: appointment.barber === "ΛΕΜΟ" ? "#6B21A8" : "orange",
        }));

        setAppointments((prevAppointments) => {
          const updatedIds = createdAppointments.map((appt) => appt._id);
          const filteredAppointments = prevAppointments.filter(
            (appt) => !updatedIds.includes(appt.id)
          );

          console.log("🔄 Updated Appointments in State:", [
            ...filteredAppointments,
            ...newEvents,
          ]);

          return [...filteredAppointments, ...newEvents];
        });

        setTimeout(() => setAppointments((prev) => [...prev]), 100);

        toast.success(
          response.updatedAppointment
            ? "Appointment updated successfully!"
            : "Appointments created successfully!"
        );
      } else {
        toast.error("Failed to add/update the appointment.");
      }
    } catch (error) {
      console.error("Error submitting appointment data:", error);
      toast.error("An error occurred while processing the appointment.");
    } finally {
      setShowForm(false);
    }
  };

  const handleDelete = async (appointmentId, password) => {
    console.log("Deleting appointment with ID:", appointmentId);

    try {
      const response = await fetch(
        `${API_BASE_URL}/appointments/${appointmentId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ currentPassword: password }),
        }
      );

      if (response.ok) {
        setAppointments((prevAppointments) =>
          prevAppointments.filter((appt) => appt.id !== appointmentId)
        );
        toast.success("Appointment deleted successfully!");
      } else {
        const errorData = await response.json();
        toast.error("Failed to delete the appointment: " + errorData.message);
      }
    } catch (error) {
      console.error("Error deleting appointment:", error);
      toast.error("An error occurred while deleting the appointment.");
    }
  };

  return (
    <div className=" relative bg-white rounded-3xl mt-[-18] min-h-[calc(100vh-64px)] p-4">
      <h1 className="text-xl font-bold mb-4 text-center sm:text-left">
        ΠΡΟΓΡΑΜΜΑ ΡΑΝΤΕΒΟΥ
      </h1>
      <div className="overflow-x-auto">
        <CalendarComponent
          events={filteredAppointments}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
        />
      </div>
      {showForm && (
        <AppointmentForm
          initialDate={selectedDate}
          isEditing={!!selectedAppointment}
          appointmentData={selectedAppointment}
          onClose={() => setShowForm(false)}
          onSubmit={handleFormSubmit}
          onDelete={handleDelete}
          customers={customers}
        />
      )}
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
};

export default CalendarPage;
