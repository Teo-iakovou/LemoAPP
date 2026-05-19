const PublicBookingSettings = require("../models/publicBookingSettings");

const MIN_VISIBLE_MONTHS = 1;
const MAX_VISIBLE_MONTHS = 6;
const DEFAULT_VISIBLE_MONTH_COUNT = 2;
const BARBER_KEYS = ["LEMO", "FOROU", "KOUSHIS"];

function clampVisibleMonthCount(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return DEFAULT_VISIBLE_MONTH_COUNT;
  return Math.min(
    MAX_VISIBLE_MONTHS,
    Math.max(MIN_VISIBLE_MONTHS, Math.floor(num))
  );
}

function serializeSettings(doc) {
  if (!doc) {
    return {
      closedMonths: [],
      blockedDates: [],
      allowedDates: [],
      specialDayHours: {},
      extraDaySlots: {},
      barberPrices: {},
      visibleMonthCount: DEFAULT_VISIBLE_MONTH_COUNT,
      updatedAt: null,
      updatedBy: null,
    };
  }
  return {
    closedMonths: Array.isArray(doc.closedMonths) ? doc.closedMonths : [],
    barberClosedMonths: normalizeScopedMonths(doc.barberClosedMonths),
    blockedDates: Array.isArray(doc.blockedDates) ? doc.blockedDates : [],
    barberBlockedDates: normalizeScopedDates(doc.barberBlockedDates),
    allowedDates: Array.isArray(doc.allowedDates) ? doc.allowedDates : [],
    specialDayHours:
      doc.specialDayHours && typeof doc.specialDayHours === "object"
        ? Object.fromEntries(
            Object.entries(doc.specialDayHours).map(([key, value]) => [
              key,
              Array.isArray(value) ? value : [],
            ])
          )
        : {},
    extraDaySlots:
      doc.extraDaySlots && typeof doc.extraDaySlots === "object"
        ? Object.fromEntries(
            Object.entries(doc.extraDaySlots).map(([key, value]) => [
              key,
              Array.isArray(value) ? value : [],
            ])
          )
        : {},
    barberPrices: normalizeBarberPrices(doc.barberPrices),
    visibleMonthCount: clampVisibleMonthCount(doc.visibleMonthCount),
    updatedAt: doc.updatedAt || null,
    updatedBy: doc.updatedBy || null,
  };
}

function normalizeBarberKey(value = "") {
  const key = String(value || "").trim().toUpperCase();
  return BARBER_KEYS.includes(key) ? key : null;
}

function normalizeMonths(value) {
  if (!Array.isArray(value)) return [];
  const valid = value
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && v >= 0 && v <= 11);
  return Array.from(new Set(valid)).sort((a, b) => a - b);
}

function normalizeDates(value) {
  if (!Array.isArray(value)) return [];
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  return Array.from(
    new Set(
      value
        .map((v) => String(v || "").trim())
        .filter((v) => v && iso.test(v))
    )
  ).sort();
}

function normalizeTimeString(value = "") {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
}

function normalizeSpecialDayHours(payload) {
  if (!payload || typeof payload !== "object") return {};
  const result = {};
  const entries = Object.entries(payload);
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  for (const [date, hours] of entries) {
    if (!iso.test(date)) continue;
    if (!Array.isArray(hours)) continue;
    const sanitized = Array.from(
      new Set(
        hours
          .map((h) => normalizeTimeString(h))
          .filter((h) => typeof h === "string")
      )
    ).sort();
    if (sanitized.length) {
      result[date] = sanitized;
    }
  }
  return result;
}

function normalizeExtraDaySlots(payload) {
  if (!payload || typeof payload !== "object") return {};
  const result = {};
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  for (const [date, hours] of Object.entries(payload)) {
    if (!iso.test(date) || !Array.isArray(hours)) continue;
    const sanitized = Array.from(
      new Set(
        hours
          .map((h) => normalizeTimeString(h))
          .filter((h) => typeof h === "string")
      )
    ).sort();
    if (sanitized.length) {
      result[date] = sanitized;
    }
  }
  return result;
}

function normalizeVisibleMonthCount(value) {
  return clampVisibleMonthCount(value);
}

function normalizeBarberPrices(value) {
  if (!value || typeof value !== "object") return {};
  const out = {};
  BARBER_KEYS.forEach((key) => {
    if (value[key] === undefined) return;
    const n = Number(value[key]);
    if (!Number.isFinite(n)) return;
    const rounded = Math.round(n * 100) / 100;
    if (rounded < 0) return;
    out[key] = rounded;
  });
  return out;
}

function normalizeScopedMonths(value) {
  if (!value || typeof value !== "object") return {};
  const out = {};
  BARBER_KEYS.forEach((key) => {
    if (value[key] !== undefined) {
      out[key] = normalizeMonths(value[key]);
    }
  });
  return out;
}

function normalizeScopedDates(value) {
  if (!value || typeof value !== "object") return {};
  const out = {};
  BARBER_KEYS.forEach((key) => {
    if (value[key] !== undefined) {
      out[key] = normalizeDates(value[key]);
    }
  });
  return out;
}

const getSettings = async (req, res, next) => {
  try {
    const doc = await PublicBookingSettings.getSingleton();
    res.json({ settings: serializeSettings(doc) });
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const doc = await PublicBookingSettings.getSingleton();
    const barberKey = normalizeBarberKey(req.body?.barberKey);
    if (req.body?.barberKey && !barberKey) {
      return res.status(400).json({ message: "Invalid barberKey. Use LEMO, FOROU, KOUSHIS." });
    }

    if (barberKey) {
      const scopedClosedMonths = normalizeMonths(req.body?.closedMonths || []);
      const scopedBlockedDates = normalizeDates(req.body?.blockedDates || []);
      const nextBarberPrices = normalizeBarberPrices(doc.barberPrices);
      if (req.body?.price !== undefined) {
        const incomingPrice = Number(req.body.price);
        if (!Number.isFinite(incomingPrice) || incomingPrice < 0) {
          return res.status(400).json({ message: "Invalid price. Use a non-negative number." });
        }
        nextBarberPrices[barberKey] = Math.round(incomingPrice * 100) / 100;
      }

      const nextClosedMonths = {
        ...(doc.barberClosedMonths && typeof doc.barberClosedMonths === "object"
          ? doc.barberClosedMonths
          : {}),
        [barberKey]: scopedClosedMonths,
      };
      const nextBlockedDates = {
        ...(doc.barberBlockedDates && typeof doc.barberBlockedDates === "object"
          ? doc.barberBlockedDates
          : {}),
        [barberKey]: scopedBlockedDates,
      };

      doc.barberClosedMonths = nextClosedMonths;
      doc.barberBlockedDates = nextBlockedDates;
      doc.barberPrices = nextBarberPrices;
      doc.updatedBy = req.publicUserId || null;
      await doc.save();
      return res.json({ settings: serializeSettings(doc) });
    }

    const closedMonths = normalizeMonths(req.body?.closedMonths || []);
    const blockedDates = normalizeDates(req.body?.blockedDates || []);
    const allowedDates = normalizeDates(req.body?.allowedDates || []);

    const specialDayHours = normalizeSpecialDayHours(
      req.body?.specialDayHours || req.body?.specialHours
    );
    const extraDaySlots = normalizeExtraDaySlots(
      req.body?.extraDaySlots || req.body?.extraSlots
    );

    const visibleMonthCount = normalizeVisibleMonthCount(
      req.body?.visibleMonthCount
    );

    doc.closedMonths = closedMonths;
    doc.blockedDates = blockedDates;
    doc.allowedDates = allowedDates;
    doc.specialDayHours = specialDayHours;
    doc.extraDaySlots = extraDaySlots;
    doc.barberPrices = normalizeBarberPrices(req.body?.barberPrices || doc.barberPrices);
    doc.visibleMonthCount = visibleMonthCount;
    doc.barberClosedMonths = normalizeScopedMonths(req.body?.barberClosedMonths || doc.barberClosedMonths);
    doc.barberBlockedDates = normalizeScopedDates(req.body?.barberBlockedDates || doc.barberBlockedDates);
    doc.updatedBy = req.publicUserId || null;
    await doc.save();

    res.json({ settings: serializeSettings(doc) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
