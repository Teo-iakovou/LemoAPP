const Appointment = require("../models/appointment");
const moment = require("moment-timezone");
const { sendSMS } = require("../utils/smsService");

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
  const seen = new Set();

  const pushVariant = (value) => {
    if (!value) return;
    const key = value instanceof RegExp ? value.toString() : value;
    if (seen.has(key)) return;
    seen.add(key);
    variants.push({ phoneNumber: value });
  };

  if (normalized) pushVariant(normalized);

  if (digits) {
    pushVariant(digits);
    pushVariant(new RegExp(`${escapeForRegex(digits)}$`, "i"));

    if (digits.length === 8) {
      pushVariant(`+357${digits}`);
      pushVariant(new RegExp(`${escapeForRegex(digits)}$`, "i"));
    }

    if (digits.length === 10) {
      pushVariant(`+30${digits}`);
      pushVariant(new RegExp(`${escapeForRegex(digits)}$`, "i"));
    }

    if (digits.length >= 8) {
      const lastEight = digits.slice(-8);
      pushVariant(lastEight);
      pushVariant(new RegExp(`${escapeForRegex(lastEight)}$`, "i"));
      pushVariant(new RegExp(`${escapeForRegex(`357${lastEight}`)}$`, "i"));
      pushVariant(new RegExp(`${escapeForRegex(`0${lastEight}`)}$`, "i"));
    }
  }

  return {
    normalized,
    variants,
  };
}

const getAppointmentsForPublicUser = async (req, res, next) => {
  try {
    const { normalized: phoneNumber, variants } = buildPhoneLookupVariants(
      req.publicUser?.phoneNumber || ""
    );
    if (!phoneNumber) {
      return res.status(400).json({ message: "Missing phone number" });
    }

    const phoneQuery = variants.length ? { $or: variants } : { phoneNumber };

    const appointments = await Appointment.find(
      {
        ...phoneQuery,
        appointmentStatus: "confirmed",
        type: { $in: ["appointment", "break", "lock"] },
      },
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

const cancelUpcomingAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { normalized: phoneNumber, variants } = buildPhoneLookupVariants(
      req.publicUser?.phoneNumber || ""
    );

    if (!id || !phoneNumber) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const now = moment().utc();

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const matchesPhone = variants.length
      ? variants.some((query) => {
          const value = query.phoneNumber;
          if (value instanceof RegExp) {
            return value.test(appointment.phoneNumber || "");
          }
          return (appointment.phoneNumber || "") === value;
        })
      : (appointment.phoneNumber || "") === phoneNumber;

    if (!matchesPhone) {
      return res.status(403).json({ message: "You cannot cancel this appointment." });
    }

    const isPast = moment(appointment.appointmentDateTime).isSameOrBefore(now);
    if (isPast) {
      return res
        .status(400)
        .json({ message: "Only upcoming appointments can be cancelled." });
    }

    if (appointment.type !== "appointment") {
      return res
        .status(400)
        .json({ message: "Only standard appointments can be cancelled." });
    }

    await Appointment.findByIdAndDelete(id);

    try {
      const formattedDateTime = moment(appointment.appointmentDateTime)
        .tz("Europe/Athens")
        .format("DD/MM/YYYY HH:mm");
      const message = `Θα θέλαμε να σας ενημερώσουμε ότι το ραντεβού σας για ${formattedDateTime} ακυρώνεται.\nWe would like to inform you that your appointment for ${formattedDateTime} has been canceled.`;
      await sendSMS(appointment.phoneNumber, message);
    } catch (smsError) {
      console.error("Failed to send cancellation SMS:", smsError.message);
    }

    res.status(200).json({ message: "Appointment cancelled successfully." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAppointmentsForPublicUser,
  cancelUpcomingAppointment,
};
