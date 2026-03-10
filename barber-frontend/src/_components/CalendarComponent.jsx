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
import { getCustomerHexColor } from "../utils/customerColors";
import { useEffect, useState } from "react";

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

const APPOINTMENT_COLORS = {
  ΛΕΜΟ: "#6B21A8",
  ΦΟΡΟΥ: "orange",
  ΚΟΥΣΙΗΣ: "#0F766E",
};

const BREAK_COLORS = {
  ΛΕΜΟ: "#34D399",
  ΦΟΡΟΥ: "#0ea5e9",
  ΚΟΥΣΙΗΣ: "#64748B",
};

const LOCK_COLORS = {
  ΛΕΜΟ: "#dc2626",
  ΦΟΡΟΥ: "#2563eb",
  ΚΟΥΣΙΗΣ: "#64748B",
};

const getEventColor = ({ barber, type }, fallback = "#9ca3af") => {
  if (type === "break") return BREAK_COLORS[barber] || fallback;
  if (type === "lock") return LOCK_COLORS[barber] || fallback;
  return APPOINTMENT_COLORS[barber] || fallback;
};

const getLockColor = (event) => {
  if (event?.backgroundColor) return event.backgroundColor;
  return getEventColor({ barber: event?.barber, type: "lock" }, "#9ca3af");
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
    <span className="block truncate leading-tight">
      {event.type === "appointment" && (
        <span
          className="inline-block h-2 w-2 rounded-full mr-2 align-middle"
          style={{ backgroundColor: getCustomerHexColor(event) }}
        />
      )}
      <span className="align-middle">{title}</span>
    </span>
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
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 768px)").matches;
  });
  const defaultCalendarView = isMobile ? Views.DAY : Views.WEEK;
  const [internalView, setInternalView] = useState(() => view || defaultCalendarView);
  const activeView = view || internalView;
  const shouldUseHorizontalScroll = isMobile && activeView === Views.WEEK;
  const isMobileMonthView = isMobile && activeView === Views.MONTH;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia("(max-width: 768px)");
    const update = (event) => setIsMobile(event.matches);
    setIsMobile(media.matches);
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  const handleViewChange = (nextView) => {
    if (!view) {
      setInternalView(nextView);
    }
    if (onView) onView(nextView);
  };

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

    const backgroundColor = getEventColor(event, "#9ca3af");
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

  const handleEventDrop = ({ event, start, end, allDay }) => {
    if (onUpdateAppointment) {
      onUpdateAppointment({ event, start, end, allDay, action: "drop" });
    }
  };

  return (
    <div className="h-full w-full">
      <div
        className={`barber-calendar-viewport ${
          shouldUseHorizontalScroll ? "barber-calendar-viewport--scroll" : ""
        } ${isMobileMonthView ? "barber-calendar-viewport--month" : ""} ${
          !shouldUseHorizontalScroll ? "barber-calendar-viewport--default" : ""
        }`}
      >
        <DragAndDropCalendar
          localizer={localizer}
          events={events}
          date={date}
          onNavigate={onNavigate}
          view={activeView}
          onView={handleViewChange}
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
          className="relative z-0 barber-calendar"
          min={new Date(1970, 1, 1, 7, 0, 0)}
          max={new Date(1970, 1, 1, 21, 0, 0)}
          step={40}
          timeslots={1}
          defaultView={defaultCalendarView}
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
    </div>
  );
};

export default CalendarComponent;
