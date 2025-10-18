import moment from "moment";
import "moment/locale/el";
import {
  momentLocalizer,
  Views,
  Calendar as BigCalendar,
} from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "../styles/calendar-dark.css";

// Greek locale
moment.locale("el");
moment.updateLocale("el", {
  meridiemParse: /π\.μ\.|μ\.μ\./,
  meridiem: (hour) => (hour < 12 ? "π.μ." : "μ.μ."),
  isPM: (input) => input === "μ.μ.",
});
const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop(BigCalendar);

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
  onUpdateAppointment, // Call this to update on backend/state
  disabled,
}) => {
  // Style for each event
  const eventStyleGetter = (event, start, end, isSelected) => {
    let backgroundColor;
    if (event.type === "break") {
      backgroundColor = event.barber === "ΛΕΜΟ" ? "#34D399" : "#0ea5e9";
    } else if (event.type === "lock") {
      backgroundColor = event.barber === "ΛΕΜΟ" ? "#dc2626" : "#2563eb";
    } else {
      backgroundColor = event.barber === "ΛΕΜΟ" ? "#6B21A8" : "orange";
    }
    return {
      style: {
        backgroundColor,
        color: "white",
        borderRadius: "5px",
        border: "none",
        ...(isSelected && { boxShadow: "0 0 5px 2px rgba(0, 0, 0, 0.3)" }),
      },
    };
  };

  // Handle resize
  const handleEventResize = ({ event, start, end }) => {
    // Call your backend or update state here
    if (onUpdateAppointment) {
      onUpdateAppointment({ ...event, start, end });
    }
    // For demo:
    // console.log("Resized event:", { ...event, start, end });
  };

  return (
    <div className="h-full w-full">
      <DragAndDropCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%", width: "100%" }}
        selectable={!disabled}
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent}
        eventPropGetter={eventStyleGetter}
        className={`relative z-0 ${
          disabled ? "pointer-events-none opacity-50" : ""
        }`}
        min={new Date(1970, 1, 1, 7, 0, 0)}
        max={new Date(1970, 1, 1, 21, 0, 0)}
        step={40}
        timeslots={1}
        defaultView={Views.WEEK}
        resizable
        onEventResize={handleEventResize}
        formats={{
          timeGutterFormat: "HH:mm",
          eventTimeRangeFormat: ({ start, end }) =>
            `${moment(start).format("HH:mm")} - ${moment(end).format("HH:mm")}`,
          agendaTimeRangeFormat: ({ start, end }) =>
            `${moment(start).format("HH:mm")} - ${moment(end).format("HH:mm")}`,
          dayFormat: (date) =>
            `${greekDays[new Date(date).getDay()]} ${moment(date).format(
              "DD/MM"
            )}`,
          weekdayFormat: (date) =>
            `${greekDays[new Date(date).getDay()]} ${moment(date).format(
              "DD/MM"
            )}`,
          monthHeaderFormat: (date) =>
            `${greekMonths[new Date(date).getMonth()]} ${new Date(
              date
            ).getFullYear()}`,
          dayHeaderFormat: (date) =>
            `${greekDays[new Date(date).getDay()]} ${moment(date).format(
              "DD/MM"
            )}`,
          weekHeaderFormat: ({ start, end }) =>
            `${moment(start).format("DD/MM")} - ${moment(end).format("DD/MM")}`,
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
