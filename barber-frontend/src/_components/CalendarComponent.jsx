import React from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

const CalendarComponent = ({
  events,
  onSelectSlot,
  onSelectEvent,
  disabled,
}) => {
  const eventStyleGetter = (event, start, end, isSelected) => {
    const backgroundColor = event.barber === "Lemo" ? "blue" : "orange";
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
        style={{ height: "77vh" }}
        selectable={!disabled}
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent}
        eventPropGetter={eventStyleGetter}
        className={`relative z-0 ${
          disabled ? "pointer-events-none opacity-50" : ""
        }`}
        min={new Date(1970, 1, 1, 7, 0, 0)} // Start at 7:00 AM
        formats={{
          timeGutterFormat: "HH:mm", // Format the left time gutter in 24-hour format
          eventTimeRangeFormat: ({ start, end }) =>
            `${moment(start).format("HH:mm")} - ${moment(end).format("HH:mm")}`,
          agendaTimeRangeFormat: ({ start, end }) =>
            `${moment(start).format("HH:mm")} - ${moment(end).format("HH:mm")}`,
        }}
      />
    </div>
  );
};

export default CalendarComponent;
