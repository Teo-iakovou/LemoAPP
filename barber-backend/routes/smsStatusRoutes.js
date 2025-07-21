const express = require("express");
const Appointment = require("../models/appointment");
const router = express.Router();

router.get("/sms-statuses", async (req, res) => {
  try {
    // 🚀 Just return current DB data instantly
    const appointments = await Appointment.find({
      "reminders.messageId": { $exists: true },
    }).lean();

    const allReminders = appointments.flatMap((appt) =>
      appt.reminders.map((reminder) => ({
        _id: appt._id,
        customerName: appt.customerName,
        phoneNumber: appt.phoneNumber,
        appointmentDateTime: appt.appointmentDateTime,
        reminder,
      }))
    );

    // Sort by most recent reminder
    allReminders.sort(
      (a, b) => new Date(b.reminder.sentAt) - new Date(a.reminder.sentAt)
    );

    res.json(allReminders);
  } catch (error) {
    console.error("❌ Error in /sms-statuses:", error.message);
    res.status(500).json({ error: "Failed to fetch SMS statuses" });
  }
});

module.exports = router;
