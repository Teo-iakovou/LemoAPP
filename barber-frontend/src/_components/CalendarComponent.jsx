import React from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "moment/locale/el"; // Import Greek locale
import "react-big-calendar/lib/css/react-big-calendar.css";

moment.locale("el"); // Set moment to use Greek locale
const localizer = momentLocalizer(moment);

const greekMonths = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
];

const greekDays = [
  "Κυριακή",
  "Δευτέρα",
  "Τρίτη",
  "Τετάρτη",
  "Πέμπτη",
  "Παρασκευή",
  "Σάββατο",
];

const CalendarComponent = ({
  events,
  onSelectSlot,
  onSelectEvent,
  disabled,
}) => {
  const eventStyleGetter = (event, start, end, isSelected) => {
    const backgroundColor = event.barber === "ΛΕΜΟ" ? "#6B21A8" : "orange";
    return {
      style: {
        backgroundColor,
        color: "white",
        borderRadius: "5px",
        border: "none",
        ...(isSelected && {
          boxShadow: "0 0 5px 2px rgba(0, 0, 0, 0.3)",
        }),
      },
    };
  };

  return (
    <div className="h-full w-full">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "77vh", width: "100%" }}
        selectable={!disabled}
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent}
        eventPropGetter={eventStyleGetter}
        className={`relative z-0 ${
          disabled ? "pointer-events-none opacity-50" : ""
        }`}
        min={new Date(1970, 1, 1, 7, 0, 0)} // Start time: 7:00 AM
        max={new Date(1970, 1, 1, 21, 0, 0)} // End time: 9:00 PM
        step={40} // Time interval: 40 minutes after January 13th
        timeslots={1} // Display one slot per step
        defaultView={Views.WEEK} // Set default view to Week (Εβδομάδα)
        formats={{
          timeGutterFormat: "HH:mm", // 12-hour format
          eventTimeRangeFormat: ({ start, end }) =>
            `${moment(start).format("HH:mm")} - ${moment(end).format("HH:mm")}`,
          agendaTimeRangeFormat: ({ start, end }) =>
            `${moment(start).format("HH:mm")} - ${moment(end).format("HH:mm")}`,
          dayFormat: (date) =>
            `${greekDays[new Date(date).getDay()]} ${moment(date).format(
              "DD/MM"
            )}`, // Greek day names with date
          weekdayFormat: (date) =>
            `${greekDays[new Date(date).getDay()]} ${moment(date).format(
              "DD/MM"
            )}`, // Greek day names for Week view
          monthHeaderFormat: (date) =>
            `${greekMonths[new Date(date).getMonth()]} ${new Date(
              date
            ).getFullYear()}`, // Greek month names
          dayHeaderFormat: (date) =>
            `${greekDays[new Date(date).getDay()]} ${moment(date).format(
              "DD/MM"
            )}`, // Day view header
          weekHeaderFormat: ({ start, end }) =>
            `${moment(start).format("DD/MM")} - ${moment(end).format("DD/MM")}`, // Week header format
        }}
        messages={{
          today: "Σήμερα",
          previous: "Προηγούμενο",
          next: "Επόμενο",
          month: "Μήνας",
          week: "Εβδομάδα",
          day: "Ημέρα",
          agenda: "Ατζέντα",
          date: "Ημερομηνία",
          time: "Ώρα",
          event: "Γεγονός",
          allDay: "Ολοήμερο",
          noEventsInRange: "Δεν υπάρχουν γεγονότα σε αυτή την περιοχή.",
          showMore: (count) => `+ Δείτε περισσότερα (${count})`,
        }}
      />
    </div>
  );
};

export default CalendarComponent;
