import React, { useState, useEffect } from "react";
import CalendarComponent from "../_components/CalendarComponent";
import AppointmentForm from "../_components/AppointmentForm";

const Home = () => {
  const [appointments, setAppointments] = useState([]);
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
    setSelectedDate(slotInfo.start);
    setSelectedAppointment(null);
    setShowForm(true);
  };

  const handleSelectEvent = (event) => {
    const appointment = appointments.find((appt) => appt.id === event.id);
    console.log("Selected Appointment for Edit/Delete:", appointment);
    setSelectedAppointment({ ...appointment, _id: event.id });
    setShowForm(true);
  };

  const handleFormSubmit = (result) => {
    const { initialAppointment, recurringAppointments } = result;

    // Combine initial and recurring appointments into one array
    const allAppointments = [
      initialAppointment,
      ...(recurringAppointments || []),
    ];

    // Map appointments into calendar events
    const newEvents = allAppointments.map((appointment) => ({
      id: appointment._id,
      title: appointment.customerName,
      start: new Date(appointment.appointmentDateTime),
      end: new Date(
        new Date(appointment.appointmentDateTime).getTime() + 30 * 60 * 1000
      ),
      barber: appointment.barber,
    }));

    // Update the state to include new appointments
    setAppointments((prevAppointments) => [...prevAppointments, ...newEvents]);
    setShowForm(false); // Close the form after submission
  };

  const handleDelete = async (appointmentId) => {
    console.log("Appointment ID being deleted:", appointmentId);
    if (!appointmentId) {
      console.error("No valid appointment ID provided for deletion.");
      return;
    }
    try {
      const response = await fetch(
        `http://localhost:5001/api/appointments/${appointmentId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setAppointments((prevAppointments) =>
          prevAppointments.filter((appt) => appt.id !== appointmentId)
        );

        if (selectedAppointment && selectedAppointment.id === appointmentId) {
          setShowForm(false);
          setSelectedAppointment(null);
        }
      } else {
        console.error("Failed to delete the appointment.");
      }
    } catch (error) {
      console.error("Error deleting appointment:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">Appointment Scheduler</h1>
      <CalendarComponent
        events={filteredAppointments} // Pass only filtered appointments
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
        />
      )}
    </div>
  );
};

export default Home;
