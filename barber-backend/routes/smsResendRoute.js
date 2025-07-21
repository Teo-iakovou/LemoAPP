const express = require("express");
const router = express.Router();
const Appointment = require("../models/appointment");
const { sendSMS } = require("../utils/smsService");

router.post("/sms-resend/:appointmentId", async (req, res) => {
  const { appointmentId } = req.params;

  try {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment)
      return res.status(404).json({ error: "Appointment not found" });

    const lastReminder =
      appointment.reminders[appointment.reminders.length - 1];

    if (!lastReminder)
      return res.status(400).json({ error: "No reminder to retry" });

    if (lastReminder.retryCount >= 1) {
      return res
        .status(400)
        .json({ error: "SMS has already been retried once" });
    }

    const formattedDate = new Date(
      appointment.appointmentDateTime
    ).toLocaleString("el-GR", {
      timeZone: "Europe/Athens",
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });

    const message =
      lastReminder.messageText ||
      `Υπενθύμιση για το ραντεβού σας στις ${formattedDate} στο Lemo Barber Shop.`;

    const smsResult = await sendSMS(appointment.phoneNumber, message);

    const newReminder = {
      type: lastReminder.type, // preserve original type: "confirmation" or "24-hour"
      sentAt: new Date(),
      messageId: smsResult.message_id,
      messageText: message,
      senderId: "Lemo Barber",
      status: smsResult.success ? "sent" : "failed",
      retryCount: 1,
    };

    appointment.reminders.push(newReminder);
    await appointment.save();

    res.json({ message: "SMS resent", status: newReminder.status });
  } catch (error) {
    console.error("❌ Error resending SMS:", error.message);
    res.status(500).json({ error: "Failed to resend SMS" });
  }
});

module.exports = router;
