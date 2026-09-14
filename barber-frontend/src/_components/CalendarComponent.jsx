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
import { useEffect, useMemo, useState } from "react";

// Greek locale
moment.locale("el");
moment.updateLocale("el", {
  meridiemParse: /π\.μ\.|μ\.μ\./,
  meridiem: (hour) => (hour < 12 ? "π.μ." : "μ.μ."),
  isPM: (input) => input === "μ.μ.",
  // Pin the week to Monday-start so the calendar's week grid matches the app's
  // Monday-aligned dates (prevents a Sunday/Monday off-by-one in the week view).
  week: { dow: 1, doy: 4 },
});
const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop(BigCalendar);

// --- Day time-grid: uniform equal-width columns --------------------------------------
// Replaces react-big-calendar's default per-overlap-group sizing (lone event = full column,
// group of 4 = 25% each) with columns of ONE fixed width for the whole day: every event is
// the same narrow width, placed in its assigned column and left-aligned, empty space to the
// right. Applied to the DAY view only (see dayLayoutAlgorithm prop).
const DESKTOP_MIN_COLUMNS = 4; // the day always renders at least this many equal columns (desktop)

// Factory returning a custom dayLayoutAlgorithm bound to a minimum column count. Kept as a
// factory so the component can pass a smaller minimum on mobile (isMobile) instead of reading
// component state from module scope. Keeps rbc's vertical placement (top/height from slotMetrics)
// and only changes horizontal geometry: greedy first-free-column assignment; width/left come from
// a single day-level column count, not the event's own group size.
function makeUniformColumnsLayout(minColumns) {
  return function uniformColumnsLayout({ events, slotMetrics, accessors }) {
    const proxies = events.map((data) => {
      const { start, end, top, height } = slotMetrics.getRange(
        accessors.start(data),
        accessors.end(data)
      );
      return { data, start, end, top, height, colIndex: 0 };
    });

    // Stable order: earliest start first, longer event first on ties.
    proxies.sort((a, b) => a.start - b.start || b.end - a.end);

    // Greedy first-free column: each event takes the lowest column whose previous event has
    // already ended (no time overlap). columnEnds.length ends up == max simultaneous events.
    const columnEnds = [];
    for (const ev of proxies) {
      let placed = false;
      for (let c = 0; c < columnEnds.length; c++) {
        if (ev.start >= columnEnds[c]) {
          ev.colIndex = c;
          columnEnds[c] = ev.end;
          placed = true;
          break;
        }
      }
      if (!placed) {
        ev.colIndex = columnEnds.length; // opens a new column
        columnEnds.push(ev.end);
      }
    }

    // All visible events (appointments + breaks/ΔΙΑΛΕΙΜΜΑ + locks) count toward concurrency.
    const dayMaxConcurrency = columnEnds.length;
    const columnCount = Math.max(dayMaxConcurrency, minColumns);
    const colWidth = 100 / columnCount; // percent
    // colIndex is always < columnsUsed <= columnCount, so no event can overflow the container.

    return proxies.map((ev) => ({
      event: ev.data,
      style: {
        top: ev.top,
        height: ev.height,
        width: colWidth,
        xOffset: ev.colIndex * colWidth,
      },
    }));
  };
}

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

// Week/Day time-grid bounds. Default to a 07:00–21:00 window, but expand it to include
// any event that starts earlier or ends later, so no appointment is ever hidden in the
// time-grid views. (Month view ignores time and always shows every event, which is why
// a 21:00 slot shows in Μήνας but was clipped out of Εβδομάδα/Ημέρα.)
const getTimeBounds = (events = []) => {
  let minMinutes = 7 * 60; // 07:00
  let maxMinutes = 21 * 60; // 21:00
  (Array.isArray(events) ? events : []).forEach((ev) => {
    const start = ev?.start instanceof Date ? ev.start : null;
    const end = ev?.end instanceof Date ? ev.end : null;
    if (start) {
      const m = start.getHours() * 60 + start.getMinutes();
      if (m < minMinutes) minMinutes = m;
    }
    if (end) {
      let m = end.getHours() * 60 + end.getMinutes();
      // An end of exactly 00:00 is midnight of the next day → treat as end of day.
      if (m === 0 && start && end > start) m = 24 * 60;
      if (m > maxMinutes) maxMinutes = m;
    }
  });
  minMinutes = Math.max(0, Math.min(minMinutes, 23 * 60));
  maxMinutes = Math.min(24 * 60 - 1, Math.max(maxMinutes, minMinutes + 60));
  const toDate = (mins) => new Date(1970, 1, 1, Math.floor(mins / 60), mins % 60, 0);
  return { calendarMin: toDate(minMinutes), calendarMax: toDate(maxMinutes) };
};

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
  // Mobile day columns at min 4 are too narrow (names truncate to ~6 chars), so use min 1 on
  // phones — reuses the existing isMobile / matchMedia(768) state, no new breakpoint. Memoised
  // so rbc doesn't recompute the layout from a new function identity on every render.
  const dayLayout = useMemo(
    () => makeUniformColumnsLayout(isMobile ? 1 : DESKTOP_MIN_COLUMNS),
    [isMobile]
  );
  const shouldUseHorizontalScroll = isMobile && activeView === Views.WEEK;
  const isMobileMonthView = isMobile && activeView === Views.MONTH;
  const { calendarMin, calendarMax } = getTimeBounds(events);

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
        // Tag lock badges so the day-view column-gap CSS can skip them (keep full 18px).
        className: "rbc-event--lock",
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
          min={calendarMin}
          max={calendarMax}
          step={40}
          timeslots={1}
          dayLayoutAlgorithm={activeView === Views.DAY ? dayLayout : "overlap"}
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
