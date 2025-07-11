const Appointment = require("../models/appointment");
const { sendSMS } = require("../utils/smsService");
const moment = require("moment-timezone");

const sendReminders = async () => {
  try {
    // THE FIX: use UTC everywhere for window calculation
    const nowUTC = moment.utc();

    // 24h window ahead in UTC
    const windowStart = nowUTC.clone().add(24, "hours");
    const windowEnd = windowStart.clone().add(10, "minutes");

    const appointments = await Appointment.find({
      appointmentDateTime: {
        $gte: windowStart.toDate(), // window in UTC!
        $lt: windowEnd.toDate(),
      },
      appointmentStatus: "confirmed",
      type: "appointment",
    });

    console.log(
      `📋 Found ${
        appointments.length
      } appointments for reminders between ${windowStart.format(
        "YYYY-MM-DD HH:mm"
      )} and ${windowEnd.format("YYYY-MM-DD HH:mm")} UTC`
    );

    for (const appointment of appointments) {
      // Always display Athens time in the SMS
      const tz = "Europe/Athens";
      const formattedTime = moment(appointment.appointmentDateTime)
        .tz(tz)
        .format("DD/MM/YYYY HH:mm");

      const message = `Υπενθύμιση για το ραντεβού σας αύριο στις ${formattedTime} στο Lemo Barber Shop.`;

      // Double-check to avoid duplicate reminders
      const fresh = await Appointment.findById(appointment._id);
      const alreadyExists = fresh.reminders?.some(
        (r) => r.type === "24-hour" && r.messageText === message
      );

      if (alreadyExists) {
        console.log(
          `⛔ Reminder already sent to ${appointment.customerName}, skipping.`
        );
        continue;
      }

      try {
        const result = await sendSMS(appointment.phoneNumber, message);

        await appointment.logReminder("24-hour", {
          messageId: result?.message_id || result?.messageId || null,
          status: result?.success ? "sent" : result?.status || "failed",
          messageText: message,
          senderId: "Lemo Barber",
          retryCount: 0,
        });

        console.log(`✅ Reminder sent to ${appointment.customerName}`);
      } catch (err) {
        console.error(
          `❌ SMS failed for ${appointment.customerName}:`,
          err.message
        );

        await appointment.logReminder("24-hour", {
          messageId: null,
          status: "failed",
          messageText: message,
          senderId: "Lemo Barber",
          retryCount: 0,
        });
      }
    }
  } catch (err) {
    console.error("❌ Reminder script failed:", err.message);
  }
};

module.exports = { sendReminders };
