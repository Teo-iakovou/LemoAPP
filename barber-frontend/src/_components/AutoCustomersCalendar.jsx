"use strict";

import { useMemo, useState } from "react";
import "../styles/autoCustomersCalendar.css";

const DAY_NAMES = [
  "Δευτέρα",
  "Τρίτη",
  "Τετάρτη",
  "Πέμπτη",
  "Παρασκευή",
  "Σάββατο",
  "Κυριακή",
];

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTime = (value) =>
  new Date(value).toLocaleTimeString("el-GR", {
    hour: "2-digit",
    minute: "2-digit",
  });

const alignToMonday = (date) => {
  const aligned = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = aligned.getDay();
  const diff = (day + 6) % 7; // convert Sunday(0) -> 6
  aligned.setDate(aligned.getDate() - diff);
  return aligned;
};

const buildDaySlots = (startDate, totalDays) => {
  const days = [];
  for (let i = 0; i < totalDays; i += 1) {
    const current = new Date(startDate.getTime());
    current.setDate(current.getDate() + i);
    const dateKey = toDateKey(current);
    const dayName = DAY_NAMES[(current.getDay() + 6) % 7];
    days.push({
      date: current,
      dateKey,
      dayName,
      formatted: current.toLocaleDateString("el-GR", {
        day: "2-digit",
        month: "2-digit",
      }),
    });
  }
  return days;
};

const groupEventsByDay = (events) => {
  const map = new Map();
  events.forEach((event) => {
    if (!event?.start) return;
    const date = new Date(event.start);
    const key = toDateKey(date);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(event);
  });
  return map;
};

const AutoCustomersCalendar = ({
  events = [],
  startDate,
  weeks = 4,
}) => {
  const [selectedEventId, setSelectedEventId] = useState(null);

  const start = useMemo(() => {
    const base = startDate ? new Date(startDate) : new Date();
    base.setHours(0, 0, 0, 0);
    return alignToMonday(base);
  }, [startDate]);

  const days = useMemo(() => buildDaySlots(start, weeks * 7), [start, weeks]);
  const grouped = useMemo(() => groupEventsByDay(events), [events]);

  return (
    <div className="auto-calendar">
      <div className="auto-calendar-grid">
        {days.map(({ dateKey, dayName, formatted }) => {
          const dayEvents = grouped.get(dateKey) || [];
          return (
            <div key={dateKey} className="auto-calendar-cell">
              <div className="auto-calendar-cell__header">
                <span className="auto-calendar-cell__day">{dayName}</span>
                <span className="auto-calendar-cell__date">{formatted}</span>
              </div>
              <div className="auto-calendar-cell__body">
                {dayEvents.length === 0 ? (
                  <div className="auto-calendar-empty">Χωρίς ραντεβού</div>
                ) : (
                  dayEvents
                    .sort((a, b) => new Date(a.start) - new Date(b.start))
                    .map((event) => {
                      const isSelected = selectedEventId === event.id;
                      const barberClass =
                        event.barber === "ΛΕΜΟ"
                          ? " auto-calendar-event--lemo"
                          : event.barber === "ΦΟΡΟΥ"
                          ? " auto-calendar-event--forou"
                          : "";
                      return (
                        <div
                          key={event.id}
                          className={`auto-calendar-event${barberClass}${isSelected ? " auto-calendar-event--selected" : ""}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setSelectedEventId((current) => (current === event.id ? null : event.id));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedEventId((current) => (current === event.id ? null : event.id));
                            }
                          }}
                        >
                          <div className="auto-calendar-event__title">{event.title}</div>
                          {isSelected && (
                            <div className="auto-calendar-event__meta">
                              <span className="auto-calendar-event__time">
                                Ώρα: {formatTime(event.start)}
                              </span>
                              {event.durationMin !== undefined && (
                                <span className="auto-calendar-event__duration">
                                  · Διάρκεια: {event.durationMin}’
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AutoCustomersCalendar;
