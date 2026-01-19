const mongoose = require("mongoose");
const dotenv = require("dotenv");
const moment = require("moment-timezone");
const Appointment = require("./models/appointment");
const { sendSMS } = require("./utils/smsService");

dotenv.config();

const tz = "Europe/Athens";

// --- tiny argv parser (no deps) ---
function getArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (!hit) return null;
  return hit.slice(prefix.length);
}
function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

const DRY_RUN = hasFlag("dry-run");
const LIMIT = Number(getArg("limit") || 0); // 0 => no limit
const ONLY_ID = getArg("id"); // appointment _id
const ONLY_PHONE = getArg("phone"); // exact match
const HOURS_FROM = Number(getArg("hoursFrom") || 24);
const HOURS_TO = Number(getArg("hoursTo") || 25);

// Optional: set "now" for testing
const MOCK_NOW = getArg("now"); // ISO string

const nowAthens = MOCK_NOW
  ? moment.tz(MOCK_NOW, tz)
  : moment.tz(tz);

// Window: [now + HOURS_FROM, now + HOURS_TO] in UTC
const windowStartUTC = nowAthens.clone().add(HOURS_FROM, "hours").utc();
const windowEndUTC = nowAthens.clone().add(HOURS_TO, "hours").utc();

console.log("🧪 Reminder test script config:", {
  DRY_RUN,
  LIMIT,
  ONLY_ID,
  ONLY_PHONE,
  HOURS_FROM,
  HOURS_TO,
  nowAthens: nowAthens.format(),
  windowStartUTC: windowStartUTC.format(),
  windowEndUTC: windowEndUTC.format(),
});

const run = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in env");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  const query = {
    appointmentDateTime: {
      $gte: windowStartUTC.toDate(),
      $lte: windowEndUTC.toDate(),
    },
    appointmentStatus: "confirmed",
    type: "appointment",
  };

  if (ONLY_ID) query._id = new mongoose.Types.ObjectId(ONLY_ID);
  if (ONLY_PHONE) query.phoneNumber = ONLY_PHONE;

  let appointments = await Appointment.find(query).sort({ appointmentDateTime: 1 });

  // Apply LIMIT after find
  if (LIMIT > 0) appointments = appointments.slice(0, LIMIT);

  console.log(`🔎 Matched appointments: ${appointments.length}`);
  if (appointments.length) {
    console.log(
      appointments.map((a) => ({
        id: String(a._id),
        customerName: a.customerName,
        phoneNumber: a.phoneNumber,
        appointmentDateTimeUTC: a.appointmentDateTime?.toISOString?.(),
        appointmentDateTimeAthens: moment(a.appointmentDateTime).tz(tz).format("DD/MM/YYYY HH:mm"),
      }))
    );
  }

  let sentCount = 0,
    skippedCount = 0,
    failedCount = 0;

  for (const appt of appointments) {
    // If already has "24-hour" with status sent -> skip
    const alreadyHas24Hour = Array.isArray(appt.reminders)
      ? appt.reminders.some(
          (r) =>
            r?.type === "24-hour" &&
            String(r?.status || "").toLowerCase() === "sent"
        )
      : false;

    if (alreadyHas24Hour) {
      skippedCount++;
      console.log(
        `⏩ Skip ${appt.customerName} (${String(appt._id)}): already has 24-hour reminder`
      );
      continue;
    }

    const formattedTime = moment(appt.appointmentDateTime)
      .tz(tz)
      .format("DD/MM/YYYY HH:mm");

    const message = `Υπενθύμιση για το ραντεβού σας αύριο στις ${formattedTime} στο Lemo Barber Shop.`;

    if (DRY_RUN) {
      console.log(`🟡 DRY RUN would send to ${appt.customerName} (${appt.phoneNumber}) -> ${formattedTime}`);
      continue;
    }

    try {
      // pass smsType for your new logs
      const result = await sendSMS(appt.phoneNumber, message, { smsType: "24-hour" });

      appt.reminders.push({
        type: "24-hour",
        sentAt: new Date(),
        messageId: result?.message_id || result?.messageId || null,
        status: result?.success ? "sent" : result?.status || "failed",
        messageText: message,
        senderId: "Lemo Barber",
        retryCount: 0,
      });

      // keep your endTime patch
      if (!appt.endTime) {
        const duration = appt.duration || 40;
        appt.endTime = new Date(
          new Date(appt.appointmentDateTime).getTime() + duration * 60 * 1000
        );
      }

      await appt.save();

      sentCount++;
      console.log(
        `✅ Reminder sent to ${appt.customerName} (${appt.phoneNumber}) for ${formattedTime}`
      );
    } catch (err) {
      failedCount++;
      console.error(
        `❌ SMS failed for ${appt.customerName} (${appt.phoneNumber}):`,
        err.message
      );

      appt.reminders.push({
        type: "24-hour",
        sentAt: new Date(),
        messageId: null,
        status: "failed",
        messageText: message,
        senderId: "Lemo Barber",
        retryCount: 0,
        error: err.message,
      });

      if (!appt.endTime) {
        const duration = appt.duration || 40;
        appt.endTime = new Date(
          new Date(appt.appointmentDateTime).getTime() + duration * 60 * 1000
        );
      }

      await appt.save();
    }
  }

  await mongoose.disconnect();
  console.log(
    `🎉 Done! Sent: ${sentCount}, Skipped: ${skippedCount}, Failed: ${failedCount}, DryRun: ${DRY_RUN}`
  );
};

run().catch((err) => {
  console.error("❌ Script failed:", err.message);
  mongoose.disconnect();
});