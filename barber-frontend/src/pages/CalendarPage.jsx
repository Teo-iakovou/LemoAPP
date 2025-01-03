import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CalendarComponent from "../_components/CalendarComponent";
import AppointmentForm from "../_components/AppointmentForm";
import { createAppointment } from "../utils/api";

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

  // Filter out past appointments
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of the current day

    const upcomingAppointments = appointments.filter(
      (appointment) => new Date(appointment.start) >= today
    );

    setFilteredAppointments(upcomingAppointments);
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
      const response = await createAppointment(appointmentData);

      if (response?.initialAppointment) {
        const appointmentDate = new Date(
          response.initialAppointment.appointmentDateTime
        );
        const duration = 40;

        const newAppointments = [
          {
            id: response.initialAppointment._id,
            title: response.initialAppointment.customerName,
            start: appointmentDate,
            end: new Date(appointmentDate.getTime() + duration * 60 * 1000),
            barber: response.initialAppointment.barber,
          },
        ];

        if (response.recurringAppointments?.length > 0) {
          const recurringEvents = response.recurringAppointments.map((appt) => {
            const recurringDate = new Date(appt.appointmentDateTime);
            const recurringDuration = 40;

            return {
              id: appt._id,
              title: appt.customerName,
              start: recurringDate,
              end: new Date(
                recurringDate.getTime() + recurringDuration * 60 * 1000
              ),
              barber: appt.barber,
            };
          });

          newAppointments.push(...recurringEvents);
        }

        setAppointments((prev) => [...prev, ...newAppointments]);
        toast.success("Appointment(s) added successfully!");
      } else {
        console.error("Invalid response structure:", response);
        toast.error("Failed to add the appointment.");
      }
    } catch (error) {
      console.error("Error submitting appointment data:", error);
      toast.error("An error occurred while adding the appointment.");
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
        setAppointments((prev) =>
          prev.filter((appt) => appt.id !== appointmentId)
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
    <div className="relative bg-white rounded-3xl mt-[-18px] min-h-[calc(100vh-64px)] p-4">
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
