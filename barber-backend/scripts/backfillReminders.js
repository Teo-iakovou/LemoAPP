const Appointment = require("../models/appointment"); // adjust path
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🔌 Connected to MongoDB");

    const result = await Appointment.updateMany(
      { "reminders.0": { $exists: true } },
      { $set: { reminders: [] } }
    );

    console.log(
      `🧹 Cleared reminders from ${result.modifiedCount} appointments.`
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to clear reminders:", error.message);
    process.exit(1);
  }
};

run();
