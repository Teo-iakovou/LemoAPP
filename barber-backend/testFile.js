const mongoose = require("mongoose");
const dotenv = require("dotenv");
const moment = require("moment-timezone");
const Appointment = require("./models/appointment");
const { sendSMS } = require("./utils/smsService");

dotenv.config();

const tz = "Europe/Athens";

// ✅ Use hardcoded appointment IDs
const appointmentIds = [
  "68529841426d72ae0382b7e0", 
"687e6ce6f15afac9173d3a18"];

const sendManualReminders = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  for (const id of appointmentIds) {
    const appt = await Appointment.findById(id);

    if (!appt) {
      console.log(`❌ No appointment found with ID: ${id}`);
      continue;
    }

    const appointmentTimeAthens = moment(appt.appointmentDateTime).tz(tz).format("DD/MM/YYYY HH:mm");
    const message = `Υπενθύμιση για το ραντεβού σας αύριο στις ${appointmentTimeAthens} στο Lemo Barber Shop.`;

    const alreadyReminded = appt.reminders?.some(
      (r) => r.type === "24-hour" && r.messageText === message
    );

    if (alreadyReminded) {
      console.log(`⛔ Already reminded: ${appt.customerName}`);
      continue;
    }

    try {
      const result = await sendSMS(appt.phoneNumber, message);

      appt.reminders.push({
        type: "24-hour",
        sentAt: new Date(),
        messageId: result?.message_id || result?.messageId || null,
        status: result?.success ? "sent" : result?.status || "failed",
        messageText: message,
        senderId: "Lemo Barber",
        retryCount: 0,
      });

      await appt.save();
      console.log(`✅ Reminder manually sent to ${appt.customerName}`);
    } catch (err) {
      console.error(`❌ SMS failed for ${appt.customerName}: ${err.message}`);
    }
  }

  await mongoose.disconnect();
  console.log("🔌 Disconnected from MongoDB");
};

sendManualReminders();
