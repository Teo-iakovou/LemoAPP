const express = require("express");
const router = express.Router();
const Appointment = require("../models/appointment");

function toLocalYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYMD(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function businessWindow(date) {
  const dow = date.getDay(); // 0 Sun ... 6 Sat
  if (dow === 0 || dow === 1) return null; // closed Sun/Mon
  if (dow === 6) return { open: 9 * 60, close: 17 * 60 + 40 }; // Sat 09:00–17:40
  return { open: 9 * 60, close: 19 * 60 }; // Tue–Fri 09:00–19:00
}

function generateSlots({ date, duration = 40, step = 40 }) {
  const win = businessWindow(date);
  if (!win) return [];
  const out = [];
  for (let t = win.open; t + duration <= win.close; t += step) {
    // Exclude exactly the 13:00–13:40 slot daily
    if (t === 13 * 60) { continue; }
    out.push(t);
  }
  return out;
}

function overlaps(aStart, aDur, bStart, bDur) {
  const aEnd = aStart + aDur;
  const bEnd = bStart + bDur;
  return aStart < bEnd && bStart < aEnd;
}

// Core month availability computation reused by multiple routes
async function buildMonthAvailability({ from, to, barber, includeSlots }) {
  const start = parseYMD(from);
  const end = parseYMD(to);
  const endOfDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);

  const match = {
    appointmentDateTime: { $gte: start, $lte: endOfDay },
    ...(barber ? { barber } : {}),
    $or: [
      { type: 'break' },
      { type: 'appointment', appointmentStatus: 'confirmed' },
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
  const appts = docs.map((a) => ({ start: new Date(a.appointmentDateTime), duration: 40, barber: a.barber }));

  // Build counts per day
  const result = {};
  const slotsMap = includeSlots ? {} : null;
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
    // If a break exists for this day, treat the whole day as unavailable
    const hasAllDayBreak = docs.some((x) => x.type === 'break' && toLocalYMD(new Date(x.appointmentDateTime)) === ds);
    if (hasAllDayBreak) { result[ds] = 0; if (slotsMap) slotsMap[ds] = []; continue; }
    const slots = generateSlots({ date: d, duration: 40, step: 40 });
    if (!slots.length) { result[ds] = 0; if (slotsMap) slotsMap[ds] = []; continue; }
    const dayAppts = appts.filter((b) => toLocalYMD(b.start) === ds);
    const free = slots.filter((s) => !dayAppts.some((b) => {
      const bStart = b.start.getHours() * 60 + b.start.getMinutes();
      return overlaps(s, 40, bStart, b.duration);
    }));
    // Same-day 60' cutoff
    const now = new Date();
    if (toLocalYMD(now) === ds) {
      const cutoff = now.getHours() * 60 + now.getMinutes() + 60;
      for (let k = free.length - 1; k >= 0; k--) if (free[k] < cutoff) free.splice(k, 1);
    }
    result[ds] = free.length;
    if (slotsMap) {
      const labels = free.map((t) => `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`);
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
      // Skip days with break entirely
      const hasAllDayBreak = docs.some((x) => x.type === 'break' && toLocalYMD(new Date(x.appointmentDateTime)) === ds);
      if (hasAllDayBreak) { firstAvailable = null; break; }
      const slots = generateSlots({ date: d, duration: 40, step: 40 });
      const dayAppts = appts.filter((b) => toLocalYMD(b.start) === ds);
      const free = slots.filter((s) => !dayAppts.some((b) => {
        const bStart = b.start.getHours() * 60 + b.start.getMinutes();
        return overlaps(s, 40, bStart, b.duration);
      }));
      const now = new Date();
      if (toLocalYMD(now) === ds) {
        const cutoff = now.getHours() * 60 + now.getMinutes() + 60;
        for (let k = free.length - 1; k >= 0; k--) if (free[k] < cutoff) free.splice(k, 1);
      }
      const labels = free.map((t) => `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`);
      firstAvailable = { date: ds, slots: labels };
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
      ...(barber ? { barber } : {}),
      $or: [
        { type: 'break' },
        { type: 'appointment', appointmentStatus: 'confirmed' },
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

    const normalized = docs.map((a) => ({
      start: a.appointmentDateTime,
      duration: 40,
      barber: a.barber,
      type: a.type || 'appointment',
    }));
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

module.exports = router;
