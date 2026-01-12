"use strict";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchAutoCustomers,
  createAutoCustomer,
  updateAutoCustomer,
  deleteAutoCustomer,
  pushAutoCustomers,
  fetchCustomers,
  overrideAutoCustomerOccurrence,
  fetchAutoCustomerLastAppointments,
} from "../utils/api";
import CalendarComponent from "../_components/CalendarComponent";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import DatePicker, { registerLocale } from "react-datepicker";
import { ChevronLeft, ChevronRight, CalendarClock } from "lucide-react";
import el from "date-fns/locale/el";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/autoCustomersPreviewCalendar.css";

registerLocale("el", el);

const addDays = (date, amount) => {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + amount);
  return next;
};

const addWeeks = (date, weeks) => addDays(date, weeks * 7);

const alignToWeekday = (startDate, targetDay) => {
  const aligned = new Date(startDate.getTime());
  const currentDay = aligned.getDay();
  const diff = (Number(targetDay) - currentDay + 7) % 7;
  aligned.setDate(aligned.getDate() + diff);
  return aligned;
};

const alignToMondayStart = (value) => {
  const base = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  base.setHours(0, 0, 0, 0);
  const day = base.getDay();
  const diff = (day + 6) % 7;
  base.setDate(base.getDate() - diff);
  return base;
};

const BARBER_OPTIONS = [
  { value: "ΛΕΜΟ", label: "ΛΕΜΟ" },
  { value: "ΦΟΡΟΥ", label: "ΦΟΡΟΥ" },
];

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Κυριακή / Sunday" },
  { value: 1, label: "Δευτέρα / Monday" },
  { value: 2, label: "Τρίτη / Tuesday" },
  { value: 3, label: "Τετάρτη / Wednesday" },
  { value: 4, label: "Πέμπτη / Thursday" },
  { value: 5, label: "Παρασκευή / Friday" },
  { value: 6, label: "Σάββατο / Saturday" },
];

const CADENCE_OPTIONS = [
  { value: 1, label: "Κάθε εβδομάδα / Every week" },
  { value: 2, label: "Ανά 2 εβδομάδες / Every 2 weeks" },
  { value: 3, label: "Ανά 3 εβδομάδες / Every 3 weeks" },
  { value: 4, label: "Ανά 4 εβδομάδες / Every 4 weeks" },
  { value: 5, label: "Ανά 5 εβδομάδες / Every 5 weeks" },
];

const toLocalDateString = (date) => {
  if (!date) return "";
  const tzAdjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return tzAdjusted.toISOString().slice(0, 10);
};

const parseLocalDateString = (value) => {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day);
};

const toUtcIsoFromLocalDate = (value) => {
  if (!value) return undefined;
  const parsed = parseLocalDateString(value);
  if (!parsed) return undefined;
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())).toISOString();
};

const normalizeTimeString = (value, fallback = "09:00") => {
  if (!value) return fallback;
  if (typeof value === "string") {
    const match = value.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const hours = String(Number(match[1]) % 24).padStart(2, "0");
      const minutes = match[2];
      return `${hours}:${minutes}`;
    }
  }
  return fallback;
};

const emptyForm = {
  customerName: "",
  phoneNumber: "",
  barber: "ΛΕΜΟ",
  weekday: 1,
  timeOfDay: "09:00",
  durationMin: 40,
  cadenceWeeks: 1,
  startFrom: toLocalDateString(new Date()),
  until: "",
  maxOccurrences: "10",
};

const toDateInput = (value) => {
  if (!value) return "";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    try {
      return toLocalDateString(new Date(value));
    } catch {
      return "";
    }
  }
  if (value instanceof Date) {
    return toLocalDateString(value);
  }
  return "";
};

const formatDateDisplay = (value, fallback = "-") => {
  if (!value) return fallback;
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    return date.toLocaleDateString("el-GR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return fallback;
  }
};

const AutoCustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formState, setFormState] = useState(emptyForm);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [initialFormSnapshot, setInitialFormSnapshot] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [occurrenceContext, setOccurrenceContext] = useState(null);
  const [pushOpen, setPushOpen] = useState(false);
  const [pushSubmitting, setPushSubmitting] = useState(false);
  const [pushState, setPushState] = useState({
    from: toLocalDateString(new Date()),
    to: "",
  });
  const [directory, setDirectory] = useState([]);
  const [listOpen, setListOpen] = useState(true);
  const formRef = useRef(null);
  const pushRef = useRef(null);
  const hasAutoJumpedRef = useRef(false);
  const MySwal = useMemo(() => withReactContent(Swal), []);
  const [calendarStart, setCalendarStart] = useState(() => alignToMondayStart(new Date()));
  const [calendarView, setCalendarView] = useState("week");
  const previewCalHeight =
    calendarView === "month"
      ? 1200
      : calendarView === "agenda"
      ? 900
      : calendarView === "week"
      ? 1200
      : 1400;
  const hasUnsavedChanges = useMemo(() => {
    if (!formOpen || !initialFormSnapshot) return false;
    const currentSnapshot = toComparableSnapshot(formState);
    return JSON.stringify(currentSnapshot) !== JSON.stringify(initialFormSnapshot);
  }, [formOpen, formState, initialFormSnapshot]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await fetchAutoCustomers();
      const list = Array.isArray(data) ? data : data?.data || [];
      setCustomers(
        list.map((customer) => ({
          ...customer,
          timeOfDay: normalizeTimeString(customer.timeOfDay, "09:00"),
        }))
      );
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Αποτυχία φόρτωσης επαναλαμβανόμενων πελατών.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    (async () => {
      try {
        const list = await fetchCustomers();
        setDirectory(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error("Failed loading customer directory", error);
      }
    })();
  }, []);

  const directoryByName = useMemo(() => {
    const map = new Map();
    directory.forEach((customer) => {
      if (!customer?.name) return;
      map.set(customer.name.trim().toLowerCase(), customer);
    });
    return map;
  }, [directory]);

  const calendarEvents = useMemo(() => {
  const rangeWeeks = 12;
  const rangeStart = alignToMondayStart(calendarStart);
  const rangeEnd = addWeeks(rangeStart, rangeWeeks);
  const events = [];

  customers.forEach((customer) => {
    if (!customer) return;
    const cadence = Number(customer.cadenceWeeks) || 1;
    const defaultDuration = Number(customer.durationMin) || 40;
    let targetWeekday = Number(customer.weekday);
    if (!Number.isFinite(targetWeekday)) {
      targetWeekday = 0;
    }
    const [hour, minute] = normalizeTimeString(customer.timeOfDay, "09:00")
      .split(":")
      .map(Number);

    const baseStart =
      customer.startFrom && toDateInput(customer.startFrom)
        ? parseLocalDateString(toDateInput(customer.startFrom))
        : new Date(rangeStart.getTime());
    if (!baseStart) return;
    baseStart.setHours(hour || 0, minute || 0, 0, 0);

    let occurrence = alignToWeekday(baseStart, targetWeekday);

    const until = customer.until ? parseLocalDateString(toDateInput(customer.until)) : null;
    const maxOccurrences = customer.maxOccurrences
      ? Number(customer.maxOccurrences)
      : customer.until
      ? Infinity
      : 5;
    let generated = 0;

    const skippedSet = new Set(
      (customer.skippedOccurrences || [])
        .map((value) => normalizeDateValue(value))
        .filter(Boolean)
        .map((date) => date.getTime())
    );

    const overrideMap = new Map(
      (customer.occurrenceOverrides || [])
        .map((entry) => {
          const originalDate = normalizeDateValue(entry?.originalStart);
          const overrideDate = normalizeDateValue(entry?.overrideStart);
          if (!originalDate || !overrideDate) return null;
          return [
            originalDate.getTime(),
            {
              startMs: overrideDate.getTime(),
              duration: entry?.durationMin,
              barber: entry?.barber,
            },
          ];
        })
        .filter(Boolean)
    );

    while (occurrence <= rangeEnd) {
      if (until && occurrence > until) break;

      const occurrenceKey = occurrence.getTime();
      const overrideInfo = overrideMap.get(occurrenceKey);
      const isSkipped = skippedSet.has(occurrenceKey);

      if (!isSkipped) {
        if (maxOccurrences && generated >= maxOccurrences) break;

        const startMs = overrideInfo?.startMs ?? occurrenceKey;
        const eventStart = new Date(startMs);
        const eventEnd = new Date(startMs + (overrideInfo?.duration ?? defaultDuration) * 60000);

        if (eventStart >= rangeStart && eventStart <= rangeEnd) {
          events.push({
            id: `${customer._id || "auto"}-${occurrenceKey}`,
            title: customer.customerName || "Ραντεβού",
            start: eventStart,
            end: eventEnd,
            barber: overrideInfo?.barber || customer.barber || "ΛΕΜΟ",
            type: "appointment",
            autoCustomerId: customer._id,
            originalStart: new Date(occurrenceKey),
            hasOverride: Boolean(overrideInfo),
            overrideBarber: overrideInfo?.barber || null,
            overrideDuration: overrideInfo?.duration ?? null,
            durationMin: overrideInfo?.duration ?? defaultDuration,
          });
        }

        generated += 1;
      }

      occurrence = addWeeks(occurrence, cadence);
      if (maxOccurrences && generated >= maxOccurrences) break;
    }
    });

    return events;
  }, [customers, calendarStart]);

  const previewEvents = useMemo(
    () =>
      calendarEvents.map((event) => {
        const customer = customers.find((item) => item?._id === event.autoCustomerId);
        const barber = event.barber || customer?.barber || "ΛΕΜΟ";
        const customerName = event.title || customer?.customerName || "Ραντεβού";
        const isOverride = Boolean(event.hasOverride);
        const start = event.start instanceof Date ? event.start : new Date(event.start);
        const durationMin = Number(event.durationMin) || 40;
        const end = new Date(start.getTime() + durationMin * 60000);

        return {
          id: String(event.id),
          title: `${customerName} • ${barber}${isOverride ? " • override" : ""}`,
          start,
          end,
          type: "appointment",
          barber,
          isOverride,
          isAutoCustomerPreview: true,
          autoCustomerId: event.autoCustomerId,
          originalStart: event.originalStart,
          durationMin,
        };
      }),
    [calendarEvents, customers]
  );

  useEffect(() => {
    hasAutoJumpedRef.current = false;
  }, [previewEvents.length]);

  useEffect(() => {
    if (hasAutoJumpedRef.current) return;
    if (!previewEvents.length) return;

    const rangeStart =
      calendarView === "day"
        ? new Date(calendarStart.getFullYear(), calendarStart.getMonth(), calendarStart.getDate(), 0, 0, 0, 0)
        : calendarView === "month"
        ? new Date(calendarStart.getFullYear(), calendarStart.getMonth(), 1, 0, 0, 0, 0)
        : alignToMondayStart(calendarStart);

    const rangeEnd =
      calendarView === "day"
        ? new Date(calendarStart.getFullYear(), calendarStart.getMonth(), calendarStart.getDate(), 23, 59, 59, 999)
        : calendarView === "month"
        ? new Date(calendarStart.getFullYear(), calendarStart.getMonth() + 1, 0, 23, 59, 59, 999)
        : new Date(addDays(rangeStart, 6).setHours(23, 59, 59, 999));

    const hasInRange = previewEvents.some(
      (event) => event.start >= rangeStart && event.start <= rangeEnd
    );

    if (!hasInRange) {
      const earliestStart = previewEvents.reduce((min, event) =>
        event.start < min ? event.start : min
      , previewEvents[0].start);
      hasAutoJumpedRef.current = true;
      setCalendarStart(alignToMondayStart(new Date(earliestStart)));
    }
  }, [calendarStart, calendarView, previewEvents]);


  const handleOpenCreate = () => {
    setEditingId(null);
    setOccurrenceContext(null);
    setFormState(emptyForm);
    setInitialFormSnapshot(toComparableSnapshot(emptyForm));
    setFormOpen(true);
  };

  const shiftCalendar = (weeks) => {
    setCalendarStart((prev) => alignToMondayStart(addWeeks(prev, weeks)));
  };

  const resetCalendarStart = () => {
    setCalendarStart(alignToMondayStart(new Date()));
  };

  function normalizeDateValue(value) {
    if (!value) return null;
    if (value instanceof Date) {
      const copy = new Date(value.getTime());
      copy.setSeconds(0, 0);
      return copy;
    }
    if (typeof value === "string") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const parsed = parseLocalDateString(value);
        if (!parsed) return null;
        parsed.setSeconds(0, 0);
        return parsed;
      }
      const dateFromString = new Date(value);
      if (Number.isNaN(dateFromString.getTime())) return null;
      dateFromString.setSeconds(0, 0);
      return dateFromString;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    date.setSeconds(0, 0);
    return date;
  }

  function toComparableSnapshot(state) {
    const normalizeDateField = (value) => {
      const input = toDateInput(value);
      if (!input) return "";
      const normalized = normalizeDateValue(input);
      return normalized ? toLocalDateString(normalized) : "";
    };

    return {
      customerName: String(state.customerName || "").trim(),
      phoneNumber: String(state.phoneNumber || "").trim(),
      barber: String(state.barber || "").trim(),
      weekday: Number(state.weekday),
      timeOfDay: normalizeTimeString(state.timeOfDay, "09:00"),
      durationMin: Number(state.durationMin),
      cadenceWeeks: Number(state.cadenceWeeks),
      startFrom: normalizeDateField(state.startFrom),
      until: normalizeDateField(state.until),
      maxOccurrences: Number(state.maxOccurrences),
    };
  }

  function combineDateAndTime(dateString, timeString) {
    if (!dateString || !timeString) return null;
    const base = parseLocalDateString(dateString);
    if (!base) return null;
    const [hours, minutes] = timeString.split(":").map(Number);
    base.setHours(hours || 0, minutes || 0, 0, 0);
    return base;
  }

  const computeNextDatesFromHistory = (customer, options = {}) => {
    if (!customer) return null;

    const cadence = Number(customer.cadenceWeeks) || 1;
    const weekday = Number(customer.weekday ?? 1);
    const timeString = normalizeTimeString(customer.timeOfDay, "09:00");
    const [hours, minutes] = timeString.split(":").map(Number);

    const startReferenceInput = customer.startFrom ? toDateInput(customer.startFrom) : "";
    let baseStart = startReferenceInput ? parseLocalDateString(startReferenceInput) : null;
    if (!baseStart) {
      baseStart = alignToMondayStart(new Date());
    }
    baseStart.setHours(0, 0, 0, 0);

    const firstOccurrence = alignToWeekday(baseStart, weekday);
    firstOccurrence.setHours(hours || 0, minutes || 0, 0, 0);

    let lastOccurrence = new Date(firstOccurrence.getTime());
    let occurrencesCount = 1;

    const untilInput = customer.until ? toDateInput(customer.until) : "";
    let untilDate = untilInput ? parseLocalDateString(untilInput) : null;
    if (untilDate) {
      untilDate.setHours(hours || 0, minutes || 0, 0, 0);
    }

    const maxOccurrencesValue = customer.maxOccurrences
      ? Number(customer.maxOccurrences)
      : undefined;
    const hasMaxLimit = Number.isFinite(maxOccurrencesValue) && maxOccurrencesValue > 0;
    const hasUntilLimit = Boolean(untilDate);

    let spanWeeks = 0;

    if (hasMaxLimit || hasUntilLimit) {
      while (true) {
        const potentialNext = addWeeks(lastOccurrence, cadence);
        const nextCount = occurrencesCount + 1;
        const exceedsUntil = hasUntilLimit && untilDate && potentialNext > untilDate;
        const exceedsMax = hasMaxLimit && nextCount > maxOccurrencesValue;

        if (exceedsUntil || exceedsMax) break;

        lastOccurrence = potentialNext;
        occurrencesCount = nextCount;
      }

      spanWeeks = cadence * Math.max(occurrencesCount - 1, 0);
    } else {
      lastOccurrence = null;
    }

    const actualLast = options?.lastActualStart instanceof Date ? options.lastActualStart : null;
    if (actualLast && !Number.isNaN(actualLast.getTime())) {
      const alignedActual = new Date(actualLast.getTime());
      alignedActual.setSeconds(0, 0);
      const nextStart = addWeeks(alignedActual, cadence);
      const newUntil = spanWeeks > 0 ? addWeeks(nextStart, spanWeeks) : undefined;
      return { nextStart, newUntil };
    }

    if (lastOccurrence) {
      const nextStart = addWeeks(lastOccurrence, cadence);
      const newUntil = spanWeeks > 0 ? addWeeks(nextStart, spanWeeks) : undefined;
      return { nextStart, newUntil };
    }

    const fallbackStart = getNextStartFromToday(customer);
    const newUntil = spanWeeks > 0 ? addWeeks(fallbackStart, spanWeeks) : undefined;

    return { nextStart: fallbackStart, newUntil };
  };

  const getNextStartFromToday = (customer) => {
    const cadence = Number(customer.cadenceWeeks) || 1;
    const weekday = Number(customer.weekday ?? 1);
    const timeString = normalizeTimeString(customer.timeOfDay, "09:00");
    const [hours, minutes] = timeString.split(":").map(Number);

    const today = new Date();
    const midnight = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
      0
    );
    let nextDate = alignToWeekday(midnight, weekday);
    const firstOccurrence = new Date(nextDate.getTime());
    firstOccurrence.setHours(hours || 0, minutes || 0, 0, 0);

    if (firstOccurrence <= today) {
      nextDate = addWeeks(nextDate, cadence);
    }

    nextDate.setHours(hours || 0, minutes || 0, 0, 0);
    return nextDate;
  };

  const handleEdit = (customer, occurrenceDate, options = {}) => {
    setEditingId(customer._id);

    const isOccurrenceEdit = Boolean(occurrenceDate);
    let occurrence = isOccurrenceEdit ? normalizeDateValue(occurrenceDate) : null;
    let originalOccurrence = options.originalStart ? normalizeDateValue(options.originalStart) : null;

    if (!originalOccurrence && occurrence) {
      originalOccurrence = new Date(occurrence.getTime());
    }

    if (!occurrence && isOccurrenceEdit) {
      occurrence = customer.startFrom ? normalizeDateValue(customer.startFrom) : null;
    }

    if (originalOccurrence && occurrence) {
      setOccurrenceContext({
        originalStart: originalOccurrence.toISOString(),
      });
    } else {
      setOccurrenceContext(null);
    }

    const startReference =
      occurrence || (customer.startFrom ? new Date(customer.startFrom) : new Date());
    const startIso = startReference.toISOString().slice(0, 10);
    const derivedTime = isOccurrenceEdit
      ? formatTimeValue(occurrence || new Date(startReference))
      : normalizeTimeString(customer.timeOfDay, "09:00");
    const derivedWeekday = occurrence ? ((occurrence.getDay() + 7) % 7) : customer.weekday ?? 1;
    const effectiveBarber = options.overrideBarber || customer.barber || "ΛΕΜΟ";
    const effectiveDuration = options.overrideDuration ?? customer.durationMin ?? 40;

    const nextFormState = {
      customerName: customer.customerName || "",
      phoneNumber: customer.phoneNumber || "",
      barber: effectiveBarber,
      weekday: derivedWeekday,
      timeOfDay: derivedTime,
      durationMin: effectiveDuration,
      cadenceWeeks: customer.cadenceWeeks ?? 1,
      startFrom: startIso,
      until: toDateInput(customer.until),
      maxOccurrences: customer.maxOccurrences ? String(customer.maxOccurrences) : "",
    };
    setFormState(nextFormState);
    setInitialFormSnapshot(toComparableSnapshot(nextFormState));
    setFormOpen(true);
  };

  const handleDelete = async (customer) => {
    const confirmed = await MySwal.fire({
      title: "Είστε σίγουρος;",
      text: `Θα αφαιρεθεί ο επαναλαμβανόμενος πελάτης ${customer.customerName}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#a78bfa",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ναι, διαγραφή!",
      cancelButtonText: "Ακύρωση",
    });

    if (!confirmed.isConfirmed) return;

    try {
      await deleteAutoCustomer(customer._id);
      MySwal.fire({
        title: "✅ Διαγραφή",
        text: "Ο επαναλαμβανόμενος πελάτης αφαιρέθηκε με επιτυχία.",
        icon: "success",
        timer: 1600,
        showConfirmButton: false,
      });
      loadCustomers();
    } catch (error) {
      console.error(error);
      MySwal.fire({
        title: "Σφάλμα",
        text: error.message || "Αποτυχία διαγραφής.",
        icon: "error",
      });
    }
  };

  const handleFormChange = (field, value) => {
    setFormState((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "customerName") {
        const lookup = directoryByName.get(String(value).trim().toLowerCase());
        if (lookup?.phoneNumber) {
          next.phoneNumber = lookup.phoneNumber;
        }
      }
      return next;
    });
  };

  function timeStringToDate(timeString) {
    if (!timeString) return null;
    const [hours, minutes] = timeString.split(":").map(Number);
    const date = new Date(1970, 0, 1, hours || 0, minutes || 0, 0, 0);
    return date;
  }

  function formatTimeValue(date) {
    if (!date) return "";
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  const parseFormPayload = () => {
    const untilIso = toUtcIsoFromLocalDate(formState.until);
    let maxOccurrencesValue = formState.maxOccurrences ? Number(formState.maxOccurrences) : undefined;

    if ((!maxOccurrencesValue || Number.isNaN(maxOccurrencesValue)) && !untilIso) {
      maxOccurrencesValue = 10;
    }

    const payload = {
      customerName: formState.customerName.trim(),
      phoneNumber: formState.phoneNumber.trim(),
      barber: formState.barber,
      weekday: Number(formState.weekday),
      timeOfDay: formState.timeOfDay,
      durationMin: Number(formState.durationMin) || 40,
      cadenceWeeks: Number(formState.cadenceWeeks) || 1,
      startFrom: toUtcIsoFromLocalDate(formState.startFrom),
      until: untilIso,
      maxOccurrences: maxOccurrencesValue,
    };
    return payload;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (formSubmitting) return;

    if (occurrenceContext && editingId) {
      const originalDate = normalizeDateValue(occurrenceContext.originalStart);
      const targetDate = combineDateAndTime(formState.startFrom, formState.timeOfDay);

      if (!originalDate || !targetDate) {
        toast.error("Η ημερομηνία και η ώρα είναι υποχρεωτικές για την ενημέρωση.");
        return;
      }

      setFormSubmitting(true);
      try {
        await overrideAutoCustomerOccurrence(editingId, {
          occurrence: originalDate.toISOString(),
          overrideStart: targetDate.toISOString(),
          durationMin: Number(formState.durationMin) || 40,
          barber: formState.barber,
        });
        toast.success("Η εμφάνιση ενημερώθηκε μόνο για αυτή την ημερομηνία.");
        setFormOpen(false);
        setEditingId(null);
        setOccurrenceContext(null);
        setFormState(emptyForm);
        setInitialFormSnapshot(null);
        loadCustomers();
      } catch (error) {
        console.error(error);
        toast.error(error.message || "Αποτυχία ενημέρωσης εμφάνισης.");
      } finally {
        setFormSubmitting(false);
      }
      return;
    }

    const payload = parseFormPayload();

    if (!payload.customerName || !payload.phoneNumber) {
      toast.error("Το όνομα και το τηλέφωνο είναι υποχρεωτικά.");
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingId) {
        await updateAutoCustomer(editingId, payload);
        toast.success("Ο πελάτης ενημερώθηκε.");
      } else {
        await createAutoCustomer(payload);
        toast.success("Ο πελάτης δημιουργήθηκε.");
      }
      setFormOpen(false);
      setEditingId(null);
      setOccurrenceContext(null);
      setFormState(emptyForm);
      setInitialFormSnapshot(null);
      loadCustomers();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Αποτυχία αποθήκευσης.");
    } finally {
      setFormSubmitting(false);
    }
  };

  useEffect(() => {
    if (!formOpen && !pushOpen) return;

    const handleClickOutside = (event) => {
      const target = event.target;
      if (target.closest && target.closest(".react-datepicker")) return;

      if (formOpen && formRef.current && !formRef.current.contains(target)) {
        setFormOpen(false);
        setEditingId(null);
        setOccurrenceContext(null);
        setFormState(emptyForm);
        setInitialFormSnapshot(null);
      }

      if (pushOpen && pushRef.current && !pushRef.current.contains(target)) {
        setPushOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [formOpen, pushOpen]);

  const handlePushSubmit = async (e) => {
    e.preventDefault();

    if (pushSubmitting) return;

    if (formOpen || hasUnsavedChanges || formSubmitting) {
      toast.error(
        "Υπάρχουν μη αποθηκευμένες αλλαγές. Αποθήκευσε πρώτα και μετά κάνε Push."
      );
      return;
    }

    if (!pushState.from) {
      toast.error("Η ημερομηνία έναρξης είναι υποχρεωτική.");
      return;
    }

    const confirmPush = await MySwal.fire({
      title: "Προσοχή",
      text:
        "Αυτό θα δημιουργήσει ΚΑΝΟΝΙΚΑ ραντεβού στο κύριο ημερολόγιο (Calendar page). Θέλεις να συνεχίσεις;",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ναι, κάνε Push",
      cancelButtonText: "Άκυρο",
    });

    if (!confirmPush.isConfirmed) return;

    setPushSubmitting(true);

    try {
      const payload = {
        from: toUtcIsoFromLocalDate(pushState.from),
        to: pushState.to ? toUtcIsoFromLocalDate(pushState.to) : undefined,
        dryRun: false,
      };
      toast("Οι πελάτες προστίθενται στο ημερολόγιο...");
      setPushOpen(false);
      await pushAutoCustomers(payload);
      toast.success("Οι επαναλαμβανόμενοι πελάτες προστέθηκαν.");

      loadCustomers();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Αποτυχία δημιουργίας ραντεβού.");
      setPushOpen(true);
    } finally {
      setPushSubmitting(false);
    }
  };

  const buildUpdatePayloadFromCustomer = (customer, startDate, options = {}) => {
    const timeOfDay = normalizeTimeString(customer.timeOfDay, "09:00");
    const cadenceWeeks = Number(customer.cadenceWeeks) || 1;
    const weekday = Number(customer.weekday ?? 1);
    const hasUntilOverride = Object.prototype.hasOwnProperty.call(options, "untilOverride");
    const untilInput = hasUntilOverride
      ? toDateInput(options.untilOverride)
      : toDateInput(customer.until);
    const untilIso = untilInput ? toUtcIsoFromLocalDate(untilInput) : undefined;
    const maxOccurrencesValue = customer.maxOccurrences
      ? Number(customer.maxOccurrences)
      : undefined;

    return {
      customerName: customer.customerName || "",
      phoneNumber: customer.phoneNumber || "",
      barber: customer.barber || "ΛΕΜΟ",
      weekday,
      timeOfDay,
      durationMin: Number(customer.durationMin) || 40,
      cadenceWeeks,
      startFrom: startDate ? toUtcIsoFromLocalDate(toLocalDateString(startDate)) : undefined,
      until: untilIso,
      maxOccurrences: Number.isFinite(maxOccurrencesValue) ? maxOccurrencesValue : undefined,
    };
  };

  const handleRenewAll = async () => {
    if (!Array.isArray(customers) || customers.length === 0) {
      toast("Δεν υπάρχουν επαναλαμβανόμενοι πελάτες για ανανέωση.");
      return;
    }

    setRenewing(true);
    try {
      let lastAppointmentsByCustomer = {};
      try {
        const customerIds = customers
          .map((customer) => (customer && customer._id ? String(customer._id) : null))
          .filter(Boolean);
        lastAppointmentsByCustomer = await fetchAutoCustomerLastAppointments(customerIds);
      } catch (historyError) {
        console.error("Failed to fetch last saved appointments for auto customers", historyError);
      }

      const customersToUpdate = customers.filter((customer) => customer && customer._id);
      const updatedPayloads = customersToUpdate.map((customer) => {
          const customerKey =
            customer && customer._id ? (typeof customer._id === "string" ? customer._id : String(customer._id)) : "";
          const lastEntry = customerKey ? lastAppointmentsByCustomer?.[customerKey] : undefined;
          const lastActualStart = lastEntry?.appointmentDateTime
            ? new Date(lastEntry.appointmentDateTime)
            : null;
          const historicalWindow = computeNextDatesFromHistory(customer, { lastActualStart });
          const nextDate = historicalWindow?.nextStart || getNextStartFromToday(customer);
          return buildUpdatePayloadFromCustomer(customer, nextDate, {
            ...(historicalWindow?.newUntil ? { untilOverride: historicalWindow.newUntil } : {}),
          });
        });

      const updates = updatedPayloads.map((payload, index) =>
        updateAutoCustomer(customersToUpdate[index]._id, payload)
      );

      await Promise.all(updates);
      await loadCustomers();
      toast.success(
        "Οι επαναλαμβανόμενοι πελάτες ανανεώθηκαν. Έλεγξε το preview και μετά κάνε Push στο κύριο ημερολόγιο."
      );
      const earliestNextStartFrom = updatedPayloads
        .map((payload) => (payload?.startFrom ? new Date(payload.startFrom) : null))
        .filter((date) => date && !Number.isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime())[0];
      if (earliestNextStartFrom) {
        setCalendarStart(alignToMondayStart(new Date(earliestNextStartFrom)));
      }
    } catch (error) {
      console.error("Failed to renew auto customers", error);
      toast.error(error?.message || "Αποτυχία ανανέωσης πελατών.");
    } finally {
      setRenewing(false);
    }
  };

  const pushBlocked = formOpen || formSubmitting || hasUnsavedChanges;
  const newTooltipText = "";
  const renewTooltipText =
    "Η ανανέωση ενημερώνει τους recurring πελάτες και το preview. Δεν δημιουργεί κανονικά ραντεβού. Για να αποθηκευτούν στο κύριο ημερολόγιο, πάτησε Push.";
  const pushTooltipText =
    "Αποθήκευσε πρώτα τις αλλαγές σου για να κάνεις Push στο κύριο ημερολόγιο.";

  return (
    <div className="h-full text-gray-100">
      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6">
        <header className="rounded-xl border border-white/10 bg-white/5 p-6 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">Επαναλαμβανόμενοι Πελάτες</h1>
              <p className="text-sm text-gray-400">
                Διαχειριστείτε τις επαναλαμβανόμενες κρατήσεις και δημιουργήστε ραντεβού μαζικά.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 items-start justify-start lg:justify-end">
              <div className="relative group">
                <button
                  onClick={handleOpenCreate}
                  className="h-10 bg-purple-600 hover:brightness-110 text-white px-4 rounded-lg text-sm font-medium transition shadow-sm"
                  aria-label="Νέος Πελάτης"
                >
                  Νέος Πελάτης
                </button>
                {newTooltipText && (
                  <div className="pointer-events-none absolute left-0 top-full mt-2 w-64 rounded-lg border border-white/10 bg-black/80 px-3 py-2 text-xs leading-snug text-gray-200 opacity-0 translate-y-1 transition group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 z-50">
                    <span className="absolute -top-1 left-4 h-2 w-2 rotate-45 bg-black/80 border-l border-t border-white/10"></span>
                    {newTooltipText}
                  </div>
                )}
              </div>
              <div className="relative group">
                <button
                  onClick={handleRenewAll}
                  disabled={renewing || loading}
                  className="h-10 bg-emerald-600 hover:brightness-110 disabled:bg-gray-700 disabled:text-gray-400 text-white px-4 rounded-lg text-sm font-medium transition shadow-sm"
                  aria-label="Η ανανέωση ενημερώνει τους recurring πελάτες και το preview. Δεν δημιουργεί κανονικά ραντεβού. Για να αποθηκευτούν στο κύριο ημερολόγιο, πάτησε Push."
                >
                  {renewing ? "Ανανέωση (Preview)..." : "Ανανέωση (Preview)"}
                </button>
                {renewTooltipText && (
                  <div className="pointer-events-none absolute left-0 top-full mt-2 w-64 rounded-lg border border-white/10 bg-black/80 px-3 py-2 text-xs leading-snug text-gray-200 opacity-0 translate-y-1 transition group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 z-50">
                    <span className="absolute -top-1 left-4 h-2 w-2 rotate-45 bg-black/80 border-l border-t border-white/10"></span>
                    {renewTooltipText}
                  </div>
                )}
              </div>
              <div className="relative group">
                <button
                  onClick={() => {
                    setPushOpen(true);
                  }}
                  disabled={pushBlocked}
                  className="h-10 bg-blue-500 hover:brightness-110 disabled:bg-gray-700 disabled:text-gray-400 text-white px-4 rounded-lg text-sm font-medium transition shadow-sm"
                  aria-label="Αποθήκευσε πρώτα τις αλλαγές σου για να κάνεις Push στο κύριο ημερολόγιο."
                >
                  Push στο Ημερολόγιο
                </button>
                {pushTooltipText && (
                  <div className="pointer-events-none absolute left-0 top-full mt-2 w-64 rounded-lg border border-white/10 bg-black/80 px-3 py-2 text-xs leading-snug text-gray-200 opacity-0 translate-y-1 transition group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 z-50">
                    <span className="absolute -top-1 left-4 h-2 w-2 rotate-45 bg-black/80 border-l border-t border-white/10"></span>
                    {pushTooltipText}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <section className="bg-gray-800 border border-gray-700 rounded-xl shadow-lg p-3 sm:p-4">
          <button
            type="button"
            onClick={() => setListOpen((prev) => !prev)}
            className="flex w-full items-center justify-between mb-4 text-left"
            aria-expanded={listOpen}
          >
            <h2 className="text-lg font-semibold">
              Λίστα Πελατών
              {!loading && (
                <span className="ml-2 text-sm text-gray-400">({customers.length})</span>
              )}
            </h2>
            <span className="text-sm text-gray-400">{listOpen ? "Κλείσιμο" : "Άνοιγμα"}</span>
          </button>

          {listOpen && (
            <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-700 text-gray-200 uppercase text-xs">
                <tr>
                  <th className="px-3 py-2">Πελάτης</th>
                  <th className="px-3 py-2">Barber</th>
                  <th className="px-3 py-2">Ημέρα</th>
                  <th className="px-3 py-2">Ώρα</th>
                  <th className="px-3 py-2">Συχνότητα</th>
                  <th className="px-3 py-2">Από</th>
                  <th className="px-3 py-2">Έως</th>
                  <th className="px-3 py-2 text-right">Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                      Φόρτωση...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                      Δεν υπάρχουν επαναλαμβανόμενοι πελάτες.
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr
                      key={customer._id}
                      className="border-t border-gray-700 hover:bg-gray-750 transition"
                    >
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-100">{customer.customerName}</div>
                        <div className="text-xs text-gray-400">{customer.phoneNumber}</div>
                      </td>
                      <td className="px-3 py-2">{customer.barber}</td>
                      <td className="px-3 py-2">
                        {
                          WEEKDAY_OPTIONS.find((opt) => opt.value === customer.weekday)?.label ||
                          customer.weekday
                        }
                      </td>
                      <td className="px-3 py-2">{customer.timeOfDay}</td>
                      <td className="px-3 py-2">
                        {CADENCE_OPTIONS.find((opt) => opt.value === customer.cadenceWeeks)?.label ||
                          `${customer.cadenceWeeks} εβδομάδες`}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-400">
                        {formatDateDisplay(customer.startFrom)}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-400">
                        {formatDateDisplay(customer.until)}
                      </td>
                      <td className="px-3 py-2 text-right space-x-2">
                        <button
                          className="text-blue-400 hover:text-blue-300 text-sm"
                          onClick={() => handleEdit(customer)}
                        >
                          Επεξεργασία
                        </button>
                        <button
                          className="text-rose-400 hover:text-rose-300 text-sm"
                          onClick={() => handleDelete(customer)}
                        >
                          Διαγραφή
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          )}

          {listOpen && (
            <div className="sm:hidden space-y-3">
            {loading ? (
              <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 text-center text-gray-400">
                Φόρτωση...
              </div>
            ) : customers.length === 0 ? (
              <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 text-center text-gray-400">
                Δεν υπάρχουν επαναλαμβανόμενοι πελάτες.
              </div>
            ) : (
              customers.map((customer) => (
                <article
                  key={customer._id}
                  className="rounded-xl border border-gray-700 bg-gray-900 p-4 space-y-3 shadow-inner"
                >
                  <div>
                    <div className="text-base font-semibold text-gray-100">
                      {customer.customerName}
                    </div>
                    <div className="text-xs text-gray-400">{customer.phoneNumber}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-300">
                    <span className="font-medium text-gray-400">Barber</span>
                    <span>{customer.barber}</span>
                    <span className="font-medium text-gray-400">Ημέρα</span>
                    <span>
                      {WEEKDAY_OPTIONS.find((opt) => opt.value === customer.weekday)?.label ||
                        customer.weekday}
                    </span>
                    <span className="font-medium text-gray-400">Ώρα</span>
                    <span>{customer.timeOfDay}</span>
                    <span className="font-medium text-gray-400">Συχνότητα</span>
                    <span>
                      {CADENCE_OPTIONS.find((opt) => opt.value === customer.cadenceWeeks)?.label ||
                        `${customer.cadenceWeeks} εβδομάδες`}
                    </span>
                    <span className="font-medium text-gray-400">Έναρξη</span>
                    <span>{formatDateDisplay(customer.startFrom)}</span>
                    <span className="font-medium text-gray-400">Λήξη</span>
                    <span>{formatDateDisplay(customer.until)}</span>
                  </div>
                  <div className="flex flex-col gap-2 pt-3">
                    <button
                      className="w-full bg-blue-500/15 text-blue-100 border border-blue-400/40 px-3 py-2 rounded-lg text-xs font-medium hover:bg-blue-500/25"
                      onClick={() => handleEdit(customer)}
                    >
                      Επεξεργασία
                    </button>
                    <button
                      className="w-full bg-rose-500/15 text-rose-100 border border-rose-400/40 px-3 py-2 rounded-lg text-xs font-medium hover:bg-rose-500/25"
                      onClick={() => handleDelete(customer)}
                    >
                      Διαγραφή
                    </button>
                  </div>
                </article>
              ))
            )}
            </div>
          )}
        </section>

        <section className="rounded-xl">
          <div className="flex flex-col gap-3 mb-2 px-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-100">
              <CalendarClock size={18} className="text-purple-300" />
              Προβολή στο Ημερολόγιο
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { value: "month", label: "Μήνας" },
                { value: "week", label: "Εβδομάδα" },
                { value: "day", label: "Ημέρα" },
                { value: "agenda", label: "Ατζέντα" },
              ].map((view) => (
                <button
                  key={view.value}
                  type="button"
                  onClick={() => setCalendarView(view.value)}
                  className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wide transition ${
                    calendarView === view.value
                      ? "border-purple-500 text-purple-200 bg-purple-600/20"
                      : "border-gray-600 text-gray-200 hover:bg-gray-700"
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-400 sm:hidden">Υπολογισμοί βασισμένοι στους αποθηκευμένους πελάτες</span>
              <span className="hidden text-xs text-gray-400 sm:inline">Υπολογισμοί βασισμένοι στους αποθηκευμένους πελάτες</span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => shiftCalendar(-4)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-600 text-gray-200 hover:bg-gray-700"
                aria-label="Προηγούμενη εβδομάδα"
              >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={resetCalendarStart}
                  className="rounded-full border border-purple-500 px-3 py-1 text-xs uppercase tracking-wide text-purple-200 hover:bg-purple-600/20"
                >
                  Σήμερα
                </button>
              <button
                type="button"
                onClick={() => shiftCalendar(4)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-600 text-gray-200 hover:bg-gray-700"
                aria-label="Επόμενη εβδομάδα"
              >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
          <div
            className="auto-customers-preview overflow-x-auto max-w-full min-h-0"
            style={{ height: previewCalHeight, width: "100%" }}
          >
            <CalendarComponent
              events={previewEvents}
              date={calendarStart}
              onNavigate={(nextDate) => setCalendarStart(nextDate)}
              view={calendarView}
              onView={setCalendarView}
              showToolbar={false}
              onSelectSlot={(slotInfo) => {
                const slotStart = slotInfo?.start instanceof Date ? slotInfo.start : null;
                if (!slotStart) return;
                const nextFormState = {
                  ...emptyForm,
                  weekday: slotStart.getDay(),
                  timeOfDay: formatTimeValue(slotStart),
                  startFrom: toLocalDateString(slotStart),
                };
                setEditingId(null);
                setOccurrenceContext(null);
                setFormState(nextFormState);
                setInitialFormSnapshot(toComparableSnapshot(nextFormState));
                setFormOpen(true);
              }}
              onUpdateAppointment={async ({ event, start, end }) => {
                if (!event?.autoCustomerId || !event?.originalStart) return;
                const startDate = new Date(start);
                const endDate = new Date(end);
                try {
                  await overrideAutoCustomerOccurrence(event.autoCustomerId, {
                    occurrence: new Date(event.originalStart).toISOString(),
                    overrideStart: startDate.toISOString(),
                    durationMin: Math.round((endDate - startDate) / 60000),
                    barber: event.barber,
                  });
                  await loadCustomers();
                } catch (error) {
                  console.error(error);
                  toast.error(error.message || "Αποτυχία ενημέρωσης εμφάνισης.");
                }
              }}
              onSelectEvent={(event) => {
                const customer = customers.find((item) => item?._id === event.autoCustomerId);
                if (!customer) return;
                handleEdit(customer, event.originalStart);
              }}
            />
          </div>
        </section>
      </div>

      {/* Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-3 sm:px-4 py-6">
          <div
            ref={formRef}
            className="w-full max-w-xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {editingId ? "Επεξεργασία Πελάτη" : "Νέος Επαναλαμβανόμενος Πελάτης"}
              </h2>
              <button
                onClick={() => {
                  setFormOpen(false);
                  setEditingId(null);
                  setInitialFormSnapshot(null);
                }}
                className="text-gray-400 hover:text-gray-200 text-xl"
              >
                &times;
              </button>
            </div>
            {occurrenceContext && (
              <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Η αλλαγή ημερομηνίας/ώρας θα εφαρμοστεί μόνο στο ραντεβού της{" "}
                {new Date(occurrenceContext.originalStart).toLocaleString("el-GR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                . Οι υπόλοιπες εμφανίσεις θα παραμείνουν ως έχουν.
              </div>
            )}
            <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={handleFormSubmit}>
              <label className="flex flex-col text-sm gap-1">
                Όνομα Πελάτη
                <input
                  type="text"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formState.customerName}
                  onChange={(e) => handleFormChange("customerName", e.target.value)}
                  required
                  list="known-customers"
                />
                <datalist id="known-customers">
                  {directory.map((customer) => (
                    <option key={customer._id || customer.name} value={customer.name}>
                      {customer.phoneNumber}
                    </option>
                  ))}
                </datalist>
              </label>
              <label className="flex flex-col text-sm gap-1">
                Τηλέφωνο
                <input
                  type="tel"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formState.phoneNumber}
                  onChange={(e) => handleFormChange("phoneNumber", e.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Barber
                <select
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formState.barber}
                  onChange={(e) => handleFormChange("barber", e.target.value)}
                >
                  {BARBER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-sm gap-1">
                Ημέρα
                <select
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formState.weekday}
                  onChange={(e) => handleFormChange("weekday", Number(e.target.value))}
                >
                  {WEEKDAY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-sm gap-1">
                Ώρα
                <DatePicker
                  selected={timeStringToDate(formState.timeOfDay)}
                  onChange={(date) =>
                    handleFormChange(
                      "timeOfDay",
                      date ? formatTimeValue(new Date(date.getTime())) : formState.timeOfDay
                    )
                  }
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={5}
                  timeCaption="Ώρα"
                  dateFormat="hh:mm aa"
                  locale="el"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#a78bfa]"
                  calendarClassName="!bg-[#161a23] !text-[#ede9fe] !rounded-lg !border !border-[#a78bfa] !shadow-lg"
                  wrapperClassName="w-full"
                  placeholderText="Επιλέξτε ώρα"
                  timeClassName={() => "!bg-[#181a23] !text-[#ede9fe] !border-b !border-[#1f1f2d]"}
                  required
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Διάρκεια (λεπτά)
                <input
                  type="number"
                  min={5}
                  max={600}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formState.durationMin}
                  onChange={(e) => handleFormChange("durationMin", e.target.value)}
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Συχνότητα
                <select
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formState.cadenceWeeks}
                  onChange={(e) => handleFormChange("cadenceWeeks", Number(e.target.value))}
                >
                  {CADENCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-sm gap-1">
                Πλήθος ραντεβού
                <input
                  type="number"
                  min={1}
                  max={52}
                  list="preset-occurrences"
                  placeholder="Επιλέξτε ή πληκτρολογήστε"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={formState.maxOccurrences}
                  onChange={(e) => handleFormChange("maxOccurrences", e.target.value)}
                />
                <datalist id="preset-occurrences">
                  <option value="1">1</option>
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                </datalist>

              </label>
              <label className="flex flex-col text-sm gap-1">
                Έναρξη
                <DatePicker
                  selected={formState.startFrom ? parseLocalDateString(formState.startFrom) : null}
                  onChange={(date) =>
                    handleFormChange("startFrom", date ? toLocalDateString(date) : "")
                  }
                  dateFormat="dd/MM/yyyy"
                  locale="el"
                  className="bg-[#181a23] border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#a78bfa]"
                  calendarClassName="!bg-[#161a23] !text-[#ede9fe] !rounded-lg !border !border-[#a78bfa]"
                  wrapperClassName="w-full"
                  placeholderText="Επιλέξτε ημερομηνία"
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Λήξη (προαιρετικό)
                <DatePicker
                  selected={formState.until ? parseLocalDateString(formState.until) : null}
                  onChange={(date) =>
                    handleFormChange("until", date ? toLocalDateString(date) : "")
                  }
                  dateFormat="dd/MM/yyyy"
                  locale="el"
                  className="bg-[#181a23] border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#a78bfa]"
                  calendarClassName="!bg-[#161a23] !text-[#ede9fe] !rounded-lg !border !border-[#a78bfa]"
                  wrapperClassName="w-full"
                  placeholderText="Επιλέξτε ημερομηνία"
                  isClearable
                />
              </label>
              <div className="col-span-1 sm:col-span-2 flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingId(null);
                    setOccurrenceContext(null);
                    setFormState(emptyForm);
                    setInitialFormSnapshot(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Άκυρο
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Αποθήκευση
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Push Modal */}
      {pushOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div
            ref={pushRef}
            className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Push στο Ημερολόγιο</h2>
              <button
                onClick={() => setPushOpen(false)}
                className="text-gray-400 hover:text-gray-200 text-xl"
              >
                &times;
              </button>
            </div>
            <form className="space-y-4" onSubmit={handlePushSubmit}>
              <label className="flex flex-col text-sm gap-1">
                Από
              <DatePicker
                  selected={pushState.from ? parseLocalDateString(pushState.from) : null}
                  onChange={(date) =>
                    setPushState((prev) => ({
                      ...prev,
                      from: date ? toLocalDateString(date) : "",
                    }))
                  }
                  dateFormat="dd/MM/yyyy"
                  locale="el"
                  className="bg-[#181a23] border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#a78bfa]"
                  calendarClassName="!bg-[#161a23] !text-[#ede9fe] !rounded-lg !border !border-[#a78bfa]"
                  wrapperClassName="w-full"
                  placeholderText="Επιλέξτε ημερομηνία"
                  required
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Έως (προαιρετικό)
              <DatePicker
                  selected={pushState.to ? parseLocalDateString(pushState.to) : null}
                  onChange={(date) =>
                    setPushState((prev) => ({
                      ...prev,
                      to: date ? toLocalDateString(date) : "",
                    }))
                  }
                  dateFormat="dd/MM/yyyy"
                  locale="el"
                  className="bg-[#181a23] border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#a78bfa]"
                  calendarClassName="!bg-[#161a23] !text-[#ede9fe] !rounded-lg !border !border-[#a78bfa]"
                  wrapperClassName="w-full"
                  placeholderText="Επιλέξτε ημερομηνία"
                  isClearable
                />
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPushOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Άκυρο
                </button>
                <button
                  type="submit"
                  disabled={pushSubmitting}
                  className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-700 disabled:text-gray-400 disabled:hover:bg-gray-700"
                >
                  Εκτέλεση
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoCustomersPage;
