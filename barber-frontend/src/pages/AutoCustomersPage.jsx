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
} from "../utils/api";
import AutoCustomersCalendar from "../_components/AutoCustomersCalendar";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import DatePicker, { registerLocale } from "react-datepicker";
import { ChevronLeft, ChevronRight, CalendarClock } from "lucide-react";
import el from "date-fns/locale/el";
import "react-datepicker/dist/react-datepicker.css";

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
  maxOccurrences: "5",
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

const AutoCustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formState, setFormState] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [occurrenceContext, setOccurrenceContext] = useState(null);
  const [pushOpen, setPushOpen] = useState(false);
  const [pushState, setPushState] = useState({
    from: toLocalDateString(new Date()),
    to: "",
  });
  const [directory, setDirectory] = useState([]);
  const formRef = useRef(null);
  const pushRef = useRef(null);
  const MySwal = useMemo(() => withReactContent(Swal), []);
  const [calendarStart, setCalendarStart] = useState(() => alignToMondayStart(new Date()));

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

  const handleOpenCreate = () => {
    setEditingId(null);
    setOccurrenceContext(null);
    setFormState(emptyForm);
    setFormOpen(true);
  };

  const shiftCalendar = (weeks) => {
    setCalendarStart((prev) => alignToMondayStart(addWeeks(prev, weeks)));
  };

  const resetCalendarStart = () => {
    setCalendarStart(alignToMondayStart(new Date()));
  };

  const handleCalendarEdit = (event) => {
    const customer = customers.find((c) => c._id === event.autoCustomerId);
    if (!customer) return;

    handleEdit(customer, event.start, {
      originalStart: event.originalStart,
      overrideBarber: event.overrideBarber,
      overrideDuration: event.overrideDuration,
    });
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

  function combineDateAndTime(dateString, timeString) {
    if (!dateString || !timeString) return null;
    const base = parseLocalDateString(dateString);
    if (!base) return null;
    const [hours, minutes] = timeString.split(":").map(Number);
    base.setHours(hours || 0, minutes || 0, 0, 0);
    return base;
  }

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

    setFormState({
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
    });
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
      maxOccurrencesValue = 5;
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

      if (occurrenceContext && editingId) {
        const originalDate = normalizeDateValue(occurrenceContext.originalStart);
        const targetDate = combineDateAndTime(formState.startFrom, formState.timeOfDay);

        if (!originalDate || !targetDate) {
          toast.error("Η ημερομηνία και η ώρα είναι υποχρεωτικές για την ενημέρωση.");
          return;
        }

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
        loadCustomers();
      } catch (error) {
        console.error(error);
        toast.error(error.message || "Αποτυχία ενημέρωσης εμφάνισης.");
      }
      return;
    }

    const payload = parseFormPayload();

    if (!payload.customerName || !payload.phoneNumber) {
      toast.error("Το όνομα και το τηλέφωνο είναι υποχρεωτικά.");
      return;
    }

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
      loadCustomers();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Αποτυχία αποθήκευσης.");
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

    if (!pushState.from) {
      toast.error("Η ημερομηνία έναρξης είναι υποχρεωτική.");
      return;
    }

    try {
      const payload = {
        from: toUtcIsoFromLocalDate(pushState.from),
        to: pushState.to ? toUtcIsoFromLocalDate(pushState.to) : undefined,
        dryRun: false,
      };
      await pushAutoCustomers(payload);
      toast.success("Οι επαναλαμβανόμενοι πελάτες προστέθηκαν.");

      loadCustomers();
      setPushOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Αποτυχία δημιουργίας ραντεβού.");
    }
  };

  return (
    <div className="h-full overflow-y-auto text-gray-100">
      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Επαναλαμβανόμενοι Πελάτες</h1>
            <p className="text-sm text-gray-400">
              Διαχειριστείτε τις επαναλαμβανόμενες κρατήσεις και δημιουργήστε ραντεβού μαζικά.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleOpenCreate}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition w-full sm:w-auto"
            >
              Νέος Πελάτης
            </button>
            <button
              onClick={() => {
                setPushOpen(true);
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition w-full sm:w-auto"
            >
              Push στο Ημερολόγιο
            </button>
          </div>
        </header>

        <section className="bg-gray-800 border border-gray-700 rounded-xl shadow-lg p-3 sm:p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Λίστα Πελατών</h2>
          </div>

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
                        {customer.startFrom ? toDateInput(customer.startFrom) : "-"}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-400">
                        {customer.until ? toDateInput(customer.until) : "-"}
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
        </section>

        <section className="rounded-xl">
          <div className="flex flex-col gap-3 mb-4 px-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-100">
              <CalendarClock size={18} className="text-purple-300" />
              Προβολή στο Ημερολόγιο
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-400 sm:hidden">Υπολογισμοί βασισμένοι στους αποθηκευμένους πελάτες</span>
              <span className="hidden text-xs text-gray-400 sm:inline">Υπολογισμοί βασισμένοι στους αποθηκευμένους πελάτες</span>
              <div className="flex items-center gap-2">
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
          <div className="h-[520px]">
            <AutoCustomersCalendar
              events={calendarEvents}
              startDate={calendarStart}
              onEdit={handleCalendarEdit}
            />
          </div>
        </section>
      </div>

      {/* Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div
            ref={formRef}
            className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {editingId ? "Επεξεργασία Πελάτη" : "Νέος Επαναλαμβανόμενος Πελάτης"}
              </h2>
              <button
                onClick={() => {
                  setFormOpen(false);
                  setEditingId(null);
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
              <div className="col-span-1 sm:col-span-2 flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingId(null);
                    setOccurrenceContext(null);
                    setFormState(emptyForm);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Άκυρο
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
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
                  className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white"
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
