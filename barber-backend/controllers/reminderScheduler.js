const Appointment = require("../models/appointment");
const { sendSMS } = require("../utils/smsService");
const moment = require("moment-timezone");

const sendReminders = async () => {
  try {
    const now = moment().utc();
    const reminderTime = now.clone().add(24, "hours").startOf("minute");

    console.log("📆 Checking reminders for:", reminderTime.toISOString());

    // Format message text exactly like the one we would send
    const formattedRangeStart = reminderTime
      .clone()
      .tz("Europe/Athens")
      .format("DD/MM/YYYY HH:mm");
    const expectedMessage = `Υπενθύμιση για το ραντεβού σας αύριο στις ${formattedRangeStart} στο Lemo Barber Shop.`;

    // Query only appointments that do NOT already have this message
    const appointments = await Appointment.find({
      appointmentDateTime: {
        $gte: reminderTime.toDate(),
        $lt: reminderTime.clone().add(1, "hour").toDate(),
      },
      appointmentStatus: "confirmed",
      reminders: {
        $not: {
          $elemMatch: {
            type: "24-hour",
            messageText: expectedMessage,
          },
        },
      },
    });

    console.log(`📋 ${appointments.length} reminder(s) will be sent.`);

    for (const appointment of appointments) {
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
