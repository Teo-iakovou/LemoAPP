const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  phoneNumber: {
    type: String,
    required: true,
    validate: {
      validator: (v) => v.length >= 6 && v.length <= 15,
      message: "Phone number must be between 6 and 15 characters",
    },
  },
  appointmentDateTime: {
    type: Date,
    required: true,
    validate: {
      validator: (v) => v > new Date(), // Ensure appointment is in the future
      message: "Appointment date must be in the future",
    },
  },
  barber: {
    type: String,
    enum: ["ΛΕΜΟ", "ΦΟΡΟΥ"],
    required: true,
  },
  appointmentStatus: {
    type: String,
    enum: ["confirmed", "pending", "canceled"],
    default: "pending",
  },
  reminders: [
    {
      type: { type: String, required: true }, // e.g., "24-hour", "7-day"
      sentAt: { type: Date, required: true },
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
appointmentSchema.methods.logReminder = function (type) {
  this.reminders.push({ type, sentAt: new Date() });
  return this.save();
};

module.exports = mongoose.model("Appointment", appointmentSchema);
