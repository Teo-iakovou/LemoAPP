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
  }, // ✅ New field

  reminders: [
    {
      type: { type: String, required: true }, // e.g. "24-hour"
      sentAt: { type: Date, required: true },
      messageId: { type: String }, // <- NEW
      messageText: { type: String },
      senderId: { type: String }, // if you store it
      status: {
        type: String,
        enum: ["sent", "delivered", "failed", "expired", "rejected"],
        default: "sent",
      }, // <- NEW
      retryCount: { type: Number, default: 0 }, // <- NEW
      error: String,
    },
  ],
});

// Middleware to calculate and set `endTime` before saving
appointmentSchema.pre("save", function (next) {
  if (this.isModified("appointmentDateTime")) {
    this.endTime = new Date(
      new Date(this.appointmentDateTime).getTime() + 40 * 60 * 1000 // Default 40 minutes duration
    );
  }
  next();
});

// Add indexes for optimized queries
appointmentSchema.index({ appointmentStatus: 1 });
appointmentSchema.index({ appointmentDateTime: 1 });

/**
 * Check if a reminder has already been sent for the given type.
 * @param {String} type - Reminder type (e.g., "24-hour", "7-day")
 * @returns {Boolean} - True if reminder of this type was already sent.
 */
appointmentSchema.methods.isReminderSent = function (type) {
  return this.reminders.some(
    (reminder) => reminder.type === type && reminder.sentAt
  );
};

/**
 * Log a reminder as sent.
 * @param {String} type - Reminder type
 */
appointmentSchema.methods.logReminder = function (type, data = {}) {
  this.reminders.push({
    type,
    sentAt: new Date(),
    ...data, // includes messageId, status, etc.
  });
  return this.save();
};

module.exports = mongoose.model("Appointment", appointmentSchema);
