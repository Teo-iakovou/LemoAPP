const express = require("express");
const router = express.Router();
const Appointment = require("../models/appointment");
const PublicBookingSettings = require("../models/publicBookingSettings");

const CY_TIMEZONE = "Europe/Athens";
const DEFAULT_OPEN_MINUTES = 9 * 60;
const DEFAULT_CLOSE_MINUTES = 19 * 60 + 40;
const DEFAULT_STEP_MINUTES = 40;

function toLocalYMD(d) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function parseYMD(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function zonedMinutes(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CY_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function businessWindow(date) {
  const dow = date.getDay(); // 0 Sun ... 6 Sat
  if (dow === 0 || dow === 1) return null; // closed Sun/Mon
  if (dow === 6) return { open: 9 * 60, close: 18 * 60 + 20 }; // Sat 09:00–18:20 (last start 17:40)
  return { open: 9 * 60, close: 19 * 60 + 40 }; // Tue–Fri 09:00–19:40 (last start 19:00)
}

function generateSlots({ date, duration = 40, step = 40, windowOverride = null }) {
  const win = windowOverride || businessWindow(date);
  if (!win) return [];
  const out = [];
  for (let t = win.open; t + duration <= win.close; t += step) {
    // Do not exclude lunch by default; treat breaks via overlap logic
    out.push(t);
  }
  return out;
}

function overlaps(aStart, aDur, bStart, bDur) {
  const aEnd = aStart + aDur;
  const bEnd = bStart + bDur;
  return aStart < bEnd && bStart < aEnd;
}

function minutesToHHMM(totalMinutes) {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const m = String(totalMinutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function hhmmToMinutes(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value || "");
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

// Core month availability computation reused by multiple routes
async function buildMonthAvailability({ from, to, barber, includeSlots }) {
  const start = parseYMD(from);
  const end = parseYMD(to);
  const endOfDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
  const settingsDoc = await PublicBookingSettings.getSingleton();
  const closedMonths = Array.isArray(settingsDoc.closedMonths) ? settingsDoc.closedMonths : [];
  const blockedDates = new Set(settingsDoc.blockedDates || []);
  const allowedDates = new Set(settingsDoc.allowedDates || []);
const specialDayHours = settingsDoc.specialDayHours || {};
const extraDaySlots = settingsDoc.extraDaySlots || {};
  const manualOpenDates = new Set([
    ...allowedDates,
    ...Object.keys(specialDayHours || {}),
    ...Object.keys(extraDaySlots || {}),
  ]);

  // Apply barber filter for both appointments and breaks. When a barber is specified,
  // only include that barber's breaks so availability stays per‑barber.
  const match = {
    appointmentDateTime: { $gte: start, $lte: endOfDay },
    $or: barber
      ? [
          { type: "break", barber },
          { type: "lock", barber },
          { type: "appointment", appointmentStatus: "confirmed", barber },
        ]
      : [
          { type: "break" },
          { type: "lock" },
          { type: "appointment", appointmentStatus: "confirmed" },
        ],
  };

  const docs = await Appointment.find(match, {
    appointmentDateTime: 1,
    barber: 1,
    type: 1,
    duration: 1,
    endTime: 1,
    _id: 0,
  }).lean();

  // Normalize
  const appts = docs.map((a) => {
    const start = new Date(a.appointmentDateTime);
    let duration = 40;
    if (typeof a.duration === 'number' && isFinite(a.duration) && a.duration > 0) {
      duration = a.duration;
    } else if (a.endTime) {
      const end = new Date(a.endTime);
      const diff = Math.max(1, Math.round((end - start) / 60000));
      duration = diff;
    }
    return { start, duration, barber: a.barber, type: a.type || 'appointment' };
  });

  // Build counts per day
  const result = {};
  const slotsMap = includeSlots ? {} : null;
  const freeLabelCache = {};
  const days = Math.round((endOfDay - start) / 86400000) + 1;
  const todayYMD = toLocalYMD(new Date());
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const ds = toLocalYMD(d);
    // Do not color or expose availability for past days
    if (ds < todayYMD) {
      result[ds] = 0;
      if (slotsMap) slotsMap[ds] = [];
      continue;
    }
    const monthClosed = closedMonths.includes(d.getMonth());
    const manualOpen = manualOpenDates.has(ds);
    const manualClosed = blockedDates.has(ds) || (monthClosed && !manualOpen);
    if (manualClosed) {
      result[ds] = 0;
      if (slotsMap) slotsMap[ds] = [];
      continue;
    }
    const whitelist = Array.isArray(specialDayHours?.[ds]) ? specialDayHours[ds] : [];
    let candidateLabels = [];
    if (whitelist.length) {
      candidateLabels = whitelist.slice();
    } else {
      const win = businessWindow(d);
      const effectiveWindow = win || (manualOpen ? { open: DEFAULT_OPEN_MINUTES, close: DEFAULT_CLOSE_MINUTES } : null);
      if (!effectiveWindow) {
        result[ds] = 0;
        if (slotsMap) slotsMap[ds] = [];
        continue;
      }
      const baseSlots = generateSlots({ date: d, duration: 40, step: 40, windowOverride: effectiveWindow }).map(minutesToHHMM);
      candidateLabels = baseSlots.sort();
    }
    const candidates = candidateLabels
      .map((label) => ({ label, start: hhmmToMinutes(label) }))
      .filter((slot) => slot.start !== null);
    if (!candidates.length) {
      result[ds] = 0;
      if (slotsMap) slotsMap[ds] = [];
      freeLabelCache[ds] = [];
      continue;
    }
    const dayAppts = appts.filter((b) => toLocalYMD(b.start) === ds);
    const free = candidates.filter((slot) => !dayAppts.some((b) => {
      const bStart = zonedMinutes(b.start);
      return overlaps(slot.start, 40, bStart, b.duration);
    }));
    // Same-day 120' cutoff
    const now = new Date();
    if (toLocalYMD(now) === ds) {
      const cutoff = zonedMinutes(now) + 120;
      for (let k = free.length - 1; k >= 0; k--) if (free[k] < cutoff) free.splice(k, 1);
    }
    result[ds] = free.length;
    const labels = free.map((slot) => slot.label);
    freeLabelCache[ds] = labels;
    if (slotsMap) {
      slotsMap[ds] = labels;
    }
  }

  // Also include first available day with its actual free slot labels
  let firstAvailable = null;
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const ds = toLocalYMD(d);
    if (ds < todayYMD) continue; // only today and future
    if ((result[ds] || 0) > 0) {
      firstAvailable = { date: ds, slots: freeLabelCache[ds] || [] };
      break;
    }
  }

  return includeSlots ? { counts: result, firstAvailable, slots: slotsMap } : { counts: result, firstAvailable };
}

// GET /api/appointments/range?from=YYYY-MM-DD&to=YYYY-MM-DD&barber=ΛΕΜΟ|ΦΟΡΟΥ
router.get("/appointments/range", async (req, res, next) => {
  try {
    const { from, to, barber } = req.query;
    if (!from || !to) return res.status(400).json({ error: "from and to are required" });
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59.999`);

  const match = {
    appointmentDateTime: { $gte: start, $lte: end },
    $or: barber
      ? [
          { type: "break", barber },
          { type: "lock", barber },
          { type: "appointment", appointmentStatus: "confirmed", barber },
        ]
      : [
          { type: "break" },
          { type: "lock" },
          { type: "appointment", appointmentStatus: "confirmed" },
        ],
  };

    const docs = await Appointment.find(match, {
      appointmentDateTime: 1,
      barber: 1,
      type: 1,
      duration: 1,
      endTime: 1,
      _id: 0,
    }).lean();

    const normalized = docs.map((a) => {
      const start = a.appointmentDateTime;
      let duration = 40;
      if (typeof a.duration === 'number' && isFinite(a.duration) && a.duration > 0) {
        duration = a.duration;
      } else if (a.endTime) {
        const end = new Date(a.endTime);
        const diff = Math.max(1, Math.round((end - new Date(start)) / 60000));
        duration = diff;
      }
      return {
        start,
        duration,
        barber: a.barber,
        type: a.type || 'appointment',
      };
    });
    res.json(normalized);
  } catch (e) {
    next(e);
  }
});

// GET /api/availability/month?from=YYYY-MM-DD&to=YYYY-MM-DD&barber=ΛΕΜΟ|ΦΟΡΟΥ
router.get("/availability/month", async (req, res, next) => {
  try {
    const { from, to, barber, include } = req.query;
    if (!from || !to) return res.status(400).json({ error: "from and to are required" });
    const includeSlots = String(include || "").split(',').map(s=>s.trim()).includes('slots');
    const payload = await buildMonthAvailability({ from, to, barber, includeSlots });
    res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.json(payload);
  } catch (e) {
    next(e);
  }
});

// GET /api/availability/horizon?start=YYYY-MM-DD&days=35&barberId=lemo|forou&include=slots
router.get("/availability/horizon", async (req, res, next) => {
  try {
    const { start, days, include, barberId, barber } = req.query;
    if (!start) return res.status(400).json({ error: "start is required" });
    const nDays = Math.max(1, Math.min(parseInt(days || '14', 10), 90));
    const startDate = parseYMD(start);
    const endDate = new Date(startDate.getTime() + (nDays - 1) * 86400000);
    const from = toLocalYMD(startDate);
    const to = toLocalYMD(endDate);
    const includeSlots = String(include || "").split(',').map(s=>s.trim()).includes('slots');
    // Map ascii barberId to Greek label expected by DB
    let greekBarber = barber || '';
    if (!greekBarber && barberId) {
      if (String(barberId).toLowerCase() === 'lemo') greekBarber = 'ΛΕΜΟ';
      else if (String(barberId).toLowerCase() === 'forou') greekBarber = 'ΦΟΡΟΥ';
    }
    const payload = await buildMonthAvailability({ from, to, barber: greekBarber, includeSlots });
    res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.json(payload);
  } catch (e) {
    next(e);
  }
});

// GET /api/availability?date=YYYY-MM-DD&barberId=lemo
router.get("/availability", async (req, res, next) => {
  try {
    const { date, barberId, barber } = req.query;
    if (!date) return res.status(400).json({ error: "date is required" });

    const settingsDoc = await PublicBookingSettings.getSingleton();
    const closedMonths = Array.isArray(settingsDoc.closedMonths) ? settingsDoc.closedMonths : [];
    const blockedDates = new Set(settingsDoc.blockedDates || []);
    const allowedDates = new Set(settingsDoc.allowedDates || []);
    const specialDayHours = settingsDoc.specialDayHours || {};
    const extraDaySlots = settingsDoc.extraDaySlots || {};
    const manualOpenDates = new Set([
      ...allowedDates,
      ...Object.keys(specialDayHours || {}),
      ...Object.keys(extraDaySlots || {}),
    ]);

    const day = parseYMD(date);
    const monthClosed = closedMonths.includes(day.getMonth());
    const manualOpen = manualOpenDates.has(date);
    const manualClosed = blockedDates.has(date) || (monthClosed && !manualOpen);
    if (manualClosed) return res.json({ slots: [] });

    let greekBarber = barber || "";
    if (!greekBarber && barberId) {
      const id = String(barberId).toLowerCase();
      if (id === "lemo") greekBarber = "ΛΕΜΟ";
      else if (id === "forou") greekBarber = "ΦΟΡΟΥ";
    }

    const dayStart = day;
    const dayEnd = new Date(dayStart.getTime() + 86400000 - 1);
    const match = {
      appointmentDateTime: { $gte: dayStart, $lte: dayEnd },
      $or: greekBarber
        ? [
            { type: "break", barber: greekBarber },
            { type: "lock", barber: greekBarber },
            { type: "appointment", appointmentStatus: "confirmed", barber: greekBarber },
          ]
        : [
            { type: "break" },
            { type: "lock" },
            { type: "appointment", appointmentStatus: "confirmed" },
          ],
    };
    const docs = await Appointment.find(match, {
      appointmentDateTime: 1,
      duration: 1,
      endTime: 1,
      type: 1,
      _id: 0,
    }).lean();

    const existing = docs.map((a) => {
      const start = new Date(a.appointmentDateTime);
      let duration = 40;
      if (typeof a.duration === "number" && isFinite(a.duration) && a.duration > 0) {
        duration = a.duration;
      } else if (a.endTime) {
        const end = new Date(a.endTime);
        const diff = Math.max(1, Math.round((end - start) / 60000));
        duration = diff;
      }
      return { start, duration };
    });

    const whiteListSlots = Array.isArray(specialDayHours?.[date]) ? specialDayHours[date] : [];

    let candidateLabels = [];
    if (whiteListSlots.length) {
      candidateLabels = whiteListSlots.slice();
    } else {
      const win = businessWindow(dayStart);
      const effectiveWindow = win || (manualOpen ? { open: DEFAULT_OPEN_MINUTES, close: DEFAULT_CLOSE_MINUTES } : null);
      if (!effectiveWindow) {
        return res.json({ slots: [] });
      }
      const base = generateSlots({ date: dayStart, duration: 40, step: 40, windowOverride: effectiveWindow }).map(minutesToHHMM);
      candidateLabels = base.sort();
    }

    const candidateObjs = candidateLabels
      .map((label) => ({ label, start: hhmmToMinutes(label) }))
      .filter((entry) => entry.start !== null);

    const free = candidateObjs.filter((slot) => {
      return !existing.some((appt) => {
        const apptStart = zonedMinutes(appt.start);
        return overlaps(slot.start, 40, apptStart, appt.duration);
      });
    });

    const now = new Date();
    if (toLocalYMD(now) === date) {
      const cutoff = zonedMinutes(now) + 120;
      for (let i = free.length - 1; i >= 0; i -= 1) {
        if (free[i].start < cutoff) free.splice(i, 1);
      }
    }

    res.json({ slots: free.map((slot) => slot.label) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
