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
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [pastPage, setPastPage] = useState(1);
const [isLoading, setIsLoading] = useState(true);  // ✅ Fetch appointments
  const getEventColor = ({ barber, type }) => {
    if (type === "break") {
      if (barber === "ΛΕΜΟ") return "#34D399";
      if (barber === "ΦΟΡΟΥ") return "#0ea5e9";
      if (barber === "ΚΟΥΣΙΗΣ") return "#64748B";
      return "#9ca3af";
    }
    if (type === "lock") {
      if (barber === "ΛΕΜΟ") return "#dc2626";
      if (barber === "ΦΟΡΟΥ") return "#2563eb";
      if (barber === "ΚΟΥΣΙΗΣ") return "#64748B";
      return "#9ca3af";
    }
    if (barber === "ΛΕΜΟ") return "#6B21A8";
    if (barber === "ΦΟΡΟΥ") return "orange";
    if (barber === "ΚΟΥΣΙΗΣ") return "#0F766E";
    return "#9ca3af";
  };

  const mapAppointmentToEvent = (appointment) => {
    const appointmentDate = new Date(appointment.appointmentDateTime);
    const isBreak = appointment.type === "break";
    const isLock = appointment.type === "lock";
    const duration = Number(appointment.duration) || 40;

    return {
      id: appointment._id,
      title: isBreak ? "ΔΙΑΛΕΙΜΜΑ" : isLock ? "" : appointment.customerName,
      customerName: appointment.customerName,
      phoneNumber: appointment.type === "appointment" ? appointment.phoneNumber : "",
      lockReason: appointment.lockReason || "",
      start: appointmentDate,
      end: new Date(appointmentDate.getTime() + duration * 60 * 1000),
      barber: appointment.barber,
      type: appointment.type || "appointment",
      duration,
      backgroundColor: getEventColor(appointment),
    };
  };

  const isOverlapping = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;
  const hasMoveConflict = ({ eventId, barber, start, end }) => {
    return appointments.some((existing) => {
      if (!existing || existing.id === eventId) return false;
      if ((existing.barber || "") !== (barber || "")) return false;
      if (!isOverlapping(start, end, existing.start, existing.end)) return false;

      // breaks/locks are blocked windows and appointments can't overlap each other.
      return existing.type === "break" || existing.type === "lock" || existing.type === "appointment";
    });
  };

  const buildUpdatedEvent = ({ currentEvent, event, start, end, allDay, action }) => {
    const originalDuration =
      Number(currentEvent.duration) || Math.max(1, Math.round((currentEvent.end - currentEvent.start) / 60000));
    if (action === "resize") {
      const resizedDuration = Math.max(1, Math.round((end - start) / 60000));
      const resizedEnd = new Date(start.getTime() + resizedDuration * 60 * 1000);
      return {
        start: new Date(start),
        end: resizedEnd,
        duration: resizedDuration,
      };
    }

    // Drop: use the exact dropped timestamp when available.
    const originalStart = new Date(currentEvent.start);
    const originalTimestamp = originalStart.getTime();
    const dropCandidates = [event?.start, start, end]
      .map((value) => (value ? new Date(value) : null))
      .filter((value) => value && !Number.isNaN(value.getTime()));
    const changedTimestampCandidate = dropCandidates.find(
      (candidate) => candidate.getTime() !== originalTimestamp
    );
    const primaryDropTarget = changedTimestampCandidate || dropCandidates[0] || originalStart;

    const nextStart = allDay
      ? new Date(
          primaryDropTarget.getFullYear(),
          primaryDropTarget.getMonth(),
          primaryDropTarget.getDate(),
          originalStart.getHours(),
          originalStart.getMinutes(),
          originalStart.getSeconds(),
          originalStart.getMilliseconds()
        )
      : new Date(primaryDropTarget);

    return {
      start: nextStart,
      end: new Date(nextStart.getTime() + originalDuration * 60 * 1000),
      duration: originalDuration,
    };
  };

  const persistEventChange = async ({ event, start, end, duration }) => {
    const payload = {
      customerName: event.type === "appointment" ? event.customerName || "" : "",
      phoneNumber: event.type === "appointment" ? event.phoneNumber || "" : "",
      barber: event.barber || "ΛΕΜΟ",
      type: event.type || "appointment",
      appointmentDateTime: start.toISOString(),
      duration,
      endTime: end.toISOString(),
      lockReason: event.type === "lock" ? event.lockReason || "" : undefined,
    };
    await updateAppointment(event.id, payload);
  };

  const handleCalendarEventUpdate = async ({ event, start, end, allDay, action }) => {
    if (!event || !event.id || !start) return;

    const currentEvent = appointments.find((appointment) => appointment.id === event.id);
    if (!currentEvent) return;

    const originalStart = new Date(currentEvent.start);
    const originalEnd = new Date(currentEvent.end);
    const { start: nextStart, end: nextEnd, duration } = buildUpdatedEvent({
      currentEvent,
      event,
      start,
      end,
      allDay,
      action,
    });
    if (
      nextStart.getTime() === originalStart.getTime() &&
      nextEnd.getTime() === originalEnd.getTime()
    ) {
      toast.error("Η μετακίνηση δεν εντοπίστηκε. Δοκίμασε ξανά σε άλλο slot.");
      return;
    }

    if (hasMoveConflict({ eventId: event.id, barber: currentEvent.barber, start: nextStart, end: nextEnd })) {
      toast.error("Μη έγκυρη μετακίνηση: υπάρχει σύγκρουση με ραντεβού/κλείδωμα/διάλειμμα.");
      return;
    }

    // Optimistic UI update.
    setAppointments((prev) =>
      prev.map((appointment) =>
        appointment.id === event.id
          ? { ...appointment, start: nextStart, end: nextEnd, duration }
          : appointment
      )
    );

    try {
      await persistEventChange({ event: currentEvent, start: nextStart, end: nextEnd, duration });
      toast.success(action === "resize" ? "Η διάρκεια ενημερώθηκε." : "Το ραντεβού μετακινήθηκε.");
    } catch (error) {
      // Rollback on failure.
      setAppointments((prev) =>
        prev.map((appointment) =>
          appointment.id === event.id
            ? { ...appointment, start: originalStart, end: originalEnd }
            : appointment
        )
      );
      toast.error("Αποτυχία αποθήκευσης μετακίνησης ραντεβού.");
      console.error("Failed to persist calendar drag/drop update:", error);
    }
  };

  useEffect(() => {
    const loadUpcomingAppointments = async () => {
      try {
        const upcomingAppointments = await fetchUpcomingAppointments();
        const events = upcomingAppointments.map(mapAppointmentToEvent);
        setAppointments(events);
      } catch (error) {
        console.error("Error fetching upcoming appointments:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUpcomingAppointments();
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

        const newEvents = createdAppointments.map(mapAppointmentToEvent);

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

      const pastEvents = pastAppointments.map(mapAppointmentToEvent);

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
          events={appointments}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onUpdateAppointment={handleCalendarEventUpdate}
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
