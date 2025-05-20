const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Appointment = require("./models/appointment");
const { sendSMS } = require("./utils/smsService");
const moment = require("moment-timezone");

dotenv.config();

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    fixMissingReminders(); // Start after connection
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
  });

const fixMissingReminders = async () => {
  try {
    const targetDate = "2025-05-21"; // 📅 Tomorrow's date (adjust if needed)
    const tz = "Europe/Athens";

    const startOfTargetDay = moment
      .tz(`${targetDate} 00:00`, tz)
      .startOf("day");
    const endOfTargetDay = moment(startOfTargetDay).endOf("day");

    const appointments = await Appointment.find({
      appointmentDateTime: {
        $gte: startOfTargetDay.toDate(),
        $lte: endOfTargetDay.toDate(),
      },
      appointmentStatus: "confirmed",
      type: "appointment",
    });

    console.log(
      `📋 Found ${appointments.length} appointments on ${targetDate}`
    );

    for (const appt of appointments) {
      const alreadyHas24Hour = appt.reminders?.some(
        (r) => r.type === "24-hour"
      );

      if (alreadyHas24Hour) {
        console.log(`⏩ ${appt.customerName}: already has 24-hour reminder`);
        continue;
      }

      const formattedTime = moment(appt.appointmentDateTime)
        .tz(tz)
        .format("DD/MM/YYYY HH:mm");

      const message = `Υπενθύμιση για το ραντεβού σας αύριο στις ${formattedTime} στο Lemo Barber Shop.`;

      try {
        const result = await sendSMS(appt.phoneNumber, message);

        await appt.logReminder("24-hour", {
          messageId: result?.message_id || result?.messageId || null,
          status: result?.success ? "sent" : result?.status || "failed",
          messageText: message,
          senderId: "Lemo Barber",
          retryCount: 0,
        });

        console.log(`✅ Sent to ${appt.customerName}`);
      } catch (err) {
        console.error(`❌ SMS failed for ${appt.customerName}:`, err.message);

        await appt.logReminder("24-hour", {
          messageId: null,
          status: "failed",
          messageText: message,
          senderId: "Lemo Barber",
          retryCount: 0,
        });
      }
    }

    mongoose.disconnect();
  } catch (error) {
    console.error("❌ Manual fix failed:", error.message);
    mongoose.disconnect();
  }
};
