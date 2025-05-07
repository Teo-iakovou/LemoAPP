const express = require("express");
const axios = require("axios");
const Appointment = require("../models/appointment");
const router = express.Router();
require("dotenv").config();

const API_KEY = process.env.SMS_TO_API_KEY.trim();

router.get("/sms-statuses", async (req, res) => {
  try {
    // 📥 Find all appointments with at least one messageId
    const appointments = await Appointment.find({
      "reminders.messageId": { $exists: true },
    });

    for (const appointment of appointments) {
      let updated = false;

      for (const reminder of appointment.reminders) {
        const messageId = reminder.messageId;

        // ⛔ Skip if message is already final
        if (
          !messageId ||
          ["delivered", "failed", "expired"].includes(reminder.status)
        )
          continue;

        try {
          const { data } = await axios.get(
            `https://api.sms.to/message/${messageId}`,
            {
              headers: {
                Authorization: `Bearer ${API_KEY}`,
                Accept: "application/json",
              },
            }
          );

          const smsStatus = data?.status?.toLowerCase();
          if (smsStatus && smsStatus !== reminder.status) {
            console.log(`🔄 Updated ${messageId} → ${smsStatus}`);
            reminder.status = smsStatus;
            updated = true;
          }
        } catch (err) {
          console.warn(`❌ Failed to check SMS.to status for ${messageId}`);
          console.error(err.response?.data || err.message);
        }
      }

      if (updated) {
        await appointment.save();
      }
    }

    // ✅ Flatten for frontend
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
