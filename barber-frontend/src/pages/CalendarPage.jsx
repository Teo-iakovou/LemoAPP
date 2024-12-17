import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CalendarComponent from "../_components/CalendarComponent";
import AppointmentForm from "../_components/AppointmentForm";
import { createAppointment } from "../utils/api";
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
        const response = await fetch("http://localhost:5001/api/appointments");
        const data = await response.json();

        const events = data.map((appointment) => ({
          id: appointment._id,
          title: appointment.customerName,
          start: new Date(appointment.appointmentDateTime),
          end: new Date(
            new Date(appointment.appointmentDateTime).getTime() + 30 * 60 * 1000
          ),
          barber: appointment.barber,
        }));
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
        const response = await fetch("http://localhost:5001/api/customers");
        const data = await response.json();

        setCustomers(data); // Store customer data
      } catch (error) {
        console.error("Error fetching customers:", error);
      }
    };

    fetchCustomers();
  }, []);

  // Filter out past appointments without causing an infinite loop
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to the start of the current day

    // Filter appointments to show only today or future
    const upcomingAppointments = appointments.filter(
      (appointment) => new Date(appointment.start) >= today
    );

    setFilteredAppointments(upcomingAppointments);
  }, [appointments]); // Run this effect only when `appointments` changes

  const handleSelectSlot = (slotInfo) => {
    const selectedStartDate = new Date(slotInfo.start);
    selectedStartDate.setHours(7, 0, 0, 0); // Set time to 07:00
    setSelectedDate(selectedStartDate);
    setSelectedAppointment(null);
    setShowForm(true);
  };

  const handleSelectEvent = (event) => {
    const appointment = appointments.find((appt) => appt.id === event.id);

    console.log("Selected Appointment for Edit/Delete:", appointment);

    // Ensure `phoneNumber` exists when editing
    setSelectedAppointment({
      _id: appointment.id,
      customerName: appointment.title, // Title corresponds to customerName
      phoneNumber:
        customers.find((customer) => customer.name === appointment.title)
          ?.phoneNumber || "", // Get phoneNumber
      barber: appointment.barber || "Lemo",
      appointmentDateTime: appointment.start,
    });

    setShowForm(true);
  };

  const handleFormSubmit = async (appointmentData) => {
    try {
      const response = await createAppointment(appointmentData);

      if (response?.initialAppointment) {
        // Map the initial appointment
        const newAppointments = [
          {
            id: response.initialAppointment._id,
            title: response.initialAppointment.customerName,
            start: new Date(response.initialAppointment.appointmentDateTime),
            end: new Date(
              new Date(
                response.initialAppointment.appointmentDateTime
              ).getTime() +
                30 * 60 * 1000
            ),
            barber: response.initialAppointment.barber,
          },
        ];

        // Add recurring appointments (if any)
        if (
          response.recurringAppointments &&
          response.recurringAppointments.length > 0
        ) {
          const recurringEvents = response.recurringAppointments.map(
            (appt) => ({
              id: appt._id,
              title: appt.customerName,
              start: new Date(appt.appointmentDateTime),
              end: new Date(
                new Date(appt.appointmentDateTime).getTime() + 30 * 60 * 1000
              ),
              barber: appt.barber,
            })
          );

          newAppointments.push(...recurringEvents); // Add to the initial list
        }

        // Update the state dynamically
        setAppointments((prevAppointments) => [
          ...prevAppointments,
          ...newAppointments,
        ]);
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
    console.log("Appointment ID being deleted:", appointmentId);

    try {
      const response = await fetch(
        `http://localhost:5001/api/appointments/${appointmentId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password }),
        }
      );

      if (response.ok) {
        setAppointments((prevAppointments) =>
          prevAppointments.filter((appt) => appt.id !== appointmentId)
        );
        setShowForm(false);
        setSelectedAppointment(null);

        // Show success notification
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
    <div className="relative bg-white rounded-3xl mt-[14px] min-h-[calc(100vh-64px)] p-4">
      <h1 className="text-xl font-bold mb-4">Appointment Scheduler</h1>
      <CalendarComponent
        events={filteredAppointments}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
      />
      {showForm && (
        <AppointmentForm
          initialDate={selectedDate}
          isEditing={!!selectedAppointment}
          appointmentData={selectedAppointment}
          onClose={() => setShowForm(false)}
          onSubmit={handleFormSubmit}
          onDelete={handleDelete}
          customers={customers} // Pass customers as a prop
        />
      )}
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
};

export default CalendarPage;
