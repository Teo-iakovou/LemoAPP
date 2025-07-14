const mongoose = require("mongoose");
const dotenv = require("dotenv");
const moment = require("moment-timezone");
const Appointment = require("./models/appointment");
const { sendSMS } = require("./utils/smsService");

dotenv.config();

const tz = "Europe/Athens";
const dateTargetAthens = moment.tz("2025-07-15", tz);

const startOfDayUTC = dateTargetAthens.clone().startOf("day").utc();
const endOfDayUTC = dateTargetAthens.clone().endOf("day").utc();

console.log(
  `🔍 Scanning for appointments on ${dateTargetAthens.format(
    "DD/MM/YYYY"
  )} between ${startOfDayUTC.format()} and ${endOfDayUTC.format()} UTC`
);

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  const appointments = await Appointment.find({
    appointmentDateTime: {
      $gte: startOfDayUTC.toDate(),
      $lte: endOfDayUTC.toDate(),
    },
    appointmentStatus: "confirmed",
    type: "appointment",
  });

  let sentCount = 0,
    skippedCount = 0,
    failedCount = 0;

  for (const appt of appointments) {
    // Check for any "24-hour" reminder already sent
    const alreadyHas24Hour = appt.reminders?.some((r) => r.type === "24-hour");
    if (alreadyHas24Hour) {
      skippedCount++;
      console.log(
        `⏩ ${
          appt.customerName
        } (${appt.appointmentDateTime.toISOString()}): already has 24-hour reminder`
      );
      continue;
    }

    // Compose Athens time for the SMS
    const formattedTime = moment(appt.appointmentDateTime)
      .tz(tz)
      .format("DD/MM/YYYY HH:mm");
    const message = `Υπενθύμιση για το ραντεβού σας αύριο στις ${formattedTime} στο Lemo Barber Shop.`;

    try {
      const result = await sendSMS(appt.phoneNumber, message);

      appt.reminders.push({
        type: "24-hour",
        sentAt: new Date(),
        messageId: result?.message_id || result?.messageId || null,
        status: result?.success ? "sent" : result?.status || "failed",
        messageText: message,
        senderId: "Lemo Barber",
        retryCount: 0,
      });

      // 👉 PATCH: Set endTime if missing (for old records)
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

      // 👉 PATCH: Set endTime if missing (for old records)
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
    `🎉 Done! Sent: ${sentCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`
  );
};

run().catch((err) => {
  console.error("❌ Script failed:", err.message);
  mongoose.disconnect();
});
