const Appointment = require("../models/appointment");
const Customer = require("../models/customer");
const User = require("../models/user");
const { sendSMS } = require("../utils/smsService")
const { upsertCustomerFromIdentity } = require("../utils/customerSync");
const { resolveBarberScope } = require("../utils/appointmentScope");

const moment = require("moment-timezone");
const { getUserIdFromRequest, getPublicUserIdFromRequest, hasBearerToken } = require("../utils/auth");
function normalizePhone(input = "") {
  try {
    return String(input)
      .trim()
      .replace(/\s+/g, "")
      .replace(/^00/, "+");
  } catch {
    return String(input || "");
  }
}
function normalizePhoneDigits(input = "") {
  try {
    return String(input).replace(/\D+/g, "");
  } catch {
    return "";
  }
}

function escapeForRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPhoneLookupVariants(rawInput = "") {
  const normalized = normalizePhone(rawInput);
  const digits = normalizePhoneDigits(normalized);
  const variants = [];

  if (normalized) variants.push({ phoneNumber: normalized });

  if (digits) {
    variants.push({ phoneNumber: digits });
    variants.push({
      phoneNumber: new RegExp(`${escapeForRegex(digits)}$`),
    });
    if (digits.length >= 8) {
      const lastEight = digits.slice(-8);
      variants.push({ phoneNumber: lastEight });
      variants.push({
        phoneNumber: new RegExp(`${escapeForRegex(lastEight)}$`),
      });
    }
  }

  return {
    normalized,
    variants,
  };
}
const BARBER_MAP = {
  lemo: "ΛΕΜΟ",
  "λεμο": "ΛΕΜΟ",
  forou: "ΦΟΡΟΥ",
  "φορου": "ΦΟΡΟΥ",
  koushis: "ΚΟΥΣΙΗΣ",
  "κουσιης": "ΚΟΥΣΙΗΣ",
  "κούσιης": "ΚΟΥΣΙΗΣ",
  ΚΟΥΣΙΗΣ: "ΚΟΥΣΙΗΣ",
};

function normalizeBarber(input = "") {
  try {
    const raw = String(input || "").trim();
    if (!raw) return "";
    return BARBER_MAP[raw.toLowerCase()] || raw;
  } catch {
    return "";
  }
}

function getBarberDisplayName(barber = "") {
  if (barber === "ΚΟΥΣΙΗΣ") return "ΚΟΥΣΙΗ";
  return barber;
}

// Create an appointment
const createAppointment = async (req, res, next) => {
  try {
    // Identify the caller up front (before any DB side effects). A LemoApp user
    // (barber/admin) resolves to a userId; public-site requests carry no token or a
    // public-user token (different secret) and resolve to null here.
    const userId = getUserIdFromRequest(req);
    const isStaff = Boolean(userId);

    // Fail fast on a broken session: a Bearer token that is valid as NEITHER an admin
    // NOR a public session means the caller's session has lapsed. Return 401 so the
    // client logs out cleanly, instead of silently downgrading a stale admin to public
    // rules (which produced confusing 409s). No Authorization header = genuine
    // anonymous public booking → allowed through.
    if (!isStaff && hasBearerToken(req) && !getPublicUserIdFromRequest(req)) {
      return res
        .status(401)
        .json({ error: "Η συνεδρία έληξε, συνδεθείτε ξανά." });
    }

    const {
      customerName,
      phoneNumber,
      appointmentDateTime,
      barber,
      type,
      recurrence,
      repeatInterval, // How many weeks between each appointment
      repeatCount, // Total number of appointments
      dateOfBirth,
      duration: rawDuration,
      endTime: rawEndTime,
      lockReason,
      createdBy,
    } = req.body;

    const normalizedBarber = normalizeBarber(barber);
    let effectiveBarber = normalizedBarber || "ΛΕΜΟ";
    let explicitBarberProvided = Boolean(normalizedBarber);

    // A limited 'calendar' user may only ever book for THEMSELVES. Their barber is
    // taken from their own DB record and overrides whatever the client sent, so a
    // crafted `barber` in the body cannot place work on another barber's calendar.
    // Public/anonymous bookings and full admins are unaffected.
    if (userId) {
      const staffUser = await User.findById(userId)
        .select("role barberName")
        .lean();
      if (staffUser?.role === "calendar") {
        if (!staffUser.barberName) {
          return res
            .status(403)
            .json({ error: "No barber is linked to this account." });
        }
        effectiveBarber = staffUser.barberName;
        explicitBarberProvided = true;
      }
    }

    const appointmentType = ["appointment", "break", "lock"].includes(
      type
    )
      ? type
      : "appointment";

    // Validate required fields
    if (
      appointmentType === "appointment" &&
      (!customerName || !phoneNumber)
    ) {
      return res
        .status(400)
        .json({ error: "Customer name and phone number are required." });
    }

    if (!appointmentDateTime) {
      return res.status(400).json({ error: "Appointment time is required." });
    }

    // Allow up to 10 total occurrences (first 5 confirmed immediately, remainder via follow-up SMS)
    const requestedRepeat = parseInt(repeatCount, 10) || 1;
    const maxRepeat = Math.min(requestedRepeat, 10);
    // Allow weekly interval up to 20 weeks
    const intervalWeeks = Math.min(parseInt(repeatInterval, 10) || 1, 20);

    // Validate appointment date
    const appointmentDateUTC = moment(appointmentDateTime).utc();
    if (!appointmentDateUTC.isValid()) {
      return res.status(400).json({ message: "Invalid appointment date." });
    }

    // Check if appointment is in the past
    const isPastDate = appointmentDateUTC.isBefore(moment().utc());

    // Convert to Athens time for logging
    const appointmentDateAthens = appointmentDateUTC
      .clone()
      .tz("Europe/Athens");
    console.log(
      "📅 Appointment Date (Athens Time):",
      appointmentDateAthens.format()
    );

    const incomingName =
      typeof customerName === "string" ? customerName.trim() : "";
    const { normalized: normalizedPhoneInput, variants: phoneLookupVariants } =
      buildPhoneLookupVariants(phoneNumber);
    let canonicalPhone = normalizedPhoneInput;

    // Keep customer table in sync for appointment writes.
    let customer = null;
    if (appointmentType === "appointment") {
      const fallbackPhone = canonicalPhone || String(phoneNumber || "").trim();
      if (!fallbackPhone) {
        return res
          .status(400)
          .json({ error: "Valid phone number is required." });
      }

      try {
        await upsertCustomerFromIdentity({
          name: incomingName || fallbackPhone,
          phoneNumber: fallbackPhone,
          barber: effectiveBarber,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        });
      } catch (upsertError) {
        if (upsertError.code !== 11000) throw upsertError;
        // concurrent request already created this customer — re-fetch below will find it
      }

      customer = phoneLookupVariants.length
        ? await Customer.findOne({ $or: phoneLookupVariants })
        : await Customer.findOne({ phoneNumber: fallbackPhone });

      if (!customer) {
        return res.status(500).json({ error: "Failed to sync customer record." });
      }

      canonicalPhone = customer.phoneNumber;
    }

    const phone =
      appointmentType === "appointment"
        ? customer
          ? customer.phoneNumber
          : canonicalPhone || normalizePhone(phoneNumber)
        : normalizePhone(phoneNumber);


    // Calculate end time in UTC
    // Accept duration from req.body or fallback to default
    const parsedDuration = Number(rawDuration);
    let duration;
    let endTimeUTC;

    if (appointmentType === "lock") {
      if (!explicitBarberProvided) {
        return res.status(400).json({ error: "Barber is required to lock time." });
      }
      let lockDuration = Number.isFinite(parsedDuration) ? parsedDuration : null;
      if ((!lockDuration || lockDuration <= 0) && rawEndTime) {
        const endMoment = moment(rawEndTime).utc();
        if (endMoment.isValid()) {
          lockDuration = Math.max(
            1,
            Math.round(
              (endMoment.toDate().getTime() - appointmentDateUTC.toDate().getTime()) /
                60000
            )
          );
        }
      }
      if (!lockDuration || lockDuration <= 0) {
        return res
          .status(400)
          .json({ error: "Lock duration must be greater than 0 or provide a valid end time." });
      }
      duration = lockDuration;
      endTimeUTC = appointmentDateUTC.clone().add(lockDuration, "minutes").toDate();
    } else if (appointmentType === "break") {
      duration = Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 0;
      endTimeUTC = duration
        ? appointmentDateUTC.clone().add(duration, "minutes").toDate()
        : appointmentDateUTC.toDate();
    } else {
      duration = Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 40;
      endTimeUTC = appointmentDateUTC.clone().add(duration, "minutes").toDate();
    }

    // ADMIN (any authenticated LemoApp user) bypasses ALL conflict validation:
    // they may create overlapping appointments and even multiple at the exact same
    // time for the same barber. PUBLIC requests keep the full overlap check (incl.
    // locks) and can never book over an existing slot — regardless of who created it,
    // because this query is not filtered by origin.
    if (!isStaff && (appointmentType !== "break" || duration > 0)) {
      const conflict = await Appointment.findOne({
        barber: effectiveBarber,
        appointmentStatus: "confirmed",
        type: { $in: ["appointment", "break", "lock"] },
        appointmentDateTime: { $lt: endTimeUTC },
        endTime: { $gt: appointmentDateUTC.toDate() },
      });
      if (conflict) {
        return res.status(409).json({ error: "Η ώρα μόλις κλείστηκε από άλλο πελάτη. Επιλέξτε άλλη ώρα." });
      }
    }

    const effectiveName = customer ? customer.name : incomingName || customerName;
    // A weekly lock is a recurring/permanent lock: tag every row "ΜΟΝΙΜΟ" so it is
    // indistinguishable from a recurring lock created on the Bulk Locks page. (recurrence/
    // repeatInterval/repeatCount are request params that drive generation only — they are
    // not persisted, since recurrence is represented by the per-date rows + this tag.)
    const isRecurringLock =
      appointmentType === "lock" && recurrence === "weekly" && maxRepeat > 1;
    const newAppointment = new Appointment({
      customerName: effectiveName,
      phoneNumber: appointmentType === "appointment" ? phone : undefined,
      appointmentDateTime: appointmentDateUTC.toDate(),
      barber: effectiveBarber,
      duration,
      appointmentStatus: "confirmed",
      type: appointmentType,
      endTime: endTimeUTC,
      user: userId || undefined,
      origin: isStaff ? "admin" : "public",
      lockReason:
        appointmentType === "lock"
          ? isRecurringLock
            ? "ΜΟΝΙΜΟ"
            : typeof lockReason === "string"
            ? lockReason.trim()
            : ""
          : undefined,
      createdBy: createdBy || undefined,
    });

    let savedAppointment;
    try {
      savedAppointment = await newAppointment.save();
    } catch (saveError) {
      if (saveError.code === 11000) {
        // Public double-book race caught atomically by the partial unique index
        // (uniq_public_confirmed_slot). Same 409 + message as the overlap check above,
        // so the user experience is identical. Admin rows have origin:'admin' and are
        // excluded from that index, so this never blocks admin.
        return res.status(409).json({ error: "Η ώρα μόλις κλείστηκε από άλλο πελάτη. Επιλέξτε άλλη ώρα." });
      }
      throw saveError;
    }

    // Generate recurring appointments if applicable
    let additionalAppointments = [];
    if (recurrence === "weekly" && maxRepeat > 1) {
      if (appointmentType === "appointment") {
        additionalAppointments = await generateRecurringAppointments({
          customerName: effectiveName,
          phoneNumber: phone,
          barber: effectiveBarber,
          initialAppointmentDate: appointmentDateUTC,
          duration,
          intervalWeeks,
          repeatCount: maxRepeat - 1, // Since the first appointment is already created
          user: userId || undefined,
          origin: isStaff ? "admin" : "public",
        });
      } else if (appointmentType === "break") {
        additionalAppointments = await generateRecurringBreaks({
          barber: effectiveBarber,
          initialAppointmentDate: appointmentDateUTC,
          duration,
          intervalWeeks,
          repeatCount: maxRepeat - 1,
          user: userId || undefined,
      });
      } else if (appointmentType === "lock") {
        additionalAppointments = await generateRecurringLocks({
          barber: effectiveBarber,
          initialAppointmentDate: appointmentDateUTC,
          duration,
          intervalWeeks,
          repeatCount: maxRepeat - 1,
          lockReason: "ΜΟΝΙΜΟ", // recurring lock → tag every occurrence, like the Bulk page
          createdBy,
          user: userId || undefined,
        });
      }
    }

    // Send confirmation SMS (split for 10/20-week recurrences)
    if (appointmentType === "appointment" && !isPastDate) {
      try {
        let result;
        if (recurrence === "weekly" && maxRepeat > 1) {
          const displayBarber = getBarberDisplayName(effectiveBarber);
          const allMoments = [
            appointmentDateAthens.clone(),
            ...additionalAppointments.map((appt) =>
              moment(appt.appointmentDateTime).tz("Europe/Athens")
            ),
          ];
          const labels = allMoments.map((m) => m.format("DD/MM/YYYY HH:mm"));

          const shouldSplit = maxRepeat > 5 && labels.length > 5;
          if (shouldSplit) {
            const firstHalf = labels.slice(0, 5);
            const secondHalf = labels.slice(5);
            const msg1 = `Επιβεβαιώνουμε τα ραντεβού σας στο LEMO BARBER SHOP με τον ${displayBarber} για τις ημερομηνίες: ${firstHalf.join(", ")}.\nWe confirm your appointments at LEMO BARBER SHOP with ${displayBarber} for the dates: ${firstHalf.join(", ")}.`;
            result = await sendSMS(phoneNumber, msg1, { smsType: "confirmation" });
            savedAppointment.reminders.push({
              type: "confirmation",
              sentAt: new Date(),
              messageId: result?.message_id || result?.messageId || null,
              status: result?.success ? "sent" : "failed",
              messageText: msg1,
              senderId: "Lemo Barber",
              retryCount: 0,
            });

            const halfWeeks = Math.floor(intervalWeeks / 2);
            const sendAt = appointmentDateUTC.clone().add(halfWeeks, "weeks").toDate();
            const ScheduledMessage = require("../models/ScheduledMessage");
            await ScheduledMessage.create({
              phoneNumber,
              messageText: `Επιβεβαιώνουμε τα επιπλέον ραντεβού σας στο LEMO BARBER SHOP με τον ${displayBarber}: ${secondHalf.join(", ")}.\nWe confirm your additional appointments at LEMO BARBER SHOP with ${displayBarber}: ${secondHalf.join(", ")}.`,
              sendAt,
              status: "pending",
              type: "recurrence-followup",
              appointmentIds: [savedAppointment._id, ...additionalAppointments.map((a) => a._id)],
              barber: effectiveBarber,
            });
          } else {
            const msg = `Επιβεβαιώνουμε τα ραντεβού σας στο LEMO BARBER SHOP με τον ${displayBarber} για τις ημερομηνίες: ${labels.join(", ")}.\nWe confirm your appointments at LEMO BARBER SHOP with ${displayBarber} for the dates: ${labels.join(", ")}.`;
            result = await sendSMS(phoneNumber, msg, { smsType: "confirmation" });
            savedAppointment.reminders.push({
              type: "confirmation",
              sentAt: new Date(),
              messageId: result?.message_id || result?.messageId || null,
              status: result?.success ? "sent" : "failed",
              messageText: msg,
              senderId: "Lemo Barber",
              retryCount: 0,
            });
          }
        } else {
          const formattedLocalTime = appointmentDateAthens.format("DD/MM/YYYY HH:mm");
          const displayBarber = getBarberDisplayName(effectiveBarber);
          const msg = `Επιβεβαιώνουμε το ραντεβού σας στο LEMO BARBER SHOP με τον ${displayBarber} για τις ${formattedLocalTime}!\nWe confirm your appointment at LEMO BARBER SHOP with ${displayBarber} for ${formattedLocalTime}!`;
          result = await sendSMS(phoneNumber, msg, { smsType: "confirmation" });
          savedAppointment.reminders.push({
            type: "confirmation",
            sentAt: new Date(),
            messageId: result?.message_id || result?.messageId || null,
            status: result?.success ? "sent" : "failed",
            messageText: msg,
            senderId: "Lemo Barber",
            retryCount: 0,
          });
        }
        await savedAppointment.save();
      } catch (smsError) {
        console.error("❌ Failed to send confirmation SMS:", smsError.message);
      }
    }

    res.status(201).json({
      message: "Appointments created successfully.",
      ...(customer && {
        customer: {
          name: customer.name,
          phoneNumber: customer.phoneNumber,
        },
      }),
      initialAppointment: savedAppointment,
      recurringAppointments: additionalAppointments,
    });
  } catch (error) {
    next(error);
  }
};

// 🔄 Generate Recurring Appointments with Dynamic Week Intervals
const generateRecurringAppointments = async ({
  customerName,
  phoneNumber,
  barber,
  initialAppointmentDate,
  duration,
  intervalWeeks,
  repeatCount,
  user,
  origin,
}) => {
  const appointments = [];
  let currentDateUTC = initialAppointmentDate.clone();

  for (let i = 1; i <= repeatCount; i++) {
    currentDateUTC.add(intervalWeeks, "weeks"); // Apply the interval dynamically
    const recurringEndTimeUTC = currentDateUTC
      .clone()
      .add(duration, "minutes")
      .toDate();

    const additionalAppointment = new Appointment({
      customerName,
      phoneNumber,
      appointmentDateTime: currentDateUTC.toDate(),
      barber,
      duration,
      endTime: recurringEndTimeUTC,
      recurrence: "weekly",
      appointmentStatus: "confirmed",
      type: "appointment",
      user: user || undefined,
      origin: origin === "admin" ? "admin" : "public",
    });

    const savedAppointment = await additionalAppointment.save();
    appointments.push(savedAppointment);
  }

  return appointments;
};

const generateRecurringBreaks = async ({
  barber,
  initialAppointmentDate,
  duration,
  intervalWeeks,
  repeatCount,
  user,
}) => {
  const breaks = [];
  let currentDateUTC = initialAppointmentDate.clone();

  for (let i = 1; i <= repeatCount; i++) {
    currentDateUTC.add(intervalWeeks, "weeks");

    const breakEntry = new Appointment({
      appointmentDateTime: currentDateUTC.toDate(),
      barber,
      duration,
      endTime: duration
        ? currentDateUTC.clone().add(duration, "minutes").toDate()
        : currentDateUTC.toDate(),
      appointmentStatus: "confirmed",
      type: "break",
      recurrence: "weekly",
      repeatInterval: intervalWeeks,
      repeatCount: null,
      user: user || undefined,
    });

    const savedBreak = await breakEntry.save();
    breaks.push(savedBreak);
  }

  return breaks;
};

const generateRecurringLocks = async ({
  barber,
  initialAppointmentDate,
  duration,
  intervalWeeks,
  repeatCount,
  lockReason,
  createdBy,
  user,
}) => {
  const locks = [];
  let currentDateUTC = initialAppointmentDate.clone();

  for (let i = 1; i <= repeatCount; i++) {
    currentDateUTC.add(intervalWeeks, "weeks");

    const lock = new Appointment({
      appointmentDateTime: currentDateUTC.toDate(),
      barber,
      duration,
      endTime: currentDateUTC.clone().add(duration, "minutes").toDate(),
      appointmentStatus: "confirmed",
      type: "lock",
      lockReason: lockReason || "ΜΟΝΙΜΟ",
      createdBy: createdBy || undefined,
      user: user || undefined,
    });

    const savedLock = await lock.save();
    locks.push(savedLock);
  }

  return locks;
};

// Get all appointments
const getAppointments = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;

  try {
    // Only fetch necessary fields; adjust as needed
    const appointments = await Appointment.find(
      {},
      {
        customerName: 1,
        phoneNumber: 1,
        appointmentDateTime: 1,
        barber: 1,
        type: 1,
        appointmentStatus: 1,
        duration: 1,
        endTime: 1,
        reminders: 1,
        lockReason: 1,
      }
    )
      .sort({ appointmentDateTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(); // 🚀

    const total = await Appointment.countDocuments();

    res.json({
      total,
      page,
      limit,
      appointments,
    });
  } catch (error) {
    next(error);
  }
};

// Update an appointment
const updateAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    let {
      appointmentDateTime,
      duration,
      endTime,
      phoneNumber,
      barber,
      ...updateData
    } = req.body;

    // Log the id/action only — never the request body (it carries customer PII).
    console.log("🔍 Update appointment:", id);

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // A 'calendar' user may only touch appointments belonging to their own barber...
    const scope = resolveBarberScope(req.user);
    if (scope.status) {
      return res.status(scope.status).json({ message: scope.message });
    }
    if (scope.barber && appointment.barber !== scope.barber) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    // ...and may never reassign one onto a different barber's calendar.
    if (scope.barber) {
      barber = scope.barber;
    }

    const oldFormattedDate = moment(appointment.appointmentDateTime)
      .tz("Europe/Athens")
      .format("DD/MM/YYYY HH:mm");

    if (appointmentDateTime) {
      const newDate = new Date(appointmentDateTime);
      appointment.appointmentDateTime = newDate;
      const effectiveDuration =
        typeof duration === "number" && duration > 0
          ? duration
          : appointment.duration || 40;
      appointment.duration = effectiveDuration;
      appointment.endTime = new Date(
        newDate.getTime() + effectiveDuration * 60 * 1000
      );
    }

    if (typeof duration === "number" && duration > 0 && !appointmentDateTime) {
      appointment.duration = duration;
      appointment.endTime = new Date(
        appointment.appointmentDateTime.getTime() + duration * 60 * 1000
      );
    }

    if (endTime) {
      const newEnd = new Date(endTime);
      if (!Number.isNaN(newEnd.getTime())) {
        appointment.endTime = newEnd;
        const diff = Math.max(
          1,
          Math.round(
            (newEnd.getTime() - appointment.appointmentDateTime.getTime()) /
              60000
          )
        );
        appointment.duration = diff;
      }
    }

    if (barber) {
      const updatedBarber = normalizeBarber(barber);
      if (updatedBarber) {
        appointment.barber = updatedBarber;
      }
    }
    if (phoneNumber && appointment.type === "appointment") {
      appointment.phoneNumber = normalizePhone(phoneNumber);
    }

    Object.assign(appointment, updateData);

    // ✅ Ensure 'type' is present for reminder compatibility
    if (!appointment.type) {
      appointment.type = "appointment";
    }

    if (appointment.type === "appointment") {
      await upsertCustomerFromIdentity({
        name: String(appointment.customerName || "").trim(),
        phoneNumber: String(appointment.phoneNumber || "").trim(),
        barber: appointment.barber,
      });
    }

    const newFormattedDate = moment(appointment.appointmentDateTime)
      .tz("Europe/Athens")
      .format("DD/MM/YYYY HH:mm");

    const now = moment().utc();
    const isPast = moment(appointment.appointmentDateTime).isBefore(now);

    if (appointment.type === "appointment" && !isPast) {
      try {
        const message = `Το ραντεβού σας στο LEMO BARBER SHOP στις ${oldFormattedDate}, έχει αλλάξει για ${newFormattedDate}.\nYour appointment at LEMO BARBER SHOP on ${oldFormattedDate} has been rescheduled to ${newFormattedDate}.`;
        const smsResponse = await sendSMS(
          phoneNumber || appointment.phoneNumber,
          message,
          { smsType: "update" }
        );

        const messageId = smsResponse?.message_id || smsResponse?.messageId;

        appointment.reminders.push({
          type: "update",
          sentAt: new Date(),
          messageId: messageId || null,
          messageText: message,
          senderId: "Lemo Barber",
          status: smsResponse?.success ? "sent" : "failed",
          retryCount: 0,
        });

        console.log("📲 Update SMS sent successfully");
      } catch (smsError) {
        console.error("❌ Failed to send update SMS:", smsError.message);
      }
    } else {
      console.log("📵 No Update SMS sent because appointment is in the past.");
    }

    await appointment.save();

    res.status(200).json({
      success: true,
      message:
        appointment.type === "appointment"
          ? "Appointment updated successfully and SMS sent"
          : "Appointment updated successfully",
      updatedAppointment: appointment,
    });
  } catch (error) {
    console.error("❌ Error updating appointment:", error);
    next(error);
  }
};

// Delete an appointment
const deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params; // Appointment ID from the route

    // Find the appointment before deleting it to retrieve customer details
    const appointmentToDelete = await Appointment.findById(id);

    if (!appointmentToDelete) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    }

    // A 'calendar' user may only delete their own barber's appointments.
    const scope = resolveBarberScope(req.user);
    if (scope.status) {
      return res
        .status(scope.status)
        .json({ success: false, message: scope.message });
    }
    if (scope.barber && appointmentToDelete.barber !== scope.barber) {
      return res
        .status(403)
        .json({ success: false, message: "Insufficient permissions" });
    }

    // Delete the appointment
    const deletedAppointment = await Appointment.findByIdAndDelete(id);

    if (deletedAppointment) {
      // Send SMS confirmation for deleted appointment
      const now = moment().utc();
      const isPastAppointment = moment(
        deletedAppointment.appointmentDateTime
      ).isBefore(now);

      if (deletedAppointment.type === "appointment" && !isPastAppointment) {
        try {
          const formattedDateTime = moment(
            deletedAppointment.appointmentDateTime
          )
            .tz("Europe/Athens")
            .format("DD/MM/YYYY HH:mm");
          const message = `Θα θέλαμε να σας ενημερώσουμε ότι το ραντεβού σας για ${formattedDateTime} ακυρώνεται.\nWe would like to inform you that your appointment for ${formattedDateTime} has been canceled.`;

          await sendSMS(deletedAppointment.phoneNumber, message, { smsType: "deletion" });
          console.log("📲 Deletion SMS sent successfully");
        } catch (smsError) {
          console.error("❌ Failed to send deletion SMS:", smsError.message);
        }
      } else {
        console.log(
          "📵 No Deletion SMS sent because appointment was in the past or not a standard appointment."
        );
      }

      return res.status(200).json({
        success: true,
        message:
          deletedAppointment.type === "appointment"
            ? "Appointment deleted successfully and SMS sent"
            : "Appointment deleted successfully",
      });
    }
  } catch (error) {
    next(error); // Pass any errors to the error-handling middleware
  }
};

const getUpcomingAppointments = async (req, res) => {
  try {
    // Scope comes from the DB user only; a 'calendar' user is hard-limited to
    // their own barber and cannot widen it from the client.
    const scope = resolveBarberScope(req.user);
    if (scope.status) {
      return res.status(scope.status).json({ message: scope.message });
    }

    const startOfYesterday = moment()
      .subtract(1, "day")
      .startOf("day")
      .toDate();

    const query = {
      appointmentDateTime: { $gte: startOfYesterday },
      appointmentStatus: "confirmed",
      type: { $in: ["appointment", "break", "lock"] },
    };
    if (scope.barber) query.barber = scope.barber;

    const appointments = await Appointment.find(
      query,
      {
        customerName: 1,
        phoneNumber: 1,
        appointmentDateTime: 1,
        barber: 1,
        type: 1,
        duration: 1,
        endTime: 1,
        lockReason: 1,
        _id: 1,
      }
    )
      .sort({ appointmentDateTime: 1 })
      .lean();

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch upcoming appointments" });
  }
};

// Locks from the last 12 months onward (past + future), for the Bulk Locks grouping
// view — so past occurrences of a weekly pattern group together instead of being cut off
// at "today". Read-only; includes lockReason so the stored "ΜΟΝΙΜΟ" tag is visible.
const getRecentLocks = async (req, res) => {
  try {
    const scope = resolveBarberScope(req.user);
    if (scope.status) {
      return res.status(scope.status).json({ message: scope.message });
    }

    const since = moment().subtract(12, "months").startOf("day").toDate();
    const query = {
      type: "lock",
      appointmentStatus: "confirmed",
      appointmentDateTime: { $gte: since },
    };
    if (scope.barber) query.barber = scope.barber;

    const locks = await Appointment.find(query, {
      appointmentDateTime: 1,
      barber: 1,
      type: 1,
      duration: 1,
      endTime: 1,
      lockReason: 1,
      _id: 1,
    })
      .sort({ appointmentDateTime: 1 })
      .lean();

    res.json(locks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch recent locks" });
  }
};

const getPastAppointments = async (req, res) => {
  try {
    const scope = resolveBarberScope(req.user);
    if (scope.status) {
      return res.status(scope.status).json({ message: scope.message });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const today = new Date();

    const query = { appointmentDateTime: { $lt: today } };
    if (scope.barber) query.barber = scope.barber;

    // Project the same shape as /upcoming. Previously this returned whole
    // documents, leaking internal fields (reminders[].messageText, source, etc.).
    const appointments = await Appointment.find(query, {
      customerName: 1,
      phoneNumber: 1,
      appointmentDateTime: 1,
      barber: 1,
      type: 1,
      duration: 1,
      endTime: 1,
      _id: 1,
    })
      .sort({ appointmentDateTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Appointment.countDocuments(query);

    res.json({ total, page, limit, appointments });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch past appointments" });
  }
};

const getMyAppointments = async (req, res, next) => {
  try {
    const userId = req.userId || req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const appointments = await Appointment.find(
      { user: userId },
      {
        customerName: 1,
        appointmentDateTime: 1,
        barber: 1,
        type: 1,
        duration: 1,
        endTime: 1,
        repeatInterval: 1,
        repeatCount: 1,
        _id: 1,
      }
    )
      .sort({ appointmentDateTime: 1 })
      .lean();
    res.json({ appointments });
  } catch (error) {
    next(error);
  }
};
module.exports = {
  createAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment,
  getUpcomingAppointments,
  getRecentLocks,
  getPastAppointments,
  getMyAppointments,
};
