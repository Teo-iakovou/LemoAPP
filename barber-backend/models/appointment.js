const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: function () {
      return this.type !== "break";
    },
  },
  phoneNumber: {
    type: String,
    required: function () {
      return this.type !== "break";
    },
    validate: {
      validator: function (v) {
        if (this.type === "break") return true;
        return v.length >= 6 && v.length <= 15;
      },
      message: "Phone number must be between 6 and 15 characters",
    },
  },
  appointmentDateTime: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number,
    required: function () {
      return this.type !== "break";
    },
    min: 10, // or whatever minimum duration you want (e.g. 10 mins)
    max: 600, // you can set a max if you want (e.g. 10 hours)
    default: 40, // default to 40 if not provided
  },
  endTime: {
    type: Date,
    required: function () {
      return this.type !== "break";
    },
  },
  barber: {
    type: String,
    enum: ["ΛΕΜΟ", "ΦΟΡΟΥ"],
    required: true,
  },
  appointmentStatus: {
    type: String,
    enum: ["confirmed"],
    default: "confirmed",
  },
  type: {
    type: String,
    enum: ["appointment", "break"],
    default: "appointment",
  },

  reminders: [
    {
      type: { type: String, required: true },
      sentAt: { type: Date, required: true },
      messageId: { type: String },
      messageText: { type: String },
      senderId: { type: String },
      status: {
        type: String,
        enum: ["sent", "delivered", "failed", "expired", "rejected"],
        default: "sent",
      },
      retryCount: { type: Number, default: 0 },
      error: String,
    },
  ],
});

// --- PRE-SAVE: Automatically calculate endTime ---
appointmentSchema.pre("save", function (next) {
  if (this.type !== "break") {
    // Always calculate endTime based on duration and appointmentDateTime
    const durationToUse = this.duration || 40; // fallback to 40
    this.endTime = new Date(
      new Date(this.appointmentDateTime).getTime() + durationToUse * 60 * 1000
    );
  } else {
    this.endTime = this.appointmentDateTime; // or handle breaks as you wish
  }
  next();
});

// Add indexes for optimized queries
appointmentSchema.index({
  appointmentDateTime: 1,
  appointmentStatus: 1,
  type: 1,
});

// --- Log Reminder Utility (needed for reminders and scripts) ---
appointmentSchema.methods.logReminder = async function (type, data = {}) {
  this.reminders.push({
    type,
    sentAt: new Date(),
    ...data,
  });
  return this.save();
};
module.exports = mongoose.model("Appointment", appointmentSchema);
