const Appointment = require("../models/appointment");
const { sendSMS } = require("../utils/smsService");
const moment = require("moment-timezone");

const sendReminders = async () => {
  try {
    const now = moment().utc();
    const reminderTime = now.clone().add(24, "hours").startOf("minute");

    console.log("📆 Checking reminders for:", reminderTime.toISOString());

    const allAppointments = await Appointment.find({
      appointmentDateTime: {
        $gte: reminderTime.toDate(),
        $lt: reminderTime.clone().add(1, "hour").toDate(),
      },
      appointmentStatus: "confirmed",
      type: "appointment",
    });

    console.log(`📋 Found ${allAppointments.length} potential reminder(s)`);

    for (const appointment of allAppointments) {
      const formattedTime = moment(appointment.appointmentDateTime)
        .tz("Europe/Athens")
        .format("DD/MM/YYYY HH:mm");

      const message = `Υπενθύμιση για το ραντεβού σας αύριο στις ${formattedTime} στο Lemo Barber Shop.`;

      const fresh = await Appointment.findById(appointment._id);
      console.log(
        `🔍 Reminder types for ${fresh.customerName}:`,
        fresh.reminders.map((r) => r.type)
      );

      const alreadyExists = fresh.reminders.some((r) => r.type === "24-hour");

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
          status: result?.success ? "sent" : "failed",
          messageText: message,
          senderId: "Lemo Barber",
          retryCount: 0,
        });

        console.log(`✅ 24-hour reminder sent to ${appointment.customerName}`);
      } catch (error) {
        console.error(
          `❌ SMS failed for ${appointment.customerName}:`,
          error.message
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
  } catch (error) {
    console.error("❌ Reminder script failed:", error.message);
  }
};

module.exports = { sendReminders };
