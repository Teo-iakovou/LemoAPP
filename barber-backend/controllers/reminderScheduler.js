const Appointment = require("../models/appointment");
const { sendSMS } = require("../utils/smsService");
const moment = require("moment-timezone");

// Main function to send 24-hour reminders
const sendReminders = async () => {
  try {
    const now = moment().utc();
    const reminderTime = now.clone().add(24, "hours").startOf("minute");

    console.log("📆 Checking reminders for:", reminderTime.toISOString());

    // Get ALL confirmed appointments 24 hours from now
    const allAppointments = await Appointment.find({
      appointmentDateTime: {
        $gte: reminderTime.toDate(),
        $lt: reminderTime.clone().add(1, "hour").toDate(),
      },
      appointmentStatus: "confirmed",
    });

    // Filter only those that have NOT been reminded yet
    const appointments = allAppointments.filter(
      (appt) => !appt.isReminderSent("24-hour")
    );

    console.log(
      `📋 Found ${appointments.length} appointment(s) needing reminders.`
    );

    for (const appointment of appointments) {
      const appointmentDateTime = moment(appointment.appointmentDateTime)
        .tz("Europe/Athens")
        .format("DD/MM/YYYY HH:mm");

      const message = `Υπενθύμιση για το ραντεβού σας αύριο στις ${appointmentDateTime} στο Lemo Barber Shop.`;

      try {
        const result = await sendSMS(appointment.phoneNumber, message);
        console.log("📦 SMS API Response:", result);

        const messageId = result?.message_id || result?.messageId;

        await appointment.logReminder("24-hour", {
          messageId: messageId || null,
          status: result?.success ? "sent" : "failed",
          messageText: message,
          senderId: "Lemo Barber",
          retryCount: 0,
        });

        console.log(`✅ Reminder logged for ${appointment._id}`);
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

    console.log("✅ Reminders processed successfully.");
  } catch (error) {
    console.error("❌ Error while sending reminders:", error.message);
  }
};

module.exports = { sendReminders };
