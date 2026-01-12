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

const getLockColor = (event) => {
  if (event?.backgroundColor) return event.backgroundColor;
  if (event?.barber === "ΛΕΜΟ") return "#dc2626";
  if (event?.barber) return "#2563eb";
  return "#9ca3af"; // fallback gray
};

const LockEvent = ({ event }) => {
  const dotColor = getLockColor(event);

  return (
    <span
      style={{
        display: "inline-block",
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        backgroundColor: dotColor,
        margin: "3px",
      }}
    />
  );
};

const CalendarEvent = ({ event, title }) =>
  event.type === "lock" ? (
    <LockEvent event={event} />
  ) : (
    <span className="block truncate leading-tight">{title}</span>
  );

const CalendarComponent = ({
  events,
  onSelectSlot,
  onSelectEvent,
  onUpdateAppointment, // Call this to update on backend/state
  disabled,
  date,
  onNavigate,
  view,
  onView,
  showToolbar = true,
}) => {
  // Style for each event
  const eventStyleGetter = (event, start, end, isSelected) => {
    const baseStyle = {
      borderRadius: "5px",
      border: "none",
      ...(isSelected && { boxShadow: "0 0 5px 2px rgba(0, 0, 0, 0.3)" }),
    };

    if (event.type === "lock") {
      return {
        style: {
          ...baseStyle,
          backgroundColor: "transparent",
          color: "transparent",
          boxShadow: "none",
          padding: 0,
          width: "18px",
          minWidth: "18px",
          maxWidth: "18px",
          height: "18px",
          minHeight: "18px",
          maxHeight: "18px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          overflow: "visible",
        },
      };
    }

    let backgroundColor;
    if (event.type === "break") {
      backgroundColor = event.barber === "ΛΕΜΟ" ? "#34D399" : "#0ea5e9";
    } else {
      backgroundColor = event.barber === "ΛΕΜΟ" ? "#6B21A8" : "orange";
    }
    return {
      style: {
        ...baseStyle,
        backgroundColor,
        color: "white",
      },
    };
  };

  // Handle resize
  const handleEventResize = ({ event, start, end }) => {
    // Call your backend or update state here
    if (onUpdateAppointment) {
      onUpdateAppointment({ event, start, end, action: "resize" });
    }
    // For demo:
    // console.log("Resized event:", { ...event, start, end });
  };

  const handleEventDrop = ({ event, start, end }) => {
    if (onUpdateAppointment) {
      onUpdateAppointment({ event, start, end, action: "drop" });
    }
  };

  return (
    <div className="h-full w-full">
      <DragAndDropCalendar
        localizer={localizer}
        events={events}
        date={date}
        onNavigate={onNavigate}
        view={view}
        onView={onView}
        toolbar={showToolbar}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%", width: "100%" }}
        selectable={!disabled}
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent}
        eventPropGetter={eventStyleGetter}
        components={{
          event: CalendarEvent,
        }}
        className="relative z-0"
        min={new Date(1970, 1, 1, 7, 0, 0)}
        max={new Date(1970, 1, 1, 21, 0, 0)}
        step={40}
        timeslots={1}
        defaultView={Views.WEEK}
        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        resizable={!disabled}
        draggableAccessor={() => !disabled}
        onEventResize={handleEventResize}
        onEventDrop={handleEventDrop}
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
