const Appointment = require("../models/appointment");
const { sendSMS } = require("../utils/smsService");
const moment = require("moment-timezone");

const sendReminders = async () => {
  try {
    const tz = "Europe/Athens";
    const nowAthens = moment().tz(tz);
    const targetDate = nowAthens.clone().add(1, "day").format("YYYY-MM-DD");

    const startOfTargetDay = moment.tz(`${targetDate} 00:00`, tz);
    const endOfTargetDay = startOfTargetDay.clone().endOf("day");

    const appointments = await Appointment.find({
      appointmentDateTime: {
        $gte: startOfTargetDay.toDate(),
        $lte: endOfTargetDay.toDate(),
      },
      appointmentStatus: "confirmed",
      type: "appointment",
    });

    console.log(
      `📋 Found ${appointments.length} appointments for ${targetDate}`
    );

    for (const appointment of appointments) {
      const formattedTime = moment(appointment.appointmentDateTime)
        .tz(tz)
        .format("DD/MM/YYYY HH:mm");

      const message = `Υπενθύμιση για το ραντεβού σας αύριο στις ${formattedTime} στο Lemo Barber Shop.`;

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
