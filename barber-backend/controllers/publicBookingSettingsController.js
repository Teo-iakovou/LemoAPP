const PublicBookingSettings = require("../models/publicBookingSettings");

function serializeSettings(doc) {
  if (!doc) {
    return {
      closedMonths: [],
      blockedDates: [],
      allowedDates: [],
      specialDayHours: {},
      extraDaySlots: {},
      updatedAt: null,
      updatedBy: null,
    };
  }
  return {
    closedMonths: Array.isArray(doc.closedMonths) ? doc.closedMonths : [],
    blockedDates: Array.isArray(doc.blockedDates) ? doc.blockedDates : [],
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
    updatedAt: doc.updatedAt || null,
    updatedBy: doc.updatedBy || null,
  };
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
    const closedMonths = normalizeMonths(req.body?.closedMonths || []);
    const blockedDates = normalizeDates(req.body?.blockedDates || []);
    const allowedDates = normalizeDates(req.body?.allowedDates || []);

    const specialDayHours = normalizeSpecialDayHours(
      req.body?.specialDayHours || req.body?.specialHours
    );
    const extraDaySlots = normalizeExtraDaySlots(
      req.body?.extraDaySlots || req.body?.extraSlots
    );

    doc.closedMonths = closedMonths;
    doc.blockedDates = blockedDates;
    doc.allowedDates = allowedDates;
    doc.specialDayHours = specialDayHours;
    doc.extraDaySlots = extraDaySlots;
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
