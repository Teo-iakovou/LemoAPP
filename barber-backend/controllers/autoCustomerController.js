"use strict";

const AutoCustomer = require("../models/autoCustomer");
const Appointment = require("../models/appointment");
const { generateAutoAppointments } = require("../services/autoCustomerScheduler");
const AutoGenerationBatch = require("../models/autoGenerationBatch");

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const VALID_CADENCE = new Set([1, 2, 4]);
const VALID_BARBERS = new Set(["ΛΕΜΟ", "ΦΟΡΟΥ"]);

const normalizePhone = (input = "") => String(input).replace(/\s+/g, "").trim();

const parseBoolean = (value, defaultValue) => {
  if (value === undefined) return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lowered = value.toLowerCase();
    if (lowered === "true") return true;
    if (lowered === "false") return false;
  }
  return defaultValue;
};

const parseNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const parseDateInput = (value) => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const normalizeDateToMinute = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  date.setSeconds(0, 0);
  return date;
};

const buildPayload = (body, { partial = false } = {}) => {
  const errors = [];
  const payload = {};

  if (body.customerName !== undefined || !partial) {
    const name = typeof body.customerName === "string" ? body.customerName.trim() : "";
    if (!name) {
      errors.push("Customer name is required.");
    } else {
      payload.customerName = name;
    }
  }

  if (body.phoneNumber !== undefined || !partial) {
    const phone = normalizePhone(body.phoneNumber);
    if (!phone) {
      errors.push("Phone number is required.");
    } else {
      payload.phoneNumber = phone;
    }
  }

  if (body.barber !== undefined || !partial) {
    const barber = typeof body.barber === "string" ? body.barber.trim().toUpperCase() : "";
    if (!VALID_BARBERS.has(barber)) {
      errors.push("Barber must be one of ΛΕΜΟ or ΦΟΡΟΥ.");
    } else {
      payload.barber = barber;
    }
  }

  if (body.weekday !== undefined || !partial) {
    const weekday = parseNumber(body.weekday);
    if (weekday === undefined || weekday < 0 || weekday > 6) {
      errors.push("Weekday must be an integer between 0 (Sunday) and 6 (Saturday).");
    } else {
      payload.weekday = weekday;
    }
  }

  if (body.timeOfDay !== undefined || !partial) {
    const time = typeof body.timeOfDay === "string" ? body.timeOfDay.trim() : "";
    if (!TIME_PATTERN.test(time)) {
      errors.push("timeOfDay must be in HH:mm 24-hour format.");
    } else {
      payload.timeOfDay = time;
    }
  }

  if (body.durationMin !== undefined) {
    const duration = parseNumber(body.durationMin);
    if (duration === undefined || duration < 5 || duration > 600) {
      errors.push("durationMin must be between 5 and 600 minutes.");
    } else {
      payload.durationMin = duration;
    }
  } else if (!partial) {
    payload.durationMin = 40;
  }

  if (body.cadenceWeeks !== undefined || !partial) {
    const cadence = parseNumber(body.cadenceWeeks);
    if (cadence === undefined || !VALID_CADENCE.has(cadence)) {
      errors.push("cadenceWeeks must be 1, 2, or 4.");
    } else {
      payload.cadenceWeeks = cadence;
    }
  }

  if (body.maxOccurrences !== undefined) {
    const count = parseNumber(body.maxOccurrences);
    if (count === undefined || count < 1 || count > 52) {
      errors.push("maxOccurrences must be between 1 and 52 when provided.");
    } else {
      payload.maxOccurrences = count;
    }
  } else if (!partial) {
    payload.maxOccurrences = undefined;
  }

  if (body.startFrom !== undefined || !partial) {
    const startFrom = parseDateInput(body.startFrom);
    if (!startFrom) {
      errors.push("startFrom must be a valid date.");
    } else {
      payload.startFrom = startFrom;
    }
  }

  if (body.until !== undefined) {
    if (body.until === null || body.until === "") {
      payload.until = undefined;
    } else {
      const until = parseDateInput(body.until);
      if (!until) {
        errors.push("until must be a valid date when provided.");
      } else {
        payload.until = until;
      }
    }
  }

  if (body.notes !== undefined) {
    payload.notes = typeof body.notes === "string" ? body.notes.trim() : "";
  }

  if (body.recursive !== undefined || !partial) {
    payload.recursive = parseBoolean(body.recursive, true);
  }

  if (body.active !== undefined) {
    payload.active = parseBoolean(body.active, true);
  }

  return { payload, errors };
};

const createAutoCustomer = async (req, res, next) => {
  try {
    const { payload, errors } = buildPayload(req.body, { partial: false });

    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    if (payload.until && payload.startFrom && payload.until < payload.startFrom) {
      return res.status(400).json({
        success: false,
        errors: ["until date cannot be earlier than startFrom date."],
      });
    }

    payload.createdBy = req.user?._id || undefined;
    payload.updatedBy = req.user?._id || undefined;

    const autoCustomer = await AutoCustomer.create(payload);
    res.status(201).json({ success: true, data: autoCustomer });
  } catch (error) {
    console.error("Error creating auto customer:", error);
    next(error);
  }
};

const listAutoCustomers = async (req, res, next) => {
  try {
    const { active, barber, recursive, q } = req.query;
    const filter = {};

    if (active !== undefined) filter.active = parseBoolean(active, true);
    if (recursive !== undefined) filter.recursive = parseBoolean(recursive, true);
    if (barber) filter.barber = barber.trim().toUpperCase();
    if (q) {
      const regex = new RegExp(q.trim(), "i");
      filter.$or = [{ customerName: regex }, { phoneNumber: regex }];
    }

    const autoCustomers = await AutoCustomer.find(filter)
      .sort({ barber: 1, weekday: 1, timeOfDay: 1, customerName: 1 })
      .lean();

    res.json({ success: true, data: autoCustomers });
  } catch (error) {
    console.error("Error listing auto customers:", error);
    next(error);
  }
};

const getLastAutoCustomerAppointments = async (req, res, next) => {
  try {
    const cursor = await Appointment.aggregate([
      {
        $match: {
          type: "appointment",
          appointmentStatus: { $ne: "cancelled" },
          "source.kind": "auto-customer",
          "source.autoCustomerId": { $ne: null },
        },
      },
      { $sort: { appointmentDateTime: -1 } },
      {
        $group: {
          _id: "$source.autoCustomerId",
          appointmentDateTime: { $first: "$appointmentDateTime" },
          endTime: { $first: "$endTime" },
          duration: { $first: "$duration" },
          barber: { $first: "$barber" },
        },
      },
    ]);

    const map = {};
    cursor.forEach((entry) => {
      if (!entry?._id) return;
      map[entry._id.toString()] = {
        appointmentDateTime: entry.appointmentDateTime,
        endTime: entry.endTime,
        duration: entry.duration,
        barber: entry.barber,
      };
    });

    res.json({ success: true, data: map });
  } catch (error) {
    console.error("Error fetching last auto customer appointments:", error);
    next(error);
  }
};

const updateAutoCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { payload, errors } = buildPayload(req.body, { partial: true });

    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const autoCustomer = await AutoCustomer.findById(id);
    if (!autoCustomer) {
      return res.status(404).json({ success: false, message: "Auto customer not found." });
    }

    if (payload.until && !payload.startFrom && autoCustomer.startFrom && payload.until < autoCustomer.startFrom) {
      return res.status(400).json({
        success: false,
        errors: ["until date cannot be earlier than startFrom date."],
      });
    }

    Object.assign(autoCustomer, payload);
    autoCustomer.updatedBy = req.user?._id || autoCustomer.updatedBy;

    await autoCustomer.save();
    res.json({ success: true, data: autoCustomer });
  } catch (error) {
    console.error("Error updating auto customer:", error);
    next(error);
  }
};

const deleteAutoCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await AutoCustomer.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Auto customer not found." });
    }

    res.json({ success: true, message: "Auto customer deleted successfully." });
  } catch (error) {
    console.error("Error deleting auto customer:", error);
    next(error);
  }
};

const overrideAutoCustomerOccurrence = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { occurrence, overrideStart, durationMin, barber } = req.body || {};

    const originalMoment = normalizeDateToMinute(occurrence);
    const overrideMoment = normalizeDateToMinute(overrideStart);

    if (!originalMoment) {
      return res.status(400).json({ success: false, message: "A valid occurrence datetime is required." });
    }
    if (!overrideMoment) {
      return res.status(400).json({ success: false, message: "A valid override datetime is required." });
    }

    const autoCustomer = await AutoCustomer.findById(id);
    if (!autoCustomer) {
      return res.status(404).json({ success: false, message: "Auto customer not found." });
    }

    const originalTs = originalMoment.getTime();
    const overrideTs = overrideMoment.getTime();

    let overrideDuration = undefined;
    if (durationMin !== undefined) {
      const parsedDuration = Number(durationMin);
      if (!Number.isFinite(parsedDuration) || parsedDuration < 5 || parsedDuration > 600) {
        return res.status(400).json({
          success: false,
          message: "durationMin must be between 5 and 600 minutes.",
        });
      }
      overrideDuration = parsedDuration;
    }

    let overrideBarber = undefined;
    if (barber !== undefined) {
      const normalizedBarber = String(barber).trim().toUpperCase();
      if (!VALID_BARBERS.has(normalizedBarber)) {
        return res.status(400).json({
          success: false,
          message: "Barber must be one of ΛΕΜΟ or ΦΟΡΟΥ.",
        });
      }
      overrideBarber = normalizedBarber;
    }

    autoCustomer.skippedOccurrences = (autoCustomer.skippedOccurrences || [])
      .map((value) => normalizeDateToMinute(value))
      .filter((date) => date && date.getTime() !== originalTs)
      .map((date) => (date ? new Date(date.getTime()) : null))
      .filter(Boolean);

    const overrides = (autoCustomer.occurrenceOverrides || []).map((entry) => ({
      ...entry,
      originalStart: normalizeDateToMinute(entry.originalStart),
      overrideStart: normalizeDateToMinute(entry.overrideStart),
      durationMin: entry.durationMin,
      barber: entry.barber,
    }));

    const existingIndex = overrides.findIndex(
      (entry) => entry.originalStart && entry.originalStart.getTime() === originalTs
    );

    if (originalTs === overrideTs) {
      if (existingIndex >= 0) {
        overrides.splice(existingIndex, 1);
      }
    } else if (existingIndex >= 0) {
      overrides[existingIndex].overrideStart = overrideMoment;
      if (overrideDuration !== undefined) {
        overrides[existingIndex].durationMin = overrideDuration;
      }
      if (overrideBarber !== undefined) {
        overrides[existingIndex].barber = overrideBarber;
      }
    } else {
      overrides.push({
        originalStart: originalMoment,
        overrideStart: overrideMoment,
        durationMin: overrideDuration,
        barber: overrideBarber,
      });
    }

    autoCustomer.occurrenceOverrides = overrides
      .filter((entry) => entry.originalStart && entry.overrideStart)
      .map((entry) => ({
        originalStart: new Date(entry.originalStart.getTime()),
        overrideStart: new Date(entry.overrideStart.getTime()),
        durationMin: entry.durationMin !== undefined ? entry.durationMin : undefined,
        barber: entry.barber,
      }));

    autoCustomer.updatedBy = req.user?._id || autoCustomer.updatedBy;

    autoCustomer.markModified("occurrenceOverrides");
    autoCustomer.markModified("skippedOccurrences");

    await autoCustomer.save();

    res.json({ success: true, data: autoCustomer });
  } catch (error) {
    console.error("Error overriding auto customer occurrence:", error);
    next(error);
  }
};

const skipAutoCustomerOccurrence = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { occurrence } = req.body || {};

    const originalMoment = normalizeDateToMinute(occurrence);
    if (!originalMoment) {
      return res.status(400).json({ success: false, message: "A valid occurrence datetime is required." });
    }

    const autoCustomer = await AutoCustomer.findById(id);
    if (!autoCustomer) {
      return res.status(404).json({ success: false, message: "Auto customer not found." });
    }

    const originalTs = originalMoment.getTime();

    const skippedSet = new Set(
      (autoCustomer.skippedOccurrences || [])
        .map((value) => normalizeDateToMinute(value))
        .filter(Boolean)
        .map((date) => date.getTime())
    );
    skippedSet.add(originalTs);

    autoCustomer.skippedOccurrences = Array.from(skippedSet)
      .sort((a, b) => a - b)
      .map((timestamp) => new Date(timestamp));

    autoCustomer.occurrenceOverrides = (autoCustomer.occurrenceOverrides || [])
      .map((entry) => ({
        ...entry,
        originalStart: normalizeDateToMinute(entry.originalStart),
        overrideStart: normalizeDateToMinute(entry.overrideStart),
        durationMin: entry.durationMin,
        barber: entry.barber,
      }))
      .filter((entry) => entry.originalStart && entry.originalStart.getTime() !== originalTs)
      .filter((entry) => entry.originalStart && entry.overrideStart)
      .map((entry) => ({
        originalStart: new Date(entry.originalStart.getTime()),
        overrideStart: new Date(entry.overrideStart.getTime()),
        durationMin: entry.durationMin,
        barber: entry.barber,
      }));

    autoCustomer.updatedBy = req.user?._id || autoCustomer.updatedBy;

    autoCustomer.markModified("occurrenceOverrides");
    autoCustomer.markModified("skippedOccurrences");

    await autoCustomer.save();

    res.json({ success: true, data: autoCustomer });
  } catch (error) {
    console.error("Error skipping auto customer occurrence:", error);
    next(error);
  }
};

const pushAutoCustomers = async (req, res, next) => {
  try {
    const {
      from,
      to,
      dryRun = false,
      includeInactive = false,
      includePaused = false,
      customerIds,
    } = req.body || {};

    const filter = {};
    if (!parseBoolean(includeInactive, false)) {
      filter.active = { $ne: false };
    }
    if (!parseBoolean(includePaused, false)) {
      filter.recursive = { $ne: false };
    }

    if (customerIds) {
      const ids = Array.isArray(customerIds)
        ? customerIds
        : String(customerIds)
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean);

      if (ids.length) {
        filter._id = { $in: ids };
      }
    }

    const customers = await AutoCustomer.find(filter).lean();

    const result = await generateAutoAppointments({
      customers,
      rangeStart: from,
      rangeEnd: to,
      dryRun: parseBoolean(dryRun, false),
      initiatedBy: req.user?._id,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error pushing auto customers:", error);
    next(error);
  }
};

const listGenerationBatches = async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const parsedLimit = Math.min(parseInt(limit, 10) || 20, 100);
    const parsedOffset = parseInt(offset, 10) || 0;

    const batches = await AutoGenerationBatch.find()
      .sort({ createdAt: -1 })
      .skip(parsedOffset)
      .limit(parsedLimit)
      .lean();

    const total = await AutoGenerationBatch.countDocuments();

    res.json({
      success: true,
      data: batches,
      total,
      limit: parsedLimit,
      offset: parsedOffset,
    });
  } catch (error) {
    console.error("Error fetching auto generation batches:", error);
    next(error);
  }
};

const getGenerationBatch = async (req, res, next) => {
  try {
    const { batchId } = req.params;

    const batch = await AutoGenerationBatch.findOne({ batchId }).lean();

    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found." });
    }

    res.json({ success: true, data: batch });
  } catch (error) {
    console.error("Error fetching auto generation batch:", error);
    next(error);
  }
};

const undoGenerationBatch = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const { reason } = req.body || {};

    const batch = await AutoGenerationBatch.findOne({ batchId });
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found." });
    }

    if (batch.dryRun) {
      return res.status(400).json({ success: false, message: "Cannot undo a dry-run batch." });
    }

    if (batch.undoneAt) {
      return res.status(400).json({ success: false, message: "Batch already undone." });
    }

    const appointmentIds = batch.appointmentIds || [];
    if (appointmentIds.length === 0) {
      batch.undoneAt = new Date();
      batch.undoReason = reason ? String(reason).trim() : undefined;
      await batch.save();
      return res.json({ success: true, message: "Batch marked as undone (no appointments to remove)." });
    }

    await Appointment.deleteMany({ _id: { $in: appointmentIds } });

    batch.undoneAt = new Date();
    batch.undoReason = reason ? String(reason).trim() : undefined;
    await batch.save();

    res.json({ success: true, message: "Batch undone and appointments removed." });
  } catch (error) {
    console.error("Error undoing auto generation batch:", error);
    next(error);
  }
};

module.exports = {
  listAutoCustomers,
  getLastAutoCustomerAppointments,
  createAutoCustomer,
  updateAutoCustomer,
  deleteAutoCustomer,
  pushAutoCustomers,
  listGenerationBatches,
  getGenerationBatch,
  undoGenerationBatch,
  overrideAutoCustomerOccurrence,
  skipAutoCustomerOccurrence,
};
