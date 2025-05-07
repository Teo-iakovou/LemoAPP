const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Appointment = require("./models/appointment");

dotenv.config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log("🧹 Connected to MongoDB - starting cleanup");

  const appointments = await Appointment.find({
    "reminders.type": "24-hour",
  });

  for (const appt of appointments) {
    const seen = new Set();
    const uniqueReminders = [];

    for (const r of appt.reminders) {
      if (r.type === "24-hour") {
        const key = r.messageText; // consider combining with r.sentAt.toISOString() if needed

        if (!seen.has(key)) {
          seen.add(key);
          uniqueReminders.push(r);
        } else {
          console.log(`🗑️ Duplicate removed for ${appt.customerName}: ${key}`);
        }
      } else {
        uniqueReminders.push(r); // keep non-24-hour reminders
      }
    }

    appt.reminders = uniqueReminders;
    await appt.save();
  }

  console.log("✅ Cleanup completed");
  mongoose.disconnect();
});
