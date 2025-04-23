const express = require("express");
const axios = require("axios");
const Appointment = require("../models/appointment");
const router = express.Router();
require("dotenv").config();

const API_KEY = process.env.SMS_TO_API_KEY.trim();

router.get("/sms-statuses", async (req, res) => {
  try {
    const selectedDate = req.query.date;
    const now = new Date();

    const filter = {
      appointmentStatus: "confirmed",
      "reminders.messageId": { $exists: true },
    };

    if (selectedDate) {
      const startOfDay = new Date(`${selectedDate}T00:00:00`);
      const endOfDay = new Date(`${selectedDate}T23:59:59`);

      // ✅ Filter appointments where at least one reminder was sent on this date
      filter.reminders = {
        $elemMatch: {
          sentAt: { $gte: startOfDay, $lte: endOfDay },
          messageId: { $exists: true },
        },
      };
    } else {
      filter.reminders = {
        $elemMatch: {
          sentAt: { $gte: now },
          messageId: { $exists: true },
        },
      };
    }

    // 🔁 Fetch appointments with matching reminders
    let appointments = await Appointment.find(filter);

    // ✅ Update SMS status if necessary
    for (const appointment of appointments) {
      let updated = false;

      for (const reminder of appointment.reminders) {
        const messageId = reminder.messageId;

        // Skip final status updates
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
          if (smsStatus) {
            console.log(`📦 [${reminder.type}] ${messageId} → ${smsStatus}`);
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

    // ✅ Sort by latest `sentAt` inside reminders
    appointments.sort((a, b) => {
      const aSent =
        a.reminders.map((r) => new Date(r.sentAt)).sort((a, b) => b - a)[0] ||
        0;
      const bSent =
        b.reminders.map((r) => new Date(r.sentAt)).sort((a, b) => b - a)[0] ||
        0;
      return bSent - aSent;
    });

    res.json(appointments);
  } catch (error) {
    console.error("❌ Error in /sms-statuses:", error.message);
    res.status(500).json({ error: "Failed to fetch SMS statuses" });
  }
});

module.exports = router;
