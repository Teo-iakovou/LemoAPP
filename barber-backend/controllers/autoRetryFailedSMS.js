const Appointment = require("../models/appointment");
const { sendSMS } = require("../utils/smsService");

const autoRetryFailedSMS = async () => {
  try {
    const appointments = await Appointment.find({
      appointmentStatus: "confirmed",
      "reminders.status": "failed",
      "reminders.retryCount": { $lt: 1 },
    });

    console.log(
      `🔁 Found ${appointments.length} appointments with failed reminders to retry.`
    );

    for (const appointment of appointments) {
      for (const reminder of appointment.reminders) {
        if (reminder.status === "failed" && reminder.retryCount < 1) {
          const formattedDate = new Date(
            appointment.appointmentDateTime
          ).toLocaleString("el-GR", {
            timeZone: "Europe/Athens",
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
          });

          const message = `Υπενθύμιση για το ραντεβού σας στις ${formattedDate} στο Lemo Barber Shop.`;

          try {
            const result = await sendSMS(appointment.phoneNumber, message);
            reminder.messageId = result.message_id || null;
            reminder.status = result.success ? "sent" : "failed";
            reminder.sentAt = new Date();
            reminder.retryCount += 1;

            console.log(
              `✅ Retried SMS for ${appointment.customerName} — status: ${reminder.status}`
            );
          } catch (err) {
            console.warn(
              `❌ Failed to auto-resend SMS for ${appointment.customerName}:`,
              err.message
            );
            reminder.status = "failed";
            reminder.retryCount += 1;
          }
        }
      }

      await appointment.save();
    }

    console.log("🔁 Auto-retry process completed.");
  } catch (error) {
    console.error("❌ Auto-retry failed:", error.message);
  }
};

module.exports = { autoRetryFailedSMS };
