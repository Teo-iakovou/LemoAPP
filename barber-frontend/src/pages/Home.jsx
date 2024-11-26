import React, { useState, useEffect } from "react";
import CalendarComponent from "../_components/CalendarComponent";
import AppointmentForm from "../_components/AppointmentForm";

const Home = () => {
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await fetch("http://localhost:5001/api/appointments");
        const data = await response.json();
        const events = data.map((appointment) => ({
          id: appointment._id,
          title: appointment.customerName,
          start: new Date(appointment.appointmentDateTime),
          end: new Date(appointment.appointmentDateTime),
        }));
        setAppointments(events);
      } catch (error) {
        console.error("Error fetching appointments:", error);
      }
    };

    fetchAppointments();
  }, []);

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

  const handleFormSubmit = (updatedAppointment) => {
    if (selectedAppointment) {
      // Update an existing appointment
      const updatedEvents = appointments.map((appt) =>
        appt.id === updatedAppointment._id
          ? {
              id: updatedAppointment._id,
              title: updatedAppointment.customerName,
              start: new Date(updatedAppointment.appointmentDateTime),
              end: new Date(updatedAppointment.appointmentDateTime),
            }
          : appt
      );
      setAppointments(updatedEvents);
    } else {
      // Add a new appointment
      const newEvent = {
        id: updatedAppointment._id,
        title: updatedAppointment.customerName,
        start: new Date(updatedAppointment.appointmentDateTime),
        end: new Date(updatedAppointment.appointmentDateTime),
      };
      setAppointments([...appointments, newEvent]);
    }
    setShowForm(false);
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
        events={appointments}
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
