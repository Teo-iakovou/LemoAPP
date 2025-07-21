const Appointment = require("../models/appointment");
const { sendSMS } = require("../utils/smsService");
const moment = require("moment-timezone");

const sendReminders = async () => {
  try {
    // -- Χρησιμοποίησε Athens time για clarity --
    const tz = "Europe/Athens";
    const nowAthens = moment().tz(tz);

    // --- [ WINDOW: 24h ± 10min από τώρα (Athens time) ] ---
    const windowStart = nowAthens
      .clone()
      .add(24, "hours")
      .subtract(10, "minutes");
    const windowEnd = nowAthens.clone().add(24, "hours").add(10, "minutes");

    // Convert window to UTC for MongoDB
    const windowStartUTC = windowStart.clone().utc().toDate();
    const windowEndUTC = windowEnd.clone().utc().toDate();

    console.log("Now (Athens):", nowAthens.format());
    console.log("Window Start (Athens):", windowStart.format());
    console.log("Window End (Athens):", windowEnd.format());
    console.log("Window Start (UTC):", windowStartUTC);
    console.log("Window End (UTC):", windowEndUTC);

    // Print the actual appointment times you expect to catch:
    const tomorrowAppointment = await Appointment.findOne({
      customerName: "gkiokas",
    });
    console.log(
      "Appointment Time (UTC):",
      tomorrowAppointment.appointmentDateTime
    );
    console.log(
      "Appointment Time (Athens):",
      moment(tomorrowAppointment.appointmentDateTime).tz(tz).format()
    );

    const appointments = await Appointment.find({
      appointmentDateTime: {
        $gte: windowStartUTC,
        $lt: windowEndUTC,
      },
      appointmentStatus: "confirmed",
      type: "appointment",
    });

    console.log(
      `📋 Found ${
        appointments.length
      } appointments for reminders between ${windowStart.format(
        "YYYY-MM-DD HH:mm"
      )} and ${windowEnd.format("YYYY-MM-DD HH:mm")} Athens`
    );

    for (const appointment of appointments) {
      const appointmentTimeAthens = moment(appointment.appointmentDateTime)
        .tz(tz)
        .format("DD/MM/YYYY HH:mm");
      const message = `Υπενθύμιση για το ραντεβού σας αύριο στις ${appointmentTimeAthens} στο Lemo Barber Shop.`;

      // Avoid duplicate reminders
      const alreadyExists = appointment.reminders?.some(
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

        appointment.reminders.push({
          type: "24-hour",
          sentAt: new Date(),
          messageId: result?.message_id || result?.messageId || null,
          status: result?.success ? "sent" : result?.status || "failed",
          messageText: message,
          senderId: "Lemo Barber",
          retryCount: 0,
        });
        await appointment.save();

        console.log(`✅ Reminder sent to ${appointment.customerName}`);
      } catch (err) {
        console.error(
          `❌ SMS failed for ${appointment.customerName}:`,
          err.message
        );
        appointment.reminders.push({
          type: "24-hour",
          sentAt: new Date(),
          messageId: null,
          status: "failed",
          messageText: message,
          senderId: "Lemo Barber",
          retryCount: 0,
        });
        await appointment.save();
      }
    }
  } catch (err) {
    console.error("❌ Reminder script failed:", err.message);
  }
};

module.exports = { sendReminders };
