const mongoose = require("mongoose");

const lastRunSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true, // Ensure each key is unique (e.g., "sendReminders")
  },
  timestamp: {
    type: Date,
    required: true,
  },
});

const LastRun = mongoose.model("LastRun", lastRunSchema);

module.exports = LastRun;
