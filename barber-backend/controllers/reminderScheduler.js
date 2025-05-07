const Appointment = require("../models/appointment");
const { sendSMS } = require("../utils/smsService");
const moment = require("moment-timezone");

const sendReminders = async () => {
  try {
    const now = moment().utc();
    const reminderTime = now.clone().add(24, "hours").startOf("minute");

    console.log("📆 Checking reminders for:", reminderTime.toISOString());

    // 1️⃣ Get all confirmed appointments in the 24h window
    const allAppointments = await Appointment.find({
      appointmentDateTime: {
        $gte: reminderTime.toDate(),
        $lt: reminderTime.clone().add(1, "hour").toDate(),
      },
      appointmentStatus: "confirmed",
    });

    // 2️⃣ Filter only the ones that haven't received this exact reminder message
    const appointmentsToNotify = allAppointments.filter((appointment) => {
      const formattedTime = moment(appointment.appointmentDateTime)
        .tz("Europe/Athens")
        .format("DD/MM/YYYY HH:mm");

      const message = `Υπενθύμιση για το ραντεβού σας αύριο στις ${formattedTime} στο Lemo Barber Shop.`;

      return !appointment.reminders.some(
        (r) => r.type === "24-hour" && r.messageText === message
      );
    });

    console.log(`📋 ${appointmentsToNotify.length} reminder(s) will be sent.`);

    // 3️⃣ Send reminders
    for (const appointment of appointmentsToNotify) {
      const formattedTime = moment(appointment.appointmentDateTime)
        .tz("Europe/Athens")
        .format("DD/MM/YYYY HH:mm");

      const message = `Υπενθύμιση για το ραντεβού σας αύριο στις ${formattedTime} στο Lemo Barber Shop.`;

      try {
        const result = await sendSMS(appointment.phoneNumber, message);
        console.log("📦 SMS API Response:", result);

        await appointment.logReminder("24-hour", {
          messageId: result?.message_id || result?.messageId || null,
          status: result?.success ? "sent" : "failed",
          messageText: message,
          senderId: "Lemo Barber",
          retryCount: 0,
        });

        console.log(`✅ Reminder logged for ${appointment.customerName}`);
      } catch (error) {
        console.error(`❌ SMS failed for ${appointment._id}:`, error.message);

        await appointment.logReminder("24-hour", {
          messageId: null,
          status: "failed",
          messageText: message,
          senderId: "Lemo Barber",
          retryCount: 0,
        });
      }
    }

    console.log("✅ All 24-hour reminders processed.");
  } catch (error) {
    console.error("❌ Reminder script failed:", error.message);
  }
};

module.exports = { sendReminders };
