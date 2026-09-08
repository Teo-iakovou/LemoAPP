const Appointment = require("../models/appointment");
const Customer = require("../models/customer");
const User = require("../models/user");
const { sendSMS } = require("../utils/smsService")
const { upsertCustomerFromIdentity } = require("../utils/customerSync");
const { resolveBarberScope } = require("../utils/appointmentScope");

const moment = require("moment-timezone");
const { getUserIdFromRequest, getPublicUserIdFromRequest, hasBearerToken } = require("../utils/auth");
const mongoose = require("mongoose");
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

// Long weekly recurrences are confirmed in two parts: the first RECURRENCE_SPLIT_INDEX
// dates are SMS'd immediately at booking; the rest ("επιπλέον"/additional) are queued as a
// ScheduledMessage and confirmed later. This single constant defines both the split point
// and the stored additionalFromIndex, so the "5" never has to be duplicated across files.
const RECURRENCE_SPLIT_INDEX = 5;

// When to send the follow-up: on the 3rd of the first-five confirmed appointments (never #1),
// so it arrives partway through the series instead of on day one. `allMoments` is the ordered
// list of series datetimes [initial, ...additional]; the split guard guarantees >=6 entries,
// so index 2 (#3) always exists. Exported for deterministic testing.
function computeFollowupSendAt(allMoments) {
  const followupIndex = Math.min(2, allMoments.length - 1);
  return allMoments[followupIndex].clone().toDate();
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

    // Multi-slot booking: when the request carries slots[], create the whole group atomically in
    // one transaction (overlap-check every slot + insert all, all-or-nothing). Single bookings
    // (no slots[]) fall through to the unchanged path below — byte-identical to before.
    if (Array.isArray(req.body.slots) && req.body.slots.length > 0) {
      return await createMultiSlotBooking(req, res, { userId, isStaff });
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

          const shouldSplit =
            maxRepeat > RECURRENCE_SPLIT_INDEX && labels.length > RECURRENCE_SPLIT_INDEX;
          if (shouldSplit) {
            const firstHalf = labels.slice(0, RECURRENCE_SPLIT_INDEX);
            const secondHalf = labels.slice(RECURRENCE_SPLIT_INDEX);
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

            // Send the follow-up on the 3rd confirmed appointment, not (intervalWeeks/2)
            // weeks out — for weekly series floor(1/2)=0 put it on appointment #1 (day one).
            const sendAt = computeFollowupSendAt(allMoments);
            const ScheduledMessage = require("../models/ScheduledMessage");
            await ScheduledMessage.create({
              phoneNumber,
              messageText: `Επιβεβαιώνουμε τα επιπλέον ραντεβού σας στο LEMO BARBER SHOP με τον ${displayBarber}: ${secondHalf.join(", ")}.\nWe confirm your additional appointments at LEMO BARBER SHOP with ${displayBarber}: ${secondHalf.join(", ")}.`,
              sendAt,
              status: "pending",
              type: "recurrence-followup",
              appointmentIds: [savedAppointment._id, ...additionalAppointments.map((a) => a._id)],
              // The message lists appointmentIds.slice(RECURRENCE_SPLIT_INDEX); persist the
              // index so the send-time rebuild stays correct even if the threshold changes.
              additionalFromIndex: RECURRENCE_SPLIT_INDEX,
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

// Multi-slot public booking: create up to MAX_SLOTS_PER_BOOKING (default 2) appointments in ONE
// submit, ATOMICALLY. Every slot's public overlap check AND all inserts run inside a single
// Mongoose transaction (Atlas is a replica set), so a conflict on any slot — or an 11000 from
// the uniq_public_confirmed_slot index — rolls back the entire group. We never leave one slot
// committed and the other not. All rows share a generated groupId; customerName is always the
// booker, with bookedFor holding the other person's name per slot when present.
const createMultiSlotBooking = async (req, res, { userId, isStaff }) => {
  try {
    const MAX_SLOTS = Math.max(1, parseInt(process.env.MAX_SLOTS_PER_BOOKING, 10) || 2);
    const { customerName, phoneNumber, dateOfBirth } = req.body;
    const slots = req.body.slots;

    if (slots.length > MAX_SLOTS) {
      return res.status(400).json({
        error: `Μπορείτε να κλείσετε το πολύ ${MAX_SLOTS} ραντεβού μαζί. / You can book at most ${MAX_SLOTS} appointments together.`,
      });
    }
    if (!customerName || !phoneNumber) {
      return res.status(400).json({ error: "Customer name and phone number are required." });
    }

    // Validate + normalize every slot BEFORE any DB work (no partial state on a bad request).
    const nowUtc = moment().utc();
    const prepared = [];
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i] || {};
      const when = moment(s.appointmentDateTime).utc();
      if (!when.isValid()) {
        return res.status(400).json({ error: `Slot ${i + 1}: invalid appointment time.` });
      }
      if (when.isBefore(nowUtc)) {
        return res.status(400).json({ error: `Slot ${i + 1}: appointment is in the past.` });
      }
      const duration = 40;
      prepared.push({
        index: i,
        startUtc: when.toDate(),
        endUtc: when.clone().add(duration, "minutes").toDate(),
        barber: normalizeBarber(s.barber) || "ΛΕΜΟ",
        duration,
        bookedFor:
          typeof s.bookedFor === "string" && s.bookedFor.trim() ? s.bookedFor.trim() : undefined,
        athens: when.clone().tz("Europe/Athens"),
      });
    }

    // Sync the BOOKER's customer record once — separate collection, idempotent, and not part of
    // the appointment atomicity guarantee, so it stays outside the transaction.
    const incomingName = typeof customerName === "string" ? customerName.trim() : "";
    const { normalized: normalizedPhoneInput, variants: phoneLookupVariants } =
      buildPhoneLookupVariants(phoneNumber);
    const fallbackPhone = normalizedPhoneInput || String(phoneNumber || "").trim();
    if (!fallbackPhone) {
      return res.status(400).json({ error: "Valid phone number is required." });
    }
    try {
      await upsertCustomerFromIdentity({
        name: incomingName || fallbackPhone,
        phoneNumber: fallbackPhone,
        barber: prepared[0].barber,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      });
    } catch (upsertError) {
      if (upsertError.code !== 11000) throw upsertError;
    }
    const customer = phoneLookupVariants.length
      ? await Customer.findOne({ $or: phoneLookupVariants })
      : await Customer.findOne({ phoneNumber: fallbackPhone });
    if (!customer) {
      return res.status(500).json({ error: "Failed to sync customer record." });
    }
    const bookerName = customer.name || incomingName || customerName;
    const phone = customer.phoneNumber;
    const groupId = new mongoose.Types.ObjectId().toString();
    const origin = isStaff ? "admin" : "public";

    // ── Atomic group insert ──────────────────────────────────────────────────────
    const session = await mongoose.startSession();
    let created = [];
    let conflictSlot = null;
    try {
      await session.withTransaction(async () => {
        created = []; // reset in case withTransaction retries on a transient error
        // 1) Overlap check for EVERY slot, inside the txn. Public callers only — staff bypass,
        //    exactly like the single-slot path. Read within the session for a consistent view.
        if (!isStaff) {
          for (const p of prepared) {
            const conflict = await Appointment.findOne({
              barber: p.barber,
              appointmentStatus: "confirmed",
              type: { $in: ["appointment", "break", "lock"] },
              appointmentDateTime: { $lt: p.endUtc },
              endTime: { $gt: p.startUtc },
            }).session(session);
            if (conflict) {
              conflictSlot = p.index + 1;
              const err = new Error(`slot-conflict-${p.index}`);
              err.slotConflict = true;
              throw err; // aborts the whole transaction
            }
          }
        }
        // 2) Insert every slot in the same txn. A concurrent booking that slipped past the check
        //    above trips the uniq_public_confirmed_slot index (11000) here, aborting the group.
        for (const p of prepared) {
          const doc = new Appointment({
            customerName: bookerName,
            phoneNumber: phone,
            appointmentDateTime: p.startUtc,
            barber: p.barber,
            duration: p.duration,
            appointmentStatus: "confirmed",
            type: "appointment",
            endTime: p.endUtc,
            user: userId || undefined,
            origin,
            groupId,
            bookedFor: p.bookedFor,
          });
          await doc.save({ session });
          created.push(doc);
        }
      });
    } catch (err) {
      await session.endSession();
      if (err.slotConflict || err.code === 11000) {
        let which = conflictSlot;
        if (which == null && err.code === 11000) {
          const kv = err.keyValue || {};
          const idx = prepared.findIndex(
            (p) =>
              p.barber === kv.barber &&
              kv.appointmentDateTime &&
              new Date(p.startUtc).getTime() === new Date(kv.appointmentDateTime).getTime()
          );
          which = idx >= 0 ? idx + 1 : "?";
        }
        return res.status(409).json({
          error: `Η ώρα του ραντεβού ${which} μόλις κλείστηκε. Επιλέξτε άλλη ώρα. / Appointment ${which} was just taken. Please pick another time.`,
          conflictSlot: which,
        });
      }
      console.error("❌ Multi-slot booking failed:", err.message);
      return res.status(500).json({ error: "Failed to create appointments." });
    }
    await session.endSession();

    // Confirmation SMS: ONCE per group, listing every slot, with bookedFor noted per line.
    // Recorded on the first appointment of the group. (All slots are future — validated above.)
    try {
      const lines = prepared.map((p) => {
        const b = getBarberDisplayName(p.barber);
        const t = p.athens.format("DD/MM/YYYY HH:mm");
        return {
          gr: p.bookedFor ? `${t} με ${b} (για ${p.bookedFor})` : `${t} με ${b}`,
          en: p.bookedFor ? `${t} with ${b} (for ${p.bookedFor})` : `${t} with ${b}`,
        };
      });
      const message =
        `Επιβεβαιώνουμε τα ραντεβού σας στο LEMO BARBER SHOP:\n` +
        lines.map((l) => `• ${l.gr}`).join("\n") +
        `\nWe confirm your appointments at LEMO BARBER SHOP:\n` +
        lines.map((l) => `• ${l.en}`).join("\n");
      const result = await sendSMS(phone, message, { smsType: "confirmation" });
      created[0].reminders.push({
        type: "confirmation",
        sentAt: new Date(),
        messageId: result?.message_id || result?.messageId || null,
        status: result?.success ? "sent" : "failed",
        messageText: message,
        senderId: "Lemo Barber",
        retryCount: 0,
      });
      await created[0].save();
    } catch (smsError) {
      console.error("❌ Failed to send multi-slot confirmation SMS:", smsError.message);
    }

    return res.status(201).json({
      message: "Appointments created successfully.",
      customer: { name: customer.name, phoneNumber: customer.phoneNumber },
      groupId,
      appointments: created,
    });
  } catch (error) {
    console.error("❌ Multi-slot booking error:", error.message);
    return res.status(500).json({ error: "Failed to create appointments." });
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

          const delResult = await sendSMS(deletedAppointment.phoneNumber, message, { smsType: "deletion" });
          if (delResult?.rateLimited) {
            console.warn("⏳ Deletion SMS rate limited (429) — not delivered.");
          } else {
            console.log("📲 Deletion SMS sent successfully");
          }
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
  computeFollowupSendAt,
  RECURRENCE_SPLIT_INDEX,
};
