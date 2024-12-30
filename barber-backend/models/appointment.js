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
      validator: (v) => v > new Date(Date.now() + 60 * 1000), // Ensure at least 1 minute in the future
      message: "Appointment date must be in the future",
    },
  },
  duration: {
    type: Number,
    required: true,
    default: 30, // Default to 30 minutes
  },
  endTime: {
    type: Date,
    required: true,
  },
  barber: {
    type: String,
    enum: ["ΛΕΜΟ", "ΦΟΡΟΥ"], // Replace with a reference to a `Barber` model if needed
    required: true,
  },
  appointmentStatus: {
    type: String,
    enum: ["confirmed", "pending", "canceled"],
    default: "pending",
  },
  reminderSent: { type: Boolean, default: false },
});

// Pre-save middleware to set duration and calculate endTime
appointmentSchema.pre("save", function (next) {
  const referenceDate = new Date(2025, 0, 13); // January 13, 2025
  const appointmentDate = new Date(this.appointmentDateTime);

  // Determine duration dynamically
  this.duration = appointmentDate >= referenceDate ? 40 : 30;

  // Calculate end time based on duration
  this.endTime = new Date(
    appointmentDate.getTime() + this.duration * 60 * 1000
  );

  next();
});

// Add an index to optimize status-based queries
appointmentSchema.index({ appointmentStatus: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
