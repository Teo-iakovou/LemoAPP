import { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CalendarComponent from "../_components/CalendarComponent";
import AppointmentForm from "../_components/AppointmentForm";
import Spinner from "../_components/Spinner";
import {
  createAppointment,
  updateAppointment,
  fetchUpcomingAppointments,
  fetchPastAppointments,
  fetchCustomers,
} from "../utils/api";

// Base API URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5002/api";

const CalendarPage = ({ darkCalendar = false }) => {
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]); // Add customers state
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [pastPage, setPastPage] = useState(1);
const [isLoading, setIsLoading] = useState(true);  // ✅ Fetch appointments
  useEffect(() => {
    const fetchUpcoming = async () => {
      try {
        const upcomingAppointments = await fetchUpcomingAppointments(); // This returns an array

        const events = upcomingAppointments.map((appointment) => {
          const appointmentDate = new Date(appointment.appointmentDateTime);
          const isBreak = appointment.type === "break";
          const isLock = appointment.type === "lock";
          const isLemo = appointment.barber === "ΛΕΜΟ";

          const duration = appointment.duration || 40;
          const lockLabel = appointment.lockReason
            ? `ΚΛΕΙΔΩΜΑ — ${appointment.lockReason}`
            : "ΚΛΕΙΔΩΜΑ";

          return {
            id: appointment._id,
            title: isBreak
              ? "ΔΙΑΛΕΙΜΜΑ"
              : isLock
              ? lockLabel
              : appointment.customerName,
            customerName: appointment.customerName,
            phoneNumber:
              appointment.type === "appointment" ? appointment.phoneNumber : "",
            lockReason: appointment.lockReason || "",
            start: appointmentDate,
            end: new Date(appointmentDate.getTime() + duration * 60 * 1000),
            barber: appointment.barber,
            type: appointment.type || "appointment",
            backgroundColor: isBreak
              ? isLemo
                ? "#34D399"
                : "#0ea5e9"
              : isLock
              ? isLemo
                ? "#dc2626"
                : "#2563eb"
              : isLemo
              ? "#6B21A8"
              : "orange",
          };
        });

        setAppointments(events);
      } catch (error) {
        console.error("Error fetching upcoming appointments:", error);
       
      }
      setIsLoading(false); 
    };

    fetchUpcoming();
  }, []);

  // ✅ Fetch customers
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const data = await fetchCustomers(1, 100); // returns { customers: [...] } or just [...]
        const customerArray = data.customers || data;
        setCustomers(customerArray);
      } catch (error) {
        console.error("Error fetching customers:", error);
      }
    };

    loadCustomers();
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

    const durationMinutes =
      (appointment.end - appointment.start) / (60 * 1000);
    const isAppointment = appointment.type === "appointment";

    setSelectedAppointment({
      _id: appointment.id,
      customerName: isAppointment ? appointment.customerName || "" : "",
      phoneNumber: isAppointment ? appointment.phoneNumber || "" : "",
      barber: appointment.barber || "ΛΕΜΟ",
      appointmentDateTime: appointment.start,
      type: appointment.type || "appointment",
      duration: durationMinutes,
      lockReason: appointment.lockReason || "",
    });

    setShowForm(true);
  };

  const handleFormSubmit = async (appointmentData) => {
    try {
      console.log("📤 Form Data Before Processing:", appointmentData);

      let response;
      if (appointmentData._id) {
        const updatedAppointmentData = {
          ...appointmentData,
          barber: appointmentData.barber || "ΛΕΜΟ",
        };

        console.log(
          "🚀 Final Payload Before API Request:",
          updatedAppointmentData
        );
        response = await updateAppointment(
          appointmentData._id,
          updatedAppointmentData
        );
      } else {
        response = await createAppointment(appointmentData);
      }

      console.log("✅ API Response:", response);

      if (response?.updatedAppointment || response?.initialAppointment) {
        const createdAppointments = [
          response.updatedAppointment || response.initialAppointment,
          ...(response.recurringAppointments || []),
        ];

        const newEvents = createdAppointments.map((appointment) => {
          const startDate = new Date(appointment.appointmentDateTime);
          const duration = appointment.duration || 40;
          const isBreak = appointment.type === "break";
          const isLock = appointment.type === "lock";
          const isLemo = appointment.barber === "ΛΕΜΟ";
          const lockLabel = appointment.lockReason
            ? `ΚΛΕΙΔΩΜΑ — ${appointment.lockReason}`
            : "ΚΛΕΙΔΩΜΑ";

          return {
            id: appointment._id,
            title: isBreak
              ? "ΔΙΑΛΕΙΜΜΑ"
              : isLock
              ? lockLabel
              : appointment.customerName,
            customerName: appointment.customerName,
            phoneNumber:
              appointment.type === "appointment" ? appointment.phoneNumber : "",
            lockReason: appointment.lockReason || "",
            start: startDate,
            end: new Date(startDate.getTime() + duration * 60 * 1000),
            barber: appointment.barber,
            type: appointment.type || "appointment",
            backgroundColor: isBreak
              ? isLemo
                ? "#34D399"
                : "#0ea5e9"
              : isLock
              ? isLemo
                ? "#dc2626"
                : "#2563eb"
              : isLemo
              ? "#6B21A8"
              : "orange",
          };
        });

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

        // ✅ Close the form after a successful update
        setShowForm(false);
      } else {
        toast.error("Failed to add/update the appointment.");
      }
    } catch (error) {
      console.error("Error submitting appointment data:", error);
      toast.error("An error occurred while processing the appointment.");
    }
  };

  // const handleDelete = async (appointmentId, password) => {
  //   console.log("Deleting appointment with ID:", appointmentId);

  //   try {
  //     const response = await fetch(
  //       `${API_BASE_URL}/appointments/${appointmentId}`,
  //       {
  //         method: "DELETE",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({ currentPassword: password }),
  //       }
  //     );

  //     if (response.ok) {
  //       setAppointments((prevAppointments) =>
  //         prevAppointments.filter((appt) => appt.id !== appointmentId)
  //       );
  //       toast.success("Appointment deleted successfully!");
  //     } else {
  //       const errorData = await response.json();
  //       toast.error("Failed to delete the appointment: " + errorData.message);
  //     }
  //   } catch (error) {
  //     console.error("Error deleting appointment:", error);
  //     toast.error("An error occurred while deleting the appointment.");
  //   }
  // };
  const handleDelete = async (appointmentId) => {
    console.log("Deleting appointment with ID:", appointmentId);

    try {
      const response = await fetch(
        `${API_BASE_URL}/appointments/${appointmentId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        setAppointments((prevAppointments) =>
          prevAppointments.filter((appt) => appt.id !== appointmentId)
        );
        toast.success("Appointment deleted successfully!");

        // ✅ Close the form after successful deletion
        setShowForm(false);
      } else {
        const errorData = await response.json();
        toast.error("Failed to delete the appointment: " + errorData.message);
      }
    } catch (error) {
      console.error("Error deleting appointment:", error);
      toast.error("An error occurred while deleting the appointment.");
    }
  };

  const loadPastAppointments = async () => {
    try {
      const { appointments: pastAppointments } = await fetchPastAppointments(
        pastPage,
        100
      );

      const pastEvents = pastAppointments.map((appointment) => {
        const appointmentDate = new Date(appointment.appointmentDateTime);
        const isBreak = appointment.type === "break";
        const isLemo = appointment.barber === "ΛΕΜΟ";
        const duration = appointment.duration || 40;
        return {
          id: appointment._id,
          title: isBreak ? "ΔΙΑΛΕΙΜΜΑ" : appointment.customerName,
          phoneNumber: appointment.phoneNumber,
          start: appointmentDate,
          end: new Date(appointmentDate.getTime() + duration * 60 * 1000),
          barber: appointment.barber,
          type: appointment.type || "appointment",
          backgroundColor: isBreak
            ? isLemo
              ? "#34D399"
              : "#0ea5e9"
            : isLemo
            ? "#6B21A8"
            : "orange",
        };
      });

      setAppointments((prev) => {
        const merged = [...prev, ...pastEvents];
        // Remove duplicates by id
        const deduped = Array.from(
          new Map(merged.map((item) => [item.id, item])).values()
        );
        return deduped;
      });
      setPastPage((prev) => prev + 1);
    } catch (error) {
      console.error("Error loading past appointments:", error);
      toast.error("Αποτυχία φόρτωσης προηγούμενων ραντεβού.");
    }
  };

  const handleResizeAppointment = async (updatedEvent) => {
    // Find the original appointment by id
    const original = appointments.find((a) => a.id === updatedEvent.id);
    if (!original) return;

    // Calculate the new duration in minutes
    const newDuration = Math.round(
      (updatedEvent.end - updatedEvent.start) / 60000
    );

    // Prepare payload for backend
    const payload = {
      ...original,
      appointmentDateTime: updatedEvent.start, // update start time
      duration: newDuration, // update duration
    };

    try {
      await updateAppointment(original.id, payload);

      // Update frontend state (so UI updates instantly)
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === updatedEvent.id
            ? {
                ...a,
                start: updatedEvent.start,
                end: updatedEvent.end,
                duration: newDuration,
              }
            : a
        )
      );
      toast.success("Διάρκεια ραντεβού ενημερώθηκε!");
    } catch (error) {
      toast.error("Αποτυχία ενημέρωσης διάρκειας.");
      console.error(error);
    }
  };

  return (
    <div
      className={`relative ${
        darkCalendar
          ? "bg-[#0f172a] text-gray-100 border border-gray-700"
          : "bg-white"
      } rounded-none sm:rounded-3xl h-full p-3 sm:p-4 overflow-x-hidden flex flex-col`}
    >
      {/* Header + smaller load button aligned left */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <h1 className="text-xl font-bold text-left">
          ΠΡΟΓΡΑΜΜΑ ΡΑΝΤΕΒΟΥ
        </h1>
        <button
          onClick={loadPastAppointments}
          className={`${
            darkCalendar
              ? "bg-white/10 hover:bg-white/20 text-white border border-white/20"
              : "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300"
          } text-xs sm:text-sm px-3 sm:px-4 py-1 rounded-lg transition`}
        >
          Φόρτωσε Προηγούμενα
        </button>
      </div>

       {isLoading ? (
      <Spinner />
    ) : (
      <div className={`overflow-x-auto max-w-full flex-1 min-h-0 ${darkCalendar ? "calendar-dark" : ""}`}>
        <CalendarComponent
          events={filteredAppointments}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onUpdateAppointment={handleResizeAppointment}
        />
      </div>
    )}

    {showForm && !isLoading && (
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
