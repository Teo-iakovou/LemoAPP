const Appointment = require("../models/appointment");
const { sendSMS } = require("../utils/smsService");
const moment = require("moment-timezone");

const sendReminders = async () => {
  try {
    const now = moment().utc();
    const reminderTime = now.clone().add(24, "hours").startOf("minute");

    console.log("📆 Checking reminders for:", reminderTime.toISOString());

    // Get confirmed appointments 24h from now
    const allAppointments = await Appointment.find({
      appointmentDateTime: {
        $gte: reminderTime.toDate(),
        $lt: reminderTime.clone().add(1, "hour").toDate(),
      },
      appointmentStatus: "confirmed",
    });

    const appointmentsToNotify = allAppointments.filter((appt) => {
      const existing24hReminder = appt.reminders.find((r) => {
        if (r.type !== "24-hour") return false;
        const reminderSent = moment(r.sentAt);
        return reminderSent.isBetween(
          reminderTime.clone().subtract(10, "minutes"),
          reminderTime.clone().add(10, "minutes")
        );
      });

      return !existing24hReminder;
    });

    console.log(`📋 ${appointmentsToNotify.length} reminder(s) will be sent.`);

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
        console.error(
          `❌ Failed to send reminder for ${appointment._id}:`,
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

    console.log("✅ All 24-hour reminders processed.");
  } catch (error) {
    console.error("❌ Reminder script failed:", error.message);
  }
};

module.exports = { sendReminders };
