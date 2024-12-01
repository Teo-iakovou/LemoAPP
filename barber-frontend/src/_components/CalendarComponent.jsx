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
  return (
    <Calendar
      localizer={localizer}
      events={events}
      startAccessor="start"
      endAccessor="end"
      style={{ height: "80vh" }}
      selectable={!disabled}
      onSelectSlot={onSelectSlot}
      onSelectEvent={onSelectEvent}
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
  );
};

export default CalendarComponent;
