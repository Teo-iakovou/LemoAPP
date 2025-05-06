const express = require("express");
const router = express.Router(); // ✅ THIS LINE WAS MISSING
const axios = require("axios");
const Appointment = require("../models/appointment");
require("dotenv").config();

router.get("/sms-statuses", async (req, res) => {
  try {
    const selectedDate = req.query.date;
    if (!selectedDate) {
      return res.status(400).json({ error: "Missing date parameter" });
    }

    const startOfDay = new Date(`${selectedDate}T00:00:00`);
    const endOfDay = new Date(`${selectedDate}T23:59:59`);

    // Find all appointments with at least one reminder on this date
    const appointments = await Appointment.find({
      "reminders.sentAt": { $gte: startOfDay, $lte: endOfDay },
    });

    const flattenedReminders = [];

    for (const appt of appointments) {
      const matchingReminders = appt.reminders.filter(
        (r) => r.sentAt >= startOfDay && r.sentAt <= endOfDay
      );

      for (const reminder of matchingReminders) {
        flattenedReminders.push({
          _id: appt._id,
          customerName: appt.customerName,
          phoneNumber: appt.phoneNumber,
          appointmentDateTime: appt.appointmentDateTime,
          reminder, // contains type, sentAt, messageId, status, etc.
        });
      }
    }

    res.json(flattenedReminders);
  } catch (error) {
    console.error("❌ Error in /sms-statuses:", error.message);
    res.status(500).json({ error: "Failed to fetch SMS statuses" });
  }
});
module.exports = router;
