// Single source of truth for the public booking "is this slot open?" rules.
//
// The date/window helpers below are MOVED VERBATIM from routes/availabilityRoutes.js so that the
// availability endpoints and the booking-create path enforce exactly the same rules (closed
// weekdays, closed months, blocked/allowed dates, special hours, business window). Keeping them
// here means there is one businessWindow / one precedence, not two that can drift.
//
// NOTE (Saturday hours): businessWindow closes Saturday at 18:20 (last start 17:40). The public
// site currently shows Saturday until 19:00 — that is a public-site bug to fix separately; the
// backend treats 18:20 as authoritative per the shop's real Saturday hours.

const CY_TIMEZONE = "Europe/Athens";
const DEFAULT_OPEN_MINUTES = 9 * 60;
const DEFAULT_CLOSE_MINUTES = 19 * 60 + 40;
const DEFAULT_STEP_MINUTES = 40;
const SLOT_DURATION_MINUTES = 40;
const GREEK_TO_BARBER_KEY = {
  "ΛΕΜΟ": "LEMO",
  "ΦΟΡΟΥ": "FOROU",
  "ΚΟΥΣΙΗΣ": "KOUSHIS",
};

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

// ── Slot-duration rules ──────────────────────────────────────────────────────────────────
// Set by the shop in the public site's Settings (settings.slotRules). A rule changes the slot
// length from a given time of day onwards, for a date range and for all or some barbers:
//   { id, barbers: [] | ["LEMO","FOROU","KOUSHIS"], from: "YYYY-MM-DD", to: "YYYY-MM-DD"|"",
//     after: "HH:MM", minutes: 10..120 }
// barbers [] = everyone. Before `after` the normal 40' grid runs (last slot that ENDS by
// `after`); from `after` slots are `minutes` long, back to back, until closing.
// MUST stay identical to lib/slotRules.js in the public site.
const SLOT_RULE_MIN_MINUTES = 10;
const SLOT_RULE_MAX_MINUTES = 120;
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const RULE_BARBER_KEYS = ["LEMO", "FOROU", "KOUSHIS"];

function normalizeSlotRules(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  value.forEach((r, i) => {
    if (!r || typeof r !== "object") return;
    const from = String(r.from || "").trim();
    const to = String(r.to || "").trim();
    const after = String(r.after || "").trim();
    const minutes = Math.round(Number(r.minutes));
    if (!YMD_RE.test(from) || !HHMM_RE.test(after)) return;
    if (to && (!YMD_RE.test(to) || to < from)) return;
    if (!Number.isFinite(minutes) || minutes < SLOT_RULE_MIN_MINUTES || minutes > SLOT_RULE_MAX_MINUTES) return;
    const barbers = Array.isArray(r.barbers)
      ? Array.from(new Set(r.barbers.filter((b) => RULE_BARBER_KEYS.includes(b))))
      : [];
    out.push({
      id: String(r.id || `rule-${i}-${from}`).slice(0, 64),
      barbers: barbers.length === RULE_BARBER_KEYS.length ? [] : barbers,
      from,
      to,
      after,
      minutes,
    });
  });
  return out;
}

// The rule that applies to this barber on this day: a rule naming the barber beats an
// "everyone" rule; among equals the one added last wins.
function activeSlotRule(rules, ds, barberKey) {
  let best = null;
  let bestSpecific = false;
  (Array.isArray(rules) ? rules : []).forEach((r) => {
    if (ds < r.from || (r.to && ds > r.to)) return;
    const everyone = !r.barbers || r.barbers.length === 0;
    if (!everyone && !r.barbers.includes(barberKey)) return;
    const specific = !everyone;
    if (!best || specific || !bestSpecific) {
      best = r;
      bestSpecific = specific;
    }
  });
  return best;
}

// Day plan: [{ start, duration }] in minutes from midnight.
function buildDaySlots({ window, rule }) {
  if (!window) return [];
  const out = [];
  const after = rule ? hhmmToMinutes(rule.after) : null;
  let t = window.open;
  for (let guard = 0; guard < 200; guard += 1) {
    if (rule && t >= after) {
      if (t + rule.minutes > window.close) break;
      out.push({ start: t, duration: rule.minutes });
      t += rule.minutes;
    } else if (t + SLOT_DURATION_MINUTES <= (rule ? Math.min(after, window.close) : window.close)) {
      out.push({ start: t, duration: SLOT_DURATION_MINUTES });
      t += SLOT_DURATION_MINUTES;
    } else if (rule && after < window.close) {
      t = Math.max(t, after); // jump to where the rule starts
    } else {
      break;
    }
  }
  return out;
}

// Length of a slot starting at `startMin` for this barber on this day.
function slotDurationFor(settings, ds, startMin, barberGreek) {
  const barberKey = GREEK_TO_BARBER_KEY[String(barberGreek || "").trim().toUpperCase()] || null;
  const rule = activeSlotRule(normalizeSlotRules(settings?.slotRules), ds, barberKey);
  if (rule && startMin >= hhmmToMinutes(rule.after)) return rule.minutes;
  return SLOT_DURATION_MINUTES;
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

function getScopedSettingList(doc, listName, scopedName, barberGreekValue) {
  const globalList = Array.isArray(doc?.[listName]) ? doc[listName] : [];
  const scopedMap = doc?.[scopedName] && typeof doc[scopedName] === "object" ? doc[scopedName] : null;
  const barberKey = GREEK_TO_BARBER_KEY[String(barberGreekValue || "").trim().toUpperCase()];
  if (!barberKey || !scopedMap) return globalList;
  if (Object.prototype.hasOwnProperty.call(scopedMap, barberKey)) {
    const scoped = scopedMap[barberKey];
    return Array.isArray(scoped) ? scoped : [];
  }
  return globalList;
}

// Last bookable local Y-M-D given visibleMonthCount. Mirrors the public site's maxDate
// (components/BookingModal.jsx): last day of (current Athens month + visibleMonthCount - 1),
// e.g. Sep + 2 => 31 Oct. Anything after this is beyond the booking window the user can reach.
function horizonEndYMD(now, visibleMonthCount) {
  const rawVmc = Number(visibleMonthCount);
  const vmc = Number.isFinite(rawVmc) && rawVmc > 0 ? Math.floor(rawVmc) : 2;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "month")?.value ?? "1"); // 1-indexed Athens month
  const end = new Date(Date.UTC(y, m - 1 + vmc, 0)); // last day of Athens month (m-1 + vmc - 1)
  const yy = end.getUTCFullYear();
  const mm = String(end.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(end.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Returns null when the slot is bookable, or a reason code otherwise:
 *   "past" | "outside-horizon" | "blocked-date" | "closed-month" | "closed-weekday" | "outside-hours".
 *
 * Precedence mirrors routes/availabilityRoutes.js exactly:
 *   past -> beyond booking horizon -> blocked date -> closed month (unless the day is manually
 *   opened) -> special-hours whitelist (if present) -> closed weekday (unless manually opened) ->
 *   outside business hours. allowedDates / specialDayHours / extraDaySlots keys can re-open an
 *   otherwise-closed month or weekday; a blocked date always closes, even if also allowed.
 *
 * @param {Object}  args
 * @param {Date}    args.startUtc  slot start (UTC instant)
 * @param {Date}    [args.endUtc]  slot end (defaults to start + 40')
 * @param {string}  args.barber    Greek barber label (ΛΕΜΟ|ΦΟΡΟΥ|ΚΟΥΣΙΗΣ)
 * @param {Object}  args.settings  PublicBookingSettings singleton doc
 * @param {Date}    [args.now]     current instant (defaults to new Date())
 */
function assertSlotBookable({ startUtc, endUtc, barber, settings, now }) {
  const start = startUtc instanceof Date ? startUtc : new Date(startUtc);
  const end = endUtc
    ? endUtc instanceof Date
      ? endUtc
      : new Date(endUtc)
    : new Date(
        start.getTime() +
          slotDurationFor(settings, toLocalYMD(start), zonedMinutes(start), barber) * 60000
      );
  const reference = now instanceof Date ? now : now ? new Date(now) : new Date();
  const doc = settings || {};

  // 1) In the past.
  if (start.getTime() < reference.getTime()) return "past";

  const ds = toLocalYMD(start);

  // 2) Beyond the booking horizon (visibleMonthCount).
  if (ds > horizonEndYMD(reference, doc.visibleMonthCount)) return "outside-horizon";

  // 3) Day-level open/closed precedence (same as the availability route).
  const closedMonths = getScopedSettingList(doc, "closedMonths", "barberClosedMonths", barber);
  const blockedDates = new Set(getScopedSettingList(doc, "blockedDates", "barberBlockedDates", barber));
  const allowedDates = new Set(Array.isArray(doc.allowedDates) ? doc.allowedDates : []);
  const specialDayHours = doc.specialDayHours && typeof doc.specialDayHours === "object" ? doc.specialDayHours : {};
  const extraDaySlots = doc.extraDaySlots && typeof doc.extraDaySlots === "object" ? doc.extraDaySlots : {};
  const manualOpenDates = new Set([
    ...allowedDates,
    ...Object.keys(specialDayHours),
    ...Object.keys(extraDaySlots),
  ]);

  const day = parseYMD(ds);
  const monthClosed = closedMonths.includes(day.getMonth());
  const manualOpen = manualOpenDates.has(ds);

  if (blockedDates.has(ds)) return "blocked-date";
  if (monthClosed && !manualOpen) return "closed-month";

  // 4) Hours: special-hours whitelist overrides the window; otherwise the business window
  //    (with a default window if the day was manually opened on a normally-closed weekday).
  const startMin = zonedMinutes(start);
  const whitelist = Array.isArray(specialDayHours[ds]) ? specialDayHours[ds] : [];
  if (whitelist.length) {
    const allowedMins = new Set(whitelist.map(hhmmToMinutes).filter((m) => m != null));
    return allowedMins.has(startMin) ? null : "outside-hours";
  }

  const win = businessWindow(day);
  const effectiveWindow = win || (manualOpen ? { open: DEFAULT_OPEN_MINUTES, close: DEFAULT_CLOSE_MINUTES } : null);
  if (!effectiveWindow) return "closed-weekday";

  const endMin = zonedMinutes(end);
  if (startMin < effectiveWindow.open || endMin > effectiveWindow.close) return "outside-hours";

  return null;
}

module.exports = {
  CY_TIMEZONE,
  DEFAULT_OPEN_MINUTES,
  DEFAULT_CLOSE_MINUTES,
  DEFAULT_STEP_MINUTES,
  SLOT_DURATION_MINUTES,
  GREEK_TO_BARBER_KEY,
  normalizeSlotRules,
  activeSlotRule,
  buildDaySlots,
  slotDurationFor,
  toLocalYMD,
  parseYMD,
  zonedMinutes,
  businessWindow,
  generateSlots,
  overlaps,
  minutesToHHMM,
  hhmmToMinutes,
  getScopedSettingList,
  horizonEndYMD,
  assertSlotBookable,
};
