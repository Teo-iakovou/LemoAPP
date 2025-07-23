const mongoose = require("mongoose");
const dotenv = require("dotenv");
const moment = require("moment-timezone");
const Appointment = require("./models/appointment");

dotenv.config();

const debugReminderWindow = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected");

  const tz = "Europe/Athens";
  const apptTimeAthens = moment.tz("2025-07-24 09:40", tz);
  const windowStart = apptTimeAthens.clone().subtract(24, "hours").subtract(10, "minutes").utc();
  const windowEnd = apptTimeAthens.clone().subtract(24, "hours").add(10, "minutes").utc();

  const marios = await Appointment.findOne({
    customerName: "marios augousti",
    appointmentDateTime: {
      $gte: apptTimeAthens.clone().utc().startOf("minute").toDate(),
      $lte: apptTimeAthens.clone().utc().endOf("minute").toDate(),
    },
  });

  const reminder = marios?.reminders?.find(r => r.type === "24-hour");

  console.log("🔍 Reminder window:", windowStart.toISOString(), "→", windowEnd.toISOString());
  console.log("📅 Appt time (UTC):", marios?.appointmentDateTime);
  console.log("📍 Appt time (Athens):", moment(marios?.appointmentDateTime).tz(tz).format("YYYY-MM-DD HH:mm"));
  console.log("🔁 Already reminded:", reminder ? "✅ YES" : "❌ NO");
  console.log("🧾 Reminder message text:", reminder?.messageText);
  console.log("📅 Reminder sentAt:", reminder?.sentAt);

  await mongoose.disconnect();
};

debugReminderWindow();
