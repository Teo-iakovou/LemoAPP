import { Greek as GreekLocale } from "flatpickr/dist/l10n/gr.js";

export const BARBER_OPTIONS = [
  { value: "ΛΕΜΟ", label: "ΛΕΜΟ" },
  { value: "ΦΟΡΟΥ", label: "ΦΟΡΟΥ" },
  { value: "ΚΟΥΣΙΗΣ", label: "ΚΟΥΣΙΗΣ" },
];

export const DURATION_OPTIONS = [15, 30, 40, 45, 60];

export const dateFormatter = new Intl.DateTimeFormat("el-GR", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export const timeFormatter = new Intl.DateTimeFormat("el-GR", {
  hour: "2-digit",
  minute: "2-digit",
});

export const simpleDateFormatter = new Intl.DateTimeFormat("el-GR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export const WEEKDAY_SHORT_LABEL = {
  0: "Κυρ",
  1: "Δευ",
  2: "Τρι",
  3: "Τετ",
  4: "Πεμ",
  5: "Παρ",
  6: "Σαβ",
};

export const getWeekdayLabel = (value) => WEEKDAY_SHORT_LABEL[value] || "";

export const toTimeString = (date) =>
  date
    ? date
        .toLocaleTimeString("el-GR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        .slice(0, 5)
    : "00:00";

export const parseTimeToDate = (value) => {
  if (!value) return new Date(1970, 0, 1, 9, 0, 0, 0);
  const [hours, minutes] = value.split(":").map(Number);
  return new Date(1970, 0, 1, hours || 0, minutes || 0, 0, 0);
};

export const TIME_PICKER_OPTIONS = {
  enableTime: true,
  noCalendar: true,
  dateFormat: "H:i",
  time_24hr: true,
  locale: GreekLocale,
  minuteIncrement: 5,
};

export const WEEKDAY_OPTIONS = [
  { value: 1, label: "Δευτέρα" },
  { value: 2, label: "Τρίτη" },
  { value: 3, label: "Τετάρτη" },
  { value: 4, label: "Πέμπτη" },
  { value: 5, label: "Παρασκευή" },
  { value: 6, label: "Σάββατο" },
  { value: 0, label: "Κυριακή" },
];

export const REPEAT_INTERVAL_OPTIONS = [
  { value: 1, label: "Κάθε εβδομάδα" },
  { value: 2, label: "Κάθε 2 εβδομάδες" },
  { value: 3, label: "Κάθε 3 εβδομάδες" },
  { value: 5, label: "Κάθε 5 εβδομάδες" },
];

export const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

export const getNextDateForWeekday = (weekday, from = new Date()) => {
  const base = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate(),
    0,
    0,
    0,
    0
  );
  const currentWeekday = base.getDay();
  const delta = (weekday - currentWeekday + 7) % 7;
  if (delta === 0) {
    return base;
  }
  return addDays(base, delta);
};

export const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const REPEAT_WEEKS = 52;
export const CREATED_LOCKS_STORAGE_KEY = "bulkLocks:created";

export const createModalSlot = (time = "09:00", duration = 40) => ({
  id: generateId(),
  time,
  duration,
});

export const formatDateInputValue = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseDateInputValue = (value, time = "00:00") => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(
    year,
    (month || 1) - 1,
    day || 1,
    Number.isFinite(hours) ? hours : 0,
    Number.isFinite(minutes) ? minutes : 0,
    0,
    0
  );
};

export const getLockRowKey = (lock) => {
  if (lock?.uid) {
    return String(lock.uid);
  }
  const startSource =
    lock?.startDate instanceof Date
      ? lock.startDate
      : lock?.date instanceof Date
      ? lock.date
      : lock?.startDate
      ? new Date(lock.startDate)
      : lock?.date
      ? new Date(lock.date)
      : null;
  const iso =
    startSource instanceof Date && !Number.isNaN(startSource.getTime())
      ? startSource.toISOString()
      : "";
  const prefix = lock?.recurring ? "rec" : "single";
  const idPart = lock?.responseIds?.[0] || lock?.time || "unknown";
  const barberPart = lock?.barber || "unknown";
  return `${prefix}-${idPart}-${barberPart}-${iso}`;
};

export const aggregateLocks = (locks) => {
  const byKey = new Map();

  locks.forEach((lock) => {
    const weekday = lock.weekday ?? lock.date.getDay();
    const key = `${lock.barber}-${weekday}-${lock.time}-${lock.duration}`;
    const entries = byKey.get(key) || [];
    entries.push({
      ...lock,
      weekday,
      startDate: new Date(lock.date),
      endDate: new Date(lock.date.getTime() + (lock.duration || 0) * 60000),
    });
    byKey.set(key, entries);
  });

  const result = [];
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  const TOLERANCE_MS = 3 * 60 * 60 * 1000;

  byKey.forEach((entries) => {
    entries.sort((a, b) => a.startDate - b.startDate);
    const responseIds = entries.map((entry) => entry.responseId).filter(Boolean);
    let repeatInterval = 1;
    let isRecurring =
      entries.length > 1 &&
      entries.every((entry, index) => {
        if (index === 0) return true;
        const prev = entries[index - 1];
        const diff = Math.abs(entry.startDate - prev.startDate);
        const approxWeeks = Math.max(1, Math.round(diff / weekMs));
        const expectedDiff = approxWeeks * weekMs;
        const delta = Math.abs(diff - expectedDiff);
        if (delta > TOLERANCE_MS) {
          return false;
        }
        if (index === 1) {
          repeatInterval = approxWeeks;
        } else if (Math.abs(approxWeeks - repeatInterval) > 0) {
          return false;
        }
        return true;
      });

    if (isRecurring) {
      const first = entries[0];
      const last = entries[entries.length - 1];
      const occurrences = entries.map((entry) => ({
        startDate: entry.startDate,
        endDate: entry.endDate,
        responseId: entry.responseId || null,
      }));
      const recurringLock = {
        ...first,
        startDate: first.startDate,
        responseIds,
        recurring: true,
      };
      result.push({
        kind: "recurring",
        uid: getLockRowKey(recurringLock),
        barber: first.barber,
        weekday: first.weekday,
        time: first.time,
        duration: first.duration,
        startDate: first.startDate,
        endDate: last.endDate,
        responseIds,
        recurring: true,
        lockReason: "ΜΟΝΙΜΟ",
        repeatInterval,
        occurrences,
      });
    } else {
      entries.forEach((entry) => {
        const occurrences = [
          {
            startDate: entry.startDate,
            endDate: entry.endDate,
            responseId: entry.responseId || null,
          },
        ];
        const singleLock = {
          ...entry,
          startDate: entry.startDate,
          responseIds: entry.responseId ? [entry.responseId] : [],
          recurring: false,
        };
        result.push({
          kind: "single",
          uid: getLockRowKey(singleLock),
          barber: entry.barber,
          weekday: entry.weekday,
          time: entry.time,
          duration: entry.duration,
          startDate: entry.startDate,
          endDate: entry.endDate,
          responseIds: entry.responseId ? [entry.responseId] : [],
          recurring: false,
          lockReason: entry.lockReason,
          repeatInterval: 1,
          occurrences,
        });
      });
    }
  });

  result.sort(
    (a, b) => a.startDate - b.startDate || a.time.localeCompare(b.time)
  );

  return result;
};
