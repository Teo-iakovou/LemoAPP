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

// Read-only preview of a card's own range: first occurrence on the chosen weekday
// on/after max(today, startFrom) (never in the past), then +(count-1)*cadence weeks.
// Mirrors the backend generation so the card shows what a plain push would produce.
const computeCardRange = ({ startFrom, weekday, cadenceWeeks, maxOccurrences }) => {
  const start0 = parseLocalDateString(startFrom);
  const count = Number(maxOccurrences);
  const wd = Number(weekday);
  const cadence = Number(cadenceWeeks) || 1;
  if (!start0 || !Number.isFinite(count) || count < 1 || !Number.isFinite(wd)) {
    return null;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const base = start0 < today ? today : start0;
  const start = alignToWeekday(base, wd);
  const end = addWeeks(start, (count - 1) * cadence);
  return { start, end };
};

const formatShortDate = (date) =>
  date.toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

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
  { value: "ΚΟΥΣΙΗΣ", label: "ΚΟΥΣΙΗΣ" },
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

// Auto-fill value for the "Λήξη" (until) field. Given the card's inputs, returns the
// local date string (YYYY-MM-DD) of the last appointment: the first occurrence of the
// chosen weekday on/after startFrom, then + cadence * (count - 1) weeks. Returns "" when
// the count is missing/invalid (open-ended → caller leaves "Λήξη" untouched).
const computeUntilValue = ({ startFrom, weekday, cadenceWeeks, maxOccurrences }) => {
  const start0 = parseLocalDateString(toDateInput(startFrom));
  const count = Number(maxOccurrences);
  const wd = Number(weekday);
  const cadence = Number(cadenceWeeks) || 1;
  if (!start0 || !Number.isFinite(count) || count < 1 || !Number.isFinite(wd)) {
    return "";
  }
  const firstDate = alignToWeekday(start0, wd);
  const end = addWeeks(firstDate, cadence * (count - 1));
  return toLocalDateString(end);
};

const AutoCustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formState, setFormState] = useState(emptyForm);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [initialFormSnapshot, setInitialFormSnapshot] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [occurrenceContext, setOccurrenceContext] = useState(null);
  const [pushOpen, setPushOpen] = useState(false);
  const [pushSubmitting, setPushSubmitting] = useState(false);
  const [pushState, setPushState] = useState({
    from: "", // optional floor; empty => each customer uses their own startFrom
    to: "", // optional hard stop; empty => open horizon (count/until govern)
    count: "", // optional per-push occurrence override (1..52); empty => per-customer maxOccurrences
  });
  // Read-only preview state, populated by a dryRun push (single source of truth with the
  // real push). previewMeta records what the shown preview reflects, for the badge.
  const [previewSummary, setPreviewSummary] = useState([]);
  const [previewMeta, setPreviewMeta] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [renewing, setRenewing] = useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState(() => new Set());
  const [customerSearch, setCustomerSearch] = useState("");
  const [directory, setDirectory] = useState([]);
  const [listOpen, setListOpen] = useState(true);
  const formRef = useRef(null);
  const pushRef = useRef(null);
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
  const selectedCount = selectedCustomerIds.size;
  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) => {
      const weekdayLabel =
        WEEKDAY_OPTIONS.find((opt) => opt.value === customer.weekday)?.label || "";
      return [
        customer.customerName,
        customer.phoneNumber,
        customer.barber,
        customer.timeOfDay,
        weekdayLabel,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [customers, customerSearch]);
  const visibleCustomerIds = useMemo(
    () => filteredCustomers.map((customer) => String(customer?._id || "")).filter(Boolean),
    [filteredCustomers]
  );
  const allVisibleSelected = useMemo(
    () => visibleCustomerIds.length > 0 && visibleCustomerIds.every((id) => selectedCustomerIds.has(id)),
    [visibleCustomerIds, selectedCustomerIds]
  );
  const toggleCustomerSelection = (customerId) => {
    if (!customerId) return;
    const key = String(customerId);
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const selectAllVisibleCustomers = () => {
    setSelectedCustomerIds(new Set(visibleCustomerIds));
  };
  const clearCustomerSelection = () => {
    setSelectedCustomerIds(new Set());
  };

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
      const availableIds = new Set(list.map((customer) => String(customer?._id || "")).filter(Boolean));
      setSelectedCustomerIds((prev) => {
        const next = new Set();
        prev.forEach((id) => {
          if (availableIds.has(id)) next.add(id);
        });
        return next;
      });
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

  // Read-only preview events, derived from the backend dryRun push summary — the SAME
  // generation logic as a real push, so the preview can never drift from reality. We
  // render only the occurrences that would actually be created (inserted/moved).
  const previewEvents = useMemo(
    () =>
      previewSummary
        .filter((entry) => entry.status === "inserted" || entry.status === "moved")
        .map((entry) => {
          const start = new Date(entry.scheduledFor);
          const durationMin = Number(entry.durationMin) || 40;
          const end = new Date(start.getTime() + durationMin * 60000);
          const barber = entry.barber || "ΛΕΜΟ";
          const customerName = entry.customerName || "Ραντεβού";
          return {
            id: `${entry.autoCustomerId || "auto"}-${start.getTime()}`,
            title: `${customerName} • ${barber}${entry.shiftMinutes ? " • moved" : ""}`,
            start,
            end,
            type: "appointment",
            barber,
            isOverride: Boolean(entry.shiftMinutes),
            isAutoCustomerPreview: true,
            autoCustomerId: entry.autoCustomerId,
            originalStart: start,
            durationMin,
          };
        }),
    [previewSummary]
  );

  // Whenever a new preview loads, anchor the calendar to the EARLIEST previewed
  // appointment (not to today). Anchor by the active view's unit so the view opens on the
  // right period: month view → the first day of that appointment's month (a Monday-align
  // could otherwise fall into the previous month); week/day view → that appointment's
  // week. Runs once per preview (keyed on previewEvents), so manual navigation afterwards
  // is preserved.
  useEffect(() => {
    if (!previewEvents.length) return;
    const earliestStart = previewEvents.reduce(
      (min, event) => (event.start < min ? event.start : min),
      previewEvents[0].start
    );
    const earliest = new Date(earliestStart);
    const target =
      calendarView === "month"
        ? new Date(earliest.getFullYear(), earliest.getMonth(), 1)
        : alignToMondayStart(earliest);
    setCalendarStart(target);
    // calendarView is read but intentionally NOT a trigger: re-anchoring only on new
    // preview data, not on a manual view switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewEvents]);


  const handleOpenCreate = () => {
    setEditingId(null);
    setOccurrenceContext(null);
    setFormState(emptyForm);
    setInitialFormSnapshot(toComparableSnapshot(emptyForm));
    setFormOpen(true);
  };

  // Navigate by the active view's own unit: month view pages by a whole month, day view
  // by a day, week/agenda by a week. (Previously every click jumped a fixed 4 weeks, which
  // skipped weeks in week view and mis-paged months.)
  const navigateCalendar = (direction) => {
    setCalendarStart((prev) => {
      if (calendarView === "month") {
        return new Date(prev.getFullYear(), prev.getMonth() + direction, 1);
      }
      if (calendarView === "day") {
        return addDays(prev, direction);
      }
      return alignToMondayStart(addWeeks(prev, direction));
    });
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

  // Renewal ("Ανανέωση προγράμματος"): continue a customer's recurring schedule from
  // where it currently ends. Anchor = the customer's latest appointment date (any date,
  // past or future), or today when they have none. New start = anchor + one cadence
  // interval, aligned to the customer's own weekday, then floored at today in whole
  // cadence steps so it is never in the past. New until = new start + cadence*(count-1)
  // weeks (same card formula). weekday/time/barber/cadence/count are never changed.
  const computeRenewal = (customer, anchorAppointmentDate) => {
    const cadence = Number(customer.cadenceWeeks) || 1;
    const weekday = Number(customer.weekday ?? 1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let anchor =
      anchorAppointmentDate instanceof Date
        ? new Date(anchorAppointmentDate.getTime())
        : anchorAppointmentDate
        ? new Date(anchorAppointmentDate)
        : null;
    const hadAppointment = Boolean(anchor && !Number.isNaN(anchor.getTime()));
    if (!hadAppointment) {
      anchor = new Date(today.getTime());
    }
    anchor.setHours(0, 0, 0, 0);

    // One cadence interval past the anchor, aligned to the customer's own weekday.
    let newStart = alignToWeekday(addWeeks(anchor, cadence), weekday);
    newStart.setHours(0, 0, 0, 0);
    // Floor at today: never a start in the past. Advance in whole cadence steps.
    while (newStart < today) {
      newStart = addWeeks(newStart, cadence);
    }

    const hasCount =
      customer.maxOccurrences !== undefined &&
      customer.maxOccurrences !== null &&
      String(customer.maxOccurrences).trim() !== "" &&
      Number(customer.maxOccurrences) > 0;
    // Same formula the card uses; "" => open-ended (a card without a count).
    const until = hasCount
      ? computeUntilValue({
          startFrom: newStart,
          weekday,
          cadenceWeeks: cadence,
          maxOccurrences: customer.maxOccurrences,
        })
      : "";

    return { anchor, hadAppointment, newStart, until };
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
      if (
        field === "startFrom" ||
        field === "cadenceWeeks" ||
        field === "maxOccurrences"
      ) {
        // Auto-fill "Λήξη" from the current inputs. Only when a count is present; an
        // empty count means open-ended, so we leave "Λήξη" exactly as it is. A value
        // typed manually into "Λήξη" survives until one of these three fields changes.
        if (String(next.maxOccurrences ?? "").trim() !== "") {
          const computed = computeUntilValue(next);
          if (computed) next.until = computed;
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
    // Guarantee the ΈΩΣ column is never "-" for a card that has a count: if "Λήξη" was
    // left empty but a count exists (e.g. a card saved with only default values), fill
    // it from the same formula the live auto-fill uses. A count-less card stays open.
    let untilLocal = formState.until;
    if (!untilLocal && String(formState.maxOccurrences ?? "").trim() !== "") {
      untilLocal = computeUntilValue(formState);
    }
    const untilIso = toUtcIsoFromLocalDate(untilLocal);
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

  // Optional per-push count override. Empty is valid (each customer uses its own
  // maxOccurrences); when present it must be an integer 1..52.
  const countError = (() => {
    const raw = pushState.count;
    if (raw === "" || raw === null || raw === undefined) return "";
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 52) return "Δώσε αριθμό από 1 έως 52.";
    return "";
  })();
  const countOverrideValue =
    pushState.count !== "" && !countError ? Number(pushState.count) : undefined;

  // Read-only preview: runs the SAME endpoint as push with dryRun:true. Writes nothing.
  // Uses the current selection when any exists, else all active customers.
  const runPreview = async (overrides = {}) => {
    // Inputs default to the live bulk fields, but callers can pass explicit values to
    // avoid React's async state (e.g. after renewal we preview with all three empty
    // immediately, before the cleared pushState has flushed).
    const fromInput = overrides.from !== undefined ? overrides.from : pushState.from;
    const toInput = overrides.to !== undefined ? overrides.to : pushState.to;
    const countInput = overrides.count !== undefined ? overrides.count : pushState.count;

    // Validate the count actually being previewed; invalid → skip (inline error shows).
    let countValue;
    if (countInput !== "" && countInput !== null && countInput !== undefined) {
      const n = Number(countInput);
      if (!Number.isInteger(n) || n < 1 || n > 52) return;
      countValue = n;
    }

    const useSelection = selectedCustomerIds.size > 0;
    setPreviewLoading(true);
    setPreviewError("");
    try {
      const res = await pushAutoCustomers({
        dryRun: true,
        from: fromInput ? toUtcIsoFromLocalDate(fromInput) : undefined,
        to: toInput ? toUtcIsoFromLocalDate(toInput) : undefined,
        count: countValue,
        customerIds: useSelection ? Array.from(selectedCustomerIds) : undefined,
      });
      const summary = res?.data?.summary || [];
      setPreviewSummary(summary);
      setPreviewMeta({
        mode: useSelection ? "selected" : "all",
        selectedCount: useSelection ? selectedCustomerIds.size : null,
        count: countValue || null,
      });

      // When the planned dates span more than one week, default to the month view so the
      // whole multi-week schedule is visible at a glance (instead of the week view).
      const starts = summary
        .filter((entry) => entry.status === "inserted" || entry.status === "moved")
        .map((entry) => new Date(entry.scheduledFor))
        .filter((date) => !Number.isNaN(date.getTime()));
      if (starts.length > 1) {
        const earliest = starts.reduce((min, date) => (date < min ? date : min), starts[0]);
        const latest = starts.reduce((max, date) => (date > max ? date : max), starts[0]);
        const spansMultipleWeeks =
          alignToMondayStart(earliest).getTime() !== alignToMondayStart(latest).getTime();
        if (spansMultipleWeeks) {
          setCalendarView("month");
        }
      }
    } catch (error) {
      console.error("Preview failed", error);
      // Never leave stale dates on screen: clear the preview and show a visible error, so
      // it's obvious the calendar no longer reflects reality.
      setPreviewSummary([]);
      setPreviewError("Η προεπισκόπηση απέτυχε. Δοκιμάστε ξανά.");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Auto-load the read-only preview on mount and whenever the inputs that shape it
  // change (selection, from, to, count). Debounced so typing in the count field
  // doesn't fire a request per keystroke. Never writes (dryRun).
  const previewSelectionKey = Array.from(selectedCustomerIds).sort().join(",");
  useEffect(() => {
    if (countError) return; // don't fetch with an invalid count
    const t = setTimeout(() => {
      runPreview();
    }, 350);
    return () => clearTimeout(t);
    // runPreview intentionally omitted — it reads the latest state via closure and
    // isn't memoized; the input deps below are what should trigger a refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewSelectionKey, pushState.from, pushState.to, pushState.count, countError]);

  const handlePushSubmit = async (e) => {
    e.preventDefault();

    if (pushSubmitting) return;

    if (formOpen || hasUnsavedChanges || formSubmitting) {
      toast.error(
        "Υπάρχουν μη αποθηκευμένες αλλαγές. Αποθήκευσε πρώτα."
      );
      return;
    }

    if (countError) {
      toast.error("Ο αριθμός ραντεβού πρέπει να είναι από 1 έως 52.");
      return;
    }
    if (selectedCount === 0) {
      toast.error("Επίλεξε τουλάχιστον έναν πελάτη.");
      return;
    }
    if (
      pushState.from &&
      pushState.to &&
      parseLocalDateString(pushState.to) < parseLocalDateString(pushState.from)
    ) {
      toast.error("Η ημερομηνία «Έως» δεν μπορεί να είναι πριν από την «Από».");
      return;
    }

    const fromIso = pushState.from ? toUtcIsoFromLocalDate(pushState.from) : undefined;
    const toIso = pushState.to ? toUtcIsoFromLocalDate(pushState.to) : undefined;
    const selectedIds = Array.from(selectedCustomerIds);

    // Dry-run first so the confirmation shows the real number of appointments that will
    // be created (Y). Same inputs as the real run below → identical result.
    setPushSubmitting(true);
    let plannedCount = 0;
    try {
      const dry = await pushAutoCustomers({
        dryRun: true,
        from: fromIso,
        to: toIso,
        count: countOverrideValue,
        customerIds: selectedIds,
      });
      const totals = dry?.data?.totals || {};
      plannedCount = (totals.inserted || 0) + (totals.moved || 0);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Αποτυχία υπολογισμού ραντεβού.");
      setPushSubmitting(false);
      return;
    }

    const confirmPush = await MySwal.fire({
      title: "Επιβεβαίωση",
      text: `Θα δημιουργηθούν ${plannedCount} ραντεβού για ${selectedCount} πελάτες. Συνέχεια;`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ναι",
      cancelButtonText: "Άκυρο",
    });

    if (!confirmPush.isConfirmed) {
      setPushSubmitting(false);
      return;
    }

    try {
      const payload = {
        from: fromIso,
        to: toIso,
        count: countOverrideValue,
        dryRun: false,
        customerIds: selectedIds,
      };
      toast("Οι πελάτες προστίθενται στο ημερολόγιο...");
      setPushOpen(false);
      await pushAutoCustomers(payload);
      toast.success(`Προστέθηκαν στο ημερολόγιο οι επιλεγμένοι πελάτες (${selectedCount}).`);
      clearCustomerSelection();
      // The bulk fields permanently updated each selected card, so clear them to avoid
      // re-applying the same change on a later run.
      setPushState({ from: "", to: "", count: "" });

      await loadCustomers();
      // The preview auto-refreshes via the effect (clearing the selection changes the
      // preview inputs), so it reflects post-push reality without an explicit call.
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Αποτυχία δημιουργίας ραντεβού.");
      setPushOpen(true);
    } finally {
      setPushSubmitting(false);
    }
  };

  // Renewal writes ONLY startFrom and until. Everything else (weekday, time, barber,
  // cadence, count) is left untouched — the partial update never sends those fields.
  const buildRenewalPayload = (newStart, untilLocal) => ({
    startFrom: toUtcIsoFromLocalDate(toLocalDateString(newStart)),
    until: untilLocal ? toUtcIsoFromLocalDate(untilLocal) : null,
  });

  // EXPLICIT WRITE: renews each selected customer's schedule (startFrom + until only),
  // continuing it from the customer's latest appointment. Scoped to the current
  // selection when any exists, else all active customers. Shows a per-customer dry-run
  // (anchor / new start / new until) and confirms before writing. No appointments are
  // created here — that stays the separate "Δημιουργία ραντεβού" step.
  const handleRenewSchedule = async () => {
    const base = (Array.isArray(customers) ? customers : []).filter(
      (customer) => customer && customer._id
    );
    const useSelection = selectedCustomerIds.size > 0;
    const targets = useSelection
      ? base.filter((customer) => selectedCustomerIds.has(String(customer._id)))
      : base;

    if (targets.length === 0) {
      toast("Δεν υπάρχουν πελάτες για ανανέωση προγράμματος.");
      return;
    }

    setRenewing(true);
    try {
      // Anchor lookup: the latest AUTO-generated appointment per customer (any date).
      let anchorsByCustomer = {};
      try {
        const customerIds = targets
          .map((customer) => (customer && customer._id ? String(customer._id) : null))
          .filter(Boolean);
        anchorsByCustomer = await fetchAutoCustomerLastAppointments(customerIds, {
          autoOnly: true,
        });
      } catch (anchorError) {
        console.error("Failed to fetch anchor appointments for renewal", anchorError);
      }

      // Dry-run: compute anchor / new start / new until per customer. Writes nothing yet.
      const plans = targets.map((customer) => {
        const entry = anchorsByCustomer?.[String(customer._id)];
        const anchorDate = entry?.appointmentDateTime
          ? new Date(entry.appointmentDateTime)
          : null;
        const { anchor, hadAppointment, newStart, until } = computeRenewal(customer, anchorDate);
        return { customer, anchor, hadAppointment, newStart, until };
      });

      const cellStyle = {
        padding: "6px 10px",
        borderBottom: "1px solid #e5e7eb",
        whiteSpace: "nowrap",
      };

      const confirmed = await MySwal.fire({
        title: "Ανανέωση προγράμματος",
        width: 680,
        html: (
          <div style={{ textAlign: "left" }}>
            <div
              style={{
                maxHeight: 340,
                overflowY: "auto",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
              }}
            >
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    <th style={{ ...cellStyle, textAlign: "left" }}>Πελάτης</th>
                    <th style={{ ...cellStyle, textAlign: "left" }}>Τελευταίο ραντεβού</th>
                    <th style={{ ...cellStyle, textAlign: "left" }}>Νέα έναρξη</th>
                    <th style={{ ...cellStyle, textAlign: "left" }}>Νέα λήξη</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.customer._id}>
                      <td style={cellStyle}>{plan.customer.customerName}</td>
                      <td style={cellStyle}>
                        {plan.hadAppointment ? formatShortDate(plan.anchor) : "Κανένα"}
                      </td>
                      <td style={cellStyle}>{formatShortDate(plan.newStart)}</td>
                      <td style={cellStyle}>
                        {plan.until ? formatShortDate(parseLocalDateString(plan.until)) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ marginTop: 14, fontWeight: 600 }}>
              Θα ανανεωθεί το πρόγραμμα για {plans.length} πελάτες. Συνέχεια;
            </p>
          </div>
        ),
        showCancelButton: true,
        confirmButtonText: "Ναι",
        cancelButtonText: "Άκυρο",
      });

      if (!confirmed.isConfirmed) return;

      const updates = plans.map((plan) =>
        updateAutoCustomer(plan.customer._id, buildRenewalPayload(plan.newStart, plan.until))
      );
      await Promise.all(updates);
      await loadCustomers();
      toast.success(`Ανανεώθηκε το πρόγραμμα για ${plans.length} πελάτες.`);

      // Renewal already wrote the correct values onto each card, so the preview must run
      // with the bulk Από / Έως / Αριθμός fields empty — each card is the source of
      // truth. Leaving stale values here would make the preview request fail validation.
      setPushState({ from: "", to: "", count: "" });

      // Show the result on THIS page: jump the preview to the earliest new start and
      // refresh the on-page dry-run preview. Nothing is written to the Calendar page.
      const earliestStart = plans
        .map((plan) => plan.newStart)
        .filter((date) => date && !Number.isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime())[0];
      if (earliestStart) {
        setCalendarStart(alignToMondayStart(new Date(earliestStart)));
      }
      // Explicit empty inputs so the preview reflects the freshly-written cards, not the
      // just-cleared (but not yet flushed) bulk fields.
      runPreview({ from: "", to: "", count: "" });
    } catch (error) {
      console.error("Failed to renew schedule", error);
      toast.error(error?.message || "Αποτυχία ανανέωσης προγράμματος.");
    } finally {
      setRenewing(false);
    }
  };

  const pushBlocked = formOpen || formSubmitting || hasUnsavedChanges || selectedCount === 0;
  const newTooltipText = "";
  const renewTooltipText =
    "Συνεχίζει το πρόγραμμα κάθε πελάτη από το τελευταίο του ραντεβού. Δεν δημιουργεί ραντεβού.";
  const pushTooltipText =
    "Αποθήκευσε πρώτα τις αλλαγές σου.";

  // Badge so it's always clear what's on screen.
  const previewBadgeText = !previewMeta
    ? "Φόρτωση…"
    : previewMeta.mode === "selected"
    ? `${previewMeta.selectedCount} επιλεγμένοι πελάτες${
        previewMeta.count ? ` · ${previewMeta.count} ραντεβού ο καθένας` : ""
      }`
    : "Όλοι οι πελάτες";

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
                  onClick={handleRenewSchedule}
                  disabled={renewing || loading}
                  className="h-10 bg-amber-600 hover:brightness-110 disabled:bg-gray-700 disabled:text-gray-400 text-white px-4 rounded-lg text-sm font-medium transition shadow-sm"
                  aria-label={renewTooltipText}
                >
                  {renewing ? "Ανανέωση..." : "Ανανέωση προγράμματος"}
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
                  aria-label="Αποθήκευσε πρώτα τις αλλαγές σου."
                >
                  Δημιουργία ραντεβού
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
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={(e) => (e.target.checked ? selectAllVisibleCustomers() : clearCustomerSelection())}
                className="h-4 w-4 accent-purple-500"
              />
              Επιλογή όλων των ορατών
            </label>
            {selectedCount > 0 && (
              <>
                <span className="text-purple-300 font-medium">{selectedCount} selected</span>
                <button
                  type="button"
                  onClick={clearCustomerSelection}
                  className="text-xs underline text-gray-300 hover:text-white"
                >
                  Καθαρισμός επιλογής
                </button>
              </>
            )}
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
                <span className="ml-2 text-sm text-gray-400">
                  ({filteredCustomers.length}/{customers.length})
                </span>
              )}
            </h2>
            <span className="text-sm text-gray-400">{listOpen ? "Κλείσιμο" : "Άνοιγμα"}</span>
          </button>

          {listOpen && (
            <div className="mb-4">
              <input
                type="search"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Αναζήτηση με όνομα, τηλέφωνο, barber ή ώρα"
                className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          )}

          {listOpen && (
            <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-700 text-gray-200 uppercase text-xs">
                <tr>
                  <th className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => (e.target.checked ? selectAllVisibleCustomers() : clearCustomerSelection())}
                      className="h-4 w-4 accent-purple-500"
                      aria-label="Επιλογή όλων"
                    />
                  </th>
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
                    <td colSpan={9} className="px-4 py-6 text-center text-gray-400">
                      Φόρτωση...
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-gray-400">
                      {customerSearch.trim()
                        ? "Δεν βρέθηκαν πελάτες για αυτή την αναζήτηση."
                        : "Δεν υπάρχουν επαναλαμβανόμενοι πελάτες."}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr
                      key={customer._id}
                      className="border-t border-gray-700 hover:bg-gray-750 transition"
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedCustomerIds.has(String(customer._id))}
                          onChange={() => toggleCustomerSelection(customer._id)}
                          className="h-4 w-4 accent-purple-500"
                          aria-label={`Επιλογή ${customer.customerName || "πελάτη"}`}
                        />
                      </td>
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
            ) : filteredCustomers.length === 0 ? (
              <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 text-center text-gray-400">
                {customerSearch.trim()
                  ? "Δεν βρέθηκαν πελάτες για αυτή την αναζήτηση."
                  : "Δεν υπάρχουν επαναλαμβανόμενοι πελάτες."}
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <article
                  key={customer._id}
                  className="rounded-xl border border-gray-700 bg-gray-900 p-4 space-y-3 shadow-inner"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-base font-semibold text-gray-100">{customer.customerName}</div>
                      <input
                        type="checkbox"
                        checked={selectedCustomerIds.has(String(customer._id))}
                        onChange={() => toggleCustomerSelection(customer._id)}
                        className="mt-1 h-4 w-4 accent-purple-500"
                        aria-label={`Επιλογή ${customer.customerName || "πελάτη"}`}
                      />
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
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => navigateCalendar(-1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-600 text-gray-200 hover:bg-gray-700"
                aria-label="Προηγούμενο"
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
                onClick={() => navigateCalendar(1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-600 text-gray-200 hover:bg-gray-700"
                aria-label="Επόμενο"
              >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
          <div
            className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              previewMeta
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-gray-600 bg-gray-700/40 text-gray-300"
            }`}
          >
            <CalendarClock size={16} />
            <span>{previewBadgeText}</span>
            {previewLoading && previewMeta && (
              <span className="text-xs text-gray-400">· φόρτωση…</span>
            )}
          </div>
          <div
            className="auto-customers-preview overflow-x-auto max-w-full min-h-0"
            style={{ height: previewCalHeight, width: "100%" }}
          >
            {previewError ? (
              <div className="flex h-full items-center justify-center p-6 text-center">
                <div className="max-w-md rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-4 text-sm text-red-200">
                  <p className="mb-1 font-semibold">Κάτι πήγε στραβά</p>
                  <p className="text-red-300/90">{previewError}</p>
                  <button
                    type="button"
                    onClick={runPreview}
                    className="mt-3 rounded-md border border-red-400/50 px-3 py-1 text-xs text-red-100 hover:bg-red-500/20"
                  >
                    Δοκίμασε ξανά
                  </button>
                </div>
              </div>
            ) : (
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
              /* Read-only preview: drag-to-override removed so the calendar never
                 writes to the DB. Per-occurrence overrides are done via the edit
                 form (click an event -> explicit save). */
              onSelectEvent={(event) => {
                const customer = customers.find((item) => item?._id === event.autoCustomerId);
                if (!customer) return;
                handleEdit(customer, event.originalStart);
              }}
            />
            )}
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
                {(() => {
                  const range = computeCardRange(formState);
                  return range ? (
                    <span className="text-xs text-gray-400">
                      Ξεκινά: {formatShortDate(range.start)} · Τελειώνει:{" "}
                      {formatShortDate(range.end)}
                    </span>
                  ) : null;
                })()}
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
              <h2 className="text-xl font-semibold">Δημιουργία ραντεβού</h2>
              <button
                onClick={() => setPushOpen(false)}
                className="text-gray-400 hover:text-gray-200 text-xl"
              >
                &times;
              </button>
            </div>
            <form className="space-y-4" onSubmit={handlePushSubmit}>
              <label className="flex flex-col text-sm gap-1">
                Από (προαιρετικό)
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
                  placeholderText=""
                  isClearable
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
                  placeholderText=""
                  isClearable
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Αριθμός ραντεβού (προαιρετικό)
                <input
                  type="number"
                  min={1}
                  max={52}
                  step={1}
                  inputMode="numeric"
                  value={pushState.count}
                  onChange={(e) =>
                    setPushState((prev) => ({ ...prev, count: e.target.value }))
                  }
                  placeholder=""
                  className={`bg-[#181a23] border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#a78bfa] ${
                    countError ? "border-red-500" : "border-gray-700"
                  }`}
                />
                {countError && (
                  <span className="text-xs text-red-400">{countError}</span>
                )}
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
                  disabled={pushSubmitting || Boolean(countError)}
                  className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-700 disabled:text-gray-400 disabled:hover:bg-gray-700"
                >
                  Δημιουργία ραντεβού
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
