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

    const reminder = appointment.reminders.find(
      (r) => r.status === "failed" || r.status === "sent"
    );

    if (!reminder)
      return res.status(400).json({ error: "No retryable reminder found" });

    if (reminder.retryCount >= 1) {
      return res.status(400).json({ error: "SMS already retried once" });
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

    const message = `Υπενθύμιση για το ραντεβού σας στις ${formattedDate} στο Lemo Barber Shop.`;

    const smsResult = await sendSMS(appointment.phoneNumber, message);

    // Update the existing reminder
    reminder.messageId = smsResult.message_id;
    reminder.status = smsResult.success ? "sent" : "failed";
    reminder.retryCount += 1;
    reminder.sentAt = new Date();

    await appointment.save();

    res.json({ message: "SMS resent successfully", status: reminder.status });
  } catch (error) {
    console.error("❌ Error resending SMS:", error.message);
    res.status(500).json({ error: "Failed to resend SMS" });
  }
});

module.exports = router;
