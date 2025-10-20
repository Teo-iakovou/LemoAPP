"use strict";

const mongoose = require("mongoose");
const moment = require("moment-timezone");
const Appointment = require("../models/appointment");
const AutoCustomer = require("../models/autoCustomer");
const AutoGenerationBatch = require("../models/autoGenerationBatch");
const { sendSMS } = require("../utils/smsService");

const TZ = "Europe/Athens";
const SHIFT_OPTIONS = [0, 15, 30]; // minutes
const CONFLICT_TYPES = new Set(["appointment", "lock", "break"]);

const toMoment = (value) => moment.tz(value, TZ);

const normalizeRange = ({ from, to }) => {
  const start = from ? toMoment(from) : moment.tz(TZ);
  const end = to ? toMoment(to) : start.clone().add(8, "weeks");

  return {
    start: start.clone().startOf("minute"),
    end: end.clone().startOf("minute"),
  };
};

const computeBaseOccurrence = (customer) => {
  const cadence = customer.cadenceWeeks || 1;
  const [hour, minute] = (customer.timeOfDay || "09:00").split(":").map(Number);

  const startFrom = customer.startFrom
    ? moment(customer.startFrom).tz(TZ)
    : moment.tz(TZ);
  startFrom.startOf("day");

  let base = startFrom.clone().hour(hour).minute(minute).second(0).millisecond(0);
  const targetWeekday = Number.isFinite(Number(customer.weekday))
    ? Number(customer.weekday)
    : base.day();

  const currentWeekday = base.day();
  const diff = (targetWeekday - currentWeekday + 7) % 7;
  base.add(diff, "days");

  if (base.isBefore(startFrom)) {
    base.add(cadence, "weeks");
  }

  return base;
};

const buildScheduleMap = (appointments) => {
  const map = new Map();
  appointments.forEach((appt) => {
    const barber = appt.barber;
    if (!map.has(barber)) map.set(barber, []);

    const start = toMoment(appt.appointmentDateTime);
    const end = appt.endTime ? toMoment(appt.endTime) : start.clone().add(appt.duration || 0, "minutes");

    map.get(barber).push({
      start,
      end,
      type: appt.type,
    });
  });

  // sort each barber's events by start time for quicker lookups
  map.forEach((events) => {
    events.sort((a, b) => a.start.valueOf() - b.start.valueOf());
  });

  return map;
};

const slotConflicts = (events = [], start, durationMin) => {
  const end = start.clone().add(durationMin, "minutes");
  return events.some((evt) => {
    if (!CONFLICT_TYPES.has(evt.type)) return false;
    return start.isBefore(evt.end) && end.isAfter(evt.start);
  });
};

const addEventToSchedule = (scheduleMap, barber, start, durationMin, type = "appointment") => {
  if (!scheduleMap.has(barber)) scheduleMap.set(barber, []);
  const end = start.clone().add(durationMin, "minutes");
  scheduleMap.get(barber).push({ start, end, type });
};

const sendConfirmationSMS = async (appointment, barber) => {
  if (!appointment.phoneNumber) {
    return { status: "skipped", reason: "missing-phone" };
  }

  const appointmentMoment = moment.tz(appointment.appointmentDateTime, TZ);
  if (appointmentMoment.isBefore(moment.tz(TZ))) {
    return { status: "skipped", reason: "in-past" };
  }

  const formattedLocalTime = appointmentMoment.format("DD/MM/YYYY HH:mm");
  const message = `Επιβεβαιώνουμε το ραντεβού σας στο LEMO BARBER SHOP με τον ${barber} για τις ${formattedLocalTime}!\nWe confirm your appointment at LEMO BARBER SHOP with ${barber} for ${formattedLocalTime}!`;

  try {
    const smsResponse = await sendSMS(appointment.phoneNumber, message);
    const messageId = smsResponse?.message_id || smsResponse?.messageId || null;
    const status = smsResponse?.success ? "sent" : "failed";

    appointment.reminders.push({
      type: "confirmation",
      sentAt: new Date(),
      messageId,
      messageText: message,
      senderId: "Lemo Barber",
      status,
      retryCount: 0,
    });
    await appointment.save();

    return { status, messageId };
  } catch (error) {
    appointment.reminders.push({
      type: "confirmation",
      sentAt: new Date(),
      messageId: null,
      messageText: message,
      senderId: "Lemo Barber",
      status: "failed",
      retryCount: 0,
      error: error.message,
    });

    try {
      await appointment.save();
    } catch (saveErr) {
      console.error("Failed to persist SMS failure reminder:", saveErr);
    }

    return { status: "failed", error: error.message };
  }
};

const generateAutoAppointments = async ({
  customers,
  rangeStart,
  rangeEnd,
  dryRun = true,
  initiatedBy,
}) => {
  if (!Array.isArray(customers) || customers.length === 0) {
    return {
      dryRun,
      summary: [],
      totals: { attempted: 0, inserted: 0, moved: 0, skipped: 0, existing: 0 },
    };
  }

  const { start: fromMoment, end: toMomentRange } = normalizeRange({
    from: rangeStart,
    to: rangeEnd,
  });

  if (!toMomentRange.isAfter(fromMoment)) {
    throw new Error("Range end must be after range start.");
  }

  const barbers = Array.from(new Set(customers.map((c) => c.barber))).filter(Boolean);
  const autoCustomerIds = customers.map((c) => c._id).filter(Boolean);

  const queryStart = fromMoment.clone().subtract(1, "day").toDate();
  const queryEnd = toMomentRange.clone().add(1, "day").toDate();

  const existingAppointments = await Appointment.find({
    barber: { $in: barbers },
    appointmentDateTime: { $lt: queryEnd },
    endTime: { $gt: queryStart },
  }).lean();

  const existingAutoAppointments = await Appointment.find({
    "source.kind": "auto-customer",
    "source.autoCustomerId": { $in: autoCustomerIds },
    appointmentDateTime: { $gte: queryStart, $lt: queryEnd },
  })
    .select({ appointmentDateTime: 1, "source.autoCustomerId": 1 })
    .lean();

  const existingAutoSet = new Set(
    existingAutoAppointments.map(
      (appt) => `${appt.source.autoCustomerId.toString()}_${appt.appointmentDateTime.getTime()}`
    )
  );

  const scheduleMap = buildScheduleMap(existingAppointments);
  const batchId = dryRun ? null : new mongoose.Types.ObjectId().toHexString();
  const now = new Date();

  const summary = [];
  const totals = {
    attempted: 0,
    inserted: 0,
    moved: 0,
    skipped: 0,
    existing: 0,
    smsSent: 0,
    smsFailed: 0,
    smsSkipped: 0,
  };
  const touchedCustomers = new Set();
  const createdAppointments = [];
  const customerEventsForSms = new Map();

  for (const customer of customers) {
    const customerId = customer._id ? customer._id.toString() : null;
    if (customer.active === false) continue;
    if (customer.recursive === false) continue;
    if (!customer.timeOfDay) continue;

    const cadence = customer.cadenceWeeks || 1;
    const defaultDuration = customer.durationMin || 40;
    const untilMoment = customer.until ? toMoment(customer.until).endOf("day") : null;
    let maxOccurrences = customer.maxOccurrences && Number(customer.maxOccurrences) > 0
      ? Number(customer.maxOccurrences)
      : null;
    if (!untilMoment && (!maxOccurrences || !Number.isFinite(maxOccurrences))) {
      maxOccurrences = 5;
    }
    let generatedForCustomer = 0;

    const skippedSet = new Set(
      (customer.skippedOccurrences || [])
        .map((value) => toMoment(value))
        .filter((momentDate) => momentDate && momentDate.isValid())
        .map((momentDate) => momentDate.valueOf())
    );

    const overrideMap = new Map(
      (customer.occurrenceOverrides || [])
        .map((entry) => {
          const original = entry.originalStart ? toMoment(entry.originalStart) : null;
          const overrideStart = entry.overrideStart ? toMoment(entry.overrideStart) : null;
          if (!original || !overrideStart || !original.isValid() || !overrideStart.isValid()) {
            return null;
          }
          return [
            original.startOf("minute").valueOf(),
            {
              overrideStart: overrideStart.startOf("minute"),
              durationMin: entry.durationMin,
              barber: entry.barber,
            },
          ];
        })
        .filter(Boolean)
    );

    let occurrence = computeBaseOccurrence(customer);
    const startBoundary = customer.startFrom
      ? moment(customer.startFrom).tz(TZ).startOf("day")
      : fromMoment.clone();
    const minStart = moment.max(fromMoment, startBoundary);

    while (occurrence.isBefore(minStart)) {
      occurrence.add(cadence, "weeks");
    }

    while (!occurrence.isAfter(toMomentRange)) {
      if (untilMoment && occurrence.isAfter(untilMoment)) break;
      if (maxOccurrences && generatedForCustomer >= maxOccurrences) break;

      const occurrenceValue = occurrence.valueOf();

      if (skippedSet.has(occurrenceValue)) {
        summary.push({
          autoCustomerId: customerId,
          customerName: customer.customerName,
          barber: customer.barber,
          scheduledFor: occurrence.toISOString(),
          status: "skipped",
          reason: "manual-skip",
          shiftMinutes: 0,
          smsStatus: "n/a",
        });
        totals.skipped += 1;
        occurrence = occurrence.clone().add(cadence, "weeks");
        continue;
      }

      const overrideEntry = overrideMap.get(occurrenceValue);
      const desiredStart = overrideEntry
        ? overrideEntry.overrideStart.clone()
        : occurrence.clone();
      const targetBarber = overrideEntry?.barber || customer.barber;
      const duration = overrideEntry?.durationMin || defaultDuration;

      const shiftCandidates = overrideEntry ? [0] : SHIFT_OPTIONS;

      totals.attempted += 1;
      const scheduleForBarber = scheduleMap.get(targetBarber) || [];
      let matchedStart = null;
      let appliedShift = 0;
      let reason = overrideEntry ? "override-conflict" : "conflict";

      for (const shiftMin of shiftCandidates) {
        const candidateStart = desiredStart.clone().add(shiftMin, "minutes");

        if (!overrideEntry && candidateStart.day() !== occurrence.day()) {
          continue;
        }
        if (candidateStart.isAfter(toMomentRange)) continue;
        if (untilMoment && candidateStart.isAfter(untilMoment)) continue;

        if (!slotConflicts(scheduleForBarber, candidateStart, duration)) {
          matchedStart = candidateStart;
          appliedShift = shiftMin;
          break;
        }
      }

      if (!matchedStart) {
        summary.push({
          autoCustomerId: customerId,
          customerName: customer.customerName,
          barber: customer.barber,
          scheduledFor: occurrence.toISOString(),
          status: "skipped",
          reason,
          shiftMinutes: 0,
          smsStatus: "n/a",
        });
        totals.skipped += 1;
        occurrence = occurrence.clone().add(cadence, "weeks");
        continue;
      }

      const finalKey = customerId ? `${customerId}_${matchedStart.valueOf()}` : null;

      if (finalKey && existingAutoSet.has(finalKey)) {
        summary.push({
          autoCustomerId: customerId,
          customerName: customer.customerName,
          barber: targetBarber,
          scheduledFor: matchedStart.toISOString(),
          status: "existing",
          reason: overrideEntry ? "override-already-created" : "already-created",
          shiftMinutes: appliedShift,
          smsStatus: "n/a",
        });
        totals.existing += 1;
        occurrence = occurrence.clone().add(cadence, "weeks");
        continue;
      }

      if (customerId) {
        existingAutoSet.add(finalKey);
      }
      addEventToSchedule(scheduleMap, targetBarber, matchedStart.clone(), duration);
      if (customerId) {
        touchedCustomers.add(customerId);
      }

      if (!dryRun) {
        const appointmentEnd = matchedStart.clone().add(duration, "minutes").toDate();

        const appointment = new Appointment({
          customerName: customer.customerName,
          phoneNumber: customer.phoneNumber,
          barber: targetBarber,
          appointmentDateTime: matchedStart.clone().toDate(),
          endTime: appointmentEnd,
          duration,
          type: "appointment",
          source: {
            kind: "auto-customer",
            autoCustomerId: customer._id,
            batchId,
          },
          createdBy: initiatedBy ? String(initiatedBy) : null,
          meta: {
            autoGeneratedAt: now,
            cadenceWeeks: cadence,
            originalPlannedTime: occurrence.toISOString(),
            shiftMinutes: appliedShift,
            overrideApplied: Boolean(overrideEntry),
          },
        });

        await appointment.save();
        createdAppointments.push(appointment);

        const scheduledList = customerEventsForSms.get(customerId || matchedStart.toISOString()) || [];
        scheduledList.push({ start: matchedStart.clone(), appointment });
        customerEventsForSms.set(customerId || matchedStart.toISOString(), scheduledList);
      }

      if (dryRun) {
        summary.push({
          autoCustomerId: customerId,
          customerName: customer.customerName,
          barber: targetBarber,
          scheduledFor: matchedStart.toISOString(),
          status: appliedShift === 0 ? "inserted" : "moved",
          shiftMinutes: appliedShift,
          reason: overrideEntry
            ? appliedShift === 0
              ? "override-scheduled"
              : `override-shifted-by-${appliedShift}`
            : appliedShift === 0
            ? "scheduled"
            : `shifted-by-${appliedShift}`,
          smsStatus: "dry-run",
        });
      }

      if (appliedShift === 0) {
        totals.inserted += 1;
      } else {
        totals.moved += 1;
      }

      generatedForCustomer += 1;

      occurrence = occurrence.clone().add(cadence, "weeks");
    }
  }

  if (!dryRun && touchedCustomers.size > 0) {
    await AutoCustomer.updateMany(
      { _id: { $in: Array.from(touchedCustomers) } },
      { $set: { lastPushedAt: now } }
    );
  }

  if (!dryRun && customerEventsForSms.size > 0) {
    for (const [customerKey, events] of customerEventsForSms.entries()) {
      if (!events.length) continue;

      const firstAppointment = events[0].appointment;
      const phoneNumber = firstAppointment.phoneNumber;
      const barber = firstAppointment.barber;

      if (!phoneNumber) {
        totals.smsSkipped += events.length;
       events.forEach(({ appointment }) => {
          const shift = appointment.meta?.shiftMinutes || 0;
          summary.push({
            autoCustomerId: customerKey,
            customerName: firstAppointment.customerName,
            barber,
            scheduledFor: appointment.appointmentDateTime.toISOString(),
            status: shift > 0 ? "moved" : "inserted",
            shiftMinutes: shift,
            reason: shift > 0 ? `shifted-by-${shift}` : "scheduled",
            smsStatus: "missing-phone",
          });
        });
        continue;
      }

      const formattedDates = events
        .map(({ appointment }) =>
          moment.tz(appointment.appointmentDateTime, TZ).format("DD/MM/YYYY HH:mm")
        )
        .join(", ");

      const message = `Επιβεβαιώνουμε τα ραντεβού σας στο LEMO BARBER SHOP με τον ${barber} για τις ημερομηνίες: ${formattedDates}.\nWe confirm your appointments at LEMO BARBER SHOP with ${barber} for the dates: ${formattedDates}.`;

      let smsStatus = "failed";
      let smsError = null;
      let messageId = null;

      try {
        const smsResponse = await sendSMS(phoneNumber, message);
        messageId = smsResponse?.message_id || smsResponse?.messageId || null;
        smsStatus = smsResponse?.success ? "sent" : "failed";
      } catch (error) {
        smsError = error.message;
      }

      if (smsStatus === "sent") {
        totals.smsSent += 1;
      } else if (smsStatus === "failed") {
        totals.smsFailed += 1;
      } else {
        totals.smsSkipped += 1;
      }

      for (const { appointment } of events) {
        const shift = appointment.meta?.shiftMinutes || 0;
        const status = shift > 0 ? "moved" : "inserted";
        const reason = shift > 0 ? `shifted-by-${shift}` : "scheduled";
        appointment.reminders.push({
          type: "confirmation",
          sentAt: new Date(),
          messageId,
          messageText: message,
          senderId: "Lemo Barber",
          status: smsStatus,
          retryCount: 0,
          error: smsError || undefined,
        });
        await appointment.save();

        summary.push({
          autoCustomerId: customerKey,
          customerName: appointment.customerName,
          barber,
          scheduledFor: appointment.appointmentDateTime.toISOString(),
          status,
          shiftMinutes: shift,
          reason,
          smsStatus,
          smsError: smsError || undefined,
        });
      }
    }
  }

  let savedBatch = null;
  if (!dryRun) {
    const batchDoc = new AutoGenerationBatch({
      batchId,
      initiatedBy,
      range: {
        from: fromMoment.toDate(),
        to: toMomentRange.toDate(),
      },
      totals: {
        attempted: totals.attempted,
        inserted: totals.inserted,
        moved: totals.moved,
        skipped: totals.skipped,
        existing: totals.existing,
        smsSent: totals.smsSent,
        smsFailed: totals.smsFailed,
        smsSkipped: totals.smsSkipped,
      },
      autoCustomerIds: Array.from(touchedCustomers, (id) => new mongoose.Types.ObjectId(id)),
      appointmentIds: createdAppointments.map((appt) => appt._id),
      summary: summary.map((item) => ({
        autoCustomerId: item.autoCustomerId,
        customerName: item.customerName,
        barber: item.barber,
        scheduledFor: item.scheduledFor ? new Date(item.scheduledFor) : undefined,
        status: item.status,
        reason: item.reason,
        shiftMinutes: item.shiftMinutes,
        smsStatus: item.smsStatus,
        smsReason: item.smsReason,
        smsError: item.smsError,
      })),
      dryRun: false,
      createdAt: now,
    });

    savedBatch = await batchDoc.save();
  }

  return {
    dryRun,
    batchId,
    range: {
      from: fromMoment.toISOString(),
      to: toMomentRange.toISOString(),
    },
    totals,
    summary,
    createdCount: createdAppointments.length,
    savedBatchId: savedBatch ? savedBatch._id : null,
  };
};

module.exports = {
  generateAutoAppointments,
};
