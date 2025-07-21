// scripts/updateSmsStatuses.js
const mongoose = require("mongoose");
const axios = require("axios");
const Appointment = require("../models/appointment"); // adjust path if needed
require("dotenv").config();

const API_KEY = process.env.SMS_TO_API_KEY.trim();

async function updateSmsStatuses() {
  await mongoose.connect(process.env.MONGODB_URI);

  const appointmentsToUpdate = await Appointment.find({
    "reminders.messageId": { $exists: true },
    "reminders.status": {
      $nin: ["delivered", "failed", "expired", "rejected"],
    },
  });

  for (const appointment of appointmentsToUpdate) {
    let updated = false;
    for (const reminder of appointment.reminders) {
      const messageId = reminder.messageId;
      if (
        !messageId ||
        ["delivered", "failed", "expired", "rejected"].includes(reminder.status)
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
          reminder.status = smsStatus;
          updated = true;
        }
      } catch (err) {
        console.warn(`❌ Failed to check SMS.to status for ${messageId}`);
        if (err.response) {
          console.error("Status:", err.response.status);
          console.error("Data:", err.response.data);
        } else {
          console.error(err.message);
        }
      }
    }
    if (updated) {
      await appointment.save();
    }
  }

  await mongoose.disconnect();
  console.log("SMS status update finished.");
}

updateSmsStatuses();
