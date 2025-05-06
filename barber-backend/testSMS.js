const mongoose = require("mongoose");
const moment = require("moment-timezone");
const Appointment = require("./models/appointment");
const { sendSMS } = require("./utils/smsService");
require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/lemo";

async function resend24HourReminders() {
  await mongoose.connect(MONGO_URI);
  console.log("📡 Connected to MongoDB");

  const tomorrowStart = moment()
    .tz("Europe/Athens")
    .add(1, "day")
    .startOf("day")
    .toDate();
  const tomorrowEnd = moment(tomorrowStart).endOf("day").toDate();

  const appointments = await Appointment.find({
    appointmentDateTime: { $gte: tomorrowStart, $lte: tomorrowEnd },
  });

  console.log(`📋 Found ${appointments.length} appointments for tomorrow.`);

  for (const appt of appointments) {
    const alreadyReminded = (appt.reminders || []).some((r) => {
      return (
        r.type === "24-hour" &&
        r.messageText?.startsWith("Υπενθύμιση") &&
        moment(r.sentAt).isAfter(moment().subtract(12, "hours"))
      );
    });

    if (alreadyReminded) {
      console.log(`✅ Skipping ${appt.customerName} — already reminded.`);
      continue;
    }

    const formattedDate = moment(appt.appointmentDateTime)
      .tz("Europe/Athens")
      .format("DD/MM/YYYY HH:mm");

    const reminderText = `Υπενθύμιση για το ραντεβού σας αύριο στις ${formattedDate} στο Lemo Barber Shop.`;

    try {
      const result = await sendSMS(appt.phoneNumber, reminderText);

      if (result && result.message_id) {
        const newReminder = {
          type: "24-hour",
          sentAt: new Date(),
          messageId: result.message_id,
          messageText: reminderText,
          senderId: "Lemo Barber",
          status: "sent",
          retryCount: 0,
        };

        appt.reminders = [...(appt.reminders || []), newReminder];
        await appt.save();

        console.log(`📨 Reminder sent to ${appt.customerName}`);
      } else {
        console.warn(`❌ No message_id returned for ${appt.customerName}`);
      }
    } catch (err) {
      console.error(
        `❌ Error sending SMS to ${appt.customerName}:`,
        err.message
      );
    }
  }

  await mongoose.disconnect();
  console.log("✅ Done. DB connection closed.");
}

resend24HourReminders();
